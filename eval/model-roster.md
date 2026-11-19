# Model Roster - the bench, single source of truth

One row per model, run # = build order. Status: `done` / `building` / `queued` / `blocked`. Scores carry tier tags per [docs/EVALUATOR.md](../docs/EVALUATOR.md). `scripts/train.sh` reads the first `queued` row each morning. This file merges the earlier MODELS.md cross-check notes (Nov 19) - no other roster file exists.

**Freshness gate (operator rule, Nov 19):** bench the LATEST refresh of each lineage at slot time; "post-Jul 2026" is a floor, not a target. K3 GA itself was Jul 2026 → the line is already on 3.1, which enters as run 05.

| Run | Model | Lab | Release (verified Nov 19 cross-check) | Slot (PT) | Status | Harness | Struct /100 | Story |
|---|---|---|---|---|---|---|---|---|
| 01 | Kimi K3 (Jul GA) | Moonshot | 2026-07 | baseline | done | 21/21 legacy | 80 | docs/runs/run-01-kimi-k3.md |
| 02 | GLM-5.3 | Z.ai | Aug 10 | Nov 18 (fired 22:10) | done | 7/8 (88%) | 72 | docs/runs/run-02-glm-5.3.md |
| 03 | Qwen3.8-Max | Alibaba | Sep 3 | Nov 19 (fired 03:58, in flight) | building | | | |
| 04 | MiniMax-M3 | MiniMax | Oct 27 | Nov 19 04:45 (Hermes lane fires) | queued | | | |
| 05 | **Kimi K3.1** | Moonshot | current refresh - exact tag verified at slot | Nov 20 05:00 | queued | | | |
| 06 | DeepSeek V4-Flash | DeepSeek | Oct 27 | Nov 21 | queued (unblocked by operator) | | | |
| 07 | MiMo v2.6-Pro | Xiaomi | Sep 27 | Nov 22 | queued | | | |
| 08 | Kimi-K2.7-Code | Moonshot | Jun 11 (pre-K3 specialist control) | Nov 23 | queued | | | |
| 09 | LongCat-2.0 | Meituan | verify at slot (HF listing unconfirmed) | Nov 24 | queued (slot-time check) | | | |
| 10 | Hunyuan hy4-preview | Tencent | verify at slot | Nov 25 | queued | | | |
| 11 | Qwen3.8-27B | Alibaba | Aug 5 (~6.9M DLs) | Nov 26 | queued | | | |
| 12 | omen-alpha | (key listing) | Nov wildcard | Nov 27 | queued | | | |
| 13+ | wildcards: qwen4-max, step-5-preview, Nemotron-550B (availability check), Dec drops | various | rolling | daily | queued | | | |

Excluded: GLM-5.3-Vision (tooling mismatch), GLM-Titanium-Preview (too large), Qwen3.8 - no such id, MiniMax-M3-base (no instruct tuning), DeepSeek-R1 (reasoner pre-OS-era) + the retired Nov 18 first-pass model names (superseded by HF re-scan).

Cross-lane build contract (both lanes): rundir `/home/hermes/openos-runs/run-<NN>-<slug>/`, tmux session `openos-run<NN>`, log `run-<NN>-<slug>.log`, state line `<NN> <slug> <rundir>` in `/home/hermes/openos-bench/.train-state`, key id from `/home/hermes/openos-runs/model-ids.map`. One concurrent build at a time; train.sh skips if any `openos-run` session is alive.

Corroborating evidence: Hermes' independent crosscheck (Nov 19): K3 10/10 vs GLM 8/10 structural - agrees with Tier-1 ordering (80 vs 72).

Freshness scan: `python3 scripts/scan-roster.py` (weekly, Sundays) writes `docs/roster-scans/<date>.md`; the newest scan wins slot decisions.
