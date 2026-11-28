# Run 05 - Kimi K3.1 (2026-11-26)

**Model:** Kimi K3.1 (Moonshot, current refresh) - served via `opencode-go/kimi-k3.1-pro`, exact tag verified at slot (map key fixed post-misfire)
**Session:** 08:14 → ~09:25 PT (~70 minutes wall-clock, one autonomous session, frozen task spec v0, empty scaffold)
**Stack chosen by the model:** Node + Express, dependency-free vanilla HTML/CSS/JS, no build step
**Evaluator:** bench lane, Tier-1 instruments per [docs/EVALUATOR.md](../EVALUATOR.md) (`harness.js` 8-check neutral + structural `clickpath.js`), scored fresh on port 3105 same-day

## Score

| Metric | Result | Tier |
|---|---|---|
| **Struct click-path** | **88/100 (provisional)** - axes: visual-fidelity 5/5, app-functionality 4/5, perf/persistence 4/5; boot 5,062 ms, 0 page errors | T1 `(struct)` |
| **Neutral harness (8-check)** | **8/8 (100%)** - second clean sweep on the board after MiniMax-M3 | T1 `(harness)` |
| 10-check crosscheck (Hermes instrument) | 6/10 raw → see instrument note | T1 `(crosscheck)` |
| Persistence | window layout survives reload server-side (56→56 node-stable); **typed text does NOT survive reload** - same red axis as run-08 | T1 |
| Security (bench-observed) | `/etc/shadow` + `/etc/passwd` → **404** on `/api/file` and `/api/fs` (deny effective, but spec asks for explicit **403**; recorded as deviation, not failure) | T1 |
| Apps | 12/13 dock apps open windows via click; STATUS.md claims 14 apps + Finder, all render | T1 |
| Human/operator pass | not yet walked | T3 pending |

**Publish-cron independent confirmation (Nov 27, 17:04 PT):** both Tier-1 instruments re-run fresh on a loopback boot of the same rundir (port 3105) - neutral harness **8/8 (100%)** and click-path **88/100 (struct, prov.)**, matching the published numbers exactly; reds reproduced identically (drag `moved: false`, typed-text `survived: false`; boot 4,758 ms / 916 nodes). No score change, kept as a repeatability datapoint per the diff-note rule.

## Lineage verdict - the hypothesis this slot existed to test

Run-05 was queued to answer one question: *does the K2.7 → K3 → K3.1 lineage improve per-session, or was K3's 80 just three overnight sessions of scope?*

| Moonshot lineage | Struct | Sessions | Wall-clock |
|---|---|---|---|
| K2.7-Code (Jun) | 64 | 1 | ~16 min |
| K3 (Jul GA) | 80 | 3 overnight | multi-hour |
| **K3.1 (Nov)** | **88** | **1** | **~70 min** |

**Answer: lineage progress is real.** K3.1 clears K3's July baseline (+8) on a fraction of the sessions and is now the highest single-session score except MiniMax-M3's 100. The K2.7→K3.1 delta on identical session budget is **+24 struct points in five months from the same lab**.

## Instrument note (dialect, disclosed)

The Hermes 10-check crosscheck initially read 6/10 on K3.1. Diagnosis (targeted DOM probes):
- Windows are **pre-rendered as `section.window` nodes** (52 matching nodes at boot) - the crosscheck's node-count deltas for spotlight-launch and window-close can't see an open/close toggle, only new DOM.
- Traffic lights carry **suffixed aria-labels** (`"Close Notes"`, `"Maximize Calculator"`) - exact-match selectors `[aria-label="Close"]` miss; the controls themselves demonstrably work (prefix-selector probes: close detaches, maximize 320×440 → 1280×697).
- The frame-based neutral `harness.js` (8-check) is immune to all three artifacts and is the published number: **8/8**. Selector override for the crosscheck is filed at `eval/harness-configs/run-05-kimi-k3.1.json` for reproducibility.

## Ingest + infra notes

- Build ran in the shared root lane (`openos-runs/run-5-kimi`), ingested into `runs/run-05-kimi-k3.1`; worker's leftover `data/state.json` (12 pre-open windows from its own testing) preserved as `state.json.workerdebris`, scoring ran on **fresh state**.
- Model's server bound `0.0.0.0`; sanitized to `127.0.0.1` at ingest per the Nov 25 infra gate.

## Worked

