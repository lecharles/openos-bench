# Model Roster - the bench, single source of truth

One row per model, run # = build order. Status: `done` / `building` / `queued` / `blocked`. Scores carry tier tags per [docs/EVALUATOR.md](../docs/EVALUATOR.md). `scripts/train.sh` reads the first `queued` row each morning. This file merges the earlier MODELS.md cross-check notes (Nov 19) - no other roster file exists.

**Freshness gate (operator rule, Nov 19):** bench the LATEST refresh of each lineage at slot time; "post-Jul 2026" is a floor, not a target. K3 GA itself was Jul 2026 → the line is already on 3.1, which enters as run 05.

| Run | Model | Lab | Release (verified Nov 19 cross-check) | Slot (PT) | Status | Harness | Struct /100 | Story |
|---|---|---|---|---|---|---|---|---|
| 01 | Kimi K3 (Jul GA) | Moonshot | 2026-07 | baseline | done | 21/21 legacy | 80 | docs/runs/run-01-kimi-k3.md |
| 02 | GLM-5.3 | Z.ai | Aug 10 | Nov 18 (fired 22:10) | done | 7/8 (88%) | 72 | docs/runs/run-02-glm-5.3.md |
| 03 | Qwen3.8-Max | Alibaba | Sep 3 | Nov 19 (fired 03:58, 82 min) | done | 7/8 (88%) | 72 | docs/runs/run-03-qwen3.8-max.md |
| 04 | MiniMax-M3 | MiniMax | Oct 27 | fired Nov 24 07:13, done ~08:18 (~65 min) | done | 8/8 (100%) | 100 (prov.) | docs/runs/run-04-minimax-m3.md |
| 05 | **Kimi K3.1** | Moonshot | current refresh - exact tag verified at slot | Nov 20 05:00 | queued (rerun - Nov 25 slot misfire built K2.7-Code instead; train.sh map-grep fixed) | | | |
| 05+ | **GLM-5.4** | Z.ai | Nov 23 (GLM Coding Plan + Z.ai Chat/ZCode rollout; pay-as-you-go API "soon" pending security assessment; open weights unreleased - per operator screenshot 11-25) | Nov 27 07:05 PT | queued (operator priority, 11-25; provisional number - build order wins at fire) | | | |
| 06 | DeepSeek V4-Flash | DeepSeek | Oct 27 | Nov 21 | queued (unblocked by operator) | | | |
| 07 | MiMo v2.6-Pro | Xiaomi | Sep 27 | Nov 22 | queued | | | |
| 08 | Kimi-K2.7-Code | Moonshot | Jun 11 (pre-K3 specialist control) | Nov 25 05:00 slot (misfire, fired early - see run-08 story) | done | 7/8 (88%) | 64 (prov.) | docs/runs/run-08-kimi-k2.7-code.md |
| 09 | LongCat-2.0 | Meituan | verify at slot (HF listing unconfirmed) | Nov 24 | queued (slot-time check) | | | |
| 10 | Hunyuan hy4-preview | Tencent | verify at slot | Nov 25 | queued | | | |
| 11 | Qwen3.8-27B | Alibaba | Aug 5 (~6.9M DLs) | Nov 26 | queued | | | |
| 12 | omen-alpha | (key listing) | Nov wildcard | Nov 27 | queued | | | |
| 13+ | wildcards: qwen4-max, step-5-preview, Nemotron-550B (availability check), **GLM-5.4 (released Nov 23 - CLOSED: Coding Plan/ZChat only, no API/open weights yet; bench-ready the moment it hits the key listing or zai-org drops weights)**, Dec drops | various | rolling | daily | queued (GLM-5.4 = watch) | | | |

Excluded: GLM-5.3-Vision (tooling mismatch), GLM-Titanium-Preview (too large), Qwen3.8 - no such id, MiniMax-M3-base (no instruct tuning), DeepSeek-R1 (reasoner pre-OS-era) + the retired Nov 18 first-pass model names (superseded by HF re-scan).

Cross-lane build contract (both lanes): rundir `runs/run-<NN>-<slug>/` under the bench runs root, tmux session `openos-run<NN>`, log `run-<NN>-<slug>.log`, state line `<NN> <slug> <rundir>` in the repo-root `.train-state`, model key id from the runs-root `model-ids.map` (not committed). One concurrent build at a time; the train skips if any `openos-run` session is alive.

Corroborating evidence: Hermes' independent crosscheck (Nov 19): K3 10/10 vs GLM 8/10 structural - agrees with Tier-1 ordering (80 vs 72).

Freshness scan: `python3 scripts/scan-roster.py` (weekly, Sundays) writes `docs/roster-scans/<date>.md`; the newest scan wins slot decisions.

Numbering reconciliation (Nov 19, two lanes): the official train state has **Qwen3.8-Max fired 03:58 → run-03** (build order wins). The Hermes lane fired DeepSeek-V4.1-Flash at 04:13 (early vs its Nov 21 slot) and published its story under a run-03 alias. Both artifacts stand; the DeepSeek run carries its crosscheck 7/10 in the board below and awaits Tier-1 click path + operator renumber (likely 04 by fire order, replacing the MiniMax slot, or 06 as scheduled). Not resolved silently in either lane's favor - operator note.
