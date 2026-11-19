#!/usr/bin/env python3
"""
# Independent second-opinion harness (python/playwright). Official
# instrument: eval/harness/clickpath.js (tier 1 per docs/EVALUATOR.md);
# when the two disagree, both numbers ship and the delta is noted.
OpenOS Bench - neutral cross-build harness v1.

Usage: python3 scripts/bench.py <base_url> <out_dir>
Scores any build against the frozen task spec with identical probes:
renders apps, runs interaction probes, persistence, security. No build
gets custom tooling credit in these numbers - this is the yardstick.
"""
import sys, os, json, time, urllib.request
from playwright.sync_api import sync_playwright

def find_chromium():
    import glob
    env = os.environ.get("CHROMIUM_PATH")
    if env and os.path.exists(env): return env
    import shutil
    for c in ("chromium", "chromium-browser", "google-chrome"):
        if shutil.which(c): return shutil.which(c)
    hits = sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome")), reverse=True)
    return hits[0] if hits else "chromium"
EXE = find_chromium()
base, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
CFG = {"app": '[title="{app}"], [aria-label="{app}"], [data-app="{app_l}"]',
       "overlay_input": '[class*="spotlight" i] input, input[class*="search" i], #spotlight-input',
       "close": '[title="Close"], [aria-label="Close"]',
       "maximize": '[title="Maximize"], [aria-label="Maximize"], [aria-label="Zoom"]',
       "restore": '[title="Restore"], [aria-label="Restore"]',
       "windows": '[class*="window"]:not([class*="window-body"]):not([class*="win-title"])'}
if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
    CFG.update(json.load(open(sys.argv[3])))

def sel(s, app):
    return s.format(app=app, app_l=app.lower())

rep = {"base": base, "ts": time.strftime("%Y-%m-%d %H:%M:%S %Z"), "probes": {}, "notes": []}


def sclick(pg, sel, timeout=2500):
    """click via locator (auto-retries against detached DOM)."""
    try:
        pg.locator(sel).first.click(timeout=timeout)
        return True
    except Exception:
        return False

    try:
        pg.locator(sel).first.click(timeout=timeout)
        return True
    except Exception:
        return False

def probe(name, ok, detail=""):
    rep["probes"][name] = {"pass": bool(ok), "detail": detail}

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=EXE, headless=True, args=["--no-sandbox"])
    pg = br.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(base + "/", wait_until="networkidle")
    pg.wait_for_timeout(2200)
    shot = os.path.join(out, "boot.png")
    pg.screenshot(path=shot)
    from PIL import Image
    cols = len(set(Image.open(shot).convert("RGB").resize((240, 150)).getdata()))
    probe("boot-paint", cols > 500, f"{cols} distinct colors")

    def close_all():
        for _ in range(60):
            if not sclick(pg, CFG["close"], 1200): break
            pg.wait_for_timeout(110)

    def wins():
        return pg.evaluate("(s) => document.querySelectorAll(s).length", CFG["windows"])

    close_all()
    # dock enumeration + app render
    titles = sorted({(el.get_attribute("title") or el.get_attribute("aria-label") or el.get_attribute("data-app") or "") for el in pg.query_selector_all('[title],[aria-label],[data-app]')})
    titles = [t for t in titles if t]
    app_like = [t for t in titles if t in {
        "Finder", "Notes", "Calendar", "Mail", "Weather", "Calculator", "Preview", "Terminal",
        "Clock", "Contacts", "Music", "Photos", "Reminders", "Settings", "System Settings", "Trash",
        "Text Editor", "Messages"}]
    opened = 0
    for t in app_like:
        w0 = wins()
        if sclick(pg, sel(CFG["app"], t)):
            pg.wait_for_timeout(900)
            if wins() > w0: opened += 1
    probe("apps-render", opened >= 12, f"{opened}/{len(app_like)} dock apps opened windows")
    rep["notes"].append(f"clickable app titles: {app_like}")
    pg.screenshot(path=os.path.join(out, "apps-open.png"))

    # spotlight
    pg.keyboard.press("Meta+Space"); pg.wait_for_timeout(700)
    vis = pg.evaluate("(s) => !!document.querySelector(s.split(',').map(x=>x.trim()).join(','))", CFG["overlay_input"])
    probe("spotlight-open", vis)
    if vis:
        pg.keyboard.type("Notes", delay=35); pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(out, "spotlight.png"))
        # close everything first so a launch is unambiguous
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        for _ in range(40):
            if not sclick(pg, CFG["close"], 1500): break
            pg.wait_for_timeout(120)
        n0 = wins()
        pg.keyboard.press("Meta+Space"); pg.wait_for_timeout(600)
        pg.keyboard.type("Notes", delay=35); pg.keyboard.press("Enter"); pg.wait_for_timeout(1200)
        probe("spotlight-launch", wins() > n0, f"{n0} -> {wins()} after Enter on search")
    else:
        probe("spotlight-launch", False, "no overlay")
        pg.keyboard.press("Escape")
    w = pg.query_selector(CFG["windows"])
    if w:
        box = w.bounding_box()
        if box:
            x, y = box["x"] + box["width"] / 2, box["y"] + 12
            pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 140, y + 90, steps=8); pg.mouse.up()
            pg.wait_for_timeout(600)
            try:
                box2 = w.bounding_box()
            except Exception:
                box2 = None
            if box2:
                probe("window-drag", abs(box2["x"] - box["x"]) > 50 or abs(box2["y"] - box["y"]) > 30)
            else:
                probe("window-drag", False, "window handle detached")
            c = pg.query_selector('[title="Maximize"]')
            if c:
                s0 = box["width"] * box["height"]; c.click(); pg.wait_for_timeout(900)
                b3 = w.bounding_box()
                probe("window-maximize", b3 and b3["width"] * b3["height"] > s0 * 1.5)
                if b3: c.click(); pg.wait_for_timeout(600)
            else:
                probe("window-maximize", False, "no maximize control")
            w0 = wins()
            if sclick(pg, CFG["close"]):
                pg.wait_for_timeout(800)
                probe("window-close", wins() < w0)
            else:
                probe("window-close", False, "no close control")
    else:
        for k in ("window-drag", "window-maximize", "window-close"): probe(k, False, "no window")

    # persistence across reload (re-open two known apps first)
    for t in ("Finder", "Notes"):
        if sclick(pg, sel(CFG["app"], t)): pg.wait_for_timeout(700)
    before = wins()
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(2200)
    after = wins()
    probe("persist-layout", before > 0 and after >= max(1, before - 1), f"{before} -> {after} windows")
    pg.screenshot(path=os.path.join(out, "after-reload.png"))
    br.close()

# security (server-side, no browser needed)
def fetch(path):
    try:
        with urllib.request.urlopen(base + path, timeout=8) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
    except Exception: return 0

for name, qs in {
    "sec-shadow": ["/api/fs?path=/etc/shadow", "/api/read?path=/etc/shadow", "/api/list?path=/etc/shadow", "/api/file?path=/etc/shadow"],
    "sec-traversal": ["/api/list?path=../../etc", "/api/read?path=../../../etc/passwd"],
}.items():
    codes = [fetch(q) for q in qs]
    leaked = [c for c in codes if c == 200]
    probe(name, not leaked, f"codes={codes}")

json.dump(rep, open(os.path.join(out, "harness-report.json"), "w"), indent=1)
ok = sum(1 for v in rep["probes"].values() if v["pass"])
print(f"HARNESS {base}: {ok}/{len(rep['probes'])} probes pass")
for k, v in rep["probes"].items(): print(f"  {'PASS' if v['pass'] else 'fail'} {k}: {v['detail']}")
