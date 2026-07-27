// Main entry point - initializes everything
(function() {
  'use strict';

  // Connect Socket.IO
  const socket = io();
  window.socket = socket;

  socket.on('connect', () => {
    console.log('KiMi Desktop connected');
  });

  // Initialize all core modules
  async function init() {
    await Persistence.init();
    Desktop.init();
    WindowManager.init();
    Dock.init();
    MenuBar.init();
    Spotlight.init();
    Launchpad.init();
    Notifications.init();
    ControlCenter.init();

    // Welcome notification
    setTimeout(() => {
      Notifications.add('KiMi Desktop', 'Welcome to KiMi Desktop! Click dock icons to open apps.');
    }, 1000);

    console.log('KiMi Desktop initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
