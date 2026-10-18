"""
Assessment Evidence Integrity Rules (ASSESS-EVIDENCE-v1.0)
Component: services/learner-profile-service/app/services/assessment_evidence.py

Classifies each submitted mathematics answer, derives first-response correctness on the
server, and decides which items may contribute to first-response proficiency estimates
(ELP-X). Pure functions: no database access.

Rules:
- First-response correctness is computed from firstConfirmedResponse and the answer key.
  A client-reported correctness flag is stored for audit only and is never authoritative.
- Missing evidence stays unknown (None). Empty answers are never correct.
- Only answered, mathematical items approved for the learner's grade, with a known and
  unassisted first response, contribute to proficiency estimates.
- Unanswered, skipped, not-presented, invalid, duplicate, unknown, off-grade and calibration
  items are preserved as excluded evidence and never scored.
"""

from typing import Any, Callable, Dict, Iterable, List, Optional, Set

from app.schemas.onboarding import ClientResponseStatus, MathItemAnswerSubmission

EVIDENCE_RULESET_VERSION = "ASSESS-EVIDENCE-v1.0"
KNOWN_PROTOCOL_VERSIONS = {"onboarding-v1", "onboarding-v2"}

# Response status of a submitted item
STATUS_ANSWERED = "ANSWERED"
STATUS_UNANSWERED = "UNANSWERED"
STATUS_SKIPPED = "SKIPPED"
STATUS_NOT_PRESENTED = "NOT_PRESENTED"
STATUS_INVALID = "INVALID"

# How first-response correctness was established
FIRST_RESPONSE_SERVER_VERIFIED = "SERVER_VERIFIED"
FIRST_RESPONSE_SINGLE_ATTEMPT = "SINGLE_ATTEMPT_FINAL_ANSWER"
FIRST_RESPONSE_UNKNOWN = "UNKNOWN"

# Exclusion reasons (excludedItems[].exclusionReason)
EXCLUDED_DUPLICATE = "DUPLICATE_SUBMISSION"
EXCLUDED_NON_MATHEMATICAL = "NON_MATHEMATICAL_ITEM"
EXCLUDED_UNKNOWN_QUESTION = "UNKNOWN_QUESTION_ID"
EXCLUDED_NOT_APPROVED_FOR_GRADE = "QUESTION_NOT_APPROVED_FOR_GRADE"

# Item-level quality flags
FLAG_RESPONSE_STATUS_CONFLICT = "RESPONSE_STATUS_CONFLICT"
FLAG_NON_NUMERIC_ANSWER = "NON_NUMERIC_ANSWER"
FLAG_FINAL_ANSWER_EMPTY = "FINAL_ANSWER_EMPTY"
FLAG_ANSWER_NOT_IN_OPTIONS = "ANSWER_NOT_IN_OPTIONS"
FLAG_FIRST_RESPONSE_UNKNOWN = "FIRST_RESPONSE_UNKNOWN"
FLAG_CLIENT_FIRST_RESPONSE_UNVERIFIED = "CLIENT_FIRST_RESPONSE_UNVERIFIED"
FLAG_FIRST_RESPONSE_MISMATCH = "FIRST_RESPONSE_CORRECTNESS_MISMATCH"
FLAG_ASSISTED_FIRST_RESPONSE = "ASSISTED_FIRST_RESPONSE"
FLAG_ASSISTANCE_TIMING_UNKNOWN = "ASSISTANCE_TIMING_UNKNOWN"
FLAG_ASSISTANCE_NOT_REPORTED = "ASSISTANCE_NOT_REPORTED"
FLAG_SUPPORT_PROBE_ROLE = "SUPPORT_PROBE_ROLE"
FLAG_RESPONSE_TIME_NOT_RECORDED = "RESPONSE_TIME_NOT_RECORDED"

# Assessment-level flags
FLAG_UNRECOGNIZED_PROTOCOL_VERSION = "UNRECOGNIZED_PROTOCOL_VERSION"
FLAG_REQUEST_GRADE_MISMATCH = "REQUEST_GRADE_MISMATCH"
FLAG_NO_INDEPENDENT_EVIDENCE = "NO_INDEPENDENT_FIRST_RESPONSE_EVIDENCE"

# Probe roles that never contribute to independent proficiency estimates
NON_MATHEMATICAL_PROBE_ROLES = {"calibration"}
ASSISTED_PROBE_ROLES = {"support"}


