"""
Unit tests for the MQ-REC v0.1 prototype (standard library unittest; also runs under pytest).

Run from research/recommendation_engine/:
    python -m unittest discover -s test_scenarios -t . -v
"""

import copy
import json
import unittest
from pathlib import Path

from rule_engine.mq_rec import ContextValidationError, LearnerContext, evaluate, load_context
from rule_engine.mq_rec.evaluator import ELPX_BASELINE_CODES
from rule_engine.mq_rec.guardrails import ClinicalLanguageError, MandatorySupportError, check_output
from rule_engine.mq_rec.rules import DISABLED, REGISTRY

ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = sorted((ROOT / "test_scenarios" / "scenarios").glob("*.json"))
REFERENCES = json.loads((ROOT / "evidence_base" / "references.json").read_text(encoding="utf-8"))
KNOWN_SOURCES = {r["sourceId"] for r in REFERENCES["references"]} | {"EXPERT-LOG-2026"}

PARENT = {"source": "parent"}


def base(**groups):
    data = {"schemaVersion": "MQ-LEARNER-CONTEXT-v0.1", "learnerRef": "SYN-TEST", "grade": 2}
    data.update(groups)
    return data


def prefs(**values):
    return {"provenance": PARENT, **values}


def child(source="child", **values):
    return {"provenance": {"source": source}, **values}


def math(*skills):
    return {"provenance": {"source": "assessment", "instrument": "ELP-X-v1.0"}, "skills": list(skills)}


def skill(skill_id, level, n=None, sufficient=None):
    s = {"skillId": skill_id, "provisionalSkillLevel": level}
    if n is not None:
        s["distinctQuestionsAssessed"] = n
    if sufficient is not None:
        s["isEvidenceSufficient"] = sufficient
    return s


def run(data):
    return evaluate(LearnerContext.from_dict(data))


def codes(output):
    return [r["strategyCode"] for r in output["recommendations"]]


def trace(output, rule_id):
    return next(t for t in output["ruleTraces"] if t["ruleId"] == rule_id)


# ----------------------------------------------------------------------------------------------
class TestLearnerContextSchema(unittest.TestCase):
    def test_unknown_schema_version_is_rejected(self):
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict({**base(), "schemaVersion": "v0"})

    def test_grade_is_required_and_bounded(self):
        for grade in (None, 0, 6, "2", True):
            data = base()
            data["grade"] = grade
            with self.assertRaises(ContextValidationError, msg=grade):
                LearnerContext.from_dict(data)

    def test_invalid_enumerated_value_is_rejected_not_repaired(self):
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict(base(learningPreferences=prefs(activityPace="very_fast")))

    def test_every_group_needs_provenance(self):
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict(base(learningPreferences={"activityPace": "regular"}))

    def test_parent_adhd_report_cannot_claim_verification(self):
        data = base(parentReportedAdhdContext={
            "provenance": {"source": "parent", "verificationStatus": "VERIFIED"}, "diagnosisStatus": "yes"})
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict(data)

    def test_clinical_reference_must_come_from_a_clinician(self):
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict(base(clinicalReference={"provenance": PARENT, "label": "x"}))

    def test_parent_and_clinical_information_are_distinct_types(self):
        ctx = LearnerContext.from_dict(base(
            parentReportedAdhdContext={"provenance": PARENT, "diagnosisStatus": "yes", "reportedPresentation": "combined"},
            clinicalReference={"provenance": {"source": "clinician", "verificationStatus": "CLINICIAN_DOCUMENTED"},
                               "label": "SYNTHETIC"},
        ))
        self.assertEqual(ctx.parentReportedAdhdContext.provenance.verificationStatus, "NOT_VERIFIED")
        self.assertEqual(ctx.clinicalReference.provenance.source, "clinician")
        self.assertIsNot(type(ctx.parentReportedAdhdContext), type(ctx.clinicalReference))

    def test_skill_without_elpx_level_is_rejected(self):
        with self.assertRaises(ContextValidationError):
            LearnerContext.from_dict(base(mathEvidence=math({"skillId": "addition"})))


