# Comparison 04 - Rolling Leaderboard (through run-08)

Same frozen task spec ([eval/task-spec.md](../../eval/task-spec.md)), same empty-scaffold conditions, same three-tier instrument ([docs/EVALUATOR.md](../EVALUATOR.md)). Previous head-to-head: [run-04 board](run-04-rolling-leaderboard.md).

## Leaderboard (structural tier unless tagged otherwise)

| Rank | Run | Model | Date | Struct /100 | Neutral harness | Operator (Tier 3) | Sessions |
|---|---|---|---|---|---|---|---|
| **1** | 04 | **MiniMax-M3** | Nov 24 | **100** (struct, provisional) | **8/8 (100%)** - first clean sweep | not yet walked | 1 × ~65 min |
| 2 | 01 | Kimi K3 | Jul | 80 (struct) | pending re-run | 84/100 (operator, provisional) | 3 overnight |
| 3= | 02 | GLM-5.3 | Nov 18 | 72 (struct) | 7/8 (88%) | not yet walked | 1 × 80 min |
| 3= | 03 | Qwen3.8-Max | Nov 19 | 72 (struct) | 7/8 (88%) | not yet walked | 1 × 82 min |
| 5 | 08 | **Kimi-K2.7-Code** | Nov 25 | 64 (struct, provisional) | 7/8 (88%) - re-run on 3105 (overnight sweep 6/8 kept per diff rule) | not yet walked | 1 × ~16 min |
| – | 03 alias* | DeepSeek-V4.1-Flash | Nov 19 | pending (struct) | 7/10 crosscheck (2nd opinion, different instrument) | not yet walked | 1 × ~72 min |

\* Numbering collision note carried over from the run-03 board; unresolved pending operator, does not touch run-08.

## Run 08 note - slot misfire, renumbered

Kimi-K2.7-Code fired ~6 days early (its slot was Nov 23 → built Nov 25) because of a model-map prefix-grep bug in the 05:00 **Kimi K3.1** slot; see [run-08 story](../runs/run-08-kimi-k2.7-code.md). K3.1 (row 05) remains queued for a clean re-run under the fixed script. Publication honors what was actually built, not what the slot intended.

## Head-to-head: Kimi-K2.7-Code vs the board

| Dimension | K2.7-Code (08) | M3 head (04) | K3 baseline (01) | GLM (02) / Qwen (03) |
|---|---|---|---|---|
| Struct /100 | 64 (prov.) | **100 (prov.)** | 80 | 72 / 72 |
| Neutral harness | 7/8 | **8/8** | legacy 21/21 | 7/8 / 7/8 |
| Spotlight chord probe | toggle yes / launch dead / harness overlay-detect fail | **detected** | n/a | failed (both) |
| Window drag | **no response** | green | green | green / green |
| Launchpad | **no frame change** | yes | yes | yes / no |
| Typed-text persistence | **fails reload** | green | green | green / green |
| Apps (self-reported) | 15 | 17 | 21 | 16 / 15+3 |
| LOC (frontend+server) | ~2.4k | ~6.5k | n/c | n/c |
| Boot | 4.7 s | 5.0 s | n/c | n/c / 4.9 s |
| Sessions | 1 × ~16 min (fastest) | 1 × ~65 min | 3 overnight | 1 each |

## What the board says now

Two Moonshot datapoints on one lineage: K2.7-Code (Jun, 16 min, 64) → K3 (Jul, 3 sessions, 80) - a +16 struct delta with a big LOC/time delta attached, so lineage progress and session budget are still confounded *within* Moonshot. M3's 100 in 65 min remains the only run that decouples them. The 64 is the board's floor and its calibration point: shell geometry + security are cheap at 2.4k LOC; interaction physics (drag, launch, menu, content persistence) is what the instrument actually gates on. Tier-2 vision pass remains the gating instrument for the real ordering; run 05 (K3.1) is the next scheduled drop.

## Evidence

- Run 08 story: [run-08-kimi-k2.7-code.md](../runs/run-08-kimi-k2.7-code.md) · captures: `eval/harness/results/run-08-kimi-k2.7-code/`
- Prior board: [run-04-rolling-leaderboard.md](run-04-rolling-leaderboard.md) · [run-03 board](run-03-rolling-leaderboard.md) · [run-01-vs-run-02](run-01-vs-run-02.md)
