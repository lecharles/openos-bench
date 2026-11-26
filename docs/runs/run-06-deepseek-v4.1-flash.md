# Run 06 - DeepSeek-V4.1-Flash (2026-11-26 publish)

**Model:** DeepSeek-V4.1-Flash (DeepSeek, Nov refresh) - served via `opencode-go/deepseek-v4.1-flash` *(renumbered from the run-03 alias; operator decision 2026-11-26 resolves the Nov 19 two-lane numbering collision: train-state Qwen owns run-03, this early Hermes-lane run takes row 06 and retires the queued V4-Flash placeholder it supersedes)*
**Session:** Nov 19, 04:13 PT, ~72 min, one autonomous session, frozen task spec v0, empty scaffold
**Evaluator:** bench lane, Tier-1 instruments (`harness.js` 8-check neutral + `clickpath.js` struct), re-run fresh on port 3082 on publish day

## Score

| Metric | Result | Tier |
|---|---|---|
| **Struct click-path** | **72/100 (provisional)** - axes: visual-fidelity 4/5, app-functionality 3/5, perf/persistence 4/5; boot 5,257 ms, 0 page errors | T1 `(struct)` |
| **Neutral harness (8-check)** | **8/8 (100%)** | T1 `(harness)` |
| 10-check crosscheck (run-night, 2nd opinion) | 7/10 - different instrument, retained per diff rule | T1 `(crosscheck)` |
| Persistence | server-side layout survives reload; typed text does not survive | T1 |
| Security | allow-list enforced on `/etc/*` probes (live re-check on serve) | T1 |
| Human/operator pass | not yet walked | T3 pending |

## Board position

72 places DeepSeek-V4.1-Flash at **3= with GLM-5.3 and Qwen3.8-Max** - the "depth-or-breadth, one session" tier - below K3.1 (88) and K3 (80), above the K2.7 control (64). Notable split from its tier-mates: it clears the neutral harness 8/8 while both 72-peers missed on the two probe artifacts, and its struct is identical - the instrument gap between harness-clean and interaction-deep is what the vision/operator tiers will need to separate.

## Read

- Clean shell, thin nervous system: app-open and context-menu respond to clicks, boot is error-free at 5.3 s, and the 8-check frame harness reads 8/8
- But the click-path finds the same failure shape as the K2.7 control one notch up: **spotlight toggle shows no frame change, Enter-launch does nothing, Launchpad never changes frame, drag doesn't move** - overlay is chrome without plumbing on three of four interaction probes (app-functionality 3/5)
- Harness 8/8 vs click-path 3 reds is the widest instrument split on the board - published struct stays with the click-path (stricter), and the discrepancy itself is recorded
- Same typed-text-persistence red as the whole Nov cohort - a bench-wide, not model-specific, discriminator so far

## Evidence

- Build dir: `runs/run-03-deepseek-v41-flash/` (artifact dir retains original alias name; run number is editorial)
- Screenshots: `screenshots/run-06-deepseek-v4.1-flash/`
- Instrument JSON + step frames: `eval/harness/results/run-06-deepseek-v4.1-flash/{harnessjs,clickpath}/`

## Human pass

Status: queued - async, does not block the leaderboard.
