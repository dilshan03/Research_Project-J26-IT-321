"""
Unit Tests for Backward-Compatible Onboarding Data Contracts (Milestone 1)
File: services/learner-profile-service/tests/test_onboarding_schemas.py

Verifies:
1. Distinguishing onboarding-v1 from onboarding-v2 protocol versions.
2. Backward compatibility with legacy onboarding-v1 payloads.
3. Full serialization and deserialization of onboarding-v2 additive fields:
   - ProbeRole (calibration, pre, support, transfer, representation)
   - ItemFamilyId
   - RepresentationType (concrete, pictorial, visual, symbolic, verbal)
   - SupportBeforeFirstResponse
   - SupportEvents (level, type, timestampSeconds, deliveredAt)
   - InstructionEvents (action, timestampSeconds, occurredAt)
   - RevisionEvents (priorResponse, newResponse, timestampSeconds, revisedAt)
   - InteractionMode (touch, mouse, keyboard)
   - DimensionTags (MP, IC, SR, RU, SC, IA, CP)
4. ChildPreferenceChoices strictly validating source='child'.
5. Provisional ImpsaSummary and ImlrSummary schemas.
"""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.onboarding import (
    AssessmentProtocolVersion,
    ProbeRole,
    RepresentationType,
    InteractionMode,
    SupportEvent,
    InstructionEvent,
    RevisionEvent,
    ChildPreferenceChoices,
    ImpsaSummary,
    ImlrSummary,
    MathItemAnswerSubmission,
    MathAssessmentSubmissionRequest,
    MathAssessmentSummary,
    OnboardingProgressResponse,
    SkillScore,
)


class TestProtocolVersioningAndDefaults:
    """Verifies protocol versioning defaults to v1 and cleanly accepts v2."""

    def test_default_protocol_version_is_v1(self):
        req = MathAssessmentSubmissionRequest(
            grade=1,
            answers=[{"questionId": "q1", "userAnswer": "opt_1"}],
        )
        assert req.assessmentProtocolVersion == "onboarding-v1"
        assert req.version == "MATH-QB-v1.0"
        assert req.childPreferences is None

    def test_explicit_protocol_v2_accepted(self):
        req = MathAssessmentSubmissionRequest(
            assessmentProtocolVersion="onboarding-v2",
            grade=1,
            answers=[{"questionId": "q1", "userAnswer": "opt_1"}],
        )
        assert req.assessmentProtocolVersion == "onboarding-v2"


class TestBackwardCompatibilityV1Payloads:
    """Verifies legacy onboarding-v1 payloads without any new fields continue to validate cleanly."""

    def test_legacy_v1_payload_without_optional_fields(self):
        legacy_data = {
            "version": "MATH-QB-v1.0",
            "grade": 2,
            "answers": [
                {
                    "questionId": "g2_add_2digit_01",
                    "userAnswer": 37,
                    "attempts": 1,
                    "responseTimeSeconds": 12.5,
                    "hintUsed": False,
                    "firstConfirmedResponse": 37,
                    "isFirstResponseCorrect": True,
                    "demonstrationUsed": False,
                    "selfCorrectionsCount": 0,
                }
            ],
        }
        req = MathAssessmentSubmissionRequest.model_validate(legacy_data)
        assert req.assessmentProtocolVersion == "onboarding-v1"
        ans = req.answers[0]
        assert ans.questionId == "g2_add_2digit_01"
        assert ans.userAnswer == 37
        assert ans.probeRole is None
        assert ans.itemFamilyId is None
        assert ans.representation is None
        assert ans.supportBeforeFirstResponse is False
        assert ans.supportEvents == []
        assert ans.instructionEvents == []
        assert ans.revisionEvents == []
        assert ans.interactionMode is None
        assert ans.dimensionTags == []


