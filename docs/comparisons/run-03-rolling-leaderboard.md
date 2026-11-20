# Comparison 02 - Rolling Leaderboard (through run-03)

Same frozen task spec ([eval/task-spec.md](../../eval/task-spec.md)), same empty-scaffold conditions, same three-tier instrument ([docs/EVALUATOR.md](../EVALUATOR.md)). This page is the rolling board; the newest head-to-head is run-02 vs run-03 below.

## Leaderboard (structural tier unless tagged otherwise)

| Rank | Run | Model | Date | Struct /100 | Neutral harness | Operator (Tier 3) | Sessions |
|---|---|---|---|---|---|---|---|
| 1 | 01 | Kimi K3 | Jul | **80** (struct) | pending re-run | 84/100 (operator, provisional) | 3 overnight |
| 2= | 02 | GLM-5.3 | Nov 18 | **72** (struct) | 7/8 (88%) | not yet walked | 1 × 80 min |
| 2= | 03 | Qwen3.8-Max | Nov 19 | **72** (struct) | 7/8 (88%) | not yet walked | 1 × 82 min |

Corroborating: Hermes' independent crosscheck (Nov 19) put K3 10/10 vs GLM 8/10 structural - ordering agrees with the board.

## Head-to-head: GLM-5.3 vs Qwen3.8-Max (the 72-72 tie)

The two single-session runs land on the identical structural score through different failure mixes. That's the interesting signal, not the tie itself.

| Dimension | GLM-5.3 (run-02) | Qwen3.8-Max (run-03) |
|---|---|---|
| Struct /100 | 72 | 72 |
| Neutral harness | 7/8 (spotlight not detected) | 7/8 (spotlight - adjudicated **instrument gap**, overlay verified working via targeted probe) |
| Apps | 16 dock apps, 21/21 self-checks | 15 windowed + 3 hidden, 50/50 self-probes |
| Launchpad | yes | **no - the one genuine structural loss** |
| Finder views | 2+ | icon + list (no column/gallery) |
| Persistence | server-side, verified | server-side JSON + sendBeacon flush, verified |
| fs security | realpath-before-allowlist | same + symlink re-check, 403 on every verb |
| Per-app depth | mock-ish shells | generative WebAudio Music, sandboxed Terminal, Mail auto-replies, analog world clocks |
| Boot (click path) | n/c | 4.9 s (slowest recorded - unbundled ES modules) |
| Asset story | mock | pure-Node PNG encoder, procedural photos |

**Read:** GLM optimized breadth-against-spec; Qwen optimized depth-against-spec and paid for it on scope. Both missed the *same* two probe artifacts (spotlight key-chord toggle, geometry-dock-click typing) - instrumentation debt, not model debt; Tier 2 fixes both.

## What the board says about the baseline

K3's 80 still leads, and the gap is still scope (21 apps, 4 Finder views, Launchpad, agent panels). The run-01/02 hypothesis - single-session runs are budget-constrained, not capability-constrained - survives run-03 with more evidence: Qwen's 82-minute build is the most feature-dense single-session artifact in the bench and still can't reach K3's three-session width. Next data point that tests this hardest: run-05 Kimi K3.1 (same lineage as the baseline, one session, Nov 20) - if lineage progress shows, K3.1 should clear K3's July score on a fraction of the sessions.

## Evidence

- Run 01 story: [run-01-kimi-k3.md](../runs/run-01-kimi-k3.md) · Run 02: [run-02-glm-5.3.md](../runs/run-02-glm-5.3.md) · Run 03: [run-03-qwen3.8-max.md](../runs/run-03-qwen3.8-max.md)
- Click-path captures: `eval/harness/results/run-0{1,2,3}-*/`
- Prior head-to-head: [run-01-vs-run-02.md](run-01-vs-run-02.md)
