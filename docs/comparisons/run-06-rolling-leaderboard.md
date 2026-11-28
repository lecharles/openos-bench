# Comparison 05 - Rolling Leaderboard (through run-05 + run-06 publishes, Nov 26)

Same frozen task spec ([eval/task-spec.md](../../eval/task-spec.md)), same empty-scaffold conditions, same three-tier instrument ([docs/EVALUATOR.md](../EVALUATOR.md)). Previous board: [run-08 board](run-08-rolling-leaderboard.md).

## Leaderboard (structural tier unless tagged otherwise)

| Rank | Run | Model | Date | Struct /100 | Neutral harness (8-check) | Operator (Tier 3) | Sessions |
|---|---|---|---|---|---|---|---|
| **1** | 04 | **MiniMax-M3** | Nov 24 | **100** (prov.) | 8/8 - first clean sweep | not yet walked | 1 × ~65 min |
| **2** | 05 | **Kimi K3.1** | Nov 26 | **88** (prov.; Nov 27 reval band 80-92, launch-probe flake, typed-text green fresh-state) | **8/8 - 2nd clean sweep, 5 boots confirmed** | not yet walked | 1 × ~70 min |
| 3 | 01 | Kimi K3 | Jul | 80 (legacy instrument) | pending re-run | 84 (operator, prov.) | 3 overnight |
| 4= | 02 | GLM-5.3 | Nov 18 | 72 | 7/8 | not yet walked | 1 × 80 min |
| 4= | 03 | Qwen3.8-Max | Nov 19 | 72 | 7/8 | not yet walked | 1 × 82 min |
| 4= | 06 | **DeepSeek-V4.1-Flash** | Nov 19 (pub. Nov 26) | 72 (prov.) | 8/8 - but click-path 3 reds (widest instrument split) | not yet walked | 1 × ~72 min |
| 7 | 08 | Kimi-K2.7-Code | Nov 25 | 64 (prov.) | 7/8 | not yet walked | 1 × ~16 min |

## The headline: the Moonshot lineage question is answered

K2.7-Code 64 (Jun, 16 min) → K3 80 (Jul, 3 overnight sessions) → **K3.1 88 (Nov, one 70-min session)**. Same lab, same spec: +24 struct points across five months, and the new refresh clears the multi-session baseline on a **fraction** of the session budget. Scope is no longer the explanation - capability moved. Only M3's 100 still sits above it, and M3 held the same budget.

## New tier signal: harness-perfect ≠ interaction-deep

Run 06 is the board's first model that sweeps the frame-based 8-check harness (8/8) while failing three of four click-path interaction probes (spotlight toggle, Enter-launch, Launchpad; drag also red). The instruments measure different things - frames detect change anywhere; click-path demands the specific control respond. Published struct follows the stricter click-path. Read-out: **budget parity with Tier-1 (72, ~72 min) buys geometry without plumbing**, exactly the K2.7 pattern at a higher boot polish.

## Board-wide red axis (all Nov runs) - revised Nov 27

Was: typed-text persistence fails reload on M3-era instruments for GLM, Qwen, K2.7, K3.1, DS-4.1F alike. **Nov 27 revalidation refutes this for K3.1** - green 2/2 on clean fresh-state boots; every prior red came from instrument sessions run back-to-back on a state-debris boot. The axis stays listed for the other rows *provisionally* - their scores were taken under the same debris conditions and get re-checked at each row's next revalidation. Lesson written into doctrine: **one fresh-state boot per instrument session.**

## Drag probe discrepancy (open item)

`3-drag: moved=false` on both new runs despite both models self-reporting working drag (K3.1: all 8 resize directions green). Same geometry probe passes nothing else - likely a probe artifact (titlebar hit-region), flagged for the operator pass rather than hidden; does not change relative ordering since it applies uniformly.

## Up next (Nov 27 update)

Row 05+ **GLM-5.4: blocked** - fire-time probe returns "isn't included in OpenCode Go" (id still not live); slot not burned, weekly re-probe until live. Train moves to row 07 **MiMo v2.6-Pro** (overdue since Nov 22, first queued row from tomorrow). Also fixed today in `scripts/train.sh`: crash on suffixed row numbers ("05+"), port math, and a post-scoring teardown after the raw rundir sat exposed on 31005 for ~9h. Every newly scored run still announces to the X lane within the hour via the bench-announce relay.

## Evidence

- Stories: [run-05-kimi-k3.1.md](../runs/run-05-kimi-k3.1.md) · [run-06-deepseek-v4.1-flash.md](../runs/run-06-deepseek-v4.1-flash.md)
- Instruments: `eval/harness/results/run-05-kimi-k3.1/` · `eval/harness/results/run-06-deepseek-v4.1-flash/`
- Galleries: `screenshots/run-05-kimi-k3.1/` · `screenshots/run-06-deepseek-v4.1-flash/`
