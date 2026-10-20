"""
Runs a unittest suite and prints a JSON summary (used by export_snapshot in a separate process, so
each suite imports its own packages from its own directory).

    python -m research_export.run_tests <start_dir> <top_level_dir>
"""

import json
import sys
import unittest


class _Recorder(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.outcomes = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.outcomes.append((test.id(), "passed"))

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.outcomes.append((test.id(), "failed"))

    def addError(self, test, err):
        super().addError(test, err)
        self.outcomes.append((test.id(), "error"))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.outcomes.append((test.id(), "skipped"))


def main(start_dir: str, top_dir: str) -> int:
    sys.path.insert(0, top_dir)
    suite = unittest.defaultTestLoader.discover(start_dir, top_level_dir=top_dir)
    with open(sys.stderr.fileno(), "w", closefd=False) as stream:
        result = unittest.TextTestRunner(stream=stream, resultclass=_Recorder, verbosity=0).run(suite)
    print(json.dumps({
        "testsRun": result.testsRun,
        "passed": sum(1 for _, o in result.outcomes if o == "passed"),
        "failed": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        # Test names only (module.Class.test_name); no messages or tracebacks, which can contain local paths
        "results": [{"test": t.split(".", 1)[-1], "outcome": o} for t, o in result.outcomes],
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
