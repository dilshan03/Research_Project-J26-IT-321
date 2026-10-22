"""
Run the prototype on synthetic scenarios.

    python -m rule_engine.mq_rec.demo                 # default scenario, text report
    python -m rule_engine.mq_rec.demo --all           # every scenario
    python -m rule_engine.mq_rec.demo S3 --json       # one scenario (by file-name prefix), JSON output

Run from research/recommendation_engine/.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .context import load_context
from .evaluator import evaluate
from .report import to_json, to_text

SCENARIO_DIR = Path(__file__).resolve().parents[2] / "test_scenarios" / "scenarios"
DEFAULT = "S2"


def scenario_files():
    return sorted(SCENARIO_DIR.glob("*.json"))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="MQ-REC v0.1 research prototype")
    parser.add_argument("scenario", nargs="?", default=DEFAULT, help="scenario file-name prefix, e.g. S1")
    parser.add_argument("--all", action="store_true", help="run every scenario")
    parser.add_argument("--json", action="store_true", help="print JSON instead of a text report")
    args = parser.parse_args(argv)

    files = scenario_files() if args.all else [p for p in scenario_files() if p.name.startswith(args.scenario)]
    if not files:
        print(f"No scenario matching {args.scenario!r} in {SCENARIO_DIR}", file=sys.stderr)
        return 1

    # Windows consoles may not default to UTF-8 (Sinhala text)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    for path in files:
        ctx, raw = load_context(path)
        output = evaluate(ctx)
        print(f"\n### Scenario: {path.stem}  ({raw.get('notes', {}).get('description', '')})")
        print(to_json(output) if args.json else to_text(raw, output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
