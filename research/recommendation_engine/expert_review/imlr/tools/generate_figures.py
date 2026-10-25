"""
Generate the review-package illustrations from the ACTUAL IMLR prototype definitions (no hand-drawn data).

    cd research/recommendation_engine/ml_experiments
    .venv\\Scripts\\python.exe ..\\expert_review\\imlr\\tools\\generate_figures.py

Writes SVG files to ../figures/:
  item_Q<n>_<itemId>.svg   the 7 questions of the demonstration form (seed 7), with the answer key marked
  child_Q<n>_<itemId>.svg  the same questions WITHOUT the answer key (as a child would see them)
  density_A<n>_*.svg       alternative layouts of one transfer item for the visual-density review
  figures_manifest.json    which form/seed/item-bank version the figures came from

Renderings approximate the prototype's layout descriptors (pattern, spacing, extent mode). They are review
illustrations, not the final child interface. Standard library only.
"""

import hashlib
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "figures"
ML_ROOT = HERE.parents[2] / "ml_experiments"
sys.path.insert(0, str(ML_ROOT))

from imlr_probe import forms, item_bank, protocol  # noqa: E402

SEED = 7  # same seed as the admin IMLR Prototype Demo
SYMBOL = {"birds": "🐦", "mangoes": "🥭", "leaves": "🍃", "shells": "🐚", "rabbits": "🐇", "ducks": "🦆",
          "balls": "⚽", "elephants": "🐘", "butterflies": "🦋", "fish": "🐟", "flowers": "🌸", "stars": "⭐",
          "boats": "⛵"}
GAP = {"tight": 4, "medium": 10, "wide": 18}
BOX_W, BOX_H, PAD, OBJ = 170, 150, 14, 22
POS = ["Left", "Middle", "Right"]


def _jitter(seed: str, i: int):
    h = int(hashlib.sha256(f"{seed}:{i}".encode()).hexdigest()[:8], 16)
    return (h % 13) - 6, ((h >> 4) % 13) - 6