def normalize_answer(val: Any) -> str:
    """Normalizes string or numeric user answers for reliable comparison."""
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        # Normalize float integers (e.g., 5.0 -> 5)
        if isinstance(val, float) and val.is_integer():
            return str(int(val)).strip().lower()
        return str(val).strip().lower()
    return str(val).strip().lower()


def is_empty_response(val: Any) -> bool:
    return val is None or (isinstance(val, str) and not val.strip())


def _is_numeric(val: Any) -> bool:
    if isinstance(val, bool):
        return False
    if isinstance(val, (int, float)):
        return True
    try:
        float(str(val).strip())
        return True
    except ValueError:
        return False


def _enum_value(val: Any) -> Any:
    return val.value if hasattr(val, "value") else val


def _raw_item_record(ans: MathItemAnswerSubmission) -> Dict[str, Any]:
    """Submitted values preserved as-is. Unsupplied optional evidence is stored as None, not a default."""
    supplied = ans.model_fields_set
    record: Dict[str, Any] = {
        "questionId": ans.questionId,
        "userAnswer": ans.userAnswer,
        "firstConfirmedResponse": ans.firstConfirmedResponse,
        "attempts": ans.attempts,
        "responseTimeSeconds": ans.responseTimeSeconds if "responseTimeSeconds" in supplied else None,
        "hintUsed": ans.hintUsed if "hintUsed" in supplied else None,
        "demonstrationUsed": ans.demonstrationUsed if "demonstrationUsed" in supplied else None,
        "selfCorrectionsCount": ans.selfCorrectionsCount if "selfCorrectionsCount" in supplied else None,
    }
    if ans.isFirstResponseCorrect is not None:
        record["clientReportedFirstResponseCorrect"] = bool(ans.isFirstResponseCorrect)
    if "supportBeforeFirstResponse" in supplied and ans.supportBeforeFirstResponse is not None:
        record["supportBeforeFirstResponse"] = bool(ans.supportBeforeFirstResponse)

    # Additive protocol-v2 fields (optional, preserved only if provided)
    if ans.probeRole is not None:
        record["probeRole"] = _enum_value(ans.probeRole)
    if ans.itemFamilyId is not None:
        record["itemFamilyId"] = ans.itemFamilyId
    if ans.representation is not None:
        record["representation"] = _enum_value(ans.representation)
    if ans.supportEvents:
        record["supportEvents"] = [e.model_dump() for e in ans.supportEvents]
    if ans.instructionEvents:
        record["instructionEvents"] = [e.model_dump() for e in ans.instructionEvents]
    if ans.revisionEvents:
        record["revisionEvents"] = [e.model_dump() for e in ans.revisionEvents]
    if ans.interactionMode is not None:
        record["interactionMode"] = _enum_value(ans.interactionMode)
    if ans.dimensionTags:
        record["dimensionTags"] = ans.dimensionTags
    if ans.responseStatus is not None:
        record["clientDeclaredResponseStatus"] = _enum_value(ans.responseStatus)
    return record


