# OpenOS: A Desktop Environment for the Browser

## Abstract
OpenOS demonstrates that a macOS-class desktop experience — window
management, a dock with magnification, spotlight search, and a suite
of real apps — can run as a plain web page with vanilla JavaScript.

## Architecture
- Frontend: vanilla JS ES modules, CSS variables for theming
- Backend: Node + Express, allow-listed filesystem API
- Persistence: server-side JSON documents
- Realtime: socket.io for cross-tab settings sync

## Conclusion
It boots in about two seconds and feels like home.