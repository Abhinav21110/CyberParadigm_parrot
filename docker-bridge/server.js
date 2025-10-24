/**
 * Docker Bridge API Server
 * 
 * This local server bridges the React frontend with Docker daemon.
 * Run this server locally to enable Docker container management from the web app.
 * 
 * Requirements:
 * - Node.js installed
 * - Docker installed and running
 * 
 * Installation:
 * 1. cd docker-bridge
 * 2. npm install express cors dockerode
 * 3. node server.js
 * 
 * The server will run on http://0.0.0.0:3001 (accessible on all network interfaces)
 */

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const docker = new Docker();

// Wait until noVNC is serving on the mapped host port
async function waitForNoVNC(hostPort, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  const publicUrl = process.env.PUBLIC_URL || 'http://127.0.0.1';
  const url = `${publicUrl.replace(/\/$/, '')}:${hostPort}/vnc.html`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for public accessibility
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({ origin: "*" })); // Allow all origins for public accessibility
app.use(express.json());

// Store active containers
const activeContainers = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Docker bridge is running' });
});

// Spawn a new Parrot OS container
app.post('/api/docker/spawn', async (req, res) => {
  try {
    const { challengeId, image = 'parrotsec/security:latest' } = req.body;

    console.log(`Spawning container for challenge: ${challengeId}`);

    // Ensure image exists locally; if not, pull it
    let hasLocalImage = false;
    try {
      await docker.getImage(image).inspect();
      hasLocalImage = true;
      console.log(`Using local image: ${image}`);
    } catch (e) {
      console.log(`Local image not found, pulling: ${image}`);
      await docker.pull(image);
      console.log(`Image ${image} pulled successfully`);
    }

    // Create and start container with published ports (noVNC 8081, SSH 22)
    const container = await docker.createContainer({
      Image: image,
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      name: `parrot-${challengeId}-${Date.now()}`,
      ExposedPorts: {
        '8081/tcp': {},
        '22/tcp': {},
      },
      HostConfig: {
        AutoRemove: true,
        NetworkMode: 'bridge',
        PortBindings: {
          '8081/tcp': [{ HostPort: '0' }],
          '22/tcp': [{ HostPort: '0' }],
        }
      }
    });

    await container.start();
    
    // Get container info
    const containerInfo = await container.inspect();
    const networks = (containerInfo.NetworkSettings && containerInfo.NetworkSettings.Networks) || {};
    const firstNetwork = Object.values(networks)[0] || null;
    const ipAddress = (firstNetwork && firstNetwork.IPAddress) || containerInfo.NetworkSettings.IPAddress || null;
    const novncPortBinding = (containerInfo.NetworkSettings.Ports && containerInfo.NetworkSettings.Ports['8081/tcp']) || [];
    const sshPortBinding = (containerInfo.NetworkSettings.Ports && containerInfo.NetworkSettings.Ports['22/tcp']) || [];
    const novncPort = novncPortBinding.length ? novncPortBinding[0].HostPort : null;
    const sshPort = sshPortBinding.length ? sshPortBinding[0].HostPort : null;

    // Optionally wait for noVNC UI to be ready to avoid empty iframe
    if (novncPort) {
      await waitForNoVNC(novncPort).catch(() => {});
    }

    // Include 'path=websockify' which noVNC expects when served by websockify
    const publicUrl = process.env.PUBLIC_URL || 'http://127.0.0.1';
    const novncUrl = novncPort
      ? `${publicUrl.replace(/\/$/, '')}:${novncPort}/vnc.html?autoconnect=1&reconnect=1&path=websockify&host=${publicUrl.replace(/^https?:\/\//, '')}&port=${novncPort}&resize=scale&quality=6&compression=2&clipboard=1&show_dot=1&view_only=0&scale=1.0`
      : null;

    // Store container reference
    activeContainers.set(container.id, {
      container,
      challengeId,
      spawnedAt: new Date()
    });

    console.log(`Container spawned: ${container.id}`);

    res.json({
      success: true,
      containerId: container.id,
      ipAddress,
      novncPort,
      sshPort,
      novncUrl,
      message: 'Container spawned successfully'
    });
  } catch (error) {
    console.error('Error spawning container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Terminate a container
app.post('/api/docker/terminate', async (req, res) => {
  try {
    const { containerId } = req.body;

    if (!activeContainers.has(containerId)) {
      return res.status(404).json({
        success: false,
        error: 'Container not found'
      });
    }

    const { container } = activeContainers.get(containerId);
    
    await container.stop();
    activeContainers.delete(containerId);

    console.log(`Container terminated: ${containerId}`);

    res.json({
      success: true,
      message: 'Container terminated successfully'
    });
  } catch (error) {
    console.error('Error terminating container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset a container
app.post('/api/docker/reset', async (req, res) => {
  try {
    const { containerId } = req.body;

    if (!activeContainers.has(containerId)) {
      return res.status(404).json({
        success: false,
        error: 'Container not found'
      });
    }

    const { container } = activeContainers.get(containerId);
    
    await container.restart();

    console.log(`Container reset: ${containerId}`);

    res.json({
      success: true,
      message: 'Container reset successfully'
    });
  } catch (error) {
    console.error('Error resetting container:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Open a URL inside the container (Firefox in Parrot OS GUI)
app.post('/api/docker/open-url', async (req, res) => {
  try {
    const { containerId, url } = req.body;
    if (!containerId || !url) {
      return res.status(400).json({ success: false, error: 'containerId and url are required' });
    }
    const data = activeContainers.get(containerId);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Container not found' });
    }

    const { container } = data;
    const exec = await container.exec({
      Cmd: ['/bin/bash', '-lc', `DISPLAY=:1 su - attacker -c "firefox --new-window '${url}'"`],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });
    const stream = await exec.start({ hijack: false, stdin: false });
    res.json({ success: true });
  } catch (error) {
    console.error('Error opening URL in container:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all active containers
app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = Array.from(activeContainers.values()).map(({ challengeId, spawnedAt }) => ({
      challengeId,
      spawnedAt
    }));

    res.json({
      success: true,
      containers,
      count: containers.length
    });
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket connection for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('attach-terminal', async ({ containerId }) => {
    console.log(`Attaching terminal to container: ${containerId}`);
    
    try {
      const containerData = activeContainers.get(containerId);
      if (!containerData) {
        socket.emit('error', 'Container not found');
        return;
      }

      const { container } = containerData;
      
      // Attach to container with TTY
      const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true
      });

      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true
      });

      // Store stream reference
      socket.containerStream = stream;

      // Send container output to client
      stream.on('data', (data) => {
        socket.emit('terminal-output', data.toString('utf-8'));
      });

      // Handle client input
      socket.on('terminal-input', (data) => {
        if (socket.containerStream) {
          socket.containerStream.write(data);
        }
      });

      // Handle resize events
      socket.on('terminal-resize', async ({ rows, cols }) => {
        try {
          await exec.resize({ h: rows, w: cols });
        } catch (err) {
          console.error('Resize error:', err);
        }
      });

      stream.on('end', () => {
        console.log('Container stream ended');
        socket.emit('terminal-disconnected');
      });

    } catch (error) {
      console.error('Error attaching to container:', error);
      socket.emit('error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.containerStream) {
      socket.containerStream.end();
    }
  });
});

const port = process.env.PORT || 3001;
const host = '0.0.0.0';

// Start server
server.listen(port, host, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🐳 Docker Bridge Server Running');
  console.log(`${'='.repeat(60)}`);
  console.log(`Server:     http://${host}:${port}`);
  console.log(`WebSocket:  ws://${host}:${port}`);
  console.log(`Health:     http://${host}:${port}/api/health`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('✅ Ready to accept container requests from the web app');
  console.log('📝 Make sure Docker daemon is running\n');
});