# ----------------------------------------------------------------------------------------------
class TestMissingData(unittest.TestCase):
    def test_minimal_context_yields_no_recommendations_and_explicit_notices(self):
        out = run(base())
        self.assertEqual(out["recommendations"], [])
        notice_codes = {n["code"] for n in out["uncertaintyNotices"]}
        self.assertTrue({"CHILD_PREFERENCES_MISSING", "NO_MATH_EVIDENCE", "INPUT_MISSING"} <= notice_codes)

    def test_missing_inputs_are_recorded_as_null_never_defaulted(self):
        out = run(base(learningPreferences=prefs(activityPace="calm_step_by_step")))
        rec = out["recommendations"][0]
        self.assertIsNone(rec["inputEvidenceSummary"]["aggregate_hints_used"])
        self.assertIsNone(rec["inputEvidenceSummary"]["task_step_count"])
        missing = [c for c in trace(out, "MQ-RS1-01")["conditions"] if c["result"] is None]
        self.assertTrue(missing)

    def test_missing_parent_preferences_mark_rule_as_missing_input(self):
        out = run(base())
        self.assertEqual(trace(out, "MQ-RS2-02")["status"], "MISSING_INPUT")
        self.assertEqual(trace(out, "MQ-RS2-01")["status"], "MISSING_INPUT")

    def test_sparse_skill_suppresses_cra_and_reports_uncertainty(self):
        out = run(base(mathEvidence=math(skill("addition", "INSUFFICIENT_EVIDENCE", n=1))))
        self.assertNotIn("CRA_SCAFFOLDING", codes(out))
        self.assertEqual(trace(out, "MQ-RS2-01")["status"], "INSUFFICIENT_EVIDENCE")
        self.assertIn("SKILL_EVIDENCE_INSUFFICIENT", {n["code"] for n in out["uncertaintyNotices"]})

    def test_inconsistent_skill_evidence_is_not_guessed(self):
        out = run(base(mathEvidence=math(skill("addition", "EMERGING", n=4, sufficient=False))))
        self.assertNotIn("CRA_SCAFFOLDING", codes(out))


# ----------------------------------------------------------------------------------------------
class TestRules(unittest.TestCase):
    def test_cra_for_emerging_skill_uses_elpx_level_without_recalculation(self):
        out = run(base(mathEvidence=math(skill("subtraction", "EMERGING", n=4, sufficient=True))))
        rec = out["recommendations"][0]
        self.assertEqual(rec["strategyCode"], "CRA_SCAFFOLDING")
        self.assertEqual(rec["skillId"], "subtraction")
        text = json.dumps(out)
        for stat in ("posteriorAlpha", "posteriorBeta", "credibleInterval", "estimatedProficiency"):
            self.assertNotIn(stat, text)

    def test_cra_not_for_developing_or_proficient(self):
        out = run(base(mathEvidence=math(skill("a", "DEVELOPING", n=4), skill("b", "PROFICIENT", n=4))))
        self.assertNotIn("CRA_SCAFFOLDING", codes(out))

    def test_accessible_numbers_for_skill_without_estimate(self):
        out = run(base(grade=1, mathEvidence=math(skill("addition", "INSUFFICIENT_EVIDENCE", n=0))))
        self.assertEqual(codes(out), ["ACCESSIBLE_NUMBERS"])
        self.assertNotIn("10", out["recommendations"][0]["action"])  # draft bounds are not applied as numbers

    def test_task_chunking_only_from_parent_pace_preference(self):
        self.assertIn("TASK_CHUNKING", codes(run(base(learningPreferences=prefs(activityPace="calm_step_by_step")))))
        self.assertNotIn("TASK_CHUNKING", codes(run(base(learningPreferences=prefs(activityPace="regular")))))

    def test_rules_are_deterministic(self):
        data = json.loads(SCENARIOS[1].read_text(encoding="utf-8"))
        self.assertEqual(json.dumps(run(data)), json.dumps(run(copy.deepcopy(data))))

    def test_recommendations_are_ordered_by_priority(self):
        out = run(base(
            childPreferences=child(soundMode="off"),
            learningPreferences=prefs(audioAssistance="read_everything", activityPace="calm_step_by_step"),
            mathEvidence=math(skill("addition", "EMERGING", n=4)),
        ))
        self.assertEqual(codes(out), ["CHILD_SENSORY_PREFERENCE", "CRA_SCAFFOLDING", "TASK_CHUNKING"])