class TestProtocolV2ExtendedFields:
    """Verifies that all new observable dimension and dynamic assessment fields validate and serialize."""

    def test_full_v2_payload_serialization_roundtrip(self):
        now = datetime.now(timezone.utc)
        payload = {
            "version": "MATH-QB-v2.0",
            "assessmentProtocolVersion": "onboarding-v2",
            "grade": 1,
            "childPreferences": {
                "source": "child",
                "avatarId": "avatar_elephant",
                "soundMode": "gentle",
                "theme": "watercolor_island",
            },
            "answers": [
                {
                    "questionId": "g1_calib_leaf_01",
                    "userAnswer": "tree_branch",
                    "attempts": 1,
                    "responseTimeSeconds": 8.4,
                    "hintUsed": False,
                    "probeRole": "calibration",
                    "dimensionTags": ["IC", "IA"],
                    "interactionMode": "touch",
                    "instructionEvents": [
                        {"action": "delivered", "timestampSeconds": 0.0},
                        {"action": "replayed", "timestampSeconds": 3.2},
                    ],
                },
                {
                    "questionId": "g1_num_count_01",
                    "userAnswer": "opt_5",
                    "attempts": 2,
                    "responseTimeSeconds": 24.1,
                    "hintUsed": True,
                    "firstConfirmedResponse": "opt_4",
                    "isFirstResponseCorrect": False,
                    "demonstrationUsed": True,
                    "selfCorrectionsCount": 1,
                    "probeRole": "pre",
                    "itemFamilyId": "fam_count_10",
                    "representation": "concrete",
                    "supportBeforeFirstResponse": False,
                    "supportEvents": [
                        {"level": 1, "type": "clarification", "timestampSeconds": 10.5},
                        {"level": 3, "type": "worked_demonstration", "timestampSeconds": 15.0},
                    ],
                    "revisionEvents": [
                        {"priorResponse": "opt_4", "newResponse": "opt_5", "timestampSeconds": 21.0}
                    ],
                    "interactionMode": "touch",
                    "dimensionTags": ["MP", "SR", "SC"],
                },
                {
                    "questionId": "g1_num_count_01_transfer",
                    "userAnswer": "opt_3",
                    "attempts": 1,
                    "responseTimeSeconds": 11.2,
                    "hintUsed": False,
                    "firstConfirmedResponse": "opt_3",
                    "isFirstResponseCorrect": True,
                    "demonstrationUsed": False,
                    "selfCorrectionsCount": 0,
                    "probeRole": "transfer",
                    "itemFamilyId": "fam_count_10",
                    "representation": "concrete",
                    "supportBeforeFirstResponse": False,
                    "dimensionTags": ["MP", "SR"],
                },
            ],
        }

        req = MathAssessmentSubmissionRequest.model_validate(payload)
        dumped = req.model_dump(mode="json")

        assert dumped["assessmentProtocolVersion"] == "onboarding-v2"
        assert dumped["childPreferences"]["source"] == "child"
        assert dumped["childPreferences"]["avatarId"] == "avatar_elephant"

        # Calibration item check
        calib = dumped["answers"][0]
        assert calib["probeRole"] == "calibration"
        assert calib["interactionMode"] == "touch"
        assert len(calib["instructionEvents"]) == 2
        assert calib["instructionEvents"][1]["action"] == "replayed"

        # Scaffolded pre-probe item check
        pre_probe = dumped["answers"][1]
        assert pre_probe["probeRole"] == "pre"
        assert pre_probe["itemFamilyId"] == "fam_count_10"
        assert pre_probe["representation"] == "concrete"
        assert len(pre_probe["supportEvents"]) == 2
        assert pre_probe["supportEvents"][0]["level"] == 1
        assert pre_probe["supportEvents"][1]["type"] == "worked_demonstration"
        assert len(pre_probe["revisionEvents"]) == 1
        assert pre_probe["revisionEvents"][0]["priorResponse"] == "opt_4"

        # Transfer probe check
        transfer_probe = dumped["answers"][2]
        assert transfer_probe["probeRole"] == "transfer"
        assert transfer_probe["isFirstResponseCorrect"] is True
        assert transfer_probe["supportBeforeFirstResponse"] is False


