"""
MathQuest Onboarding-v2 Activity Item Bank
Version: ONBOARDING-V2-ITEMS-v1.0

Answer keys for the interactive child onboarding journey. The frontend renders these
activities; correctness is always derived here on the server.

Probe roles and item families are authoritative on the server: a client cannot turn a
guided (support) item into independent evidence by relabelling it.

All items are proposals pending Sri Lankan Grade 1 curriculum/teacher review
(expertReview = "PENDING"); they are not a validated assessment instrument.
Only Grade 1 is defined so far; other grades keep using MATH-QB-v1.0.
"""

from typing import Any, Dict, List, Optional

ONBOARDING_ITEM_BANK_VERSION = "ONBOARDING-V2-ITEMS-v1.0"

_NUMBER_SENSE = {"skillId": "number_sense", "skillName": "Counting & Number Sense", "skillNameSi": "ගණන් කිරීම හා සංඛ්‍යා සංකල්ප"}
_COMPARISON = {"skillId": "number_comparison", "skillName": "Comparing Quantities", "skillNameSi": "ප්‍රමාණ සංසන්දනය"}

ONBOARDING_V2_ITEMS: List[Dict[str, Any]] = [
    # Phase C: independent exploration (no probe role = independent evidence)
    {
        "questionId": "g1v2_count_fruit_4",
        "grade": 1, **_NUMBER_SENSE,
        "activityId": "g1_count_basket",
        "conceptId": "counting_to_10",
        "itemFamilyId": "g1_count_set",
        "probeRole": None,
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 4,
        "expertReview": "PENDING",
    },
    # Phase D: representation understanding (both directions)
    {
        "questionId": "g1v2_match_objects_to_numeral_3",
        "grade": 1, **_NUMBER_SENSE,
        "activityId": "g1_match_numeral",
        "conceptId": "quantity_numeral_link",
        "itemFamilyId": "g1_quantity_numeral",
        "probeRole": "representation",
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 3,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g1v2_match_numeral_to_group_5",
        "grade": 1, **_NUMBER_SENSE,
        "activityId": "g1_match_group",
        "conceptId": "quantity_numeral_link",
        "itemFamilyId": "g1_quantity_numeral",
        "probeRole": "representation",
        "representation": "symbolic",
        "questionType": "multiple_choice",
        "options": [{"id": "group_4"}, {"id": "group_5"}, {"id": "group_6"}],
        "correctAnswer": "group_5",
        "expertReview": "PENDING",
    },
    # Phase E: dynamic learning probe (pre -> guided support -> transfer)
    {
        "questionId": "g1v2_compare_pre",
        "grade": 1, **_COMPARISON,
        "activityId": "g1_compare_groups",
        "conceptId": "compare_more",
        "itemFamilyId": "g1_compare_more",
        "probeRole": "pre",
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "left"}, {"id": "right"}],
        "correctAnswer": "left",
        "expertReview": "PENDING",
    },
    {
        "questionId": "g1v2_compare_support",
        "grade": 1, **_COMPARISON,
        "activityId": "g1_compare_groups",
        "conceptId": "compare_more",
        "itemFamilyId": "g1_compare_more",
        "probeRole": "support",
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "left"}, {"id": "right"}],
        "correctAnswer": "right",
        "expertReview": "PENDING",
    },
    {
        "questionId": "g1v2_compare_transfer",
        "grade": 1, **_COMPARISON,
        "activityId": "g1_compare_groups",
        "conceptId": "compare_more",
        "itemFamilyId": "g1_compare_more",
        "probeRole": "transfer",
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "left"}, {"id": "right"}],
        "correctAnswer": "right",
        "expertReview": "PENDING",
    },
]

_BY_ID = {item["questionId"]: item for item in ONBOARDING_V2_ITEMS}


def get_onboarding_v2_items_for_grade(grade: int) -> List[Dict[str, Any]]:
    return [item for item in ONBOARDING_V2_ITEMS if item["grade"] == grade]


def get_onboarding_v2_item(question_id: str) -> Optional[Dict[str, Any]]:
    return _BY_ID.get(question_id)
