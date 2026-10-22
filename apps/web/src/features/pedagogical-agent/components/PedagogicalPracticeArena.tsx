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
      '"Welcome! Start by counting 4 steps forward, then add 5 more. You know what 4 + 4 is!"',
    defaultGuidanceSi: 'පළමුව 4 සිට ඉදිරියට පියවර 5ක් ගණන් කර බලමු. 4 + 4 = 8 බව මතක තබා ගන්න!',
    hints: {
      1: {
        en: 'Hint 1: Think of doubling! What is 4 + 4?',
        si: 'හෝඩුවාව 1: 4 + 4 කීයද කියා මුලින්ම සිතන්න.',
      },
      2: {
        en: 'Hint 2: Since 4 + 4 = 8, adding 1 more gives 4 + 5.',
        si: 'හෝඩුවාව 2: 4 + 4 = 8 නිසා, ඊට තව 1ක් එකතු කරන්න.',
      },
      3: {
        en: 'Hint 3: Count one by one from 4: 5, 6, 7, 8, 9!',
        si: 'හෝඩුවාව 3: 4 සිට ඉදිරියට ගණන් කරමු: 5, 6, 7, 8, 9!',
      },
      4: {
        en: 'Hint 4: 4 + 5 equals 9! Click the card with 9.',
        si: 'හෝඩුවාව 4: 4 + 5 හි නිවැරදි පිළිතුර 9 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: Break 5 into (4 + 1). First do 4 + 4 = 8, then 8 + 1 = 9.',
      si: 'පියවර පැහැදිලි කිරීම: 4 + 4 = 8 වේ. එයට ඉතිරි 1 එකතු කළ විට 8 + 1 = 9 ලැබේ.',
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
      '"Great rhythm! 5 + 5 makes a clean 10. How much is 1 more than 10?"',
    defaultGuidanceSi: '5 + 5 = 10 බව ඔයා දන්නවා! එහෙනම් 10 ට තව 1ක් එකතු කළාම කීයද?',
    hints: {
      1: {
        en: 'Hint 1: Use your hands! Two hands of 5 fingers make 10.',
        si: 'හෝඩුවාව 1: අත් දෙකේ ඇඟිලි 5 බැගින් එකතු කළ විට 10 කි.',
      },
      2: {
        en: 'Hint 2: 6 is just 5 + 1. So 5 + 6 is the same as (5 + 5) + 1.',
        si: 'හෝඩුවාව 2: 6 යනු 5 + 1 වේ. එවිට (5 + 5) + 1 ලෙස ගත හැක.',
      },
      3: {
        en: 'Hint 3: 10 + 1 gives the next number after 10.',
        si: 'හෝඩුවාව 3: 10 ට 1ක් එකතු කළ විට 10 ට පසුව එන සංඛ්‍යාව ලැබේ.',
      },
      4: {
        en: 'Hint 4: 5 + 6 = 11! Select 11 below.',
        si: 'හෝඩුවාව 4: 5 + 6 හි නිවැරදි උත්තරය 11 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: Make a 10 first! 5 + 5 = 10, then add the remaining 1 to get 11.',
      si: 'පියවර පැහැදිලි කිරීම: මුලින්ම 10 හදාගමු (5 + 5 = 10). ඉන්පසු 10 + 1 = 11 වේ.',
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
      '"Take your time, Nethmi. Think about the numbers carefully. If you know what 6 + 6 is, you can figure this out!"',
    defaultGuidanceSi:
      'හදිසි වෙන්න එපා නෙත්මි. 6 + 6 කීයද කියලා මතක් කරගත්තොත්, මේ උත්තරය පහසුවෙන්ම හොයාගන්න පුළුවන්!',
    hints: {
      1: {
        en: 'Hint 1: Start with a Near-Double! What is 6 + 6?',
        si: 'හෝඩුවාව 1: මුලින්ම 6 + 6 කීයද කියා මතක් කරගන්න.',
      },
      2: {
        en: 'Hint 2: 6 + 6 = 12. Since 7 is 1 more than 6, add 1 more to 12!',
        si: 'හෝඩුවාව 2: 6 + 6 = 12 කි. 7 යනු 6 ට වඩා 1ක් වැඩි නිසා 12 ට 1ක් එකතු කරන්න.',
      },
      3: {
        en: 'Hint 3: Or make 10 first: 6 + 4 = 10, with 3 left over (10 + 3).',
        si: 'හෝඩුවාව 3: නැතහොත් 6 + 4 = 10 හදාගෙන ඉතිරි 3 එකතු කරන්න (10 + 3).',
      },
      4: {
        en: 'Hint 4: 12 + 1 = 13! Choose the card with 13.',
        si: 'හෝඩුවාව 4: 12 + 1 = 13! නිවැරදි පිළිතුර 13 වේ.',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 6 + 7 = 6 + (6 + 1) = (6 + 6) + 1 = 12 + 1 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: 6 + 7 = (6 + 6) + 1 = 12 + 1 = 13 ලෙස පියවරෙන් පියවර ලැබේ.',
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
      '"How many more does 8 need to reach 10? Take 2 from 5 to make 10 first!"',
    defaultGuidanceSi: '8 ට 10 වෙන්න තව කීයක් ඕනද? 5 න් 2ක් අරන් මුලින්ම 10 හදාගමු!',
    hints: {
      1: {
        en: 'Hint 1: 8 needs 2 more to become 10.',
        si: 'හෝඩුවාව 1: 8 ට තව 2ක් එකතු කළ විට 10 ලැබේ.',
      },
      2: {
        en: 'Hint 2: Split 5 into 2 and 3.',
        si: 'හෝඩුවාව 2: 5 යන සංඛ්‍යාව 2 සහ 3 ලෙස කොටස් දෙකකට වෙන් කරන්න.',
      },
      3: {
        en: 'Hint 3: Now add (8 + 2) + 3 = 10 + 3.',
        si: 'හෝඩුවාව 3: දැන් (8 + 2) + 3 = 10 + 3 ලෙස එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 3 = 13! Click 13.',
        si: 'හෝඩුවාව 4: 10 + 3 = 13 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: Bridge through 10 -> 8 + 5 = (8 + 2) + 3 = 10 + 3 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: 8 + 2 = 10. ඉතිරි 3 එකතු කළ විට 10 + 3 = 13 ලැබේ.',
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
      '"Halfway through Level 01! Think of 7 + 7 = 14, then add just 1 more!"',
    defaultGuidanceSi: 'අපි භාගයක්ම ඉවරයි! 7 + 7 = 14 බව මතක් කරගෙන තව 1ක් එකතු කරන්න.',
    hints: {
      1: {
        en: 'Hint 1: Recall the double: 7 + 7 = 14.',
        si: 'හෝඩුවාව 1: 7 + 7 = 14 බව මතක් කරගන්න.',
      },
      2: {
        en: 'Hint 2: 8 is 1 more than 7, so add 1 to 14.',
        si: 'හෝඩුවාව 2: 8 යනු 7 ට වඩා 1ක් වැඩි නිසා 14 ට 1ක් එකතු කරන්න.',
      },
      3: {
        en: 'Hint 3: Or make 10: 8 + 2 = 10, plus remaining 5.',
        si: 'හෝඩුවාව 3: නැතහොත් 8 + 2 = 10 හදා ඉතිරි 5 එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 14 + 1 = 15! Choose 15.',
        si: 'හෝඩුවාව 4: නිවැරදි පිළිතුර 15 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 7 + 8 = 7 + (7 + 1) = 14 + 1 = 15.',
      si: 'පියවර පැහැදිලි කිරීම: 7 + 7 = 14 වේ. 14 + 1 = 15 ලෙස පිළිතුර ලැබේ.',
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
      '"9 is super close to 10! Give 1 from 4 to 9 so it becomes 10."',
    defaultGuidanceSi: '9 කියන්නේ 10 ට ඉතාම ළඟ අගයක්! 4 න් 1ක් අරන් 9 ට දීලා 10 හදාගමු.',
    hints: {
      1: {
        en: 'Hint 1: Add 1 to 9 to make 10.',
        si: 'හෝඩුවාව 1: 9 ට 1ක් එකතු කර 10 සාදාගන්න.',
      },
      2: {
        en: 'Hint 2: Taking 1 from 4 leaves 3.',
        si: 'හෝඩුවාව 2: 4 න් 1ක් ගත් පසු ඉතිරි වන්නේ 3 කි.',
      },
      3: {
        en: 'Hint 3: Now combine 10 and 3.',
        si: 'හෝඩුවාව 3: දැන් 10 සහ 3 එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 3 = 13!',
        si: 'හෝඩුවාව 4: 10 + 3 = 13 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 9 + 4 = (9 + 1) + 3 = 10 + 3 = 13.',
      si: 'පියවර පැහැදිලි කිරීම: (9 + 1) + 3 = 10 + 3 = 13.',
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
      '"Double 8! Think of two rows of 8 crayons. Take your time."',
    defaultGuidanceSi: '8 ඒවා දෙකක්! 8 + 2 = 10 හදාගෙන ඉතිරි 6 එකතු කර බලන්න.',
    hints: {
      1: {
        en: 'Hint 1: Take 2 from the second 8 to make 10.',
        si: 'හෝඩුවාව 1: දෙවන 8 න් 2ක් ගෙන පළමු 8 ට එකතු කර 10 සාදන්න.',
      },
      2: {
        en: 'Hint 2: After taking 2 from 8, 6 is left.',
        si: 'හෝඩුවාව 2: 8 න් 2ක් ගත් විට ඉතිරි වන්නේ 6 කි.',
      },
      3: {
        en: 'Hint 3: Add 10 + 6.',
        si: 'හෝඩුවාව 3: දැන් 10 ට 6ක් එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 6 = 16!',
        si: 'හෝඩුවාව 4: නිවැරදි පිළිතුර 16 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 8 + 8 = (8 + 2) + 6 = 10 + 6 = 16.',
      si: 'පියවර පැහැදිලි කිරීම: (8 + 2) + 6 = 10 + 6 = 16.',
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
      '"Turn 9 into 10 by borrowing 1 from 6! What is left of 6?"',
    defaultGuidanceSi: '6 න් 1ක් ගෙන 9 ට එකතු කර 10 හදාගන්න. එවිට 6 න් ඉතිරි කීයද?',
    hints: {
      1: {
        en: 'Hint 1: 9 + 1 = 10.',
        si: 'හෝඩුවාව 1: 9 + 1 = 10 කි.',
      },
      2: {
        en: 'Hint 2: 6 minus 1 leaves 5.',
        si: 'හෝඩුවාව 2: 6 න් 1ක් අඩු කළ විට 5ක් ඉතිරි වේ.',
      },
      3: {
        en: 'Hint 3: Combine 10 and 5.',
        si: 'හෝඩුවාව 3: 10 සහ 5 එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 5 = 15!',
        si: 'හෝඩුවාව 4: 10 + 5 = 15 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 9 + 6 = (9 + 1) + 5 = 10 + 5 = 15.',
      si: 'පියවර පැහැදිලි කිරීම: (9 + 1) + 5 = 10 + 5 = 15.',
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
      '"Almost at the finish line! Make 10 with 9 + 1, then add what remains of 7."',
    defaultGuidanceSi: 'අපි අවසානයට ළඟයි! 7 න් 1ක් 9 ට දීලා 10 හදාගමු.',
    hints: {
      1: {
        en: 'Hint 1: Give 1 from 7 to 9 so 9 becomes 10.',
        si: 'හෝඩුවාව 1: 7 න් 1ක් 9 ට දී 10 සාදාගන්න.',
      },
      2: {
        en: 'Hint 2: 7 minus 1 leaves 6.',
        si: 'හෝඩුවාව 2: 7 න් 1ක් ගත් විට 6ක් ඉතිරි වේ.',
      },
      3: {
        en: 'Hint 3: 10 + 6 gives the total.',
        si: 'හෝඩුවාව 3: දැන් 10 + 6 එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 6 = 16!',
        si: 'හෝඩුවාව 4: නිවැරදි පිළිතුර 16 වේ!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 7 + 9 = 6 + (1 + 9) = 6 + 10 = 16.',
      si: 'පියවර පැහැදිලි කිරීම: 6 + (1 + 9) = 6 + 10 = 16.',
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
      '"Final boss question of Level 01! Borrow 1 from 8 to turn 9 into 10!"',
    defaultGuidanceSi: 'පළමු මට්ටමේ අවසාන ප්‍රශ්නය! 8 න් 1ක් ගෙන 9 ට එකතු කර 10 හදාගමු.',
    hints: {
      1: {
        en: 'Hint 1: 9 needs 1 to become 10.',
        si: 'හෝඩුවාව 1: 9 ට 1ක් එකතු කළ විට 10 වේ.',
      },
      2: {
        en: 'Hint 2: Taking 1 from 8 leaves 7.',
        si: 'හෝඩුවාව 2: 8 න් 1ක් ගත් විට ඉතිරි වන්නේ 7 කි.',
      },
      3: {
        en: 'Hint 3: Add 10 and 7 together.',
        si: 'හෝඩුවාව 3: දැන් 10 සහ 7 එකතු කරන්න.',
      },
      4: {
        en: 'Hint 4: 10 + 7 = 17! You completed Level 01!',
        si: 'හෝඩුවාව 4: 10 + 7 = 17! ඔයා පළමු මට්ටම ජයගත්තා!',
      },
    },
    explainStep: {
      en: 'Step Breakdown: 9 + 8 = (9 + 1) + 7 = 10 + 7 = 17.',
      si: 'පියවර පැහැදිලි කිරීම: (9 + 1) + 7 = 10 + 7 = 17.',
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
    2: { title: 'මඟපෙන්වීම', description: activeQuestion.hints[2].si },
    3: { title: 'පියවරෙන් පියවර', description: activeQuestion.hints[3].si },
    4: { title: 'විසඳුම', description: activeQuestion.hints[4].si },
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

                {/* Visual Dots Aid when Hint Level >= 2 or Explanation is active */}
                {(currentHintLevel >= 2 || explanationActive) && (
                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5 text-sm font-bold text-mq-primary-dark animate-fade-in">
                    <div className="flex items-center gap-1.5 bg-mq-surface-blue px-3.5 py-1.5 rounded-full border border-mq-primary/25">
                      <span>{activeQuestion.num1}:</span>
                      <span className="tracking-widest text-mq-primary">
                        {'●'.repeat(activeQuestion.num1)}
                      </span>
                    </div>
                    <span className="text-mq-text-muted">+</span>
                    <div className="flex items-center gap-1.5 bg-mq-surface-green px-3.5 py-1.5 rounded-full border border-mq-secondary/35">
                      <span>{activeQuestion.num2}:</span>
                      <span className="tracking-widest text-mq-success">
                        {'●'.repeat(activeQuestion.num2)}
                      </span>
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
