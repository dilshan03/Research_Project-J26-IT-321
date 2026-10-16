"""
MathQuest Mathematics Assessment Question Bank
Version: MATH-QB-v1.0
Target audience: Sri Lankan Primary Grades 1 to 5 (Ages 6-10)
Curriculum alignment: Sri Lankan Primary Mathematics (Sinhala / English medium)
"""

from typing import Dict, Any, List, Optional

QUESTION_BANK_VERSION = "MATH-QB-v1.0"

QUESTION_BANK: List[Dict[str, Any]] = [
    # =========================================================================
    # GRADE 1
    # =========================================================================
    {
        "questionId": "g1_num_count_01",
        "grade": 1,
        "skillId": "number_sense",
        "skillName": "Counting & Number Sense",
        "skillNameSi": "ගණන් කිරීම හා සංඛ්‍යා සංකල්ප",
        "difficulty": "easy",
        "questionType": "visual",
        "promptEn": "Count the apples in the basket. How many apples are there?",
        "promptSi": "කූඩයේ ඇති ඇපල් ගෙඩි ගණන කීයද? ගණන් කර නිවැරදි පිළිතුර තෝරන්න.",
        "visualRepresentation": {
            "type": "icon_grid",
            "icon": "🍎",
            "count": 5,
            "grouping": "linear"
        },
        "options": [
            {"id": "opt_3", "textEn": "3 apples", "textSi": "ඇපල් 3", "visualIcon": "🍎🍎🍎"},
            {"id": "opt_4", "textEn": "4 apples", "textSi": "ඇපල් 4", "visualIcon": "🍎🍎🍎🍎"},
            {"id": "opt_5", "textEn": "5 apples", "textSi": "ඇපල් 5", "visualIcon": "🍎🍎🍎🍎🍎"},
            {"id": "opt_6", "textEn": "6 apples", "textSi": "ඇපල් 6", "visualIcon": "🍎🍎🍎🍎🍎🍎"},
        ],
        "correctAnswer": "opt_5",
        "hintEn": "Point to each apple with your finger and count: 1, 2, 3...",
        "hintSi": "ඇඟිල්ලෙන් එක් එක් ඇපල් ගෙඩියට තට්ටු කරමින් 1, 2, 3... ලෙස ගණන් කරන්න.",
        "explanationEn": "There are 5 apples in total: 1, 2, 3, 4, 5.",
        "explanationSi": "කූඩයේ ඇපල් ගෙඩි 5ක් ඇත: 1, 2, 3, 4, 5."
    },
    {
        "questionId": "g1_add_basic_02",
        "grade": 1,
        "skillId": "addition",
        "skillName": "Basic Addition",
        "skillNameSi": "මූලික එකතු කිරීම",
        "difficulty": "easy",
        "questionType": "multiple_choice",
        "promptEn": "What is 3 + 2?",
        "promptSi": "3 + 2 හි අගය කීයද?",
        "visualRepresentation": {
            "type": "addition_dots",
            "firstCount": 3,
            "firstIcon": "🔵",
            "secondCount": 2,
            "secondIcon": "🟢"
        },
        "options": [
            {"id": "opt_4", "textEn": "4", "textSi": "4"},
            {"id": "opt_5", "textEn": "5", "textSi": "5"},
            {"id": "opt_6", "textEn": "6", "textSi": "6"},
            {"id": "opt_7", "textEn": "7", "textSi": "7"},
        ],
        "correctAnswer": "opt_5",
        "hintEn": "Start at 3 and count forward 2 more: 4, 5.",
        "hintSi": "3 සිට ඉදිරියට තව 2ක් ගණන් කරන්න: 4, 5.",
        "explanationEn": "3 plus 2 equals 5.",
        "explanationSi": "3ට 2ක් එකතු කළ විට 5ක් ලැබේ."
    },
    {
        "questionId": "g1_sub_basic_03",
        "grade": 1,
        "skillId": "subtraction",
        "skillName": "Basic Subtraction",
        "skillNameSi": "මූලික අඩු කිරීම",
        "difficulty": "medium",
        "questionType": "numeric",
        "promptEn": "You have 6 stars. If 2 stars fly away, how many are left? (6 - 2)",
        "promptSi": "ඔබ ළඟ තරු 6ක් ඇත. එයින් තරු 2ක් ඉවත් කළහොත් ඉතිරි තරු ගණන කීයද? (6 - 2)",
        "visualRepresentation": {
            "type": "subtraction_icons",
            "total": 6,
            "removed": 2,
            "icon": "⭐"
        },
        "options": None,
        "correctAnswer": 4,
        "hintEn": "Imagine crossing out 2 stars from the 6 stars.",
        "hintSi": "තරු 6න් තරු 2ක් මත ඉරි ඇඳ ඉවත් කර ඉතිරි ඒවා ගණන් කරන්න.",
        "explanationEn": "6 - 2 = 4 stars remain.",
        "explanationSi": "6න් 2ක් අඩු කළ විට 4ක් ඉතිරි වේ."
    },
    {
        "questionId": "g1_shape_rec_04",
        "grade": 1,
        "skillId": "geometry_shapes",
        "skillName": "2D Shape Identification",
        "skillNameSi": "ද්විමාන හැඩතල හඳුනාගැනීම",
        "difficulty": "easy",
        "questionType": "multiple_choice",
        "promptEn": "Which shape has 3 sides and 3 corners?",
        "promptSi": "පැති 3ක් සහ කොන් 3ක් ඇති ජ්‍යාමිතික හැඩය කුමක්ද?",
        "visualRepresentation": {
            "type": "shape_illustration",
            "shape": "triangle"
        },
        "options": [
            {"id": "opt_circle", "textEn": "Circle", "textSi": "වෘත්තය", "visualIcon": "⭕"},
            {"id": "opt_triangle", "textEn": "Triangle", "textSi": "ත්‍රිකෝණය", "visualIcon": "🔺"},
            {"id": "opt_square", "textEn": "Square", "textSi": "සමචතුරස්‍රය", "visualIcon": "🟦"},
            {"id": "opt_rectangle", "textEn": "Rectangle", "textSi": "සෘජුකෝණාස්‍රය", "visualIcon": "🟨"},
        ],
        "correctAnswer": "opt_triangle",
        "hintEn": "Think of a slice of pizza or a party hat.",
        "hintSi": "පීසා කෑල්ලක හෝ පාටි තොප්පියක හැඩය මතක් කරගන්න.",
        "explanationEn": "A triangle always has 3 straight sides and 3 corners.",
        "explanationSi": "ත්‍රිකෝණයකට සෘජු පැති 3ක් සහ කොන් 3ක් ඇත."
    },

    # =========================================================================
    # GRADE 2
    # =========================================================================
    {
        "questionId": "g2_add_2digit_01",
        "grade": 2,
        "skillId": "addition",
        "skillName": "2-Digit Addition",
        "skillNameSi": "දෙඅංක සංඛ්‍යා එකතු කිරීම",
        "difficulty": "medium",
        "questionType": "multiple_choice",
        "promptEn": "Find the sum: 24 + 13 =",
        "promptSi": "එකතුව සොයන්න: 24 + 13 =",
        "options": [
            {"id": "opt_35", "textEn": "35", "textSi": "35"},
            {"id": "opt_37", "textEn": "37", "textSi": "37"},
            {"id": "opt_38", "textEn": "38", "textSi": "38"},
            {"id": "opt_47", "textEn": "47", "textSi": "47"},
        ],
        "correctAnswer": "opt_37",
        "hintEn": "Add the ones digits first (4 + 3), then add the tens digits (2 + 1).",
        "hintSi": "පළමුව එකස්ථානයේ අංක එකතු කරන්න (4 + 3), පසුව දහස්ථානයේ අංක එකතු කරන්න (2 + 1).",
        "explanationEn": "4 + 3 = 7 ones, 2 + 1 = 3 tens. Total = 37.",
        "explanationSi": "එකස්ථානය: 4 + 3 = 7, දහස්ථානය: 2 + 1 = 3. පිළිතුර = 37."
    },
    {
        "questionId": "g2_mult_groups_02",
        "grade": 2,
        "skillId": "grouping_multiplication",
        "skillName": "Equal Grouping & Foundations",
        "skillNameSi": "සමාන කාණ්ඩ හා මූලික ගුණකිරීම",
        "difficulty": "medium",
        "questionType": "visual",
        "promptEn": "There are 4 plates. Each plate has 3 mangoes. How many mangoes in total?",
        "promptSi": "පිඟන් 4ක් ඇත. සෑම පිඟානකම අඹ ගෙඩි 3 බැගින් ඇත. සියලුම අඹ ගෙඩි ගණන කීයද?",
        "visualRepresentation": {
            "type": "grouped_items",
            "groups": 4,
            "itemsPerGroup": 3,
            "icon": "🥭"
        },
        "options": [
            {"id": "opt_7", "textEn": "7 mangoes", "textSi": "අඹ 7"},
            {"id": "opt_10", "textEn": "10 mangoes", "textSi": "අඹ 10"},
            {"id": "opt_12", "textEn": "12 mangoes", "textSi": "අඹ 12"},
            {"id": "opt_15", "textEn": "15 mangoes", "textSi": "අඹ 15"},
        ],
        "correctAnswer": "opt_12",
        "hintEn": "Add 3 four times: 3 + 3 + 3 + 3, or calculate 4 × 3.",
        "hintSi": "3 හතර වතාවක් එකතු කරන්න: 3 + 3 + 3 + 3, නැතහොත් 4 × 3 ගණනය කරන්න.",
        "explanationEn": "4 groups of 3 = 4 × 3 = 12 mangoes.",
        "explanationSi": "3 බැගින් වූ කාණ්ඩ 4ක් = 4 × 3 = 12."
    },
    {
        "questionId": "g2_num_compare_03",
        "grade": 2,
        "skillId": "number_comparison",
        "skillName": "Number Comparison",
        "skillNameSi": "සංඛ්‍යා සංසන්දනය",
        "difficulty": "easy",
        "questionType": "multiple_choice",
        "promptEn": "Which number is the greatest?",
        "promptSi": "පහත සංඛ්‍යා අතුරින් විශාලතම සංඛ්‍යාව කුමක්ද?",
        "options": [
            {"id": "opt_49", "textEn": "49", "textSi": "49"},
            {"id": "opt_82", "textEn": "82", "textSi": "82"},
            {"id": "opt_78", "textEn": "78", "textSi": "78"},
            {"id": "opt_56", "textEn": "56", "textSi": "56"},
        ],
        "correctAnswer": "opt_82",
        "hintEn": "Look at the tens digit first: 4 tens, 8 tens, 7 tens, or 5 tens?",
        "hintSi": "පළමුව දහස්ථානයේ අගය බලන්න: 49, 82, 78, 56 අතුරින් වැඩිම දහය ඇත්තේ කුමන සංඛ්‍යාවටද?",
        "explanationEn": "82 has 8 tens, which is greater than all others.",
        "explanationSi": "82 හි දහස්ථානය 8ක් වන බැවින් එය විශාලතම සංඛ්‍යාව වේ."
    },
    {
        "questionId": "g2_word_sub_04",
        "grade": 2,
        "skillId": "word_problems",
        "skillName": "Word Problems",
        "skillNameSi": "ගැටලු විසඳීම",
        "difficulty": "medium",
        "questionType": "numeric",
        "promptEn": "Sahan had 20 pencils. He gave 5 pencils to his sister. How many pencils does he have now?",
        "promptSi": "සහන් ළඟ පැන්සල් 20ක් තිබුණි. ඔහු ඉන් පැන්සල් 5ක් නංගීට දුන්නේය. දැන් ඔහු ළඟ ඉතිරි පැන්සල් ගණන කීයද?",
        "options": None,
        "correctAnswer": 15,
        "hintEn": "Subtract 5 from 20: 20 - 5.",
        "hintSi": "20න් 5ක් අඩු කරන්න: 20 - 5.",
        "explanationEn": "20 - 5 = 15 pencils.",
        "explanationSi": "20 - 5 = පැන්සල් 15ක් ඉතිරි වේ."
    },

    # =========================================================================
    # GRADE 3
    # =========================================================================
    {
        "questionId": "g3_place_val_01",
        "grade": 3,
        "skillId": "place_value",
        "skillName": "3-Digit Place Value",
        "skillNameSi": "ස්ථානීය අගය (සියය, දහය, එක)",
        "difficulty": "medium",
        "questionType": "multiple_choice",
        "promptEn": "In the number 648, what is the place value of digit 4?",
        "promptSi": "648 සංඛ්‍යාවේ '4' ඉලක්කමේ ස්ථානීය අගය කොපමණද?",
        "options": [
            {"id": "opt_4", "textEn": "4 (Ones)", "textSi": "4 (එකස්ථානය)"},
            {"id": "opt_40", "textEn": "40 (Tens)", "textSi": "40 (දහස්ථානය)"},
            {"id": "opt_400", "textEn": "400 (Hundreds)", "textSi": "400 (සියස්ථානය)"},
            {"id": "opt_48", "textEn": "48", "textSi": "48"},
        ],
        "correctAnswer": "opt_40",
        "hintEn": "6 is in the hundreds place, 4 is in the tens place, 8 is in the ones place.",
        "hintSi": "6 ඇත්තේ සියස්ථානයේය, 4 ඇත්තේ දහස්ථානයේය, 8 ඇත්තේ එකස්ථානයේය.",
        "explanationEn": "The digit 4 represents 4 tens, which equals 40.",
        "explanationSi": "4 ඉලක්කම දහස්ථානයේ ඇති බැවින් එහි අගය 40කි."
    },
    {
        "questionId": "g3_mult_table_02",
        "grade": 3,
        "skillId": "multiplication",
        "skillName": "Multiplication Facts",
        "skillNameSi": "ගුණකිරීමේ චක්‍ර",
        "difficulty": "easy",
        "questionType": "numeric",
        "promptEn": "Calculate: 5 × 6 =",
        "promptSi": "අගය ගණනය කරන්න: 5 × 6 =",
        "options": None,
        "correctAnswer": 30,
        "hintEn": "Count by fives 6 times: 5, 10, 15, 20, 25, 30.",
        "hintSi": "5 බැගින් 6 වතාවක් ගණන් කරන්න: 5, 10, 15, 20, 25, 30.",
        "explanationEn": "5 × 6 = 30.",
        "explanationSi": "5 වරක් 6 සමාන වේ 30ට."
    },
    {
        "questionId": "g3_fraction_half_03",
        "grade": 3,
        "skillId": "fractions",
        "skillName": "Fraction Foundations",
        "skillNameSi": "භාග පිළිබඳ මූලික සංකල්ප",
        "difficulty": "medium",
        "questionType": "multiple_choice",
        "promptEn": "A cake is cut into 4 equal slices. Nuwan eats 1 slice. What fraction of the cake did Nuwan eat?",
        "promptSi": "කේක් ගෙඩියක් සමාන කොටස් 4කට කපන ලදී. නුවන් ඉන් 1 කොටසක් කෑවේය. නුවන් කෑවේ කේක් ගෙඩියෙන් කවර භාගයක්ද?",
        "visualRepresentation": {
            "type": "fraction_circle",
            "totalParts": 4,
            "shadedParts": 1
        },
        "options": [
            {"id": "opt_half", "textEn": "1/2 (One-half)", "textSi": "1/2 (දෙකෙන් එක)"},
            {"id": "opt_quarter", "textEn": "1/4 (One-fourth / Quarter)", "textSi": "1/4 (හතරෙන් එක / කාල)"},
            {"id": "opt_three_quarters", "textEn": "3/4 (Three-fourths)", "textSi": "3/4 (හතරෙන් තුන)"},
            {"id": "opt_whole", "textEn": "4/4 (Whole cake)", "textSi": "4/4 (සම්පූර්ණ කේක්)"},
        ],
        "correctAnswer": "opt_quarter",
        "hintEn": "There are 4 equal parts total (denominator), and 1 part taken (numerator).",
        "hintSi": "සම්පූර්ණ කොටස් ගණන 4කි (හරය), කෑ කොටස් ගණන 1කි (ලවය).",
        "explanationEn": "1 slice out of 4 equal parts is 1/4.",
        "explanationSi": "සමාන කොටස් 4කින් 1 කොටසක් යනු 1/4 (හතරෙන් එක) වේ."
    },

    # =========================================================================
    # GRADE 4
    # =========================================================================
    {
        "questionId": "g4_mult_div_01",
        "grade": 4,
        "skillId": "multiplication_division",
        "skillName": "Division & Equal Sharing",
        "skillNameSi": "බෙදීම හා සමානව බෙදාදීම",
        "difficulty": "medium",
        "questionType": "numeric",
        "promptEn": "Divide 72 by 8: 72 ÷ 8 =",
        "promptSi": "72 අටෙන් බෙදන්න: 72 ÷ 8 =",
        "options": None,
        "correctAnswer": 9,
        "hintEn": "Think: What number multiplied by 8 gives 72? (8 × ? = 72)",
        "hintSi": "8 කීයෙන් ගුණ කළ විට 72 ලැබේ දැයි සිතන්න (8 × ? = 72).",
        "explanationEn": "8 × 9 = 72, so 72 ÷ 8 = 9.",
        "explanationSi": "8 × 9 = 72 බැවින් 72 ÷ 8 = 9 වේ."
    },
    {
        "questionId": "g4_equiv_frac_02",
        "grade": 4,
        "skillId": "fractions",
        "skillName": "Equivalent Fractions",
        "skillNameSi": "තුල්‍ය භාග",
        "difficulty": "medium",
        "questionType": "multiple_choice",
        "promptEn": "Which fraction is equivalent to 1/2?",
        "promptSi": "1/2 (දෙකෙන් එක) භාගයට තුල්‍ය වන භාගය කුමක්ද?",
        "options": [
            {"id": "opt_2_4", "textEn": "2/4", "textSi": "2/4"},
            {"id": "opt_2_3", "textEn": "2/3", "textSi": "2/3"},
            {"id": "opt_1_3", "textEn": "1/3", "textSi": "1/3"},
            {"id": "opt_3_4", "textEn": "3/4", "textSi": "3/4"},
        ],
        "correctAnswer": "opt_2_4",
        "hintEn": "Multiply both the top and bottom of 1/2 by 2.",
        "hintSi": "1/2 හි ලවය සහ හරය යන දෙකම 2න් ගුණ කරන්න: (1×2)/(2×2).",
        "explanationEn": "(1 × 2) / (2 × 2) = 2/4. Both represent one-half.",
        "explanationSi": "(1 × 2) / (2 × 2) = 2/4. 1/2 සහ 2/4 යන දෙකෙන්ම අඩක් නියෝජනය වේ."
    },
    {
        "questionId": "g4_perimeter_03",
        "grade": 4,
        "skillId": "measurement_geometry",
        "skillName": "Perimeter of Shapes",
        "skillNameSi": "පරිමිතිය මැනීම",
        "difficulty": "hard",
        "questionType": "multiple_choice",
        "promptEn": "A rectangle garden has a length of 6 meters and a width of 4 meters. What is its perimeter?",
        "promptSi": "සෘජුකෝණාස්‍රාකාර මල් පාත්තියක දිග මීටර් 6ක් සහ පළල මීටර් 4කි. එහි පරිමිතිය කොපමණද?",
        "visualRepresentation": {
            "type": "rectangle_dimensions",
            "length": 6,
            "width": 4,
            "unit": "m"
        },
        "options": [
            {"id": "opt_10", "textEn": "10 m", "textSi": "මීටර් 10"},
            {"id": "opt_20", "textEn": "20 m", "textSi": "මීටර් 20"},
            {"id": "opt_24", "textEn": "24 m", "textSi": "මීටර් 24"},
            {"id": "opt_16", "textEn": "16 m", "textSi": "මීටර් 16"},
        ],
        "correctAnswer": "opt_20",
        "hintEn": "Perimeter is the distance all the way around: 6 + 4 + 6 + 4.",
        "hintSi": "පරිමිතිය යනු වටේ ඇති සියලු පැතිවල එකතුවයි: 6 + 4 + 6 + 4.",
        "explanationEn": "Perimeter = (2 × 6) + (2 × 4) = 12 + 8 = 20 meters.",
        "explanationSi": "පරිමිතිය = 6 + 4 + 6 + 4 = මීටර් 20."
    },

    # =========================================================================
    # GRADE 5
    # =========================================================================
    {
        "questionId": "g5_decimals_01",
        "grade": 5,
        "skillId": "decimals",
        "skillName": "Decimals Addition",
        "skillNameSi": "දශම සංඛ්‍යා එකතු කිරීම",
        "difficulty": "medium",
        "questionType": "multiple_choice",
        "promptEn": "What is 3.4 + 2.8?",
        "promptSi": "3.4 + 2.8 හි අගය කීයද?",
        "options": [
            {"id": "opt_5_2", "textEn": "5.2", "textSi": "5.2"},
            {"id": "opt_6_2", "textEn": "6.2", "textSi": "6.2"},
            {"id": "opt_6_12", "textEn": "6.12", "textSi": "6.12"},
            {"id": "opt_5_12", "textEn": "5.12", "textSi": "5.12"},
        ],
        "correctAnswer": "opt_6_2",
        "hintEn": "Add the tenths: 4 + 8 = 12 tenths (1 one and 2 tenths). Then add 3 + 2 + 1.",
        "hintSi": "දශමස්ථානය එකතු කරන්න: 4 + 8 = 12 (1ක් සහ දශම 2ක්). පසුව 3 + 2 + 1 = 6.",
        "explanationEn": "3.4 + 2.8 = 6.2.",
        "explanationSi": "3.4 + 2.8 = 6.2."
    },
    {
        "questionId": "g5_fraction_add_02",
        "grade": 5,
        "skillId": "fractions",
        "skillName": "Fractions with Common Denominators",
        "skillNameSi": "සමාන හර ඇති භාග එකතු කිරීම",
        "difficulty": "easy",
        "questionType": "multiple_choice",
        "promptEn": "Calculate: 2/7 + 3/7 =",
        "promptSi": "සුළු කරන්න: 2/7 + 3/7 =",
        "options": [
            {"id": "opt_5_14", "textEn": "5/14", "textSi": "5/14"},
            {"id": "opt_5_7", "textEn": "5/7", "textSi": "5/7"},
            {"id": "opt_6_7", "textEn": "6/7", "textSi": "6/7"},
            {"id": "opt_1_7", "textEn": "1/7", "textSi": "1/7"},
        ],
        "correctAnswer": "opt_5_7",
        "hintEn": "When denominators are the same, keep the bottom number 7 and add the top numbers: 2 + 3.",
        "hintSi": "හරයන් සමාන විට, හරය 7 එලෙසම තබා ලවයන් එකතු කරන්න: 2 + 3.",
        "explanationEn": "2/7 + 3/7 = (2 + 3)/7 = 5/7.",
        "explanationSi": "හරය සමාන බැවින් 2/7 + 3/7 = 5/7."
    },
    {
        "questionId": "g5_num_pattern_03",
        "grade": 5,
        "skillId": "number_patterns",
        "skillName": "Number Patterns & Sequences",
        "skillNameSi": "සංඛ්‍යා රටා හා අනුක්‍රම",
        "difficulty": "medium",
        "questionType": "numeric",
        "promptEn": "What is the next number in this pattern? 4, 8, 12, 16, __",
        "promptSi": "පහත සංඛ්‍යා රටාවේ ඊළඟට ලැබෙන සංඛ්‍යාව කුමක්ද? 4, 8, 12, 16, __",
        "options": None,
        "correctAnswer": 20,
        "hintEn": "The numbers are increasing by 4 each step (multiples of 4): 16 + 4.",
        "hintSi": "සෑම පියවරකදීම 4 බැගින් වැඩි වේ (4 ගුණාකාර): 16 + 4.",
        "explanationEn": "The pattern adds 4 to each term: 16 + 4 = 20.",
        "explanationSi": "4 බැගින් වැඩිවන රටාවක් බැවින් 16 + 4 = 20 වේ."
    },
]


