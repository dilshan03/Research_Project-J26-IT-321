"""
Synthetic Grade 1 item bank for the IMLR probe prototype (HYPOTHETICAL; pending educator review).

Concept: identify which of three collections has the most objects. Items are defined only by their mathematics
(three counts) and a neutral object type; positions and visual arrangement are assigned per form, independently
of the correct answer (see forms.py).

Item-model cells
  pre / transfer : largest 7-9, largest - second = 2, smallest 2..second-1   (same cell -> comparable difficulty)
  teaching       : largest 5-6, gap 2 (smaller numbers, so teaching never previews transfer quantities)
Pre and transfer pools have the same mean largest set (8.0).
"""

from typing import Dict, List, Tuple

FAMILY_ID = "g1_compare_most_proto"
CONCEPT_ID = "compare_quantities_most"
BANK_VERSION = "IMLR-G1-ITEMS-0.1.0-synthetic"
EXPERT_REVIEW = "PENDING"

CELLS: Dict[str, Dict[str, object]] = {
    "max7-9_gap2": {"largest": (7, 9), "gap": 2, "smallestMin": 2, "roles": ("pre", "transfer")},
    "max5-6_gap2": {"largest": (5, 6), "gap": 2, "smallestMin": 2, "roles": ("teaching",)},
}


def _item(item_id: str, role: str, cell: str, counts: Tuple[int, int, int], object_type: str) -> Dict[str, object]:
    return {"itemId": item_id, "role": role, "familyId": FAMILY_ID, "conceptId": CONCEPT_ID, "cell": cell,
            "counts": tuple(sorted(counts, reverse=True)), "objectType": object_type, "expertReview": EXPERT_REVIEW}


ITEMS: List[Dict[str, object]] = [
    # pre-probe pool
    _item("g1p_pre_01", "pre", "max7-9_gap2", (7, 5, 3), "birds"),
    _item("g1p_pre_02", "pre", "max7-9_gap2", (8, 6, 4), "mangoes"),
    _item("g1p_pre_03", "pre", "max7-9_gap2", (9, 7, 5), "leaves"),
    _item("g1p_pre_04", "pre", "max7-9_gap2", (8, 6, 2), "shells"),
    # teaching pool (standardised guided examples; never scored as independent evidence)
    _item("g1p_teach_01", "teaching", "max5-6_gap2", (6, 4, 2), "rabbits"),
    _item("g1p_teach_02", "teaching", "max5-6_gap2", (5, 3, 2), "ducks"),
    _item("g1p_teach_03", "teaching", "max5-6_gap2", (6, 4, 3), "balls"),
    # transfer pool (unseen comparable variants)
    _item("g1p_tr_01", "transfer", "max7-9_gap2", (7, 5, 2), "elephants"),
    _item("g1p_tr_02", "transfer", "max7-9_gap2", (8, 6, 3), "butterflies"),
    _item("g1p_tr_03", "transfer", "max7-9_gap2", (9, 7, 4), "fish"),
    _item("g1p_tr_04", "transfer", "max7-9_gap2", (7, 5, 4), "flowers"),
    _item("g1p_tr_05", "transfer", "max7-9_gap2", (9, 7, 3), "stars"),
    _item("g1p_tr_06", "transfer", "max7-9_gap2", (8, 6, 5), "boats"),
]
BY_ID = {i["itemId"]: i for i in ITEMS}


def pool(role: str) -> List[Dict[str, object]]:
    return [i for i in ITEMS if i["role"] == role]


def validate_bank() -> None:
    """Raises ValueError if any item breaks its cell, or if pools overlap in IDs, quantities or object types."""
    if len(BY_ID) != len(ITEMS):
        raise ValueError("Duplicate item IDs")
    for it in ITEMS:
        cell = CELLS[it["cell"]]
        a, b, c = it["counts"]
        lo, hi = cell["largest"]
        if it["role"] not in cell["roles"]:
            raise ValueError(f"{it['itemId']}: role not allowed in cell {it['cell']}")
        if not (lo <= a <= hi and a - b == cell["gap"] and cell["smallestMin"] <= c < b):
            raise ValueError(f"{it['itemId']}: counts {it['counts']} violate cell {it['cell']}")
    triples = {r: {i["counts"] for i in pool(r)} for r in ("pre", "teaching", "transfer")}
    if triples["pre"] & triples["transfer"] or triples["teaching"] & (triples["pre"] | triples["transfer"]):
        raise ValueError("Quantity triples shared between pools")
    objects = [i["objectType"] for i in ITEMS]
    if len(set(objects)) != len(objects):
        raise ValueError("Object types must be unique across the bank")
