"""
Deterministic form assignment from a recorded seed.

- Item selection without replacement; items in `previously_seen` are never assigned (unseen transfer guarantee).
- Correct-answer positions: distinct within pre and teaching; the three transfer items use each position exactly
  once, the first transfer position never repeats the last teaching position, and the transfer order never starts
  with the teaching order (no copying the supported item's position).
- Visual arrangement (pattern, spacing, extent mode) is drawn independently of which option is correct.
"""

import hashlib
import json
import random
from typing import Dict, Iterable, List, Optional

from . import item_bank, protocol


class FormAssignmentError(ValueError):
    pass


def _rng(seed: int) -> random.Random:
    # String seeding is deterministic across runs and platforms (hashed internally with SHA-512).
    return random.Random(f"{protocol.PROTOCOL_ID}|{protocol.PROTOCOL_VERSION}|{item_bank.BANK_VERSION}|{seed}")


def _transfer_positions(rng: random.Random, teaching_positions: List[int]) -> List[int]:
    candidates = [[a, b, c] for a in range(3) for b in range(3) for c in range(3) if len({a, b, c}) == 3]
    allowed = [p for p in candidates if p[0] != teaching_positions[-1] and p[:2] != teaching_positions[:2]]
    return rng.choice(allowed)


def _present(item: Dict[str, object], role: str, correct_position: int, rng: random.Random, index: int) -> Dict[str, object]:
    largest, *others = item["counts"]
    rng.shuffle(others)
    counts_by_position: List[Optional[int]] = [None, None, None]
    counts_by_position[correct_position] = largest
    for pos in (p for p in range(3) if p != correct_position):
        counts_by_position[pos] = others.pop()
    options = [{
        "optionId": f"{item['itemId']}_opt{pos}",
        "position": pos,
        "count": counts_by_position[pos],
        # Arrangement is drawn per option without reference to the count or the answer key
        "pattern": rng.choice(protocol.PATTERNS),
        "spacing": rng.choice(protocol.SPACINGS),
    } for pos in range(3)]
    return {
        "presentationIndex": index,
        "role": role,
        "itemId": item["itemId"],
        "familyId": item["familyId"],
        "conceptId": item["conceptId"],
        "cell": item["cell"],
        "objectType": item["objectType"],
        "extentMode": rng.choice(protocol.EXTENT_MODES),
        "options": options,
        "correctPosition": correct_position,          # answer key: server-side only (see client_view)
    }


def assign_form(seed: int, previously_seen: Iterable[str] = ()) -> Dict[str, object]:
    item_bank.validate_bank()
    seen = set(previously_seen)
    rng = _rng(seed)
    chosen: Dict[str, List[Dict[str, object]]] = {}
    for role, n in protocol.PHASES:
        available = [i for i in item_bank.pool(role) if i["itemId"] not in seen]
        if len(available) < n:
            raise FormAssignmentError(f"Not enough unseen {role} items ({len(available)} < {n})")
        chosen[role] = rng.sample(available, n)

    positions = {
        protocol.PRE: rng.sample(range(3), 2),
        protocol.TEACHING: rng.sample(range(3), 2),
    }
    positions[protocol.TRANSFER] = _transfer_positions(rng, positions[protocol.TEACHING])

    items, index = [], 0
    for role, _ in protocol.PHASES:
        for item, pos in zip(chosen[role], positions[role]):
            items.append(_present(item, role, pos, rng, index))
            index += 1

    body = {"protocolId": protocol.PROTOCOL_ID, "protocolVersion": protocol.PROTOCOL_VERSION,
            "itemBankVersion": item_bank.BANK_VERSION, "seed": seed, "items": items}
    digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode("utf-8")).hexdigest()[:12].upper()
    return {"formId": f"{protocol.PROTOCOL_ID}-F{digest}", **body}


def client_view(form: Dict[str, object]) -> Dict[str, object]:
    """What a client may receive: no answer key."""
    return {**form, "items": [{k: v for k, v in it.items() if k != "correctPosition"} for it in form["items"]]}


def items_by_role(form: Dict[str, object], role: str) -> List[Dict[str, object]]:
    return [it for it in form["items"] if it["role"] == role]


def item_lookup(form: Dict[str, object]) -> Dict[str, Dict[str, object]]:
    return {it["itemId"]: it for it in form["items"]}