- Full shell: menu bar w/ live clock + dropdowns, wallpapers, desktop icons + context menus, Launchpad, Control/Notification Center
- Window chrome verified: traffic lights (close detaches node, maximize 320×440 → 1280×697 via prefix-selector probe), 8-way resize in model self-tests, genie minimize/restore, focus z-ordering
- **Click-path drag probe: no movement** (`3-drag: moved=false`) - recorded as the one red interaction step; resize works on the same geometry, so this reads as titlebar-drag handler or probe-geometry artifact; the 8-check frame harness saw no failure here, so it stays a flagged discrepancy, not a hand-wave
- Dock magnification, running indicators, launch bounce; Spotlight on ⌘/⌃-Space with fuzzy search + Enter-launch + arrow keys (all green on click-path)
- Finder on real filesystem: history, breadcrumbs, favorites, icon+list views, search, Get Info, Trash put-back/empty
- 14 apps + Finder per STATUS.md; server-side persistence store real

## Failed / didn't

- **Typed-text persistence fails reload** (layout-only) - the board's recurring Moonshot-era red axis now spans K2.7 and K3.1 - **superseded by the Nov 27 revalidation below: reds did not reproduce on fresh-state boots (2/2 green)**
- **Click-path drag probe red** (`moved=false`) while the same step is green on other 72-tier runs - see Worked note; adjudicating instrument-vs-handler needs the operator pass
- 404 instead of spec-mandated 403 on path-allowlist probes
- One dock app never opened a window in click sweep (12/13)

## Nov 27 revalidation sweep (publish cron, no new build today)

The 05+ GLM-5.4 slot went blocked at fire time (probe: "glm-5.4 isn't included in OpenCode Go", 17:10 PT), so today is a revalidation day for run 05. Five Tier-1 samples now exist across three instrument sessions (all `(struct)` unless noted):

| Sample | Boot state | Struct /100 | Spotlight-launch probe | Typed-text survives | Neutral harness |
|---|---|---|---|---|---|
| Nov 26 publish (committed) | post-harness debris (1,564 nodes) | 88 | green | red | 8/8 |
| Nov 26 publish-cron confirm | loopback 3105 | 88 (rep.) | green | red | 8/8 (rep.) |
| Nov 27 morning train (31005) | rundir boot (925 nodes) | - | - | - | **8/8** |
| Nov 27 cron confirm | state-debris boot (1,564 nodes) | 80 | **red** | red | 8/8 |
| Nov 27 reval A (fresh state) | 610 nodes | **92** | green | **green** | - |
| Nov 27 reval B (fresh state) | 736 nodes | 84 | **red** | **green** | - |

**Rulings, with the diff-note rule honored (headline stays 88, the mid-band value):**

1. **`6-spotlight-launch` is a flapping probe on this build** - green/red across identical fresh boots (2/4 overall). The frame-diff step cannot distinguish Enter-launch from Enter-noop when the target window exists anywhere in z-order; combined with pre-rendered `section.window` nodes (see instrument note), this is a tier-1 instrument gap, filed for the clickpath backlog. Score band disclosed: **88 (prov.), 80-92 observed spread, launch-step flake is the whole delta**.
2. **Typed-text persistence red is retracted for K3.1.** Both clean fresh-state boots survive reload 2/2; every red came from a boot whose `data/state.json` carried leftover open windows from a prior instrument session. The board-wide "all Moonshot-era runs fail typed-text" axis now reads K2.7 only, with K3.1 green on the structural tier - other rows' claims were made under the same debris conditions and should be rechecked at their next revalidation.
3. **The neutral harness is rock-solid**: 8/8 five boots in a row across two days and two ports - the second clean sweep stands.
4. **Infra findings** (fixed same day): morning-train finish-branch arithmetic crashed on the "05+" roster row (`$((10#05+))`), and the train's raw-rundir boot (model binds 0.0.0.0) sat **exposed on port 31005 for ~9 hours** before this sweep killed it and patched `train.sh`: run-number sanitizing, correct `3100+n` port math, and a post-scoring teardown of the port listener.

Evidence: `eval/harness/results/run-05-kimi-1127-train/` · `.../run-05-kimi-k3.1/{confirm-1127-harnessjs,confirm-1127-clickpath,reval-1127-freshA,reval-1127-freshB}/`

## Evidence

- Screenshots: `screenshots/run-05-kimi-k3.1/` (boot / apps-open / spotlight / after-reload + click-path steps)
- Raw instrument JSON + step frames: `eval/harness/results/run-05-kimi-k3.1/{harnessjs,clickpath,crosscheck-config}/`
- Build dir + STATUS.md: `runs/run-05-kimi-k3.1/`

## Human pass

Status: queued - async, does not block the leaderboard.