def _positions(count: int, pattern: str, spacing: str, extent: str, seed: str):
    """Object centre points inside a box (box-local coordinates)."""
    inner_w, inner_h = BOX_W - 2 * PAD, BOX_H - 2 * PAD - 26
    cols = 3 if pattern == "grid" else min(count, 5)
    rows = math.ceil(count / cols)
    if extent == "equal_extent":                      # every group fills the same area
        dx = inner_w / max(cols, 1)
        dy = inner_h / max(rows, 1)
        pts = [(PAD + dx * (i % cols) + dx / 2, PAD + dy * (i // cols) + dy / 2) for i in range(count)]
    else:                                             # equal gaps between objects, group centred
        step = OBJ + GAP[spacing]
        w, h = cols * step, rows * step
        x0, y0 = PAD + (inner_w - w) / 2, PAD + (inner_h - h) / 2
        pts = [(x0 + step * (i % cols) + step / 2, y0 + step * (i // cols) + step / 2) for i in range(count)]
    if pattern == "scatter":
        pts = [(x + _jitter(seed, i)[0], y + _jitter(seed, i)[1]) for i, (x, y) in enumerate(pts)]
    return pts


def _box(x0: float, option: dict, item: dict, show_key: bool, symbol_size: float = OBJ, points=None) -> str:
    correct = show_key and option["position"] == item["correctPosition"]
    stroke, width, fill = ("#047857", 4, "#ecfdf5") if correct else ("#94a3b8", 2, "#f8fafc")
    parts = [f'<rect x="{x0}" y="10" width="{BOX_W}" height="{BOX_H}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>']
    pts = points or _positions(option["count"], option["pattern"], option["spacing"], item["extentMode"], f"{item['itemId']}-{option['position']}")
    sym = SYMBOL.get(item["objectType"], "●")
    for (x, y), size in zip(pts, [symbol_size] * len(pts) if not isinstance(symbol_size, list) else symbol_size):
        parts.append(f'<text x="{x0 + x:.1f}" y="{10 + y:.1f}" font-size="{size:.1f}" text-anchor="middle" dominant-baseline="central">{sym}</text>')
    label = f'{POS[option["position"]]}'
    if show_key:
        label += f' · {option["count"]} · {option["pattern"]}/{option["spacing"]}'
    parts.append(f'<text x="{x0 + BOX_W / 2}" y="{10 + BOX_H - 10}" font-size="11" text-anchor="middle" fill="#334155" font-family="sans-serif">{label}</text>')
    if correct:
        parts.append(f'<text x="{x0 + BOX_W - 8}" y="26" font-size="10" text-anchor="end" fill="#047857" font-weight="bold" font-family="sans-serif">MOST (key)</text>')
    return "".join(parts)


def _svg(body: str, title: str, width: int, height: int) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img">'
            f'<title>{title}</title><rect width="100%" height="100%" fill="#ffffff"/>{body}</svg>\n')


def item_svg(item: dict, show_key: bool) -> str:
    opts = sorted(item["options"], key=lambda o: o["position"])
    caption = (f'Q{item["presentationIndex"] + 1} · {item["role"]} · {item["itemId"]} · {item["objectType"]} · '
               f'layout: {item["extentMode"]} · DRAFT, NOT VALIDATED')
    body = "".join(_box(10 + i * (BOX_W + 12), o, item, show_key) for i, o in enumerate(opts))
    body += f'<text x="10" y="{BOX_H + 30}" font-size="11" fill="#475569" font-family="sans-serif">{caption}</text>'
    return _svg(body, caption, 3 * BOX_W + 2 * 12 + 20, BOX_H + 42)


def density_variants(item: dict) -> dict:
    """Alternative layouts of one item for the visual-density review (illustrations only)."""
    opts = sorted(item["options"], key=lambda o: o["position"])
    out = {}

    def row(title, boxes):
        body = "".join(boxes) + f'<text x="10" y="{BOX_H + 30}" font-size="11" fill="#475569" font-family="sans-serif">{title}</text>'
        return _svg(body, title, 3 * BOX_W + 44, BOX_H + 42)

    xs = [10 + i * (BOX_W + 12) for i in range(3)]
    # A1: every group fills the same area -> larger groups look denser (density cue)
    it = {**item, "extentMode": "equal_extent"}
    boxes = [_box(x, {**o, "pattern": "grid", "spacing": "medium"}, it, True) for x, o in zip(xs, opts)]
    out["density_A1_equal_extent"] = row("A1: equal extent, current prototype mode (larger group looks denser) · DRAFT", boxes)
    # A2: equal gaps between objects -> larger groups take more space (length/area cue)
    it = {**item, "extentMode": "equal_spacing"}
    boxes = [_box(x, {**o, "pattern": "row", "spacing": "tight"}, it, True) for x, o in zip(xs, opts)]
    out["density_A2_equal_spacing"] = row("A2: equal spacing, current prototype mode (larger group takes more space) · DRAFT", boxes)

    # A3: ten-frame style (2 x 5 slots); every group occupies the same frame, count shown by filled slots
    boxes = []
    for x, o in zip(xs, opts):
        slots = "".join(f'<rect x="{x + 18 + (i % 5) * 27}" y="{40 + (i // 5) * 40}" width="25" height="36" rx="4" fill="none" stroke="#cbd5e1"/>' for i in range(10))
        pts = [(18 + (i % 5) * 27 + 12.5, 30 + (i // 5) * 40 + 18) for i in range(o["count"])]
        boxes.append(_box(x, {**o, "pattern": "ten-frame", "spacing": "fixed"}, item, True, points=pts)
                     .replace('"/>', '"/>' + slots, 1))
    out["density_A3_ten_frame"] = row("A3: ten-frame (fixed 2 x 5 frame; same size and extent for every group) · DRAFT", boxes)

    # A4: matched total object area (larger groups use smaller objects) - size now conflicts with number
    total_area = (OBJ ** 2) * opts[0]["count"]
    boxes = []
    for x, o in zip(xs, opts):
        size = math.sqrt(total_area / max(o["count"], 1)) * 0.75
        pts = _positions(o["count"], "grid", "medium", "equal_extent", "a4")
        boxes.append(_box(x, {**o, "pattern": "matched-area", "spacing": "spread"}, item, True,
                          symbol_size=[size] * o["count"], points=pts))
    out["density_A4_matched_total_area"] = row("A4: matched total object area (bigger groups use smaller objects) · DRAFT", boxes)
    return out


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    form = forms.assign_form(SEED)
    written = []
    for it in form["items"]:
        for prefix, key in (("item", True), ("child", False)):
            name = f"{prefix}_Q{it['presentationIndex'] + 1}_{it['itemId']}.svg"
            (OUT / name).write_text(item_svg(it, key), encoding="utf-8")
            written.append(name)
    sample = next(i for i in form["items"] if i["itemId"] == "g1p_tr_02") if any(
        i["itemId"] == "g1p_tr_02" for i in form["items"]) else forms.items_by_role(form, protocol.TRANSFER)[0]
    for name, svg in density_variants(sample).items():
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
        written.append(f"{name}.svg")
    manifest = {"generatedFrom": "research/recommendation_engine/ml_experiments/imlr_probe",
                "protocol": f"{protocol.PROTOCOL_ID} {protocol.PROTOCOL_VERSION}", "status": protocol.PROTOCOL_STATUS,
                "itemBankVersion": item_bank.BANK_VERSION, "formId": form["formId"], "seed": SEED,
                "densitySampleItem": sample["itemId"], "files": sorted(written)}
    (OUT / "figures_manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"{len(written)} figures written to {OUT} (form {form['formId']}, seed {SEED})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
