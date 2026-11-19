# ROADMAP - OpenOS Bench, Nov 19 → Dec 31 2026

**Goal:** a published, daily-cadence open-weight model benchmark with 10+ scored runs, a live leaderboard, and a launch writeup by New Year's Eve.

One run per day, every day. Each morning: the previous night's run is scored, screenshotted, and committed. Every run gets its own story page in `docs/runs/`.

## The bench: models released since the K3 baseline (July 2026)

All available on the operator's inference key; no new accounts needed. DeepSeek is excluded by operator policy.

| Run | Date (overnight build) | Model | Why it's interesting |
|---|---|---|---|
| 01 | done (Jul) | **Kimi K3** | the baseline; 21/21 apps |
| 02 | Nov 19→20 | **GLM-5.3** (Z.ai) | newest flagship GLM; strong GUI/visual reputation |
| 03 | Nov 20→21 | **Qwen3.8-Max** (Alibaba) | the frontier open challenger |
| 04 | Nov 21→22 | **MiniMax-M3** | different lineage, long-context agentic training |
| 05 | Nov 22→23 | **MiMo-v2.5-Pro** (Xiaomi) | newcomer lab, coding-agent optimized |
| 06 | Nov 23→24 | **Kimi-K2.7-Code** | code-specialist control: does specialization survive a whole OS? |
| 07 | Nov 24→25 | **LongCat-2.0** (Meituan) | MoE design outlier |
| 08 | Nov 25→26 | **Hunyuan hy4-preview** (Tencent) | preview-model behavior under a fixed spec |
| 09-11 | Nov 27→29 | **wildcards** | any major release that shipped Nov-Dec (re-scanned at slot time) + first re-run of the day's most surprising result |

## Phase 2: make the numbers real (Nov 30 → Dec 8)

- **Nov 30:** leaderboard v1 frozen format; per-run **token + wall-clock cost telemetry** committed (what each model burned to build an OS - the chart everyone will screenshot)
- **Dec 2:** variance pass: top-3 models get a second run; score spread is reported, not hidden
- **Dec 4:** rubric v2: split "fidelity" vs "functionality" vs "feel" weighting after seeing 8 models fail differently
- **Dec 6:** optional LLM-judge second opinion wired in (human pass stays primary)
- **Dec 8:** mid-bench review with the operator; roster updated for December releases

## Phase 3: publishable artifact (Dec 9 → Dec 26)

- **Dec 9-15:** results mini-site (per-run galleries, score deltas, cost table) so the benchmark is browsable without reading markdown
- **Dec 16-20:** failure-mode analysis: the taxonomy of how open models break on GUI work (the thought-leadership payload)
- **Dec 21-26:** docs polish to full standard: architecture page, adapter contract with a "add your own model" guide, QUICKSTART so anyone can run their own bench

## Phase 4: launch (Dec 27 → Dec 31)

- **Dec 28:** tag **v1.0**; leaderboard final
- **Dec 29-30:** announcement package: article draft, social posts, podcast talking points
- **Dec 31:** everything public. openos-bench = live benchmark, 10+ scored runs, daily evidence trail

## Standing cadence rules

- 1 build nightly (overnight agent session, fixed task spec, session ceiling)
- 1 commit train every morning (score + screenshots + story page) - the git history IS the benchmark's credibility
- E2E harness rebuild is task #1 (Nov 19) - every subsequent run scores itself automatically
- Public hygiene gate before every push: no hosts, IPs, provider identities, names, or secrets in anything public
