PHASE 6 - QA AND PRODUCT READINESS

You are still KiMi Code, the implementation engine. OpenCode remains the orchestrator and reviewer.

Do not change tmux, OpenCode, Hermes, OpenClaw, system services, firewall, SSH, Docker daemon, or global agent configuration.

Perform a comprehensive quality and product-readiness pass.

Focus on:

- bug fixes
- visual inconsistencies
- interaction validation
- persistence validation
- app-by-app functionality checks
- agent app health and status display checks
- reconnect behavior where implemented
- graceful error states
- accessibility where practical
- keyboard navigation where practical
- responsive behavior
- production-ready defaults
- clear README and STATUS.md state

Rules:
- Keep the project runnable.
- Update STATUS.md with QA results, fixes, remaining known limitations, and run/test commands.
- Test your own work before reporting completion.
- Commit a meaningful Phase 6 milestone locally.
- If ambiguity arises, make the best reasonable product/engineering decision, document it in STATUS.md, and continue.
- Stop only for data-loss risk, destructive actions, security compromise, or unrecoverable failure.
