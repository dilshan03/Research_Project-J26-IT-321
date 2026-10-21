"""
MathQuest Onboarding-v2 Activity Item Bank
Version: ONBOARDING-V2-ITEMS-v1.0

Answer keys for the interactive child onboarding journey. The frontend renders these
activities; correctness is always derived here on the server.

Probe roles and item families are authoritative on the server: a client cannot turn a
guided (support) item into independent evidence by relabelling it.

All items are proposals pending Sri Lankan curriculum/teacher review
(expertReview = "PENDING"); they are not a validated assessment instrument.
Grades 1-5 are defined (MATH-QB-v1.0 items stay approved for v1 clients).
Each Grade 2-5 skill has at least 3 independent items (ELP-X needs >= 3 distinct items per skill);
the guided `support` item never counts.
"""

from typing import Any, Dict, List, Optional

ONBOARDING_ITEM_BANK_VERSION = "ONBOARDING-V2-ITEMS-v1.0"

_NUMBER_SENSE = {"skillId": "number_sense", "skillName": "Counting & Number Sense", "skillNameSi": "ගණන් කිරීම හා සංඛ්‍යා සංකල්ප"}
_COMPARISON = {"skillId": "number_comparison", "skillName": "Comparing Quantities", "skillNameSi": "ප්‍රමාණ සංසන්දනය"}
_PLACE_VALUE = {"skillId": "place_value", "skillName": "Place Value (Tens & Ones)", "skillNameSi": "ස්ථානීය අගය (දහය හා එක)"}
_ADDITION = {"skillId": "addition", "skillName": "2-Digit Addition (no regrouping)", "skillNameSi": "දෙඅංක සංඛ්‍යා එකතු කිරීම"}
_PLACE_VALUE_3 = {"skillId": "place_value", "skillName": "Place Value to 1000 (Hundreds, Tens & Ones)", "skillNameSi": "ස්ථානීය අගය (සියය, දහය, එක)"}
_MULTIPLICATION = {"skillId": "multiplication", "skillName": "Multiplication as Equal Groups", "skillNameSi": "සමාන කාණ්ඩ ලෙස ගුණ කිරීම"}
_FRACTIONS = {"skillId": "fractions", "skillName": "Fractions & Equivalent Fractions", "skillNameSi": "භාග සහ තුල්‍ය භාග"}
_PERIMETER = {"skillId": "measurement_geometry", "skillName": "Perimeter with Unit Lengths", "skillNameSi": "පරිමිතිය (ඒකක දිග)"}
_DECIMALS = {"skillId": "decimals", "skillName": "Decimals (Tenths)", "skillNameSi": "දශම සංඛ්‍යා (දහයෙන් පංගු)"}
_PATTERNS = {"skillId": "number_patterns", "skillName": "Number Patterns", "skillNameSi": "සංඛ්‍යා රටා"}


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
    # Independent quantity comparison (own family, outside the learn-and-transfer sequence). With the
    # pre-probe and transfer item this gives number_comparison 3 independent items (ELP-X minimum).
    {
        "questionId": "g1v2_compare_independent_7_4",
        "grade": 1, **_COMPARISON,
        "activityId": "g1_compare_independent",
        "conceptId": "compare_more",
        "itemFamilyId": "g1_compare_independent",
        "probeRole": None,
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "left"}, {"id": "right"}],
        "correctAnswer": "left",
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
    # ============================ GRADE 3 ============================
    # Skill place_value: 3 independent items (build, blocks -> numeral, numeral -> blocks with a zero ten)
    {
        "questionId": "g3v2_build_hto_347",
        "grade": 3, **_PLACE_VALUE_3,
        "activityId": "g3_build_number",
        "conceptId": "hundreds_tens_ones",
        "itemFamilyId": "g3_place_value",
        "probeRole": None,
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 347,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g3v2_match_blocks_to_numeral_258",
        "grade": 3, **_PLACE_VALUE_3,
        "activityId": "g3_read_blocks",
        "conceptId": "hundreds_tens_ones",
        "itemFamilyId": "g3_place_value",
        "probeRole": "representation",
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(852, 258, 285, 15),
        "correctAnswer": 258,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g3v2_match_numeral_to_blocks_406",
        "grade": 3, **_PLACE_VALUE_3,
        "activityId": "g3_show_number",
        "conceptId": "hundreds_tens_ones",
        "itemFamilyId": "g3_place_value",
        "probeRole": "representation",
        "representation": "symbolic",
        "questionType": "multiple_choice",
        "options": [{"id": "blocks_4_6_0"}, {"id": "blocks_4_0_6"}, {"id": "blocks_6_0_4"}],
        "correctAnswer": "blocks_4_0_6",
        "expertReview": "PENDING",
    },
    # Skill multiplication: independent groups picture + pre -> guided support -> new transfer
    {
        "questionId": "g3v2_mult_groups_2x4",
        "grade": 3, **_MULTIPLICATION,
        "activityId": "g3_mult_groups",
        "conceptId": "mult_equal_groups",
        "itemFamilyId": "g3_mult_groups_picture",
        "probeRole": None,
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(6, 8, 24, 12),
        "correctAnswer": 8,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g3v2_mult_pre_4x3",
        "grade": 3, **_MULTIPLICATION,
        "activityId": "g3_mult_sequence",
        "conceptId": "mult_equal_groups",
        "itemFamilyId": "g3_mult_equal_groups",
        "probeRole": "pre",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(7, 43, 12, 15),
        "correctAnswer": 12,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g3v2_mult_support_3x5",
        "grade": 3, **_MULTIPLICATION,
        "activityId": "g3_mult_sequence",
        "conceptId": "mult_equal_groups",
        "itemFamilyId": "g3_mult_equal_groups",
        "probeRole": "support",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(15, 8, 35, 18),
        "correctAnswer": 15,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g3v2_mult_transfer_5x2",
        "grade": 3, **_MULTIPLICATION,
        "activityId": "g3_mult_sequence",
        "conceptId": "mult_equal_groups",
        "itemFamilyId": "g3_mult_equal_groups",
        "probeRole": "transfer",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(7, 52, 12, 10),
        "correctAnswer": 10,
        "expertReview": "PENDING",
    },

    # ============================ GRADE 4 ============================
    # Skill fractions: 3 independent items (shade a fraction, strip -> fraction, equivalent strip)
    {
        "questionId": "g4v2_shade_fraction_3_4",
        "grade": 4, **_FRACTIONS,
        "activityId": "g4_shade_fraction",
        "conceptId": "fraction_part_whole",
        "itemFamilyId": "g4_fractions",
        "probeRole": None,
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 3,          # shaded parts of a strip of 4 equal parts
        "expertReview": "PENDING",
    },
    {
        "questionId": "g4v2_match_strip_to_fraction_2_3",
        "grade": 4, **_FRACTIONS,
        "activityId": "g4_read_strip",
        "conceptId": "fraction_part_whole",
        "itemFamilyId": "g4_fractions",
        "probeRole": "representation",
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "3/2"}, {"id": "1/3"}, {"id": "2/3"}, {"id": "2/5"}],
        "correctAnswer": "2/3",
        "expertReview": "PENDING",
    },
    {
        "questionId": "g4v2_equivalent_strip_1_2",
        "grade": 4, **_FRACTIONS,
        "activityId": "g4_equivalent_strip",
        "conceptId": "equivalent_fractions",
        "itemFamilyId": "g4_fractions",
        "probeRole": "representation",
        "representation": "symbolic",
        "questionType": "multiple_choice",
        "options": [{"id": "strip_2_4"}, {"id": "strip_1_4"}, {"id": "strip_2_3"}],
        "correctAnswer": "strip_2_4",
        "expertReview": "PENDING",
    },
    # Skill measurement_geometry: independent perimeter + pre -> guided support -> new transfer
    {
        "questionId": "g4v2_perimeter_square_2x2",
        "grade": 4, **_PERIMETER,
        "activityId": "g4_perimeter_square",
        "conceptId": "perimeter_unit_edges",
        "itemFamilyId": "g4_perimeter_square",
        "probeRole": None,
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(4, 8, 6, 16),
        "correctAnswer": 8,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g4v2_perimeter_pre_3x2",
        "grade": 4, **_PERIMETER,
        "activityId": "g4_perimeter_sequence",
        "conceptId": "perimeter_unit_edges",
        "itemFamilyId": "g4_perimeter_rectangle",
        "probeRole": "pre",
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(6, 5, 10, 12),
        "correctAnswer": 10,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g4v2_perimeter_support_4x2",
        "grade": 4, **_PERIMETER,
        "activityId": "g4_perimeter_sequence",
        "conceptId": "perimeter_unit_edges",
        "itemFamilyId": "g4_perimeter_rectangle",
        "probeRole": "support",
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(12, 8, 6, 16),
        "correctAnswer": 12,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g4v2_perimeter_transfer_5x2",
        "grade": 4, **_PERIMETER,
        "activityId": "g4_perimeter_sequence",
        "conceptId": "perimeter_unit_edges",
        "itemFamilyId": "g4_perimeter_rectangle",
        "probeRole": "transfer",
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(10, 7, 28, 14),
        "correctAnswer": 14,
        "expertReview": "PENDING",
    },

    # ============================ GRADE 5 ============================
    # Skill decimals: 3 independent items (shade tenths, tiles -> decimal, compare decimals)
    {
        "questionId": "g5v2_shade_tenths_0_6",
        "grade": 5, **_DECIMALS,
        "activityId": "g5_shade_tenths",
        "conceptId": "decimal_tenths",
        "itemFamilyId": "g5_decimals",
        "probeRole": None,
        "representation": "concrete",
        "questionType": "numeric",
        "correctAnswer": 6,          # shaded tenths of a strip of 10 equal parts
        "expertReview": "PENDING",
    },
    {
        "questionId": "g5v2_match_tiles_to_decimal_0_4",
        "grade": 5, **_DECIMALS,
        "activityId": "g5_read_tiles",
        "conceptId": "decimal_tenths",
        "itemFamilyId": "g5_decimals",
        "probeRole": "representation",
        "representation": "pictorial",
        "questionType": "multiple_choice",
        "options": [{"id": "4"}, {"id": "0.04"}, {"id": "0.4"}, {"id": "40"}],
        "correctAnswer": "0.4",
        "expertReview": "PENDING",
    },
    {
        "questionId": "g5v2_compare_decimals_0_7_0_45",
        "grade": 5, **_DECIMALS,
        "activityId": "g5_compare_decimals",
        "conceptId": "decimal_comparison",
        "itemFamilyId": "g5_decimals",
        "probeRole": "representation",
        "representation": "symbolic",
        "questionType": "multiple_choice",
        "options": [{"id": "0.45"}, {"id": "0.7"}],
        "correctAnswer": "0.7",
        "expertReview": "PENDING",
    },
    # Skill number_patterns: independent picture pattern + pre -> guided support -> new transfer
    {
        "questionId": "g5v2_pattern_towers_1_3_5",
        "grade": 5, **_PATTERNS,
        "activityId": "g5_pattern_towers",
        "conceptId": "pattern_next_term",
        "itemFamilyId": "g5_pattern_picture",
        "probeRole": None,
        "representation": "pictorial",
        "questionType": "numeric",
        "options": _numeric_choices(6, 7, 9, 8),
        "correctAnswer": 7,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g5v2_pattern_pre_plus4",
        "grade": 5, **_PATTERNS,
        "activityId": "g5_pattern_sequence",
        "conceptId": "pattern_find_rule",
        "itemFamilyId": "g5_pattern_add_rule",
        "probeRole": "pre",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(22, 18, 21, 25),
        "correctAnswer": 21,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g5v2_pattern_support_plus4",
        "grade": 5, **_PATTERNS,
        "activityId": "g5_pattern_sequence",
        "conceptId": "pattern_find_rule",
        "itemFamilyId": "g5_pattern_add_rule",
        "probeRole": "support",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(14, 13, 18, 12),
        "correctAnswer": 14,
        "expertReview": "PENDING",
    },
    {
        "questionId": "g5v2_pattern_transfer_plus3",
        "grade": 5, **_PATTERNS,
        "activityId": "g5_pattern_sequence",
        "conceptId": "pattern_find_rule",
        "itemFamilyId": "g5_pattern_add_rule",
        "probeRole": "transfer",
        "representation": "symbolic",
        "questionType": "numeric",
        "options": _numeric_choices(15, 17, 14, 16),
        "correctAnswer": 16,
        "expertReview": "PENDING",
    },
]

_BY_ID = {item["questionId"]: item for item in ONBOARDING_V2_ITEMS}


def get_onboarding_v2_items_for_grade(grade: int) -> List[Dict[str, Any]]:
    return [item for item in ONBOARDING_V2_ITEMS if item["grade"] == grade]


def get_onboarding_v2_item(question_id: str) -> Optional[Dict[str, Any]]:
    return _BY_ID.get(question_id)
