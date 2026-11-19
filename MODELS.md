# The Bench - what we run and where it lives

Every notable open-weights family since the July 2026 Kimi K3 baseline, organized by
how it can be driven through the nightly builder. Dates verified against the Hugging
Face API on Nov 19 2026. DeepSeek is on the bench with operator approval (Nov 18).

## Tier A - flagships via the builder account (one overnight session each)

| Run | Model | Released | Notes |
|-----|-------|----------|-------|
| 01 | Kimi K3 (baseline) | Jun/Jul 2026 | 3 sessions; the legacy 21-app bar |
| 02 | GLM-5.3 (Z.ai) | Aug 25 | done; 80-min single session |
| 03 | DeepSeek-V4.1-Flash | building now | most-downloaded new release line |
| 04 | Qwen3.8-Max | Aug 2026 | frontier challenger |
| 05 | Qwen3.8-27B | Aug 5 | #2 downloads overall since July |
| 06 | MiniMax-M3 | 2026 | long-context agentic lineage |
| 07 | DeepSeek-V4-Pro | Aug 13 | pro variant of run 03 |
| 08 | Kimi-K2.7-Code | Jun 11 | control: does code specialization survive an OS? |

## Tier B - free-lane models (continuous engine; can run any time of day)

`nemotron-3.5-lightning-30B`, `mimo-v2.6-flash`, `hy4-flash`, `longcat-2.5`,
`flint-40b`, `inkling-2-small`, plus unidentifieds as blind controls
(`beam`, `iceman`, `tidepool-alpha`, `union-alpha`). These keep the leaderboard
growing even when a flagship slot stalls.

## Tier C - weights on Hugging Face (fork-and-run for the community)

GLM-5.3, Qwen3.8 (2.4T-A95B + 27B), DeepSeek-V4 Flash/Pro, Hy3 (Jul 2),
Nemotron-3.5 Lightning/Bolt/Dory, MiniCPM5-2B (small-model stress case).
Adapter contract shows how to wire any of them: `eval/task-spec.md` + worker script.

## Status columns

Leaderboard rows in [README.md](README.md); per-run evidence pages in `docs/runs/`;
machine reports in `runs/harness-*`. Cadence and schedule: [ROADMAP.md](ROADMAP.md).
