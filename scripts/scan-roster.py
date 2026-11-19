#!/usr/bin/env python3
"""Weekly roster scan: notable open-weight text-gen releases since the K3 baseline.
Writes docs/roster-scans/<date>.md. Criterion: createdAt >= BASELINE (2026-07-01),
downloads >= MIN_DL, org in the major-lab list or the name matches a known family."""
import json, re, sys, urllib.request, datetime, os

BASELINE = "2026-07-01"
MIN_DL = 10000
ORGS = ["deepseek-ai","Qwen","zai-org","mistralai","meta-llama","google","moonshotai",
        "MiniMaxAI","xai-org","openbmb","nvidia","tencent","XiaomiMiMo","Meituan",
        "stepfun-ai","microsoft","internlm"]

def fetch(org):
    url = (f"https://huggingface.co/api/models?author={org}"
           f"&pipeline_tag=text-generation&sort=createdAt&direction=-1&limit=50")
    req = urllib.request.Request(url, headers={"User-Agent": "openos-bench-roster/1"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=20))
    except Exception:
        return []

def base_name(n):
    return re.sub(r"-(AWQ|GPTQ|GGUF|gguf|FP8|fp8|NVFP4|IQ\d\S*|BNB|bnb|MLX|Base|DFlash|DSpark|DFlash)$", "", n)

rows = {}
for org in ORGS:
    for m in fetch(org):
        ca = (m.get("createdAt") or "")[:10]
        if ca >= BASELINE and m.get("downloads", 0) >= MIN_DL:
            b = base_name(m["id"])
            if b not in rows or m["downloads"] > rows[b]["dl"]:
                rows[b] = {"id": m["id"], "ca": ca, "dl": m["downloads"]}

today = datetime.date.today().isoformat()
out = os.path.join(os.path.dirname(__file__), "..", "docs", "roster-scans", today + ".md")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    f.write(f"# Roster scan {today}\n\nCriterion: text-generation weights created on/after {BASELINE} (the K3 baseline month), >= {MIN_DL} downloads.\n\n")
    f.write("| Model | Released | Downloads |\n|---|---|---|\n")
    for r in sorted(rows.values(), key=lambda r: -r["dl"]):
        f.write(f"| {r['id']} | {r['ca']} | {r['dl']:,} |\n")
    f.write("\nNew entries here are candidates for the next free wildcard slot; see MODELS.md for tiering.\n")
print(f"wrote {out} ({len(rows)} models)")
