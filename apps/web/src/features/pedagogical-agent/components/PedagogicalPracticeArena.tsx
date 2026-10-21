import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Check,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowLeft,
  Sparkles,
  Star,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { PedagogicalCompanion } from './PedagogicalCompanion';
import { LearnerStateHUD } from './LearnerStateHUD';
import { usePedagogicalAgent } from '../hooks/usePedagogicalAgent';
import { useInteractionLogger } from '../hooks/useInteractionLogger';
import { useLearnerState } from '../hooks/useLearnerState';
import { useAgentStore } from '../store/useAgentStore';
import type { HintLevel } from '../types/agent.types';

export interface PracticeQuestion {
  id: string;
  stepNumber: number;
  category: string;
  categorySi: string;
  levelTitle: string;
  num1: number;
  num2: number;
  operator: '+' | '-';
  answer: number;
  options: number[];
  defaultGuidanceEn: string;
  defaultGuidanceSi: string;
  hints: {
    1: { en: string; si: string };
    2: { en: string; si: string };
    3: { en: string; si: string };
    4: { en: string; si: string };
  };
  explainStep: {
    en: string;
    si: string;
  };
}

const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: 'math_q_add_01',
    stepNumber: 1,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 4,
    num2: 5,
    operator: '+',
    answer: 9,
    options: [7, 8, 9, 10],
    defaultGuidanceEn:
      '"Look at 4 and 5. Count the dots step by step!"',
    defaultGuidanceSi: '4 ට තව 5ක් එකතු කරමු! පහළ තිත් ටික එකින් එක ගණන් කර බලන්න.',
    hints: {
      1: {
        en: 'Hint 1: Look at 4 and 5. We are adding them together (+)!',
        si: 'හෝඩුවාව 1: 4 ට තව 5ක් එකතු කරමු (+)!',
      },
      2: {
        en: 'Hint 2: Count the blue dots (4), then count the green dots (5) from left to right!',
        si: 'හෝඩුවාව 2: නිල් තිත් 4 ගණන් කරලා, එතැන් සිට කොළ තිත් 5ත් එක දිගට ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 4 ➔ 5, 6, 7, 8, 9... තිත් ඔක්කොම එකතු කළාම කීයද?',
        si: 'හෝඩුවාව 3: 4 න් පටන් අරන් ඉදිරියට ගණන් කරමු: 5, 6, 7, 8, 9!',
      },
      4: {
        en: 'Hint 4: 4 + 4 = 8 යි. තව 1ක් දැම්මම 9 වෙනවා! කාඩ් එකෙන් 9 තෝරන්න.',
        si: 'හෝඩුවාව 4: 4 + 4 = 8 යි. තව 1ක් දැම්මම 9 වෙනවා! කාඩ් එකෙන් 9 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: Start at 4, count 5 more: 5, 6, 7, 8, 9.',
      si: 'පියවර පැහැදිලි කිරීම: 4 ට 4ක් දැම්මොත් 8යි. තව 1ක් එකතු කළ විට 9 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_02',
    stepNumber: 2,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 5,
    num2: 6,
    operator: '+',
    answer: 11,
    options: [10, 11, 12, 13],
    defaultGuidanceEn:
      '"5 + 5 makes 10! How much is 1 more than 10?"',
    defaultGuidanceSi: '5 + 5 = 10 බව ඔයා දන්නවා! 10 ට තව 1ක් දැම්මම කීයද?',
    hints: {
      1: {
        en: 'Hint 1: 5 and 6 are next-door numbers!',
        si: 'හෝඩුවාව 1: 5 ට තව 6ක් එකතු කරමු!',
      },
      2: {
        en: 'Hint 2: Count the 5 blue dots, then count the 6 green dots one by one!',
        si: 'හෝඩුවාව 2: නිල් තිත් 5 ගණන් කර, එතැන් සිට කොළ තිත් 6 එකින් එක ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 5 + 5 = 10 යි. 6 කියන්නේ 5 ට වඩා 1ක් වැඩියි. එහෙනම් 10 ට තව 1ක් දාන්න!',
        si: 'හෝඩුවාව 3: 5 + 5 = 10 යි. 6 ට තව 1ක් වැඩි නිසා 10 ට තව 1ක් දාන්න!',
      },
      4: {
        en: 'Hint 4: 10 න් පස්සේ එන ඊළඟ අංකය තමයි 11! කාඩ් එකෙන් 11 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 න් පස්සේ එන ඊළඟ අංකය තමයි 11! කාඩ් එකෙන් 11 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 5 + 5 = 10, then 10 + 1 = 11.',
      si: 'පියවර පැහැදිලි කිරීම: 5 + 5 = 10. තව 1ක් එකතු කළ විට 11 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_03',
    stepNumber: 3,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 6,
    num2: 7,
    operator: '+',
    answer: 13,
    options: [11, 12, 13, 14],
    defaultGuidanceEn:
      '"6 + 6 = 12. Add 1 more!"',
    defaultGuidanceSi: '6 + 6 = 12 බව මතක තබා ගන්න. ඊට තව 1ක් එකතු කරමු.',
    hints: {
      1: {
        en: 'Hint 1: 6 + 7 addition.',
        si: 'හෝඩුවාව 1: 6 ට තව 7ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 6 blue dots, then keep counting the 7 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 6 ගණන් කරලා, එතැන් සිට කොළ තිත් 7 ගණන් කරගෙන යන්න!',
      },
      3: {
        en: 'Hint 3: 6 + 6 = 12 යි. 7 ට තව 1ක් වැඩි නිසා 12 ට තව 1ක් එකතු කරන්න!',
        si: 'හෝඩුවාව 3: 6 + 6 = 12 යි. 7 ට තව 1ක් වැඩි නිසා 12 ට තව 1ක් එකතු කරන්න!',
      },
      4: {
        en: 'Hint 4: 12 ට 1ක් දැම්මම 13 ලැබෙනවා! කාඩ් වලින් 13 තෝරන්න.',
        si: 'හෝඩුවාව 4: 12 ට 1ක් දැම්මම 13 ලැබෙනවා! කාඩ් වලින් 13 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: (6 + 6) + 1 = 12 + 1 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: 6 + 6 = 12. තව 1ක් දැමූ විට 13 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_04',
    stepNumber: 4,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 8,
    num2: 5,
    operator: '+',
    answer: 13,
    options: [12, 13, 14, 15],
    defaultGuidanceEn:
      '"8 needs 2 to make 10. Split 5 into 2 and 3!"',
    defaultGuidanceSi: '8 ට 10 වෙන්න තව 2ක් ඕනෑ. 5 න් 2ක් අරන් 10 හදමු!',
    hints: {
      1: {
        en: 'Hint 1: 8 is very close to 10!',
        si: 'හෝඩුවාව 1: 8 ට තව 5ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the blue dots (8), then count the green dots (5) one by one!',
        si: 'හෝඩුවාව 2: නිල් තිත් 8 ගණන් කර, එතැන් සිට කොළ තිත් 5 එකින් එක එකතු කරන්න!',
      },
      3: {
        en: 'Hint 3: 8 ට 2ක් දැම්මම 10යි. 5 න් ඉතිරි 3 එකතු කර (10 + 3) බලන්න!',
        si: 'හෝඩුවාව 3: 8 ට 2ක් දැම්මම 10යි. 5 න් ඉතිරි 3 එකතු කර (10 + 3) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 ට 3ක් එකතු කළාම 13යි! කාඩ් එකෙන් 13 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 ට 3ක් එකතු කළාම 13යි! කාඩ් එකෙන් 13 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 8 + 2 = 10, then 10 + 3 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: 8 + 2 = 10. ඉතිරි 3 එකතු කළ විට 13 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_05',
    stepNumber: 5,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 7,
    num2: 8,
    operator: '+',
    answer: 15,
    options: [13, 14, 15, 16],
    defaultGuidanceEn:
      '"7 + 7 = 14. 8 is 1 more than 7!"',
    defaultGuidanceSi: '7 + 7 = 14 බව මතක් කරගන්න. 8 ට තව 1ක් එකතු කරමු.',
    hints: {
      1: {
        en: 'Hint 1: 7 + 8 addition.',
        si: 'හෝඩුවාව 1: 7 ට 8ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 7 blue dots and then keep counting the 8 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 7 ගණන් කර, එතැන් සිට කොළ තිත් 8 ගණන් කරගෙන යන්න!',
      },
      3: {
        en: 'Hint 3: 7 + 7 = 14 යි. 8 ට තව 1ක් වැඩි නිසා 14 ට 1ක් එකතු කරන්න!',
        si: 'හෝඩුවාව 3: 7 + 7 = 14 යි. 8 ට තව 1ක් වැඩි නිසා 14 ට 1ක් එකතු කරන්න!',
      },
      4: {
        en: 'Hint 4: 14 ට 1ක් දැම්මම 15 වෙනවා! කාඩ් වලින් 15 තෝරන්න.',
        si: 'හෝඩුවාව 4: 14 ට 1ක් දැම්මම 15 වෙනවා! කාඩ් වලින් 15 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 7 + 7 = 14, then 14 + 1 = 15.',
      si: 'පියවර පැහැදිලි කිරීම: 7 + 7 = 14. තව 1ක් දැමූ විට 15 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_06',
    stepNumber: 6,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 9,
    num2: 4,
    operator: '+',
    answer: 13,
    options: [11, 12, 13, 14],
    defaultGuidanceEn:
      '"9 needs only 1 to become 10! Take 1 from 4."',
    defaultGuidanceSi: '9 ට 10 වෙන්න ඕනෑ 1යි! 4 න් 1ක් 9 ට දෙමු.',
    hints: {
      1: {
        en: 'Hint 1: 9 is 1 step away from 10.',
        si: 'හෝඩුවාව 1: 9 ට තව 4ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 9 blue dots, then count the 4 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 9 ගණන් කර, එතැන් සිට කොළ තිත් 4 දිගටම ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 9 ට 1ක් දැම්මම 10යි. 4 න් ඉතිරි 3 එකතු කර (10 + 3) බලන්න!',
        si: 'හෝඩුවාව 3: 9 ට 1ක් දැම්මම 10යි. 4 න් ඉතිරි 3 එකතු කර (10 + 3) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 + 3 = 13 යි! කාඩ් එකෙන් 13 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 + 3 = 13 යි! කාඩ් එකෙන් 13 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 9 + 1 = 10, then 10 + 3 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: 9 + 1 = 10. ඉතිරි 3 දැමූ විට 13 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_07',
    stepNumber: 7,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 8,
    num2: 8,
    operator: '+',
    answer: 16,
    options: [14, 15, 16, 18],
    defaultGuidanceEn:
      '"Double 8! 8 + 2 makes 10, plus remaining 6!"',
    defaultGuidanceSi: '8 ඒවා දෙකක්! 8 + 2 = 10 හදා ඉතිරි 6 එකතු කරමු.',
    hints: {
      1: {
        en: 'Hint 1: Two identical numbers: 8 + 8.',
        si: 'හෝඩුවාව 1: 8 ට තව 8ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 8 blue dots, then count the 8 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 8 ගණන් කර, එතැන් සිට කොළ තිත් 8 දිගටම ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 8 ට 2ක් දැම්මම 10යි. ඉතිරි 6 එකතු කර (10 + 6) බලන්න!',
        si: 'හෝඩුවාව 3: 8 ට 2ක් දැම්මම 10යි. ඉතිරි 6 එකතු කර (10 + 6) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 ට 6ක් දැම්මම 16 වෙනවා! කාඩ් වලින් 16 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 ට 6ක් දැම්මම 16 වෙනවා! කාඩ් වලින් 16 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: (8 + 2) + 6 = 10 + 6 = 16.',
      si: 'පියවර පැහැදිලි කිරීම: 8 + 2 = 10. ඉතිරි 6 දැමූ විට 16 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_08',
    stepNumber: 8,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 9,
    num2: 6,
    operator: '+',
    answer: 15,
    options: [14, 15, 16, 17],
    defaultGuidanceEn:
      '"Make 10 with 9 + 1, then add 5!"',
    defaultGuidanceSi: '6 න් 1ක් 9 ට දීලා 10 හදමු. ඉතිරි 5 එකතු කරමු.',
    hints: {
      1: {
        en: 'Hint 1: 9 + 6 addition.',
        si: 'හෝඩුවාව 1: 9 ට තව 6ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 9 blue dots, then count the 6 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 9 ගණන් කර, එතැන් සිට කොළ තිත් 6 දිගටම ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 9 ට 1ක් දැම්මම 10යි. 6 න් ඉතිරි 5 එකතු කර (10 + 5) බලන්න!',
        si: 'හෝඩුවාව 3: 9 ට 1ක් දැම්මම 10යි. 6 න් ඉතිරි 5 එකතු කර (10 + 5) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 ට 5ක් දැම්මම 15 වෙනවා! නිවැරදි කාඩ් එක 15 වේ.',
        si: 'හෝඩුවාව 4: 10 ට 5ක් දැම්මම 15 වෙනවා! නිවැරදි කාඩ් එක 15 වේ.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: (9 + 1) + 5 = 10 + 5 = 15.',
      si: 'පියවර පැහැදිලි කිරීම: 9 + 1 = 10. ඉතිරි 5 දැමූ විට 15 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_09',
    stepNumber: 9,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 7,
    num2: 9,
    operator: '+',
    answer: 16,
    options: [15, 16, 17, 18],
    defaultGuidanceEn:
      '"Almost there! Give 1 from 7 to 9 to make 10."',
    defaultGuidanceSi: '7 න් 1ක් 9 ට දීලා 10 හදමු. ඉතිරි 6 එකතු කරමු.',
    hints: {
      1: {
        en: 'Hint 1: 7 + 9 addition.',
        si: 'හෝඩුවාව 1: 7 ට තව 9ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 7 blue dots, then count the 9 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 7 ගණන් කර, එතැන් සිට කොළ තිත් 9 දිගටම ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 9 ට 1ක් දුන්නම 10යි. 7 න් ඉතිරි 6 එකතු කර (10 + 6) බලන්න!',
        si: 'හෝඩුවාව 3: 9 ට 1ක් දැම්මම 10යි. 7 න් ඉතිරි 6 එකතු කර (10 + 6) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 ට 6ක් එකතු කළාම 16 වෙනවා! කාඩ් වලින් 16 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 ට 6ක් එකතු කළාම 16 වෙනවා! කාඩ් වලින් 16 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: (9 + 1) + 6 = 10 + 6 = 16.',
      si: 'පියවර පැහැදිලි කිරීම: 9 + 1 = 10. ඉතිරි 6 දැමූ විට 16 ලැබේ.',
    },
  },
  {
    id: 'math_q_add_10',
    stepNumber: 10,
    category: 'ADDITION MASTERY',
    categorySi: 'එකතු කිරීමේ ප්‍රගුණතාව',
    levelTitle: 'Level 01: Number Adventure',
    num1: 9,
    num2: 8,
    operator: '+',
    answer: 17,
    options: [15, 16, 17, 18],
    defaultGuidanceEn:
      '"Final question! Borrow 1 from 8 to make 10 with 9!"',
    defaultGuidanceSi: 'අවසාන ප්‍රශ්නය! 8 න් 1ක් 9 ට දී 10 හදාගමු.',
    hints: {
      1: {
        en: 'Hint 1: Final challenge: 9 + 8.',
        si: 'හෝඩුවාව 1: 9 ට තව 8ක් එකතු කරමු.',
      },
      2: {
        en: 'Hint 2: Count the 9 blue dots, then count the 8 green dots!',
        si: 'හෝඩුවාව 2: නිල් තිත් 9 ගණන් කර, එතැන් සිට කොළ තිත් 8 දිගටම ගණන් කරන්න!',
      },
      3: {
        en: 'Hint 3: 9 ට 1ක් දැම්මම 10යි. 8 න් ඉතිරි 7 එකතු කර (10 + 7) බලන්න!',
        si: 'හෝඩුවාව 3: 9 ට 1ක් දැම්මම 10යි. 8 න් ඉතිරි 7 එකතු කර (10 + 7) බලන්න!',
      },
      4: {
        en: 'Hint 4: 10 ට 7ක් දැම්මම 17යි! කාඩ් එකෙන් 17 තෝරන්න.',
        si: 'හෝඩුවාව 4: 10 ට 7ක් දැම්මම 17යි! කාඩ් එකෙන් 17 තෝරන්න.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: (9 + 1) + 7 = 10 + 7 = 17.',
      si: 'පියවර පැහැදිලි කිරීම: 9 + 1 = 10. ඉතිරි 7 දැමූ විට 17 ලැබේ.',
    },
  },
];

// Option Card Styles using Teacher Dashboard mq-* surface & border tokens
const OPTION_CARD_STYLES = [
  {
    bg: 'bg-mq-surface-blue hover:bg-[#dcebff]',
    border: 'border-mq-primary/35 hover:border-mq-primary',
    text: 'text-mq-primary-dark',
  },
  {
    bg: 'bg-mq-surface-yellow hover:bg-[#ffefc7]',
    border: 'border-mq-accent-yellow/55 hover:border-mq-warning',
    text: 'text-[#6E4D11]',
  },
  {
    bg: 'bg-mq-surface-green hover:bg-[#d8f3e8]',
    border: 'border-mq-secondary/50 hover:border-mq-success',
    text: 'text-mq-success',
  },
  {
    bg: 'bg-mq-surface-soft hover:bg-[#e1f0fa]',
    border: 'border-mq-border-strong hover:border-mq-primary',
    text: 'text-mq-primary-dark',
  },
];

export interface PedagogicalPracticeArenaProps {
  studentId?: string;
  parentId?: string;
  studentName?: string;
  studentGrade?: number;
  studentAvatar?: string;
  showResearchHUD?: boolean;
  isGameActive?: boolean;
  onStartGame?: () => void;
  onExitGame?: () => void;
  onRewardEarned?: (starsDelta: number, coinsDelta: number) => void;
  onProgressUpdate?: (progressPercent: number) => void;
  onSessionDataSync?: (summary: {
    completedSteps: number[];
    hintAwareKnowledge: number;
    standardKnowledge: number;
    totalHintsUsed: number;
    cognitiveState?: string;
    fsmState?: string;
    sessionComplete?: boolean;
  }) => void;
}

/**
 * PedagogicalPracticeArena (Practice Game + MathBot 3000 3D Companion)
 * Standalone component inside `features/pedagogical-agent/components/`
 * linked into the `Practice` section of `StudentDashboardPage`.
 */
export const PedagogicalPracticeArena: React.FC<PedagogicalPracticeArenaProps> = ({
  studentId = 'student_nethmi_g3',
  parentId = 'parent_demo',
  studentName = 'Nethmi',
  studentGrade = 3,
  studentAvatar = '🦉',
  showResearchHUD = false,
  isGameActive,
  onStartGame,
  onExitGame,
  onRewardEarned,
  onProgressUpdate,
  onSessionDataSync,
}) => {
  const { playAction, onGameEvent, resetHints } = usePedagogicalAgent();
  const currentHintLevel = useAgentStore((state) => state.currentHintLevel);
  const requestNextHint = useAgentStore((state) => state.requestNextHint);

  const [internalGameActive, setInternalGameActive] = useState<boolean>(false);
  const isSessionPlaying = isGameActive !== undefined ? isGameActive : internalGameActive;

  // Start at Question 1 (index 0) and auto-advance across all 10 questions
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [explanationActive, setExplanationActive] = useState<boolean>(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeQuestion = PRACTICE_QUESTIONS[currentQuestionIdx];

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Reset practice session state when switching to a different child profile
  useEffect(() => {
    setCurrentQuestionIdx(0);
    setCompletedSteps([]);
    setIsSessionComplete(false);
    setSelectedOption(null);
    setAnswerFeedback(null);
    setExplanationActive(false);
    resetHints();
  }, [studentId, parentId, resetHints]);

  const sessionId = `sess_${parentId}_${studentId}`;

  // Telemetry & Real-time Pedagogical Engine (BKT + 10-Rule FSM) across all 10 questions
  const { logs, metrics, logAnswer, logHint, clearLogs } = useInteractionLogger({
    sessionId,
    studentId,
    parentId,
    studentName,
    grade: studentGrade,
    questionId: activeQuestion.id,
    concept: 'single_digit_addition',
  });

  const {
    learnerState,
    bktComparison,
    fsmDecision,
    isLoading: isEngineLoading,
    evaluateInteractions,
    triggerFSMContext,
  } = useLearnerState({
    studentId,
    parentId,
    sessionId,
    autoIntervene: true,
  });

  useEffect(() => {
    if (logs.length > 0) {
      evaluateInteractions(logs);
    }
  }, [logs, evaluateInteractions]);

  useEffect(() => {
    if (onProgressUpdate) {
      const pct = Math.round((completedSteps.length / PRACTICE_QUESTIONS.length) * 100);
      onProgressUpdate(pct);
    }
  }, [completedSteps, onProgressUpdate]);

  useEffect(() => {
    if (onSessionDataSync && logs.length > 0) {
      onSessionDataSync({
        completedSteps,
        hintAwareKnowledge: bktComparison.hintAwareKnowledge,
        standardKnowledge: bktComparison.standardKnowledge,
        totalHintsUsed: metrics.totalHintsCount,
        cognitiveState: learnerState?.cognitiveState,
        fsmState: fsmDecision.fsmState,
        sessionComplete: isSessionComplete,
      });
    }
  }, [
    completedSteps,
    bktComparison.hintAwareKnowledge,
    bktComparison.standardKnowledge,
    metrics.totalHintsCount,
    learnerState?.cognitiveState,
    fsmDecision.fsmState,
    isSessionComplete,
    logs.length,
    onSessionDataSync,
  ]);

  const handleGoToStep = (idx: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsSessionComplete(false);
    setCurrentQuestionIdx(idx);
    setSelectedOption(null);
    setAnswerFeedback(null);
    setExplanationActive(false);
    resetHints();
  };

  const handleRestartFullSession = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearLogs();
    setCompletedSteps([]);
    setIsSessionComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setAnswerFeedback(null);
    setExplanationActive(false);
    resetHints();
    playAction('wave', {
      message: `${studentName}, අපි ප්‍රශ්න 10 මුලසිට නැවත පටන් ගමු!`,
      duration: 3,
    });
  };

  const handleStartPractice = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    clearLogs();
    setCompletedSteps([]);
    setIsSessionComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setAnswerFeedback(null);
    setExplanationActive(false);
    resetHints();
    setInternalGameActive(true);
    onStartGame?.();
    playAction('wave', {
      message: `ආයුබෝවන් ${studentName}! අපි ප්‍රශ්න 10 පුහුණුව ආරම්භ කරමු!`,
      duration: 3.5,
    });
  };

  const handleExitPractice = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setInternalGameActive(false);
    onExitGame?.();
  };

  const handleSelectOption = (optionValue: number) => {
    // Prevent duplicate clicks while auto-advancing after a correct answer
    if (answerFeedback === 'correct' || isSessionComplete) return;

    setSelectedOption(optionValue);
    const isCorrect = optionValue === activeQuestion.answer;

    // Log telemetry event with response time, idle time, and current hint level
    logAnswer(optionValue, isCorrect, currentHintLevel);

    if (isCorrect) {
      setAnswerFeedback('correct');
      onRewardEarned?.(25, 10);
      if (!completedSteps.includes(activeQuestion.stepNumber)) {
        setCompletedSteps((prev) => [...prev, activeQuestion.stepNumber]);
      }
      onGameEvent('CORRECT_ANSWER');

      // Auto-advance to the next question after 1.35s so calculations proceed across all 10 questions
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (currentQuestionIdx < PRACTICE_QUESTIONS.length - 1) {
          handleGoToStep(currentQuestionIdx + 1);
        } else {
          setIsSessionComplete(true);
        }
      }, 1350);
    } else {
      setAnswerFeedback('wrong');
      onGameEvent('WRONG_ANSWER');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < PRACTICE_QUESTIONS.length - 1) {
      handleGoToStep(currentQuestionIdx + 1);
      playAction('wave', {
        message: 'ඊළඟ ගැටලුව බලමු! ඔයාට පුළුවන්!',
        duration: 3,
      });
    } else {
      setIsSessionComplete(true);
    }
  };

  const handleHintBoardRequest = (level: HintLevel) => {
    if (level === 0) return;
    setExplanationActive(false);
    logHint(level);

    const hintData = activeQuestion.hints[level as 1 | 2 | 3 | 4];
    const animMap = {
      1: 'smallHint',
      2: 'guidedHint',
      3: 'stepByStep',
      4: 'explain',
    } as const;

    playAction(animMap[level as 1 | 2 | 3 | 4], {
      message: hintData.si,
      duration: 4,
    });
  };

  const handleGetHint = () => {
    const nextLvl = currentHintLevel < 4 ? requestNextHint() : 4;
    handleHintBoardRequest(nextLvl);
  };

  const activeHintBoardHints = {
    1: { title: 'පොඩි හෝඩුවාවක්', description: activeQuestion.hints[1].si },
    2: { title: 'තිත් ගණන් කිරීම', description: activeQuestion.hints[2].si },
    3: { title: 'පියවරෙන් පියවර', description: activeQuestion.hints[3].si },
    4: { title: 'ගැටලුව විසඳන හැටි', description: activeQuestion.hints[4].si },
  };

  const bktConfidencePct =
    logs.length > 0 ? Math.round(bktComparison.hintAwareKnowledge * 100) : 50;

  // ===============================================================
  // 1. INITIAL PRACTICE START SCREEN (Before clicking Start)
  // ===============================================================
  if (!isSessionPlaying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-4 animate-fade-in">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-mq-border shadow-sm overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-mq-primary-dark via-mq-primary to-mq-secondary" />

          <div className="p-6 sm:p-10 text-center space-y-6">
            {/* Top Icon, Active Child Badge & Category Pill */}
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-mq-surface-blue to-mq-surface-green border border-mq-primary/25 flex items-center justify-center mx-auto shadow-xs text-3xl">
                {studentAvatar}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-mq-surface-green border border-mq-secondary/35 text-xs font-extrabold text-mq-success">
                  <span>{studentAvatar}</span>
                  <span>
                    {studentName} · Grade {studentGrade}
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-mq-surface-blue border border-mq-primary/20 text-xs font-extrabold uppercase tracking-wider text-mq-primary-dark">
                  <Dumbbell size={13} className="text-mq-primary" />
                  <span>එකතු කිරීමේ ප්‍රගුණතාව · ADDITION MASTERY</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong sinhala">
                ආයුබෝවන් {studentName}! ගණිත පුහුණුව ආරම්භ කරමුද?
              </h1>
              <p className="text-sm sm:text-base font-bold text-mq-primary-dark">
                Ready to Start Maths Practice, {studentName}? (Level 01: Number Adventure)
              </p>
              <p className="text-xs sm:text-sm text-mq-text-muted max-w-lg mx-auto leading-relaxed sinhala">
                ප්‍රශ්න 10 කින් යුත් මෙම පුහුණු වටයේදී ඔයාට පියවරෙන් පියවර උදව් කරන්න{' '}
                <strong className="text-mq-text-strong">3D MathBot</strong> සූදානමින් සිටිනවා!
              </p>
            </div>

            {/* 3 Feature Highlight Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-mq-surface-blue/70 border border-mq-primary/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-mq-primary flex items-center justify-center font-extrabold shadow-xs shrink-0">
                  10
                </div>
                <div>
                  <p className="text-xs font-extrabold text-mq-text-strong sinhala">ප්‍රශ්න 10 ක්</p>
                  <p className="text-[11px] text-mq-text-muted">Auto-Advance</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-mq-surface-green/80 border border-mq-secondary/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-mq-success flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-mq-text-strong sinhala">3D හෝඩුවාවන්</p>
                  <p className="text-[11px] text-mq-text-muted">4 Hint Levels</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-mq-surface-yellow/80 border border-mq-accent-yellow/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-mq-warning flex items-center justify-center shadow-xs shrink-0">
                  <Star size={18} className="fill-mq-accent-yellow text-mq-warning" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-mq-text-strong sinhala">තරු සහ කාසි</p>
                  <p className="text-[11px] text-mq-text-muted">+25 Stars / Q</p>
                </div>
              </div>
            </div>

            {/* Start Practice CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartPractice}
                className="btn btn-primary py-3.5 px-8 rounded-full text-sm sm:text-base font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all inline-flex items-center gap-3 cursor-pointer sinhala"
              >
                <Play size={18} className="fill-white" />
                <span>පුහුණුව ආරම්භ කරන්න · Start Practice</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // 2. ACTIVE GAME + 3D AGENT WORKSPACE (Sidebar Collapsed)
  // ===============================================================
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start animate-fade-in">
      {/* =================================================== */}
      {/* CENTER COLUMN (8 cols): Practice Game Arena         */}
      {/* =================================================== */}
      <div className="xl:col-span-8 space-y-3.5">
        {/* 1. Distraction-Free 10-Step Question Progress Bar Only (ADHD Friendly) */}
        <div className="bg-white px-4 py-3 sm:px-6 sm:py-3.5 rounded-2xl border border-mq-border shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[420px]">
            {PRACTICE_QUESTIONS.map((q, idx) => {
              const isCurrent = idx === currentQuestionIdx && !isSessionComplete;
              const isDone = completedSteps.includes(q.stepNumber);

              return (
                <React.Fragment key={q.id}>
                  <button
                    type="button"
                    onClick={() => handleGoToStep(idx)}
                    title={`Question ${q.stepNumber}: ${q.num1} ${q.operator} ${q.num2}`}
                    className={`relative flex items-center justify-center rounded-full font-extrabold transition-all cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'w-10 h-10 bg-mq-surface-blue text-mq-primary-dark border-2 border-mq-primary text-sm sm:text-base shadow-xs scale-105'
                        : isDone
                        ? 'w-8 h-8 sm:w-9 sm:h-9 bg-mq-success text-white text-xs sm:text-sm'
                        : 'w-8 h-8 sm:w-9 sm:h-9 bg-mq-surface-soft text-mq-text-muted border border-mq-border text-xs sm:text-sm hover:border-mq-primary'
                    }`}
                  >
                    {isDone && !isCurrent ? <Check size={16} strokeWidth={3} /> : q.stepNumber}
                  </button>

                  {idx < PRACTICE_QUESTIONS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1.5 rounded-full transition-colors ${
                        isDone ? 'bg-mq-success' : 'bg-mq-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {isSessionComplete ? (
          /* =================================================== */
          /* 10-QUESTION SESSION COMPLETED SUMMARY CARD          */
          /* =================================================== */
          <div className="bg-white rounded-2xl border border-mq-border shadow-xs overflow-hidden animate-fade-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-mq-success via-mq-secondary to-mq-primary" />

            <div className="p-6 sm:p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-mq-surface-green border border-mq-secondary/40 flex items-center justify-center mx-auto text-mq-success shadow-xs">
                <Trophy size={32} />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-mq-success sinhala">
                  ප්‍රශ්න 10 ම සාර්ථකව අවසන්! 🎉
                </h2>
                <p className="text-xs sm:text-sm text-mq-text-muted sinhala">
                  ප්‍රශ්න 10 තුළ ඔබේ සමස්ත BKT ප්‍රගුණතා මට්ටම සහ FSM ප්‍රතිඵල පහතින් බලන්න:
                </p>
              </div>

              {/* 3 Cumulative BKT & Hint Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="p-3.5 rounded-2xl bg-mq-surface-green border border-mq-secondary/40">
                  <p className="text-[11px] font-bold text-mq-text-muted uppercase">
                    Hint-Aware P(L)
                  </p>
                  <p className="text-2xl font-extrabold text-mq-success mt-0.5">
                    {Math.round(bktComparison.hintAwareKnowledge * 100)}%
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-mq-surface-blue border border-mq-primary/25">
                  <p className="text-[11px] font-bold text-mq-text-muted uppercase">
                    Standard P(L)
                  </p>
                  <p className="text-2xl font-extrabold text-mq-primary-dark mt-0.5">
                    {Math.round(bktComparison.standardKnowledge * 100)}%
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-mq-surface-yellow border border-mq-accent-yellow/50">
                  <p className="text-[11px] font-bold text-mq-text-muted uppercase">Hints Used</p>
                  <p className="text-2xl font-extrabold text-[#6E4D11] mt-0.5">
                    {metrics.totalHintsCount}
                  </p>
                </div>
              </div>

              {/* Restart 10 Questions & Exit Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestartFullSession}
                  className="btn btn-primary py-3 px-7 rounded-full text-sm font-extrabold shadow-sm hover:shadow-md inline-flex items-center gap-2.5 cursor-pointer sinhala"
                >
                  <RotateCcw size={16} />
                  <span>ප්‍රශ්න 10 නැවත මුලසිට ආරම්භ කරන්න</span>
                </button>

                <button
                  type="button"
                  onClick={handleExitPractice}
                  className="btn btn-secondary py-3 px-6 rounded-full text-sm font-bold inline-flex items-center gap-2 cursor-pointer sinhala"
                >
                  <ArrowLeft size={16} />
                  <span>ඉවත් වන්න · Exit</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Large, Clear Main Math Equation Card (ADHD Friendly) */}
            <div className="bg-white rounded-3xl border border-mq-border shadow-xs overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-mq-primary-dark via-mq-primary to-mq-secondary" />

              <div className="py-6 sm:py-8 px-6 text-center space-y-3">
                <div className="text-5xl sm:text-6xl font-extrabold text-mq-text-strong tracking-wider flex items-center justify-center gap-4 sm:gap-6 select-none">
                  <span>{activeQuestion.num1}</span>
                  <span className="text-mq-primary">{activeQuestion.operator}</span>
                  <span>{activeQuestion.num2}</span>
                  <span>=</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.3em] px-3 py-1 rounded-2xl transition-all ${
                      answerFeedback === 'correct'
                        ? 'bg-mq-success-bg text-mq-success border-2 border-mq-success/40'
                        : answerFeedback === 'wrong'
                        ? 'bg-mq-danger-bg text-mq-danger border-2 border-mq-danger/40'
                        : 'text-mq-border-strong'
                    }`}
                  >
                    {selectedOption !== null ? selectedOption : '?'}
                  </span>
                </div>

                {/* Visual Dots Aid when Hint Level >= 2 or Explanation is active - Large, concrete & count-friendly for ADHD kids */}
                {(currentHintLevel >= 2 || explanationActive) && (
                  <div className="pt-2 pb-1 flex flex-col items-center justify-center gap-2.5 animate-fade-in">
                    {/* Visual Counting Container */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 bg-stone-50/90 p-3 sm:p-4 rounded-3xl border-2 border-dashed border-mq-border max-w-xl mx-auto shadow-2xs">
                      {/* First Number Counters */}
                      <div className="flex flex-col items-center gap-1.5 bg-white px-3.5 py-2 rounded-2xl border border-sky-200 shadow-2xs">
                        <span className="text-xs font-black text-sky-800 flex items-center gap-1">
                          <span>{activeQuestion.num1}</span>
                          <span className="text-[11px] font-bold text-sky-600">(නිල් තිත්)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: activeQuestion.num1 }).map((_, i) => (
                            <span
                              key={`dot1-${i}`}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs transition-transform hover:scale-110 select-none animate-bounce"
                              style={{ animationDelay: `${i * 70}ms`, animationDuration: '1.2s' }}
                              title={`තිත ${i + 1}`}
                            >
                              {i + 1}
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="text-2xl font-black text-mq-primary select-none">+</span>

                      {/* Second Number Counters */}
                      <div className="flex flex-col items-center gap-1.5 bg-white px-3.5 py-2 rounded-2xl border border-emerald-200 shadow-2xs">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                          <span>{activeQuestion.num2}</span>
                          <span className="text-[11px] font-bold text-emerald-600">(කොළ තිත්)</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: activeQuestion.num2 }).map((_, i) => {
                            const totalCountIndex = activeQuestion.num1 + i + 1;
                            return (
                              <span
                                key={`dot2-${i}`}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs transition-transform hover:scale-110 select-none animate-bounce"
                                style={{ animationDelay: `${(activeQuestion.num1 + i) * 70}ms`, animationDuration: '1.2s' }}
                                title={`තිත ${totalCountIndex}`}
                              >
                                {totalCountIndex}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Simple Guidance text for child */}
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-mq-primary-dark bg-sky-50 px-3.5 py-1 rounded-full border border-sky-200">
                      <span>👉</span>
                      <span>වමේ සිට දකුණට 1, 2, 3... ලෙස තිත් ටික එකතු කරලා ගණන් කරමු!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Large 2x2 Answer Option Cards Grid (ADHD Friendly) */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              {activeQuestion.options.map((opt, idx) => {
                const style = OPTION_CARD_STYLES[idx % OPTION_CARD_STYLES.length];
                const isSelected = selectedOption === opt;
                const isCorrectSelection = isSelected && answerFeedback === 'correct';
                const isWrongSelection = isSelected && answerFeedback === 'wrong';

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`group relative h-24 sm:h-28 rounded-3xl border-2 font-extrabold text-4xl sm:text-5xl transition-all duration-150 flex items-center justify-center shadow-xs cursor-pointer ${
                      isCorrectSelection
                        ? 'bg-mq-success-bg border-mq-success text-mq-success ring-2 ring-mq-success/20 scale-[1.01]'
                        : isWrongSelection
                        ? 'bg-mq-danger-bg border-mq-danger text-mq-danger ring-2 ring-mq-danger/15'
                        : `${style.bg} ${style.border} ${style.text} hover:-translate-y-0.5 hover:shadow-sm`
                    }`}
                  >
                    <span>{opt}</span>

                    {isCorrectSelection && (
                      <span className="absolute top-3 right-3 text-mq-success">
                        <CheckCircle2 size={22} />
                      </span>
                    )}
                    {isWrongSelection && (
                      <span className="absolute top-3 right-3 text-mq-danger">
                        <AlertCircle size={22} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 4. Compact Feedback & Auto-Advance / Hint Action Bar */}
            {answerFeedback && (
              <div
                className={`py-2.5 px-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 animate-fade-in ${
                  answerFeedback === 'correct'
                    ? 'bg-mq-success-bg border-mq-success/40 text-mq-text-strong'
                    : 'bg-mq-warning-bg border-mq-warning/40 text-mq-text-strong'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{answerFeedback === 'correct' ? '🎉' : '💡'}</span>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold sinhala leading-snug">
                      {answerFeedback === 'correct'
                        ? currentQuestionIdx < PRACTICE_QUESTIONS.length - 1
                          ? 'නිවැරදියි! තරු +25 සහ කාසි +10 ක් ලැබුණා! ඊළඟ ප්‍රශ්නයට යමින්...'
                          : 'නිවැරදියි! ප්‍රශ්න 10 ම සාර්ථකයි!'
                        : 'තව පොඩ්ඩක් හිතලා බලමු! දකුණු පසින් උදව්වක් ගන්නත් පුළුවන්.'}
                    </p>
                    <p className="text-[11px] text-mq-text-muted">
                      {answerFeedback === 'correct'
                        ? `Concept Mastery P(L): ${bktConfidencePct}%`
                        : `Active Pedagogical State: ${fsmDecision.fsmState}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {answerFeedback === 'wrong' && (
                    <button
                      type="button"
                      onClick={handleGetHint}
                      className="btn btn-secondary text-xs py-1.5 px-3.5 rounded-full font-bold"
                    >
                      <Lightbulb size={13} />
                      <span>Get Hint</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold inline-flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Optional Live BKT & FSM Research HUD */}
        {showResearchHUD && (
          <div className="pt-1 animate-fade-in">
            <LearnerStateHUD
              learnerState={learnerState}
              bktComparison={bktComparison}
              fsmDecision={fsmDecision}
              isLoading={isEngineLoading}
              onTriggerFSMRule={(ctx) => triggerFSMContext(ctx)}
            />
          </div>
        )}
      </div>

      {/* =================================================== */}
      {/* RIGHT COLUMN (4 cols): 3D Agent + HintBoard (Light) */}
      {/* =================================================== */}
      <div className="xl:col-span-4">
        <PedagogicalCompanion
          agentId="greenbot"
          theme="light"
          hints={activeHintBoardHints}
          onHintRequest={handleHintBoardRequest}
          interactive={false}
        />
      </div>
    </div>
  );
};

export default PedagogicalPracticeArena;
