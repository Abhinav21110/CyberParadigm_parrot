FROM parrotsec/security:latest

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    VNC_RESOLUTION=1920x1080 \
    VNC_DEPTH=24 \
    USER=attacker \
    PASS=attacker

# Update and upgrade first
RUN apt-get update && apt-get upgrade -y

# GUI stack with full XFCE desktop environment
RUN apt-get install -y \
    xfce4 xfce4-goodies xfce4-terminal xfce4-panel xfce4-whiskermenu-plugin \
    xfce4-taskmanager xfce4-settings xfce4-screenshooter xfce4-appfinder \
    xfce4-clipman-plugin xfce4-places-plugin thunar \
    dbus-x11 x11-xserver-utils xclip xsel \
    x11vnc xvfb novnc websockify supervisor xdotool

# Parrot branding and tools
RUN apt-get install -y \
    parrot-interface parrot-menu

# Security tools
RUN apt-get install -y \
    openssh-server sudo curl wget git net-tools iproute2 iputils-ping \
    metasploit-framework sqlmap burpsuite

# Clean up apt cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Remove noisy autostart apps
RUN rm -f /etc/xdg/autostart/{blueman,light-locker,nm-applet,polkit-gnome-authentication-agent-1}.desktop

# Create attacker user and preload XFCE config
RUN if ! id -u "$USER" > /dev/null 2>&1; then \
        useradd -m -s /bin/bash "$USER" && echo "$USER:$PASS" | chpasswd && \
        adduser "$USER" sudo && echo "$USER ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers; \
    fi && \
    cp -r /etc/skel/.config /home/$USER/ 2>/dev/null || mkdir -p /home/$USER/.config && \
    chown -R $USER:$USER /home/$USER/.config

