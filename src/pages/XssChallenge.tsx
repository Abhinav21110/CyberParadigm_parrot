import { useEffect, useState } from 'react';
import { PwnBox } from '@/components/PwnBox';

interface ExerciseStatus {
  easy: boolean;
  medium: boolean;
  hard: boolean;
}

export function XssChallenge() {
  const [instructions, setInstructions] = useState<string>('');
  const [status, setStatus] = useState<ExerciseStatus>({ easy: false, medium: false, hard: false });
  const [containerId, setContainerId] = useState<string | null>(null);

  useEffect(() => {
    // Load HTML instructions from public/xsss/index.html
    fetch('/xsss/index.html')
      .then(r => r.text())
      .then(setInstructions)
      .catch(() => setInstructions('<h3 style="color:#fff">Failed to load instructions.</h3>'));
  }, []);

  const handleSpawned = async (id: string) => {
    setContainerId(id);
    // Open the exercise pages inside the container's Firefox
    const urls = [
      'http://localhost:8080/xsss/index.html',
      'http://localhost:8080/xsss/easy.html',
      'http://localhost:8080/xsss/medium.html',
      'http://localhost:8080/xsss/hard.html',
    ];
    for (const url of urls) {
      try {
        await fetch('http://localhost:3001/api/docker/open-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ containerId: id, url }),
        });
      } catch {}
    }
  };

  const markComplete = (level: 'easy' | 'medium' | 'hard') => {
    setStatus((s) => ({ ...s, [level]: true }));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">XSS Challenge</h1>
          <p className="text-gray-400">Read the instructions and start the instance to practice.</p>
        </div>
        <div className="flex gap-3">
          <span className={`px-3 py-1 rounded bg-gray-800 text-sm ${status.easy ? 'text-green-400' : 'text-gray-400'}`}>Easy {status.easy ? '✓' : ''}</span>
          <span className={`px-3 py-1 rounded bg-gray-800 text-sm ${status.medium ? 'text-yellow-400' : 'text-gray-400'}`}>Medium {status.medium ? '✓' : ''}</span>
          <span className={`px-3 py-1 rounded bg-gray-800 text-sm ${status.hard ? 'text-red-400' : 'text-gray-400'}`}>Hard {status.hard ? '✓' : ''}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-white text-xl font-semibold mb-4">Exercise Instructions</h2>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: instructions }} />
          <div className="mt-4 flex gap-3">
            <button onClick={() => markComplete('easy')} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded">Mark Easy Done</button>
            <button onClick={() => markComplete('medium')} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded">Mark Medium Done</button>
            <button onClick={() => markComplete('hard')} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded">Mark Hard Done</button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-white text-xl font-semibold mb-4">Instance</h2>
          <PwnBox challengeId="xss" challengeTitle="XSS" />
        </div>
      </div>
    </div>
  );
}