# ----------------------------------------------------------------------------------------------
class TestConflictingPreferences(unittest.TestCase):
    def test_child_quiet_choice_overrides_parent_automatic_audio(self):
        out = run(base(childPreferences=child(soundMode="quiet"),
                       learningPreferences=prefs(audioAssistance="read_everything")))
        rec = out["recommendations"][0]
        self.assertEqual(rec["strategyCode"], "CHILD_SENSORY_PREFERENCE")
        self.assertIn("tap-to-hear", rec["action"])
        self.assertEqual(len(rec["conflicts"]), 1)

    def test_no_override_without_a_conflict(self):
        out = run(base(childPreferences=child(soundMode="gentle"),
                       learningPreferences=prefs(audioAssistance="read_on_click")))
        self.assertEqual(out["recommendations"], [])

    def test_preference_not_from_child_does_not_get_child_priority(self):
        out = run(base(childPreferences=child(source="parent", soundMode="off"),
                       learningPreferences=prefs(audioAssistance="read_everything")))
        self.assertEqual(out["recommendations"], [])
        self.assertIn("CHILD_PREFERENCES_NOT_FROM_CHILD", {n["code"] for n in out["uncertaintyNotices"]})

    def test_minimal_visual_preference_is_recorded_not_overridden(self):
        out = run(base(learningPreferences=prefs(visualAssistance="minimal"),
                       mathEvidence=math(skill("addition", "EMERGING", n=3))))
        rec = out["recommendations"][0]
        self.assertTrue(rec["optional"])
        self.assertIn("not overridden", rec["conflicts"][0]["resolution"])


# ----------------------------------------------------------------------------------------------
class TestNonDiagnosticSafeguards(unittest.TestCase):
    ADHD = {"provenance": PARENT, "diagnosisStatus": "yes", "reportedPresentation": "combined"}
    SNAP = {"provenance": PARENT, "inattentionAverage": 2.9, "hyperactivityAverage": 2.9}
    CLIN = {"provenance": {"source": "clinician", "verificationStatus": "CLINICIAN_DOCUMENTED"}, "label": "X"}

    def _rich(self, **extra):
        return base(
            childPreferences=child(soundMode="quiet"),
            learningPreferences=prefs(audioAssistance="read_everything", activityPace="calm_step_by_step"),
            mathEvidence=math(skill("addition", "EMERGING", n=4), skill("fractions", "INSUFFICIENT_EVIDENCE", n=1)),
            **extra,
        )

    def test_adhd_report_snap_iv_and_clinical_label_never_change_recommendations(self):
        without = run(self._rich())["recommendations"]
        with_all = run(self._rich(parentReportedAdhdContext=self.ADHD, snapIvSummary=self.SNAP,
                                  clinicalReference=self.CLIN))["recommendations"]
        self.assertEqual(without, with_all)

    def test_reported_presentation_value_has_no_effect(self):
        outputs = set()
        for presentation in ("predominantly_inattentive", "predominantly_hyperactive_impulsive", "combined", "not_specified"):
            adhd = {**self.ADHD, "reportedPresentation": presentation}
            outputs.add(json.dumps(run(self._rich(parentReportedAdhdContext=adhd))["recommendations"]))
        self.assertEqual(len(outputs), 1)

    def test_snap_iv_is_not_required(self):
        self.assertTrue(run(self._rich())["recommendations"])

    def test_same_reported_presentation_different_learners_get_different_support(self):
        a = run(json.loads(next(p for p in SCENARIOS if p.name.startswith("S4")).read_text(encoding="utf-8")))
        b = run(json.loads(next(p for p in SCENARIOS if p.name.startswith("S5")).read_text(encoding="utf-8")))
        self.assertNotEqual(codes(a), codes(b))

    def test_recommendations_contain_no_clinical_language(self):
        for path in SCENARIOS:
            out = evaluate(load_context(path)[0])
            for rec in out["recommendations"]:
                text = json.dumps({k: v for k, v in rec.items() if k != "evidence"}).lower()
                for term in ("adhd", "diagnos", "disorder", "symptom", "impulsiv", "hyperactiv"):
                    self.assertNotIn(term, text, f"{path.name}: {term}")

    def test_guardrail_rejects_injected_diagnostic_text(self):
        rec = {"recommendationId": "x", "optional": True, "explanationEn": "Child has inattentive ADHD."}
        with self.assertRaises(ClinicalLanguageError):
            check_output([rec], {"recommendations": [rec]})
        with self.assertRaises(ClinicalLanguageError):
            check_output([], {"note": "Learner diagnosed with ADHD"})

    def test_response_latency_is_never_used(self):
        obs = lambda latency: {"provenance": {"source": "telemetry"}, "responseLatencySeconds": latency}
        fast = run(self._rich(interactionObservations=obs(3.0)))["recommendations"]
        slow = run(self._rich(interactionObservations=obs(120.0)))["recommendations"]
        self.assertEqual(fast, slow)


