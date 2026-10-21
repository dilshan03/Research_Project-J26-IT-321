"""
MathQuest Onboarding-v2 Activity Item Bank
Version: ONBOARDING-V2-ITEMS-v1.0

Answer keys for the interactive child onboarding journey. The frontend renders these
activities; correctness is always derived here on the server.

Probe roles and item families are authoritative on the server: a client cannot turn a
guided (support) item into independent evidence by relabelling it.

All items are proposals pending Sri Lankan curriculum/teacher review
(expertReview = "PENDING"); they are not a validated assessment instrument.
Grades 1 and 2 are defined; Grades 3-5 keep using MATH-QB-v1.0 until implemented.
Each Grade 2 skill has at least 3 independent items (ELP-X needs >= 3 distinct items per skill);
the guided `support` item never counts.
"""

from typing import Any, Dict, List, Optional

ONBOARDING_ITEM_BANK_VERSION = "ONBOARDING-V2-ITEMS-v1.0"

_NUMBER_SENSE = {"skillId": "number_sense", "skillName": "Counting & Number Sense", "skillNameSi": "ගණන් කිරීම හා සංඛ්‍යා සංකල්ප"}
_COMPARISON = {"skillId": "number_comparison", "skillName": "Comparing Quantities", "skillNameSi": "ප්‍රමාණ සංසන්දනය"}
_PLACE_VALUE = {"skillId": "place_value", "skillName": "Place Value (Tens & Ones)", "skillNameSi": "ස්ථානීය අගය (දහය හා එක)"}
_ADDITION = {"skillId": "addition", "skillName": "2-Digit Addition (no regrouping)", "skillNameSi": "දෙඅංක සංඛ්‍යා එකතු කිරීම"}


def _numeric_choices(*values: int):
    return [{"id": str(v)} for v in values]

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

    # ============================ GRADE 2 ============================
    # Skill place_value: 3 independent items (build, blocks -> numeral, numeral -> blocks)
    {
        "questionId": "g2v2_build_tens_ones_34",
        "grade": 2, **_PLACE_VALUE,
        "activityId": "g2_build_number",
        "conceptId": "tens_and_ones",
        "itemFamilyId": "g2_place_value",
        "probeRole": None,
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 34,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g2v2_match_blocks_to_numeral_47",
        "grade": 2, **_PLACE_VALUE,
        "activityId": "g2_read_blocks",
        "conceptId": "tens_and_ones",
        "itemFamilyId": "g2_place_value",
        "probeRole": "representation",
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(74, 47, 11, 407),
        "correctAnswer": 47,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g2v2_match_numeral_to_blocks_52",
        "grade": 2, **_PLACE_VALUE,
        "activityId": "g2_show_number",
        "conceptId": "tens_and_ones",
        "itemFamilyId": "g2_place_value",
        "probeRole": "representation",
        "representation": "symbolic",
        "questionType": "multiple_choice",
        "options": [{"id": "blocks_2_5"}, {"id": "blocks_0_7"}, {"id": "blocks_5_2"}],
        "correctAnswer": "blocks_5_2",
        "expertReview": "PENDING",
    },
    # Skill addition: independent item + pre -> guided support -> new transfer (pre and transfer are independent)
    {
        "questionId": "g2v2_add_blocks_21_14",
        "grade": 2, **_ADDITION,
        "activityId": "g2_add_blocks",
        "conceptId": "add_2digit_no_regroup",
        "itemFamilyId": "g2_add_no_regroup_blocks",
        "probeRole": None,
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(53, 35, 25, 45),
        "correctAnswer": 35,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g2v2_add_pre_32_15",
        "grade": 2, **_ADDITION,
        "activityId": "g2_add_sequence",
        "conceptId": "add_2digit_no_regroup",
        "itemFamilyId": "g2_add_no_regroup",
        "probeRole": "pre",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(74, 46, 47, 57),
        "correctAnswer": 47,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g2v2_add_support_24_33",
        "grade": 2, **_ADDITION,
        "activityId": "g2_add_sequence",
        "conceptId": "add_2digit_no_regroup",
        "itemFamilyId": "g2_add_no_regroup",
        "probeRole": "support",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(56, 57, 66, 75),
        "correctAnswer": 57,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g2v2_add_transfer_41_26",
        "grade": 2, **_ADDITION,
        "activityId": "g2_add_sequence",
        "conceptId": "add_2digit_no_regroup",
        "itemFamilyId": "g2_add_no_regroup",
        "probeRole": "transfer",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(67, 76, 65, 57),
        "correctAnswer": 67,
        "expertReview": "PENDING",
    },
]

_BY_ID = {item["questionId"]: item for item in ONBOARDING_V2_ITEMS}


def get_onboarding_v2_items_for_grade(grade: int) -> List[Dict[str, Any]]:
    return [item for item in ONBOARDING_V2_ITEMS if item["grade"] == grade]


def get_onboarding_v2_item(question_id: str) -> Optional[Dict[str, Any]]:
    return _BY_ID.get(question_id)