class TestChildPreferenceChoicesStrictSource:
    """Verifies that child-expressed preferences strictly require source='child'."""

    def test_valid_child_source_succeeds(self):
        pref = ChildPreferenceChoices(source="child", avatarId="avatar_lion", soundMode="gentle")
        assert pref.source == "child"
        assert pref.avatarId == "avatar_lion"

    def test_case_insensitive_child_normalized(self):
        pref = ChildPreferenceChoices(source="CHILD", avatarId="avatar_lion")
        assert pref.source == "child"

    def test_non_child_source_raises_validation_error(self):
        with pytest.raises(ValidationError) as exc:
            ChildPreferenceChoices(source="parent", avatarId="avatar_lion")
        assert "source must strictly be 'child'" in str(exc.value)

    def test_empty_source_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ChildPreferenceChoices(source="")


class TestImpsaAndImlrSummaries:
    """Verifies provisional IMPSA and IMLR data contracts."""

    def test_impsa_summary_serialization(self):
        impsa = ImpsaSummary(
            status="PROVISIONAL",
            eligibleUnassistedItems=2,
            skillEvidence=[{"conceptId": "number_sense", "correctFirstAttempt": True}],
            estimatedProficiency=0.75,
            credibleInterval={"lower": 0.45, "upper": 0.92},
            evidenceSufficiency="INSUFFICIENT",
        )
        data = impsa.model_dump()
        assert data["status"] == "PROVISIONAL"
        assert data["eligibleUnassistedItems"] == 2
        assert data["evidenceSufficiency"] == "INSUFFICIENT"
        assert data["credibleInterval"]["lower"] == 0.45

    def test_imlr_summary_serialization(self):
        imlr = ImlrSummary(
            status="TRANSFER_OBSERVED",
            conceptId="counting_objects",
            preProbeCorrect=False,
            supportDelivered=["visual_cue", "worked_demonstration"],
            unassistedTransferCorrect=True,
            evidenceLevel="PROVISIONAL",
        )
        data = imlr.model_dump()
        assert data["status"] == "TRANSFER_OBSERVED"
        assert data["preProbeCorrect"] is False
        assert data["unassistedTransferCorrect"] is True
        assert "worked_demonstration" in data["supportDelivered"]

    def test_math_assessment_summary_with_impsa_and_imlr(self):
        summary = MathAssessmentSummary(
            grade=1,
            assessmentProtocolVersion="onboarding-v2",
            totalQuestions=3,
            correctAnswers=2,
            accuracyPercentage=66.7,
            evidenceLevel="SUFFICIENT",
            skills=[
                SkillScore(
                    skillId="number_sense",
                    skillName="Number Sense",
                    skillNameSi="සංඛ්‍යා ඥානය",
                    totalQuestions=3,
                    correctQuestions=2,
                    accuracyPercentage=66.7,
                    proficiencyCategory="Developing",
                )
            ],
            strengths=["Number Sense"],
            areasForGrowth=[],
            recommendations=["Continue with visual aids"],
            mlPredictionNotice="Rule-based baseline",
            impsa=ImpsaSummary(
                status="PROVISIONAL",
                eligibleUnassistedItems=2,
                evidenceSufficiency="INSUFFICIENT",
            ),
            imlr=ImlrSummary(
                status="TRANSFER_OBSERVED",
                conceptId="counting_objects",
                unassistedTransferCorrect=True,
            ),
            childPreferences=ChildPreferenceChoices(
                source="child",
                avatarId="avatar_fox",
            ),
        )
        dumped = summary.model_dump()
        assert dumped["assessmentProtocolVersion"] == "onboarding-v2"
        assert dumped["impsa"]["status"] == "PROVISIONAL"
        assert dumped["imlr"]["status"] == "TRANSFER_OBSERVED"
        assert dumped["childPreferences"]["avatarId"] == "avatar_fox"
