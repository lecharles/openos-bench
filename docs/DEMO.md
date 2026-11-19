# OpenOS Bench - Guided Demo (click path)

The 3-minute tour judges **feel**, which automated probes cannot. Walk this path on any run's build; score each step 0-2 in your head (0 broken, 1 works but feels wrong, 2 feels like macOS). The baseline (run-01, Kimi K3) is used for the reference screenshots.

## The path

1. **First sight.** Load the page. Does it land like a desktop, not a web page? Wallpaper crisp? Menu bar clock correct?
2. **Move a window.** Open Finder from the dock. Drag it by the title bar. Does it follow the cursor without lag? Resize from all 8 edges - do the cursors change?
3. **Traffic lights.** Hover the close/min/zoom buttons - do glyphs appear? Minimize: does the window *genie into the dock icon*? Restore it from the dock.
4. **Dock feel.** Sweep the cursor along the dock. Magnification should grow icons smoothly from the bottom edge and settle with a spring - no jitter.
5. **Spotlight.** Hit ⌘-Space. Type three letters of any app. Fuzzy match should appear instantly; Enter launches. Escape dismisses.
6. **Launchpad.** F4 (or dock icon): full-screen app grid, blur behind, click-to-launch, Escape out.
7. **Finder deep-check.** Switch icon → list → column → gallery views (⌘1-⌘4). Column view should append columns as you click folders. Right-click a file: Rename inline, Get Info card, Move to Trash. Empty trash restores it.
8. **Real work.** Notes: type, reload the page - your note is still there (server-side, not localStorage). Calendar: month view renders, events appear.
9. **Right-click the desktop.** Context menu: New Folder, Change Wallpaper. Does it feel native?
10. **Agent panels.** Open the agent control GUI. Streaming chat interface should be wired to the adapter contract even if no provider answers (a clean error state is fine; a blank pane is not).

## Scoring sheet template

| Step | 0 | 1 | 2 | Notes |
|---|---|---|---|---|
| 1 First sight | ☐ | ☐ | ☐ | |
| 2 Windows | ☐ | ☐ | ☐ | |
| 3 Traffic lights | ☐ | ☐ | ☐ | |
| 4 Dock feel | ☐ | ☐ | ☐ | |
| 5 Spotlight | ☐ | ☐ | ☐ | |
| 6 Launchpad | ☐ | ☐ | ☐ | |
| 7 Finder | ☐ | ☐ | ☐ | |
| 8 Persistence | ☐ | ☐ | ☐ | |
| 9 Context menu | ☐ | ☐ | ☐ | |
| 10 Agent panels | ☐ | ☐ | ☐ | |

**Human pass = X/20.** Combined with the automated scorecard in each `docs/runs/*.md`, that's the leaderboard entry.

## Where to click for each run

- Run-01 (Kimi K3) and each subsequent run keep the same path; only the build changes. Run URLs and start commands are in each run's story page under `docs/runs/`.
