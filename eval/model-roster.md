# Model Roster - the bench, organized

One row per model. Status: `done` (scored + published), `building`, `queued`, `blocked`. Scores filled by the neutral harness (`eval/harness/`) + human pass. This file is the single source of truth for "what's next" - `scripts/train.sh` reads the first `queued` row each morning.

| Run | Model | Lab | Release window | Slot | Status | Harness % | Human /100 | Story page |
|---|---|---|---|---|---|---|---|---|
| 01 | Kimi K3 | Moonshot | Jul 2026 (baseline) | done | done | 21/21 (legacy suite) | pending | docs/runs/run-01-kimi-k3.md |
| 02 | GLM-5.3 | Z.ai | post-Jul 2026 | Nov 18 | done | pending re-score | pending | docs/runs/run-02-glm-5.3.md |
| 03 | Qwen3.8-Max | Alibaba | post-Jul 2026 | Nov 19 | building | | | |
| 04 | MiniMax-M3 | MiniMax | post-Jul 2026 | Nov 20 | queued | | | |
| 05 | DeepSeek V4-Flash | DeepSeek | most-downloaded release since Jul | Nov 21 | queued (unblocked by operator Nov 19) | | | |
| 06 | MiMo-v2.5-Pro | Xiaomi | post-Jul 2026 | Nov 22 | queued | | | |
| 07 | Kimi-K2.7-Code | Moonshot | post-Jul 2026 (specialist control) | Nov 23 | queued | | | |
| 08 | LongCat-2.0 | Meituan | post-Jul 2026 | Nov 24 | queued | | | |
| 09 | Hunyuan hy4-preview | Tencent | post-Jul 2026 | Nov 25 | queued | | | |
| 10 | Qwen3.8-27B | Alibaba | post-Jul 2026 (top OSS download) | Nov 26 | queued | | | |
| 11 | omen-alpha | (key listing) | Nov 2026 wildcard | Nov 27 | queued | | | |
| 12+ | wildcards: qwen4-max, step-5-preview, + Dec drops | various | rolling | daily slots | queued | | | |

Notes:
- Release-window verification happens at slot time (web check); if a listed model predates July it gets swapped for the newest comparable release and the row records why.
- DeepSeek was excluded Sep 12; operator lifted the exclusion Nov 19 04:04 PT for this bench. If endpoint region-blocks at run time, row flips to `blocked (reason)` and the next queued model moves up.
- Every `done` row must link a story page with: scorecard, evidence gallery, worked/failed split, verdict vs baseline.
