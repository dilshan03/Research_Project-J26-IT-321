"""
Tests for the isolated IMLR probe prototype (standard library unittest).

    .venv\\Scripts\\python.exe -m unittest tests.test_imlr_probe -v        (from ml_experiments/)

All interaction data are SYNTHETIC scripted fixtures; no model is trained.
"""

import copy
import io
import json
import unittest
from collections import Counter
from contextlib import redirect_stdout
from pathlib import Path

from imlr_probe import demo, fixtures, forms, item_bank, protocol
from imlr_probe import events as ev
from imlr_probe import outcome as oc
from imlr_probe.snapshot import (FEATURE_ALLOWLIST, LeakageError, SnapshotError, assert_no_leakage,
                                 build_prediction_snapshot, verify_frozen)

SEEDS = range(3000)
FORMS = [forms.assign_form(s) for s in SEEDS]


def role_items(form, role):
    return forms.items_by_role(form, role)


class TestItemBank(unittest.TestCase):
    def test_bank_is_valid(self):
        item_bank.validate_bank()

    def test_pre_and_transfer_share_a_cell_with_equal_mean_difficulty(self):
        pre, tr = item_bank.pool("pre"), item_bank.pool("transfer")
        self.assertEqual({i["cell"] for i in pre}, {i["cell"] for i in tr})
        mean = lambda xs: sum(i["counts"][0] for i in xs) / len(xs)
        self.assertAlmostEqual(mean(pre), mean(tr))

    def test_teaching_never_previews_transfer_quantities_or_objects(self):
        teach, tr = item_bank.pool("teaching"), item_bank.pool("transfer")
        self.assertFalse({i["counts"] for i in teach} & {i["counts"] for i in tr})
        self.assertFalse({i["objectType"] for i in teach} & {i["objectType"] for i in tr})

    def test_all_items_pending_expert_review(self):
        self.assertTrue(all(i["expertReview"] == "PENDING" for i in item_bank.ITEMS))


class TestFormAssignment(unittest.TestCase):
    def test_same_seed_gives_identical_form(self):
        self.assertEqual(forms.assign_form(42), forms.assign_form(42))
        self.assertEqual(json.dumps(forms.assign_form(42), sort_keys=True), json.dumps(FORMS[42], sort_keys=True))

    def test_seed_and_form_id_are_recorded_and_vary(self):
        self.assertEqual(FORMS[5]["seed"], 5)
        self.assertGreater(len({f["formId"] for f in FORMS}), 500)

    def test_phase_structure_and_universal_teaching(self):
        for f in FORMS[:200]:
            self.assertEqual([it["role"] for it in f["items"]], ["pre"] * 2 + ["teaching"] * 2 + ["transfer"] * 3)

    def test_largest_count_is_always_at_the_recorded_position(self):
        for f in FORMS[:500]:
            for it in f["items"]:
                counts = [o["count"] for o in it["options"]]
                self.assertEqual(counts.index(max(counts)), it["correctPosition"])
                self.assertEqual(len(set(counts)), 3)

    def test_client_view_has_no_answer_key(self):
        self.assertNotIn("correctPosition", json.dumps(forms.client_view(FORMS[0])))


class TestBalancedPositions(unittest.TestCase):
    def test_transfer_positions_use_each_position_exactly_once(self):
        for f in FORMS:
            self.assertEqual(sorted(it["correctPosition"] for it in role_items(f, "transfer")), [0, 1, 2])

    def test_positions_within_pre_and_teaching_are_distinct(self):
        for f in FORMS:
            for role in ("pre", "teaching"):
                pos = [it["correctPosition"] for it in role_items(f, role)]
                self.assertEqual(len(set(pos)), len(pos))

    def test_correct_positions_are_balanced_across_forms(self):
        for role in ("pre", "teaching", "transfer"):
            for idx in range(len(role_items(FORMS[0], role))):
                freq = Counter(role_items(f, role)[idx]["correctPosition"] for f in FORMS)
                for pos in range(3):
                    self.assertAlmostEqual(freq[pos] / len(FORMS), 1 / 3, delta=0.04, msg=f"{role}[{idx}] pos {pos}")

    def test_transfer_never_copies_the_supported_items_position(self):
        for f in FORMS:
            teach = [it["correctPosition"] for it in role_items(f, "teaching")]
            tr = [it["correctPosition"] for it in role_items(f, "transfer")]
            self.assertNotEqual(tr[0], teach[-1])
            self.assertNotEqual(tr[:2], teach)