def _excluded(record: Dict[str, Any], status: str, reason: str, flags: List[str],
              question: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    excluded = {
        **record,
        "responseStatus": status,
        "exclusionReason": reason,
        "includedInProficiencyEstimate": False,
        "qualityFlags": flags,
    }
    if question:
        excluded["skillId"] = question.get("skillId")
        excluded["questionGrade"] = question.get("grade")
    return excluded


def _response_status(ans: MathItemAnswerSubmission, question: Dict[str, Any], flags: List[str]) -> str:
    final_empty = is_empty_response(ans.userAnswer)
    first_empty = is_empty_response(ans.firstConfirmedResponse)
    declared = _enum_value(ans.responseStatus)

    if final_empty and first_empty:
        if declared == ClientResponseStatus.SKIPPED.value:
            return STATUS_SKIPPED
        if declared == ClientResponseStatus.NOT_PRESENTED.value:
            return STATUS_NOT_PRESENTED
        return STATUS_UNANSWERED

    if declared in (ClientResponseStatus.SKIPPED.value, ClientResponseStatus.NOT_PRESENTED.value):
        flags.append(FLAG_RESPONSE_STATUS_CONFLICT)
        return STATUS_INVALID

    if question.get("questionType") == "numeric" and not final_empty and not _is_numeric(ans.userAnswer):
        flags.append(FLAG_NON_NUMERIC_ANSWER)
        return STATUS_INVALID

    return STATUS_ANSWERED


def _assistance_before_first_response(ans: MathItemAnswerSubmission, flags: List[str]) -> Optional[bool]:
    """
    True = assisted before the first response, False = unassisted, None = unknown.
    An explicit supportBeforeFirstResponse is authoritative. Hints or demonstrations without
    timing information make the first response's independence unknown.
    """
    supplied = ans.model_fields_set
    if "supportBeforeFirstResponse" in supplied and ans.supportBeforeFirstResponse is not None:
        return bool(ans.supportBeforeFirstResponse)

    hint_used = "hintUsed" in supplied and bool(ans.hintUsed)
    demo_used = "demonstrationUsed" in supplied and bool(ans.demonstrationUsed)
    if hint_used or demo_used:
        flags.append(FLAG_ASSISTANCE_TIMING_UNKNOWN)
        return None
    if "hintUsed" in supplied:
        return False

    flags.append(FLAG_ASSISTANCE_NOT_REPORTED)
    return None


def _evaluate_answered_item(ans: MathItemAnswerSubmission, question: Dict[str, Any],
                            record: Dict[str, Any], flags: List[str]) -> Dict[str, Any]:
    expected = question.get("correctAnswer")
    final_empty = is_empty_response(ans.userAnswer)
    is_correct = (not final_empty) and normalize_answer(ans.userAnswer) == normalize_answer(expected)

    if final_empty:
        flags.append(FLAG_FINAL_ANSWER_EMPTY)
    options = question.get("options") or []
    if options and not final_empty and str(ans.userAnswer) not in {o.get("id") for o in options}:
        flags.append(FLAG_ANSWER_NOT_IN_OPTIONS)

    # First-response correctness is derived on the server from the answer key.
    if not is_empty_response(ans.firstConfirmedResponse):
        first_correct: Optional[bool] = normalize_answer(ans.firstConfirmedResponse) == normalize_answer(expected)
        first_source = FIRST_RESPONSE_SERVER_VERIFIED
    elif "attempts" in ans.model_fields_set and ans.attempts == 1 and not final_empty:
        first_correct = is_correct
        first_source = FIRST_RESPONSE_SINGLE_ATTEMPT
    else:
        first_correct = None
        first_source = FIRST_RESPONSE_UNKNOWN
        flags.append(FLAG_FIRST_RESPONSE_UNKNOWN)

    if ans.isFirstResponseCorrect is not None:
        if first_correct is None:
            flags.append(FLAG_CLIENT_FIRST_RESPONSE_UNVERIFIED)
        elif bool(ans.isFirstResponseCorrect) != first_correct:
            flags.append(FLAG_FIRST_RESPONSE_MISMATCH)

    assisted = _assistance_before_first_response(ans, flags)
    if assisted:
        flags.append(FLAG_ASSISTED_FIRST_RESPONSE)

    independent: Optional[bool]
    if assisted is True:
        independent = False
    elif assisted is False and first_correct is not None:
        independent = True
    else:
        independent = None

    probe_role = record.get("probeRole")
    if probe_role in ASSISTED_PROBE_ROLES:
        flags.append(FLAG_SUPPORT_PROBE_ROLE)

    included = independent is True and probe_role not in ASSISTED_PROBE_ROLES
    if record.get("responseTimeSeconds") is None:
        flags.append(FLAG_RESPONSE_TIME_NOT_RECORDED)

    return {
        **record,
        "skillId": question["skillId"],
        "skillName": question["skillName"],
        "skillNameSi": question["skillNameSi"],
        "responseStatus": STATUS_ANSWERED,
        "isCorrect": is_correct,
        "correctFirstResponse": first_correct,
        "firstResponseSource": first_source,
        "correctAnswer": expected,
        "independentFirstResponse": independent,
        "includedInProficiencyEstimate": included,
        "qualityFlags": flags,
    }


def evaluate_submission(
    answers: Iterable[MathItemAnswerSubmission],
    learner_grade: int,
    approved_question_ids: Set[str],
    question_lookup: Callable[[str], Optional[Dict[str, Any]]],
    request_grade: Optional[int] = None,
    protocol_version: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Classifies a submission into scorable 'evaluatedItems' (answered mathematical items approved
    for the learner's grade) and 'excludedItems' (preserved but never scored), and builds an
    evidence summary. Item order is preserved; for repeated questionIds the first occurrence wins.
    """
    evaluated: List[Dict[str, Any]] = []
    excluded: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()
    approved_submitted = 0

    for ans in answers:
        record = _raw_item_record(ans)
        flags: List[str] = []
        qid = ans.questionId

        if qid in seen_ids:
            excluded.append(_excluded(record, STATUS_INVALID, EXCLUDED_DUPLICATE, flags))
            continue
        seen_ids.add(qid)

        if record.get("probeRole") in NON_MATHEMATICAL_PROBE_ROLES:
            status = STATUS_UNANSWERED if is_empty_response(ans.userAnswer) else STATUS_ANSWERED
            excluded.append(_excluded(record, status, EXCLUDED_NON_MATHEMATICAL, flags))
            continue

        question = question_lookup(qid)
        if not question:
            excluded.append(_excluded(record, STATUS_INVALID, EXCLUDED_UNKNOWN_QUESTION, flags))
            continue
        if qid not in approved_question_ids:
            excluded.append(_excluded(record, STATUS_INVALID, EXCLUDED_NOT_APPROVED_FOR_GRADE, flags, question))
            continue

        approved_submitted += 1
        status = _response_status(ans, question, flags)
        if status != STATUS_ANSWERED:
            excluded.append(_excluded(record, status, status, flags, question))
            continue

        evaluated.append(_evaluate_answered_item(ans, question, record, flags))

    summary = build_evidence_summary(evaluated, excluded, approved_submitted)
    if protocol_version not in KNOWN_PROTOCOL_VERSIONS:
        summary["flags"].append(FLAG_UNRECOGNIZED_PROTOCOL_VERSION)
    if request_grade is not None and request_grade != learner_grade:
        summary["flags"].append(FLAG_REQUEST_GRADE_MISMATCH)

    return {
        "evaluatedItems": evaluated,
        "excludedItems": excluded,
        "evidenceSummary": summary,
        "approvedItemsSubmitted": approved_submitted,
    }


def build_evidence_summary(evaluated: List[Dict[str, Any]], excluded: List[Dict[str, Any]],
                           approved_submitted: int) -> Dict[str, Any]:
    def count_status(status: str) -> int:
        # Mathematical items only; non-mathematical items are counted separately.
        return sum(
            1 for it in excluded
            if it.get("responseStatus") == status and it.get("exclusionReason") != EXCLUDED_NON_MATHEMATICAL
        )

    def count_reason(reason: str) -> int:
        return sum(1 for it in excluded if it.get("exclusionReason") == reason)

    def count_flag(flag: str) -> int:
        return sum(1 for it in evaluated if flag in it.get("qualityFlags", []))

    included = sum(1 for it in evaluated if it.get("includedInProficiencyEstimate"))
    summary = {
        "evidenceRulesetVersion": EVIDENCE_RULESET_VERSION,
        "submittedItems": len(evaluated) + len(excluded),
        "approvedItemsSubmitted": approved_submitted,
        "answeredItems": len(evaluated),
        "unansweredItems": count_status(STATUS_UNANSWERED),
        "skippedItems": count_status(STATUS_SKIPPED),
        "notPresentedItems": count_status(STATUS_NOT_PRESENTED),
        "invalidItems": count_status(STATUS_INVALID),
        "excludedItems": len(excluded),
        "nonMathematicalItems": count_reason(EXCLUDED_NON_MATHEMATICAL),
        "unknownQuestionItems": count_reason(EXCLUDED_UNKNOWN_QUESTION),
        "notApprovedForGradeItems": count_reason(EXCLUDED_NOT_APPROVED_FOR_GRADE),
        "duplicateItems": count_reason(EXCLUDED_DUPLICATE),
        "independentFirstResponseItems": included,
        "firstResponseUnknownItems": count_flag(FLAG_FIRST_RESPONSE_UNKNOWN),
        "assistedFirstResponseItems": count_flag(FLAG_ASSISTED_FIRST_RESPONSE),
        "assistanceTimingUnknownItems": count_flag(FLAG_ASSISTANCE_TIMING_UNKNOWN),
        "firstResponseMismatchItems": count_flag(FLAG_FIRST_RESPONSE_MISMATCH),
        "responseTimeNotRecordedItems": count_flag(FLAG_RESPONSE_TIME_NOT_RECORDED),
        "flags": [],
    }
    if included == 0:
        summary["flags"].append(FLAG_NO_INDEPENDENT_EVIDENCE)
    return summary


def select_proficiency_items(evaluated_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Items eligible for first-response proficiency estimation (ELP-X).
    Records created before ASSESS-EVIDENCE-v1.0 carry no 'includedInProficiencyEstimate' key and
    are passed through unchanged, so historical estimates are reproduced exactly.
    """
    return [it for it in evaluated_items if it.get("includedInProficiencyEstimate", True)]
