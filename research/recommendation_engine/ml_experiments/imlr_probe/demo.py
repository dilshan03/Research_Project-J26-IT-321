"""
CLI demonstration: pre-probe -> teaching -> frozen prediction-time snapshot -> transfer outcome.

    .venv\\Scripts\\python.exe -m imlr_probe.demo                         (from ml_experiments/)
    .venv\\Scripts\\python.exe -m imlr_probe.demo --seed 11 --scenario help_before_transfer_response
    .venv\\Scripts\\python.exe -m imlr_probe.demo --list

All interactions are SYNTHETIC scripted fixtures. Nothing is trained and nothing is a real child.
"""

import argparse
import json
import sys

from . import events as ev
from . import fixtures, forms, protocol
from .outcome import build_research_record, evaluate_transfer
from .snapshot import build_prediction_snapshot, pre_probe_evidence, verify_frozen

POS = {0: "left", 1: "middle", 2: "right"}


def _item_line(it):
    opts = "  ".join(f"[{POS[o['position']]}: {o['count']} {o['pattern']}/{o['spacing']}]" for o in it["options"])
    return f"  {it['presentationIndex']}. {it['role']:<9} {it['itemId']:<13} {it['objectType']:<12} {opts}  extent={it['extentMode']}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="IMLR probe research prototype demo (synthetic fixtures only)")
    parser.add_argument("--seed", type=int, default=7, help="recorded seed for deterministic form assignment")
    parser.add_argument("--scenario", default="all_independent", choices=sorted(fixtures.SCENARIOS))
    parser.add_argument("--list", action="store_true", help="list scenarios")
    parser.add_argument("--json", action="store_true", help="print the research record as JSON")
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if args.list:
        for name, s in sorted(fixtures.SCENARIOS.items()):
            print(f"{name:<32} {s['description']}")
        return 0

    bar = "=" * 96
    form = forms.assign_form(args.seed)
    log = fixtures.scenario(args.scenario, form)
    print(bar)
    print(f"{protocol.PROTOCOL_ID} {protocol.PROTOCOL_VERSION} | {protocol.PROTOCOL_STATUS}")
    print(f"NOTE: {fixtures.SYNTHETIC_NOTICE}")
    print(bar)
    print(f"Form {form['formId']} (seed {form['seed']}); scenario '{args.scenario}': {fixtures.SCENARIOS[args.scenario]['description']}")
    print("Correct positions: " + ", ".join(f"{it['role']}={POS[it['correctPosition']]}" for it in form["items"]))
    for it in form["items"]:
        print(_item_line(it))

    print("\n1) PRE-PROBE (recorded separately)")
    for p in pre_probe_evidence(form, log):
        print(f"  {p['itemId']:<13} correct={p['correctFirstResponse']!s:<5} assistance={p['assistanceStatus']:<15} "
              f"help requests={p['childHelpRequests']} flags={p['flags'] or '-'}")

    window = ev.teaching_window(log)
    print("\n2) TEACHING (every learner; responses here are assisted, never transfer evidence)")
    print(f"  window seq {window['startedSeq']} -> {window['endedSeq']} (closed: {window['closed']})")

    snap = build_prediction_snapshot(form, log)
    print("\n3) FROZEN PREDICTION-TIME SNAPSHOT (events before BOUNDARY_SHOWN only)")
    print(f"  prediction time seq {snap['meta']['predictionTime']['seq']} | events used {snap['meta']['eventsUsed']} | "
          f"sha256 {snap['snapshotSha256'][:20]}... | verified {verify_frozen(snap)}")
    for k, v in snap["features"].items():
        if k == "elpx_pre_transfer":
            v = {x: v.get(x) for x in ("distinctQuestionsAssessed", "correctFirstResponses", "estimatedProficiency",
                                       "provisionalSkillLevel")} if v.get("available") else v
        print(f"  {k:<38} {v}")

    out = evaluate_transfer(form, log)
    print("\n4) TRANSFER OUTCOMES (after prediction time)")
    for i in out["items"]:
        print(f"  {i['itemId']:<13} {i['outcome']:<22} assistance={i['assistanceStatus']:<15} flags={i['flags'] or '-'}")
    print(f"  {out['description']}")
    print(f"  {out['interpretation']}")

    record = build_research_record(snap, out)
    print("\n5) RESEARCH RECORD (inputs and label kept separate; not used for training)")
    print(f"  label status {record['label']['status']} | input snapshot {record['separation']['inputSnapshotSha256'][:20]}... "
          f"| label from events at/after seq {record['separation']['labelFromEventsAtOrAfterSeq']}")
    if args.json:
        print(json.dumps(record, indent=1))

    print("\nNot claimed:")
    for c in protocol.NON_CLAIMS:
        print(f"  - {c}")
    print("Approvals still required:")
    for a in protocol.APPROVALS_REQUIRED:
        print(f"  - {a}")
    print(bar)
    return 0


if __name__ == "__main__":
    sys.exit(main())