class TestArrangementIndependence(unittest.TestCase):
    """Visual arrangement must not signal the answer: the correct option looks like any other option."""

    def _options(self):
        correct, other = [], []
        for f in FORMS:
            for it in f["items"]:
                for o in it["options"]:
                    (correct if o["position"] == it["correctPosition"] else other).append(o)
        return correct, other

    def test_pattern_and_spacing_distributions_match_for_correct_and_other_options(self):
        correct, other = self._options()
        for attr, values in (("pattern", protocol.PATTERNS), ("spacing", protocol.SPACINGS)):
            c, o = Counter(x[attr] for x in correct), Counter(x[attr] for x in other)
            for v in values:
                self.assertAlmostEqual(c[v] / len(correct), o[v] / len(other), delta=0.02, msg=f"{attr}={v}")

    def test_correct_option_is_not_systematically_the_widest_or_tightest(self):
        rank = {"tight": 0, "medium": 1, "wide": 2}
        widest = tightest = total = 0
        for f in FORMS:
            for it in f["items"]:
                spacings = [rank[o["spacing"]] for o in it["options"]]
                c = spacings[it["correctPosition"]]
                if len(set(spacings)) == 3:
                    total += 1
                    widest += c == max(spacings)
                    tightest += c == min(spacings)
        self.assertAlmostEqual(widest / total, 1 / 3, delta=0.04)
        self.assertAlmostEqual(tightest / total, 1 / 3, delta=0.04)

    def test_extent_mode_is_independent_of_correct_position(self):
        for pos in range(3):
            its = [it for f in FORMS for it in f["items"] if it["correctPosition"] == pos]
            share = sum(it["extentMode"] == "equal_extent" for it in its) / len(its)
            self.assertAlmostEqual(share, 0.5, delta=0.04)


class TestUnseenItems(unittest.TestCase):
    def test_no_item_repeats_within_a_form(self):
        for f in FORMS:
            ids = [it["itemId"] for it in f["items"]]
            self.assertEqual(len(ids), len(set(ids)))

    def test_previously_seen_items_are_never_assigned(self):
        seen = [it["itemId"] for it in role_items(FORMS[3], "transfer")]
        for s in range(200):
            assigned = {it["itemId"] for it in forms.assign_form(s, previously_seen=seen)["items"]}
            self.assertFalse(assigned & set(seen))

    def test_assignment_refuses_when_unseen_pool_is_exhausted(self):
        seen = [i["itemId"] for i in item_bank.pool("transfer")][:4]
        with self.assertRaises(forms.FormAssignmentError):
            forms.assign_form(1, previously_seen=seen)

    def test_previously_seen_transfer_item_is_not_counted_as_independent(self):
        f = FORMS[9]
        out = oc.evaluate_transfer(f, fixtures.scenario("all_independent", f),
                                   previously_seen=[role_items(f, "transfer")[0]["itemId"]])
        self.assertEqual(out["items"][0]["outcome"], oc.ASSISTANCE_UNKNOWN)
        self.assertIn("ITEM_PREVIOUSLY_SEEN", out["items"][0]["flags"])