def get_questions_for_grade(grade: int, include_answers: bool = False) -> List[Dict[str, Any]]:
    """
    Returns question bank items tailored to the specified grade level.
    If include_answers is False, the 'correctAnswer' and 'explanation' fields are omitted.
    """
    grade_items = [q for q in QUESTION_BANK if q["grade"] == grade]
    # Fallback to Grade 1 if no items for grade
    if not grade_items:
        grade_items = [q for q in QUESTION_BANK if q["grade"] == 1]

    if include_answers:
        return grade_items

    public_items = []
    for item in grade_items:
        pub = {
            "questionId": item["questionId"],
            "grade": item["grade"],
            "skillId": item["skillId"],
            "skillName": item["skillName"],
            "skillNameSi": item["skillNameSi"],
            "difficulty": item["difficulty"],
            "questionType": item["questionType"],
            "promptEn": item["promptEn"],
            "promptSi": item["promptSi"],
            "visualRepresentation": item.get("visualRepresentation"),
            "options": item.get("options"),
            "hintEn": item["hintEn"],
            "hintSi": item["hintSi"],
        }
        public_items.append(pub)

    return public_items


def get_question_by_id(question_id: str) -> Optional[Dict[str, Any]]:
    """Look up a specific question by questionId from the question bank."""
    for item in QUESTION_BANK:
        if item["questionId"] == question_id:
            return item
    return None