# ----------------------------------------------------------------------------------------------
class TestOptionalSupportAndNoDuplication(unittest.TestCase):
    def test_every_recommendation_is_optional_and_nothing_is_imposed(self):
        for path in SCENARIOS:
            for rec in evaluate(load_context(path)[0])["recommendations"]:
                self.assertIs(rec["optional"], True)

    def test_guardrail_rejects_mandatory_support(self):
        with self.assertRaises(MandatorySupportError):
            check_output([{"recommendationId": "x", "optional": False}], {})
        with self.assertRaises(MandatorySupportError):
            check_output([{"recommendationId": "x", "optional": True, "action": "Mandatory break every 10 minutes"}], {})

    def test_break_rule_is_disabled_even_when_parent_prefers_breaks(self):
        out = run(base(socialContext={"provenance": PARENT, "challengingTaskSupport": "take_a_break"}))
        self.assertNotIn("OPTIONAL_REST_BREAK", codes(out))
        self.assertEqual(trace(out, "MQ-RS2-03")["status"], DISABLED)

    def test_no_elpx_baseline_codes_are_emitted(self):
        for path in SCENARIOS:
            self.assertFalse(set(codes(evaluate(load_context(path)[0]))) & ELPX_BASELINE_CODES, path.name)

    def test_unsupported_thresholds_stay_disabled(self):
        disabled = {s.ruleId for s in REGISTRY if not s.enabled}
        for rule_id in ("MQ-RS1-02", "MQ-RS2-03", "MQ-RS4-02", "MQ-RS5-02", "MQ-RS6-02"):
            self.assertIn(rule_id, disabled)
        out = run(base(interactionObservations={"provenance": {"source": "telemetry"},
                                                "missedDropCount": 9, "inputMethod": "drag"}))
        self.assertEqual(out["recommendations"], [])
        self.assertIn("MISSED_DROPS_OBSERVED", {n["code"] for n in out["uncertaintyNotices"]})


# ----------------------------------------------------------------------------------------------
class TestExplainability(unittest.TestCase):
    def test_every_specified_rule_has_a_trace(self):
        out = run(base())
        self.assertEqual(len(out["ruleTraces"]), 18)
        for t in out["ruleTraces"]:
            if t["status"] == DISABLED:
                self.assertTrue(t["disabledReason"])

    def test_recommendations_carry_provenance_evidence_and_trace(self):
        for path in SCENARIOS:
            for rec in evaluate(load_context(path)[0])["recommendations"]:
                self.assertEqual(rec["rulesetVersion"], "MQ-REC-v0.1")
                self.assertTrue(rec["reasonCodes"])
                self.assertTrue(rec["why"])
                self.assertTrue(rec["explanationEn"] and rec["explanationSi"])
                self.assertTrue(rec["evidence"])
                self.assertTrue({e["sourceId"] for e in rec["evidence"]} <= KNOWN_SOURCES)
                self.assertTrue(rec["trace"]["contributingFeatures"])

    def test_scenarios_cover_five_to_eight_cases(self):
        self.assertTrue(5 <= len(SCENARIOS) <= 8)
        for path in SCENARIOS:
            ctx, raw = load_context(path)
            self.assertTrue(raw["notes"]["synthetic"])
            self.assertTrue(ctx.learnerRef.startswith("SYN-"))


if __name__ == "__main__":
    unittest.main()