# Configure XFCE desktop environment with improved panels and Whisker menu
RUN mkdir -p /home/$USER/.config/xfce4/xfconf/xfce-perchannel-xml /home/$USER/.config/xfce4/panel && \
    printf '%s\n' \
    '<?xml version="1.0" encoding="UTF-8"?>' \
    '<channel name="xfce4-panel" version="1.0">' \
    '  <property name="configver" type="int" value="2"/>' \
    '  <property name="panels" type="array">' \
    '    <value type="int" value="1"/>' \
    '    <value type="int" value="2"/>' \
    '    <property name="panel-1" type="empty">' \
    '      <property name="position" type="string" value="p=6;x=0;y=0"/>' \
    '      <property name="length" type="uint" value="100"/>' \
    '      <property name="position-locked" type="bool" value="true"/>' \
    '      <property name="size" type="uint" value="28"/>' \
    '      <property name="plugin-ids" type="array">' \
    '        <value type="int" value="1"/>' \
    '        <value type="int" value="2"/>' \
    '        <value type="int" value="3"/>' \
    '        <value type="int" value="4"/>' \
    '        <value type="int" value="5"/>' \
    '        <value type="int" value="6"/>' \
    '        <value type="int" value="7"/>' \
    '        <value type="int" value="8"/>' \
    '        <value type="int" value="11"/>' \
    '      </property>' \
    '    </property>' \
    '    <property name="panel-2" type="empty">' \
    '      <property name="position" type="string" value="p=8;x=0;y=0"/>' \
    '      <property name="length" type="uint" value="100"/>' \
    '      <property name="position-locked" type="bool" value="true"/>' \
    '      <property name="size" type="uint" value="28"/>' \
    '      <property name="autohide" type="bool" value="false"/>' \
    '      <property name="enter-opacity" type="uint" value="100"/>' \
    '      <property name="leave-opacity" type="uint" value="100"/>' \
    '      <property name="plugin-ids" type="array">' \
    '        <value type="int" value="9"/>' \
    '        <value type="int" value="10"/>' \
    '      </property>' \
    '    </property>' \
    '  </property>' \
    '  <property name="plugins" type="empty">' \
    '    <property name="plugin-1" type="string" value="whiskermenu"/>' \
    '    <property name="plugin-2" type="string" value="tasklist"/>' \
    '    <property name="plugin-3" type="string" value="separator"/>' \
    '    <property name="plugin-4" type="string" value="systray"/>' \
    '    <property name="plugin-5" type="string" value="separator"/>' \
    '    <property name="plugin-6" type="string" value="clock"/>' \
    '    <property name="plugin-7" type="string" value="separator"/>' \
    '    <property name="plugin-8" type="string" value="actions"/>' \
    '    <property name="plugin-9" type="string" value="showdesktop"/>' \
    '    <property name="plugin-10" type="string" value="pager"/>' \
    '    <property name="plugin-11" type="string" value="clipman"/>' \
    '  </property>' \
    '</channel>' \
    > /home/$USER/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml && \
    printf '%s\n' \
    '<?xml version="1.0" encoding="UTF-8"?>' \
    '<channel name="whiskermenu" version="1.0">' \
    '  <property name="launcher-show-name" type="bool" value="true"/>' \
    '  <property name="launcher-show-description" type="bool" value="true"/>' \
    '  <property name="launcher-show-tooltip" type="bool" value="true"/>' \
    '  <property name="launcher-icon-size" type="int" value="2"/>' \
    '  <property name="hover-switch-category" type="bool" value="true"/>' \
    '  <property name="category-show-name" type="bool" value="true"/>' \
    '  <property name="category-icon-size" type="int" value="1"/>' \
    '  <property name="load-hierarchy" type="bool" value="false"/>' \
    '  <property name="view-as-icons" type="bool" value="false"/>' \
    '  <property name="default-category" type="int" value="0"/>' \
    '  <property name="recent-items-max" type="int" value="10"/>' \
    '  <property name="favorites-in-recent" type="bool" value="true"/>' \
    '  <property name="position-search-alternate" type="bool" value="true"/>' \
    '  <property name="position-commands-alternate" type="bool" value="false"/>' \
    '  <property name="position-categories-alternate" type="bool" value="true"/>' \
    '  <property name="position-categories-horizontal" type="bool" value="false"/>' \
    '  <property name="stay-on-focus-out" type="bool" value="false"/>' \
    '  <property name="profile-shape" type="uint" value="0"/>' \
    '  <property name="confirm-session-command" type="bool" value="true"/>' \
    '  <property name="menu-width" type="int" value="450"/>' \
    '  <property name="menu-height" type="int" value="500"/>' \
    '  <property name="menu-opacity" type="uint" value="100"/>' \
    '  <property name="command-settings" type="string" value="xfce4-settings-manager"/>' \
    '  <property name="show-command-settings" type="bool" value="true"/>' \
    '  <property name="command-lockscreen" type="string" value="xflock4"/>' \
    '  <property name="show-command-lockscreen" type="bool" value="true"/>' \
    '  <property name="command-switchuser" type="string" value="gdmflexiserver"/>' \
    '  <property name="show-command-switchuser" type="bool" value="false"/>' \
    '  <property name="command-logoutuser" type="string" value="xfce4-session-logout --logout --fast"/>' \
    '  <property name="show-command-logoutuser" type="bool" value="false"/>' \
    '  <property name="command-restart" type="string" value="xfce4-session-logout --reboot --fast"/>' \
    '  <property name="show-command-restart" type="bool" value="false"/>' \
    '  <property name="command-shutdown" type="string" value="xfce4-session-logout --halt --fast"/>' \
    '  <property name="show-command-shutdown" type="bool" value="false"/>' \
    '  <property name="search-actions" type="uint" value="6"/>' \
    '</channel>' \
    > /home/$USER/.config/xfce4/xfconf/xfce-perchannel-xml/whiskermenu.xml && \
    chown -R $USER:$USER /home/$USER/.config

# Create resolution adjustment script
RUN printf '%s\n' \
    '#!/bin/bash' \
    'RESOLUTION=${1:-1920x1080}' \
    'DISPLAY=${2:-:1}' \
    'echo "Setting display resolution to $RESOLUTION"' \
    'xrandr --display $DISPLAY --output default --mode $RESOLUTION 2>/dev/null || true' \
    'xrandr --display $DISPLAY --output VNC-0 --mode $RESOLUTION 2>/dev/null || true' \
    'echo "Resolution updated to $RESOLUTION"' \
    > /usr/local/bin/set-resolution.sh && \
    chmod +x /usr/local/bin/set-resolution.sh

# Configure SSH
RUN mkdir -p /var/run/sshd && \
    sed -ri 's/^#?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -ri 's/^#?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose noVNC and SSH
EXPOSE 8081 22

ENTRYPOINT []
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]