class TestAssistanceStatus(unittest.TestCase):
    def setUp(self):
        self.form = FORMS[11]

    def outcomes(self, name):
        return [i["outcome"] for i in oc.evaluate_transfer(self.form, fixtures.scenario(name, self.form))["items"]]

    def test_explicit_independent_and_helped_outcomes(self):
        self.assertEqual(self.outcomes("all_independent"),
                         [oc.INDEPENDENT_CORRECT, oc.INDEPENDENT_INCORRECT, oc.INDEPENDENT_CORRECT])
        self.assertEqual(self.outcomes("help_before_transfer_response")[1], oc.HELPED)

    def test_help_after_first_response_keeps_first_response_independent(self):
        out = oc.evaluate_transfer(self.form, fixtures.scenario("help_after_transfer_response", self.form))
        self.assertEqual(out["items"][0]["outcome"], oc.INDEPENDENT_INCORRECT)
        self.assertIn(ev.FLAG_HELP_AFTER_FIRST_RESPONSE, out["items"][0]["flags"])

    def test_missing_or_incomplete_assistance_record_is_unknown_not_unassisted(self):
        out = oc.evaluate_transfer(self.form, fixtures.scenario("missing_assistance_record", self.form))
        self.assertEqual([i["outcome"] for i in out["items"]], [oc.INDEPENDENT_CORRECT, oc.ASSISTANCE_UNKNOWN, oc.ASSISTANCE_UNKNOWN])
        self.assertIn(ev.FLAG_RECORDING_INCOMPLETE, out["items"][1]["flags"])
        self.assertIn(ev.FLAG_RECORDING_MISSING, out["items"][2]["flags"])

    def test_record_without_assistance_field_is_unknown(self):
        log = fixtures.scenario("all_independent", self.form)
        tr0 = role_items(self.form, "transfer")[0]["itemId"]
        for e in log:
            if e["type"] == ev.ITEM_ENDED and e["itemId"] == tr0:
                del e["assistanceRecording"]
        self.assertEqual(oc.evaluate_transfer(self.form, log)["items"][0]["outcome"], oc.ASSISTANCE_UNKNOWN)

    def test_open_teaching_window_makes_transfer_unknown(self):
        self.assertEqual(set(self.outcomes("teaching_window_not_closed")), {oc.ASSISTANCE_UNKNOWN})

    def test_unanswered_items(self):
        self.assertEqual(self.outcomes("unanswered_transfer"), [oc.INDEPENDENT_CORRECT, oc.UNANSWERED, oc.UNANSWERED])

    def test_break_is_not_support(self):
        out = oc.evaluate_transfer(self.form, fixtures.scenario("break_during_transfer", self.form))
        self.assertEqual(out["items"][0]["outcome"], oc.INDEPENDENT_CORRECT)
        self.assertIn(ev.FLAG_BREAK_DURING_ITEM, out["items"][0]["flags"])

    def test_teaching_responses_are_always_assisted(self):
        log = fixtures.scenario("all_independent", self.form)
        for it in role_items(self.form, "teaching"):
            self.assertEqual(ev.item_evidence(it, log)["assistanceStatus"], ev.ASSISTED)

    def test_correctness_comes_from_answer_key_not_events(self):
        log = fixtures.scenario("all_independent", self.form)
        tr1 = role_items(self.form, "transfer")[1]
        for e in log:
            if e["type"] == ev.RESPONSE_CONFIRMED and e["itemId"] == tr1["itemId"]:
                e["correct"] = True          # a client claim; must be ignored
        self.assertEqual(oc.evaluate_transfer(self.form, log)["items"][1]["outcome"], oc.INDEPENDENT_INCORRECT)

    def test_malformed_logs_are_rejected(self):
        log = fixtures.scenario("all_independent", self.form)
        bad = copy.deepcopy(log)
        bad[3]["seq"] = bad[2]["seq"]
        with self.assertRaises(ev.EventLogError):
            oc.evaluate_transfer(self.form, bad)


class TestPredictionSnapshot(unittest.TestCase):
    def setUp(self):
        self.form = FORMS[21]
        self.log = fixtures.scenario("all_independent", self.form)
        self.snap = build_prediction_snapshot(self.form, self.log)

    def test_only_allowlisted_features(self):
        self.assertEqual(set(self.snap["features"]), set(FEATURE_ALLOWLIST))

    def test_no_transfer_information_in_snapshot(self):
        text = json.dumps(self.snap)
        for it in role_items(self.form, "transfer"):
            self.assertNotIn(it["itemId"], text)
        cutoff = self.snap["meta"]["predictionTime"]["seq"]
        self.assertEqual(self.snap["meta"]["eventsUsed"], len([e for e in self.log if e["seq"] < cutoff]))

    def test_post_prediction_events_cannot_change_snapshot(self):
        cutoff = self.snap["meta"]["predictionTime"]["seq"]
        truncated = [e for e in self.log if e["seq"] <= cutoff]
        self.assertEqual(build_prediction_snapshot(self.form, truncated), self.snap)
        # Different transfer behaviour after the boundary -> identical snapshot
        other = fixtures.scenario("all_independent", self.form)
        for e in other:
            if e["seq"] > cutoff and e["type"] == ev.RESPONSE_CONFIRMED:
                e["position"] = (e["position"] + 1) % 3
        self.assertEqual(build_prediction_snapshot(self.form, other)["snapshotSha256"], self.snap["snapshotSha256"])

    def test_snapshot_is_reproducible_and_frozen(self):
        again = build_prediction_snapshot(self.form, copy.deepcopy(self.log))
        self.assertEqual(again["snapshotSha256"], self.snap["snapshotSha256"])
        self.assertTrue(verify_frozen(json.loads(json.dumps(self.snap))))
        tampered = copy.deepcopy(self.snap)
        tampered["features"]["pre_independent_correct"] += 1
        self.assertFalse(verify_frozen(tampered))

    def test_pre_transfer_evidence_changes_the_snapshot(self):
        log = fixtures.scenario("pre_correct_still_taught", self.form)
        self.assertNotEqual(build_prediction_snapshot(self.form, log)["snapshotSha256"], self.snap["snapshotSha256"])

    def test_elpx_is_recomputed_from_independent_pre_items_only(self):
        elpx = self.snap["features"]["elpx_pre_transfer"]
        if not elpx["available"]:
            self.skipTest("ELP-X engine file not present")
        self.assertEqual(elpx["distinctQuestionsAssessed"], self.snap["features"]["pre_independent_correct"]
                         + self.snap["features"]["pre_independent_incorrect"])
        self.assertEqual(elpx["provisionalSkillLevel"], "INSUFFICIENT_EVIDENCE")   # n = 2 < 3

    def test_missing_boundary_is_refused(self):
        log = [e for e in self.log if e["type"] != ev.BOUNDARY_SHOWN]
        with self.assertRaises(SnapshotError):
            build_prediction_snapshot(self.form, log)

    def test_transfer_before_boundary_is_refused(self):
        log = copy.deepcopy(self.log)
        boundary = next(e for e in log if e["type"] == ev.BOUNDARY_SHOWN)
        boundary["type"] = ev.INSTRUCTION
        boundary["action"] = "delivered"
        log.append({"seq": log[-1]["seq"] + 1, "t": log[-1]["t"] + 1, "type": ev.BOUNDARY_SHOWN})
        with self.assertRaises(LeakageError):
            build_prediction_snapshot(self.form, log)

    def test_leakage_guard_rejects_forbidden_features(self):
        for key in ("transfer_correct", "label", "imlr_status", "adhd_reported", "snap_iv_total"):
            bad = copy.deepcopy(self.snap)
            bad["features"][key] = 1
            with self.assertRaises(LeakageError):
                assert_no_leakage(bad, self.form)


