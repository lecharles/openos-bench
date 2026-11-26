# Run 08 - Kimi-K2.7-Code (2026-11-25)

**Model:** Kimi-K2.7-Code (Moonshot, Jun 11) - the pre-K3 specialist control from roster row 08, served via `opencode-go/kimi-k2.7-code`
**Session:** 05:00 → 05:16 PT (~16 minutes wall-clock, one autonomous session, frozen task spec v0, empty scaffold) - fastest build in bench history
**Stack chosen by the model:** Node + Express 4 + Socket.IO 4 backend; vanilla JS frontend, no framework, no build step (~2.4k hand-written JS/CSS/HTML server+frontend)
**Evaluator:** bench lane, Tier-1 instruments per [docs/EVALUATOR.md](../EVALUATOR.md) (neutral `harness.js` + structural `clickpath.js`), re-run fresh on port 3105 on publish morning

## Slot misfire note (attribution honesty)

The Nov 25 05:00 train slot was **Kimi K3.1 (row 05)**. `scripts/train.sh` resolved the map key by unanchored prefix grep: "Kimi K3.1" → `^Kimi` matched `Kimi-K2.7-Code` before `Kimi` in `model-ids.map`, so the worker built with **K2.7-Code**. The overnight commit and the round dir were labeled run-05/K3.1 in error. This page scores what was *actually built*: it publishes as **run 08** (K2.7-Code's own roster row), the artifacts are renamed `run-08-kimi-k2.7-code`, and row 05 (K3.1) stays queued for a clean re-run. The grep is fixed (exact-match-first, `=`-anchored, abort-on-ambiguous). Same incident, better data: the bench now has its Jun-era Moonshot control measured one session deep.

## Score

| Metric | Result | Tier |
|---|---|---|
| **Struct click-path** | **64/100 (provisional)** - green: boot, shell regions, dock app-open, spotlight overlay toggle, 0 page errors; red: window drag no response, no Launchpad frame change, no desktop context menu, spotlight-launch dead, typed text does not survive reload | T1 `(struct)` |
| **Neutral harness (publish re-run)** | **7/8 (88%)** - sole fail `spotlight.overlay-detect`; `apps.window-opens` passed 3/6 unique frames | T1 `(harness)` |
| Neutral harness (overnight sweep, port 31005) | 6/8 (75%) - spotlight fail + window-opens 2/5; retained per diff-note rule, the 3105 re-run is the published number | T1 `(harness)` |
| Boot latency | 4,731 ms; 147 DOM nodes at first paint - the leanest shell on the board | T1 |
| Icon inventory | 38 desktop icons detected | T1 |
| Security (bench-observed) | `/etc/shadow` → 403, `/etc/passwd` → 403, allow-listed paths → 200 (live curl re-check on publish morning) | T1 |
| Model self-suite | STATUS.md claims 15 apps + smoke test; bench frame-hash contradicts 5 of 9 click-path steps - recorded as `self-suite` evidence only (rule 3) | self |
| Human/operator pass | not yet walked | T3 pending |

Provisional 64 excludes agent/VPS-apps (25) and full visual fidelity (15/30) - vision tier pending infra; the label travels with the number.

## Evidence screenshots

Neutral harness captures: boot / spotlight-attempt / dock-click sweep / post-reload in `eval/harness/results/run-08-kimi-k2.7-code/`, click-path step frames `step01..step08` in the same dir. No model-authored gallery this run.

## Worked

- Shell geometry is right on day one: menu bar + dock regions detected, non-blank render, live app-open via dock, and the spotlight overlay *toggle* responds to the chord
- 15 apps claimed and the server-side JSON persistence store is real (window layout survives reload in-harness: 154→154 nodes)
- Path-guard is disciplined for 2.4k LOC: deny on `/etc/*` across verbs, serve only allow-listed roots - matches the best prior runs' posture at a fraction of the code
- Zero page errors across the full click path; 4.7 s boot despite Socket.IO

## Failed / didn't

- **Interaction depth is where 16 minutes went:** window drag doesn't move (frame-identical after drag), Launchpad shows no state change, desktop right-click produces no menu frame, and Spotlight opens but never launches - the overlay is chrome without plumbing
- **Typed-text persistence fails** - input survives window-layout reload but not content; the persistence axis is layout-only
- Harness `spotlight.overlay-detect` fail vs clickpath overlay-toggle pass: the overlay responds on one chord/timing but not under the harness probe - consistent with a fragile key handler, flagged not hand-waved
- STATUS.md overclaims relative to observed behavior (the only genuine 15-app claim on the board that misses 5 click-path steps) - screenshot honesty rule keeps the published score at the instrument, not the self-report

## Verdict vs baseline

64 `(struct)` sits below the K3 baseline (80) and well under M3's 100 - as a *control* that is exactly the informative result: the Jun-11 Moonshot specialist reaches shell geometry + security posture in 16 minutes but loses every interaction-depth step, while K3 (three overnight sessions) and M3 (65 min) clear them. It puts a number on the K2.7→K3 lineage delta (+16 struct points, same lab) and reinforces the board's budget axis: the two fastest builds on the board (16 min here, 65 min M3) bracket the completeness gap. MiniMax-M3 holds the head of the board; this run does not threaten any ranking, it calibrates one.

## Tech stack notes

Express + Socket.IO with a single small hand-rolled frontend is the most compact stack on the board (2.4k LOC vs M3's ~6.5k). The compression bought boot latency and a clean path-guard; it cost interaction physics - drag handlers, Launchpad state, and context menus are present in DOM but non-responsive to real input, the signature of a model that built the skeleton of macOS in the time M3 spent building its nervous system.

## Human pass

Status: queued - async, does not block the leaderboard.
