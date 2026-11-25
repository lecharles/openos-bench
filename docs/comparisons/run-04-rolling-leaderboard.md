# Comparison 03 - Rolling Leaderboard (through run-04)

Same frozen task spec ([eval/task-spec.md](../../eval/task-spec.md)), same empty-scaffold conditions, same three-tier instrument ([docs/EVALUATOR.md](../EVALUATOR.md)). Previous head-to-head: [run-03 board](run-03-rolling-leaderboard.md).

## Leaderboard (structural tier unless tagged otherwise)

| Rank | Run | Model | Date | Struct /100 | Neutral harness | Operator (Tier 3) | Sessions |
|---|---|---|---|---|---|---|---|
| **1** | 04 | **MiniMax-M3** | Nov 24 | **100** (struct, provisional) | **8/8 (100%)** - first clean sweep | not yet walked | 1 × ~65 min |
| 2 | 01 | Kimi K3 | Jul | 80 (struct) | pending re-run | 84/100 (operator, provisional) | 3 overnight |
| 3= | 02 | GLM-5.3 | Nov 18 | 72 (struct) | 7/8 (88%) | not yet walked | 1 × 80 min |
| 3= | 03 | Qwen3.8-Max | Nov 19 | 72 (struct) | 7/8 (88%) | not yet walked | 1 × 82 min |
| – | 03 alias* | DeepSeek-V4.1-Flash | Nov 19 | pending (struct) | 7/10 crosscheck (2nd opinion, different instrument) | not yet walked | 1 × ~72 min |

\* Numbering collision note carried over from the run-03 board; unresolved pending operator, does not touch run-04.

## Head-to-head: MiniMax-M3 vs previous best (run-04 vs runs 01/02/03)

| Dimension | MiniMax-M3 (04) | K3 baseline (01) | GLM (02) / Qwen (03) |
|---|---|---|---|
| Struct /100 | **100 (prov.)** | 80 | 72 / 72 |
| Neutral harness | **8/8** | legacy 21/21 (pre-instrument) | 7/8 / 7/8 |
| Spotlight chord probe | **detected** | n/a | failed (both) |
| Launchpad | yes | yes | yes / **no** |
| Apps | 17 registered, 15 spec-menu | 21 | 16 / 15+3 |
| Persistence | server-side JSON, reloaded green | server-side | server-side / server-side + sendBeacon |
| Security | global path-guard pre-route, 403 all verbs, no-shell terminal | (legacy pass) | realpath allow-list / + symlink re-check |
| Boot | 5.0 s (tied slowest) | n/c | n/c / 4.9 s |
| Sessions | 1 × ~65 min (fastest full-scope) | 3 overnight | 1 each |
| Agent-app honesty | reports offline truthfully, no fake connection | agent panels | n/a |

**Read:** M3 is the first single-session run that loses nothing on scope *or* instrument - the two-axis loss every predecessor accepted. The board caveat is structural, not model-specific: the 100 is provisional over measurable axes; K3's 80 survived a fuller walk (84 operator). Tier-2 vision pass is now the gating instrument for the real ordering.

## What the board says about the baseline hypothesis

The run-01/02/03 line was "single-session runs are budget-constrained, not capability-constrained." M3 weakens it: 65 minutes, one session, full sweep. Either the Oct-27 MiniMax generation jumped, or the constraint was scaffold-prompt fit. Next data point (run-05 Kimi K3.1, one session) tests lineage progress directly against M3's bar.

## Evidence

- Run 04 story: [run-04-minimax-m3.md](../runs/run-04-minimax-m3.md) · captures: `eval/harness/results/run-04-minimax-m3/`, `screenshots/run-04-minimax-m3/`
- Prior board: [run-03-rolling-leaderboard.md](run-03-rolling-leaderboard.md) · [run-01-vs-run-02.md](run-01-vs-run-02.md)
