IMPORTANT MODEL CORRECTION

You are KiMi Code running on KiMi 3 (`opencode-go/kimi-k3`).

OpenCode is the orchestrator and supervisor. The user clarified that all implementation work must be performed using KiMi 3.

Previous workspace contents may have been created before that clarification. Treat the current project as a draft implementation that KiMi 3 must now audit, validate, repair, continue, and own. Do not assume prior work is correct. You may keep good existing work if, after inspection, you judge it sound; otherwise refactor or replace it.

Do not change tmux, OpenCode, Hermes, OpenClaw, system services, firewall, SSH, Docker daemon, or global agent configuration.

WORKSPACE

Work in `/root/kimi-browser-desktop`.

MISSION

1. Inspect the current project and STATUS.md.
2. Update STATUS.md with this model correction: KiMi 3 is now the implementation model; previous non-KiMi-3 work is treated as draft and subject to KiMi 3 review.
3. Verify functional implementation completeness for the browser-accessible macOS-inspired desktop:
   - Desktop shell
   - Window manager
   - Dock
   - Menu Bar
   - Spotlight
   - Launchpad
   - Notification Center
   - Control Center
   - Persistent wallpaper
   - Persistent settings
   - Persistent windows
   - Finder, Calendar, Notes, Clock, Calculator, Weather, Mail, Messages, Contacts, Photos, Music, Reminders, Preview, Text Editor, Activity Monitor, System Settings, Terminal, Trash
   - Hermes app: conversations, markdown, streaming/reconnect where practical, session history, provider/model display
   - OpenClaw app: conversations, streaming/reconnect where practical, tasks, history, logs, provider/model display
   - Agent Control: health, status, restart controls or safe placeholders, diagnostics
4. Fix missing or broken functional pieces.
5. Perform Phase 4 Apple Design Pass:
   - typography, spacing, layout, proportions, iconography, shadows, translucency, blur, depth, color, window chrome, Dock, Menu Bar, Spotlight, Launchpad, animations, easing, transitions, hover states, cursor interactions, responsiveness, native/cohesive fit and finish.
6. Perform Phase 5 Performance and Engineering Quality:
   - rendering performance, startup time, responsiveness, memory usage, code organization, modularity, state management, adapter boundaries, unnecessary complexity removal.
7. Perform Phase 6 QA and Product Readiness:
   - bug fixes, visual consistency, interactions, persistence, app-by-app checks, agent status display checks, reconnect behavior where implemented, graceful errors, accessibility where practical, keyboard navigation where practical, README/STATUS completeness.

RULES

- Keep the project runnable at all times.
- Update STATUS.md continuously with decisions, rationale, test commands, risks, and known limitations.
- Commit meaningful milestones locally. Do not push.
- Do not expose secrets in source, logs, commits, STATUS.md, or terminal output.
- If ambiguity arises, make the best reasonable engineering/product decision, document it in STATUS.md, and continue.
- Stop only if continuing would risk data loss, destructive actions, security compromise, or unrecoverable failure.
- Continue autonomously until complete or blocked.

REPORTING

When complete, print a concise final summary with:
- what KiMi 3 reviewed/changed
- commits created
- test commands and results
- remaining limitations
- how OpenCode should run acceptance review
