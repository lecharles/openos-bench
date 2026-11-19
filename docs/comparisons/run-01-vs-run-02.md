# Comparison 01 - Kimi K3 vs GLM-5.3

The first head-to-head. Same frozen task spec ([eval/task-spec.md](../../eval/task-spec.md)), same empty-scaffold starting conditions, same evaluator tiers ([docs/EVALUATOR.md](../EVALUATOR.md)).

## Scoreboard

| Dimension | Kimi K3 (run-01, Jul) | GLM-5.3 (run-02, Nov 18) |
|---|---|---|
| Structural pass /100 | **80** (struct) | **72** (struct) |
| Neutral harness (8 checks) | pending re-run | 7/8 (88%) |
| Operator human pass | 84/100 (operator, provisional) | not yet walked |
| Self-suite (recorded, not leaderboard) | 21/21 legacy probes | 21/21 CDP checks, operator-re-ran |
| Session time | 3 overnight sessions | 1 session, 80 minutes |
| Persistence (typed text across reload) | not captured by probe¹ | false in probe¹ |

¹ *Probe artifact: the generic click path types into whatever text field it finds after a geometry-based dock click; neither run reliably opened a note-taking app from that exact click coordinate. Server-side persistence itself passed targeted tests on both (see each story page). Tier-2 vision pass will fix probe fidelity.*

## Scope delivered

- **K3: 21 apps**, 4 Finder views (icon/list/column/gallery), Launchpad, genie minimize, cosine dock magnification, wallpapers, fs API with rename/trash/statfs, 2 agent GUI panels
- **GLM: 16 apps**, 2+ Finder views, boot animation, self-built test tooling, stricter fs hardening design (realpath-before-allowlist), dark/light themes

## Tech stack chosen (the model's own decision - stack is never mandated)

| | Kimi K3 | GLM-5.3 |
|---|---|---|
| Backend | Node + Express + Socket.IO | Node + Express |
| Frontend | Vanilla JS (script tags, global-ish core) | Vanilla JS **ES modules**, 33 modules, no bundler |
| State | server JSON + socket sync | server JSON store (`os-data/`) |
| Testing | ephemerally run suite (never committed - the benchmark's first sin) | **wrote its own CDP harness + PNG color probe inside the session** |

The architecture contrast is the story: K3 built wider (more apps, more macOS mimicry), GLM built cleaner (module discipline, meta-compliance with the scoring process). One model optimized the artifact; the other optimized the exam. Both are legitimate signals for what "good at building OSes" means - which is exactly why the rubric weights stay frozen while we gather more pairs.

## Evidence galleries

- K3: [`screenshots/run-01-kimi-k3/`](../../screenshots/run-01-kimi-k3/) (11 states) + click-path frames [`eval/harness/results/run-01-kimi-k3/`](../../eval/harness/results/run-01-kimi-k3/)
- GLM: [`screenshots/run-02-glm-5.3/`](../../screenshots/run-02-glm-5.3/) + click-path frames [`eval/harness/results/run-02-glm-5.3/`](../../eval/harness/results/run-02-glm-5.3/)

## Verdict (structural tier)

**K3 leads 80 to 72.** The gap is scope: K3's dock/shell response coverage and app breadth clear more of the deterministic probes. GLM's loss is cheapest to recover (more apps, tighter spotlight wiring), which suggests the newer model's constraint was session budget, not capability - a hypothesis the Qwen3.8-Max run (03) tests directly.