class TestResearchRecord(unittest.TestCase):
    def setUp(self):
        self.form = FORMS[33]

    def record(self, name):
        log = fixtures.scenario(name, self.form)
        return build_prediction_snapshot(self.form, log), oc.evaluate_transfer(self.form, log)

    def test_label_and_inputs_are_separate(self):
        snap, out = self.record("all_independent")
        rec = oc.build_research_record(snap, out)
        self.assertFalse(set(rec["label"]) & set(rec["inputs"]["features"]))
        self.assertNotIn("independentTransferCorrect", json.dumps(rec["inputs"]))
        self.assertTrue(all(i["evidenceFromSeq"] > snap["meta"]["predictionTime"]["seq"] for i in out["items"]))

    def test_tampered_snapshot_or_mismatched_form_is_refused(self):
        snap, out = self.record("all_independent")
        bad = copy.deepcopy(snap)
        bad["features"]["pre_revisions"] = 9
        with self.assertRaises(LeakageError):
            oc.build_research_record(bad, out)
        with self.assertRaises(LeakageError):
            oc.build_research_record(snap, {**out, "formId": "OTHER"})

    def test_no_independent_evidence_yields_unusable_label(self):
        snap, out = self.record("teaching_window_not_closed")
        self.assertEqual(oc.build_research_record(snap, out)["label"]["status"], "NO_VALID_TRANSFER_EVIDENCE")

    def test_every_scenario_builds_a_consistent_record(self):
        for name in fixtures.SCENARIOS:
            snap, out = self.record(name)
            rec = oc.build_research_record(snap, out)
            self.assertEqual(sum(out["counts"].values()), 3, name)
            self.assertEqual(rec["label"]["independentTransferClassified"],
                             out["counts"][oc.INDEPENDENT_CORRECT] + out["counts"][oc.INDEPENDENT_INCORRECT])


class TestNoClinicalClaims(unittest.TestCase):
    CLAIM_WORDS = ("adhd", "diagnos", "symptom", "disorder", "mastery", "mastered", "frustrat", "ready", "readiness")

    def test_outputs_contain_no_clinical_or_readiness_claims(self):
        f = FORMS[2]
        for name in fixtures.SCENARIOS:
            log = fixtures.scenario(name, f)
            snap, out = build_prediction_snapshot(f, log), oc.evaluate_transfer(f, log)
            text = (json.dumps(snap) + json.dumps({k: v for k, v in out.items() if k != "interpretation"})).lower()
            for w in self.CLAIM_WORDS:
                self.assertNotIn(w, text, f"{name}: {w}")

    def test_interpretation_disclaims_rather_than_claims(self):
        text = oc.INTERPRETATION.lower()
        self.assertIn("not a learning-readiness score", text)
        self.assertIn("does not show that the teaching caused improvement", text)

    def test_demo_prints_non_claims_and_approvals(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            demo.main(["--seed", "3"])
        printed = buf.getvalue()
        self.assertIn("SYNTHETIC FIXTURE", printed)
        for line in protocol.NON_CLAIMS + protocol.APPROVALS_REQUIRED:
            self.assertIn(line, printed)

    def test_prototype_has_no_training_or_learner_data_access(self):
        src = "".join(p.read_text(encoding="utf-8") for p in Path(demo.__file__).parent.glob("*.py"))
        for token in ("sklearn", "joblib", ".fit(", "pymongo", "motor", "MONGODB", "load_year"):
            self.assertNotIn(token, src)


if __name__ == "__main__":
    unittest.main()
