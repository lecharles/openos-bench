# Run 03 - DeepSeek-V4.1-Flash (2026-11-19)

**Model:** DeepSeek-V4.1-Flash (opencode/deepseek-v4.1-flash-free) - released Jul 31, most-downloaded open release since the baseline
**Session:** 04:13 → ~05:25 PT, one autonomous session (~72 min wall-clock), empty scaffold
**Stack chosen by the model:** vanilla JS ES modules (core/ + apps/ split), Express backend, Socket.IO
**Evaluator:** Hermes bench lane (crosscheck harness) + tier-1 clickpath pending

## Machine verdict (crosscheck, second opinion)

| Result | Value |
|--------|-------|
| Harness probes | 7/10 with adapter config `eval/harness-configs/run-03-deepseek-v41-flash.json` (6/10 without; range reflects selector translation, not model behavior) |
| Passed | boot-paint, spotlight-open, window-drag, window-close, persist-layout, sec-shadow, sec-traversal |
| Failed | apps-render, spotlight-launch, window-maximize - all three are known v1 crosscheck limitations (hidden window templates spoof element-count deltas), logged for v1.1 |
| Official tier-1 score | pending - runs automatically with the morning train |

## Honest notes

- The worker died at the finish line, not at the build: its last action was a self-serve smoke test against /tmp, which its sandbox permission layer rejected, so the session ended before writing STATUS.md. The build itself is complete (server.js 466 lines, 15 dock apps, os-data fixtures, self-authored screenshot script).
- Control markup ("Close window" / "Zoom window" aria-labels) is identical in style to GLM-5.3's - a notable convergence of this release cohort.
- Typed-content persistence and genie/animation physics remain human/vision axes (see docs/EVALUATOR.md).

## Evidence

screenshots/run-03-deepseek-v41-flash/ (boot, apps-open, after-reload) + full run directory in runs/run-03-deepseek-v41-flash/

## Human pass

Status: queued, voluntary override - never a gate.
