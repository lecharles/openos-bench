# The Evaluator Agent

**Who:** the OpenOS Bench evaluator - the OpenClaw main lane (Philip) - operating in three tiers. It is not a single LLM; it is a pipeline with a documented instrument at each level. Scores are only ever as strong as the tier that produced them, and every published score names its tier.

## Tier 1 - Structural pass (automated, deterministic) · LIVE

`eval/harness/clickpath.js` - puppeteer walks the click path from `docs/DEMO.md` against any run's URL with zero per-app selectors:

- boot + shell geometry (menu bar / dock regions), icon inventory
- app-open via dock, window drag response, Launchpad, Spotlight (both key chords), spotlight-launch, desktop context menu
- typed-text persistence across reload, page-error count, boot latency
- outputs `evaluator.json`: per-step signals + rubric-axis scores (5/3/1) + **provisional /100 over the measurable axes only** (agent/VPS + full visual fidelity are explicitly excluded at this tier - no pretending)

Runs automatically with the morning train (08:30 PT). This is the instrument that lets the train never block on a human.

## Tier 2 - Vision pass (agent looking at real screenshots) · PENDING INFRA

Computer-use walkthrough: an agent model *views* the captures and grades texture, blur, shadow depth, animation quality, typography - the visual-fidelity 30 and the agent/VPS-apps 25. Two known blockers tracked here honestly: the browser automation tool is broken on this host (snap/Playwright mismatch, since Apr), and the vision model endpoint 400s tonight. When either is fixed, Tier 2 plugs into the same `evaluator.json` schema - it upgrades fields Tier 1 marked `excluded`. Interim: no Tier-2 scores are published; provisional scores carry the label.

## Tier 3 - Operator pass (Carlos) · VOLUNTARY, NEVER A GATE

The 3-minute walkthrough on a live run, scored on the 20-pt click-path sheet + 100-pt rubric. An operator score **always overrides** Tier 1/2 (marked `operator` in the leaderboard). It lands when it lands; the train ships without it.

## Rules

1. Every leaderboard cell carries its tier tag: `(struct)`, `(vision)`, `(operator)`.
2. Provisional scores are never deleted by final scores without a diff note in the story page.
3. No model grades its own homework: model-authored suites are recorded as `self-suite` evidence, never as the leaderboard score.
4. Screenshot honesty: a state is only published as "X view" if the frame demonstrably shows X (frame-hash comparison or vision confirmation). No decorative evidence.
