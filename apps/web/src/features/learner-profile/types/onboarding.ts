/**
 * MathQuest Learner Onboarding Types
 */

export type OnboardingStepKey =
  | 'preferences'
  | 'snap_iv'
  | 'social_context'
  | 'handover'
  | 'math_assessment'
  | 'summary';

export interface LearningPreferencesData {
  version: string;
  visualAssistance: 'always' | 'sometimes' | 'minimal';
  audioAssistance: 'read_everything' | 'read_on_click' | 'off';
  activityPace: 'calm_step_by_step' | 'regular' | 'flexible';
  hintStyle: 'visual_clue' | 'step_guide' | 'audio_hint';
  celebrationStyle: 'gentle_star' | 'badge_sound' | 'minimal';
  additionalNotes?: string;
}

export interface SnapIvItemAnswer {
  itemId: number;
  score: number; // 0, 1, 2, 3
}

export interface SnapIvScoreSummary {
  inattentionTotal: number;
  inattentionAverage: number;
  hyperactivityTotal: number;
  hyperactivityAverage: number;
  totalScore: number;
  overallAverage: number;
  disclaimer: string;
}

export interface SocialContextData {
  version: string;
  learningEnvironment: string;
  peerCollaboration: string;
  parentInvolvement: string;
  challengingTaskSupport: string;
  optionalNotes?: string;
}

export interface MathQuestionOption {
  id: string;
  textEn: string;
  textSi: string;
  visualIcon?: string;
}

export interface MathQuestion {
  questionId: string;
  grade: number;
  skillId: string;
  skillName: string;
  skillNameSi: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'multiple_choice' | 'numeric' | 'visual';
  promptEn: string;
  promptSi: string;
  visualRepresentation?: {
    type: string;
    [key: string]: any;
  };
  options?: MathQuestionOption[];
  hintEn: string;
  hintSi: string;
}

export interface MathItemAnswer {
  questionId: string;
  userAnswer: string | number;
  attempts: number;
  responseTimeSeconds: number;
  hintUsed: boolean;
}

export interface SkillScore {
  skillId: string;
  skillName: string;
  skillNameSi: string;
  totalQuestions: number;
  correctQuestions: number;
  accuracyPercentage: number;
  proficiencyCategory: 'Emerging' | 'Developing' | 'Proficient' | 'INSUFFICIENT_EVIDENCE';
}

export interface MathAssessmentSummary {
  grade: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercentage: number;
  evidenceLevel: 'INSUFFICIENT' | 'SUFFICIENT';
  skills: SkillScore[];
  strengths: string[];
  areasForGrowth: string[];
  recommendations: string[];
  thresholdVersion?: string;
  disclaimer?: string;
  mlPredictionNotice: string;
}

export interface OnboardingProgress {
  learnerId: string;
  parentId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  currentStep: OnboardingStepKey;
  completedSteps: string[];
  preferencesCompleted: boolean;
  snapIvCompleted: boolean;
  socialContextCompleted: boolean;
  mathAssessmentCompleted: boolean;
  learningPreferences?: LearningPreferencesData;
  snapIvResponses?: SnapIvItemAnswer[];
  socialContext?: SocialContextData;
  snapIvSummary?: SnapIvScoreSummary;
  mathSummary?: MathAssessmentSummary;
  updatedAt: string;
}

export interface OnboardingFullSummary {
  learner: any;
  progress: OnboardingProgress;
  learningPreferences?: LearningPreferencesData;
  snapIvSummary?: SnapIvScoreSummary;
  socialContext?: SocialContextData;
  mathSummary?: MathAssessmentSummary;
}

/**
 * Standard SNAP-IV 18-item questionnaire template
 * Items 1-9: Inattention subscale
 * Items 10-18: Hyperactivity/Impulsivity subscale
 * Scale: 0 = Not at all, 1 = Just a little, 2 = Quite a bit, 3 = Very much
 * Note: Uses verified standard English text with provisional research translation template.
 */
export interface SnapIvItemDefinition {
  id: number;
  subscale: 'inattention' | 'hyperactivity';
  textEn: string;
  textSi: string;
}

export const SNAP_IV_ITEMS: SnapIvItemDefinition[] = [
  // Inattention Subscale (Items 1 - 9)
  {
    id: 1,
    subscale: 'inattention',
    textEn: 'Often fails to give close attention to details or makes careless mistakes in schoolwork or tasks',
    textSi: 'පාසල් වැඩ හෝ පැවරුම්වලදී විස්තර කෙරෙහි අවධානය නොදැක්වීම හෝ නොසැලකිලිමත් වැරදි සිදු කිරීම',
  },
  {
    id: 2,
    subscale: 'inattention',
    textEn: 'Often has difficulty sustaining attention in tasks or play activities',
    textSi: 'ක්‍රියාකාරකම්වල හෝ ක්‍රීඩාවල යෙදෙන විට එකදිගට අවධානය රඳවා ගැනීමට අපහසු වීම',
  },
  {
    id: 3,
    subscale: 'inattention',
    textEn: 'Often does not seem to listen when spoken to directly',
    textSi: 'සෘජුව කතා කරන විට සවන් නොදෙන බවක් බොහෝවිට පෙනෙන්නට තිබීම',
  },
  {
    id: 4,
    subscale: 'inattention',
    textEn: 'Often does not follow through on instructions and fails to finish schoolwork or chores',
    textSi: 'උපදෙස් අනුව ක්‍රියා කිරීම මගහැරීම සහ පැවරුම් අතරමග අත්හැර දැමීම',
  },
  {
    id: 5,
    subscale: 'inattention',
    textEn: 'Often has difficulty organizing tasks and activities',
    textSi: 'වැඩකටයුතු සහ ක්‍රියාකාරකම් පිළිවෙළකට සංවිධානය කරගැනීමට අපහසු වීම',
  },
  {
    id: 6,
    subscale: 'inattention',
    textEn: 'Often avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort',
    textSi: 'වැඩි මානසික වෙහෙසක් අවශ්‍ය වන කාර්යයන්වල යෙදීමට අකමැති වීම හෝ ඒවා මගහැරීම',
  },
  {
    id: 7,
    subscale: 'inattention',
    textEn: 'Often loses things necessary for tasks or activities (e.g., pencils, books, toys)',
    textSi: 'පාසල් වැඩට හෝ සෙල්ලම් කිරීමට අවශ්‍ය දෑ (පැන්සල්, පොත්පත්) නිතර අමතක වීම හෝ නැති කරගැනීම',
  },
  {
    id: 8,
    subscale: 'inattention',
    textEn: 'Is often easily distracted by extraneous stimuli',
    textSi: 'බාහිර පරිසරයේ ශබ්ද හෝ වෙනස්වීම් නිසා පහසුවෙන් අවධානය වෙනතකට යොමු වීම',
  },
  {
    id: 9,
    subscale: 'inattention',
    textEn: 'Is often forgetful in daily activities',
    textSi: 'දෛනික කටයුතුවලදී සහ පුරුදු වැඩවලදී නිතර අමතක වීම් සිදු වීම',
  },

  // Hyperactivity / Impulsivity Subscale (Items 10 - 18)
  {
    id: 10,
    subscale: 'hyperactivity',
    textEn: 'Often fidgets with hands or feet or squirms in seat',
    textSi: 'වාඩිවී සිටින විට අත් පා නිතර චලනය කිරීම හෝ එක තැන නොසන්සුන්ව සිටීම',
  },
  {
    id: 11,
    subscale: 'hyperactivity',
    textEn: 'Often leaves seat in classroom or in other situations in which remaining seated is expected',
    textSi: 'වාඩිවී සිටිය යුතු අවස්ථාවලදී (පන්ති කාමරයේදී හෝ කෑම මේසයේදී) නිතර ආසනයෙන් නැගිට යාම',
  },
  {
    id: 12,
    subscale: 'hyperactivity',
    textEn: 'Often runs about or climbs excessively in situations in which it is inappropriate',
    textSi: 'නුසුදුසු හෝ අන්තරායකර අවස්ථාවලදී පවා නොනවත්වා දිවීම හෝ උඩ නැගීම',
  },
  {
    id: 13,
    subscale: 'hyperactivity',
    textEn: 'Often has difficulty playing or engaging in leisure activities quietly',
    textSi: 'නිහඬව හෝ සන්සුන්ව ක්‍රීඩාවක හෝ විවේකී කටයුත්තක යෙදීමට අපහසු වීම',
  },
  {
    id: 14,
    subscale: 'hyperactivity',
    textEn: 'Is often "on the go" or often acts as if "driven by a motor"',
    textSi: 'නිතරම නොනවත්වා ක්‍රියාශීලීව සිටීම (මෝටරයකින් ක්‍රියාකරනවාක් මෙන් හැසිරීම)',
  },
  {
    id: 15,
    subscale: 'hyperactivity',
    textEn: 'Often talks excessively',
    textSi: 'නිතරම වැඩිපුර සහ නොනවත්වා කතා කිරීම',
  },
  {
    id: 16,
    subscale: 'hyperactivity',
    textEn: 'Often blurts out answers before questions have been completed',
    textSi: 'ප්‍රශ්නය සම්පූර්ණයෙන් අසා අවසන් වීමට පෙර පිළිතුරු කීමට ඉක්මන් වීම',
  },
  {
    id: 17,
    subscale: 'hyperactivity',
    textEn: 'Often has difficulty awaiting turn',
    textSi: 'ක්‍රීඩා හෝ පෝලිම්වලදී තම වාරය එනතුරු ඉවසීමෙන් බලා සිටීමට අපහසු වීම',
  },
  {
    id: 18,
    subscale: 'hyperactivity',
    textEn: 'Often interrupts or intrudes on others (e.g., butts into conversations or games)',
    textSi: 'අනුන්ගේ කතාබස් හෝ ක්‍රීඩාවලට මැදින් පැන බාධා කිරීම',
  },
];

export const SNAP_IV_SCALE_OPTIONS = [
  { value: 0, labelEn: 'Not at all', labelSi: 'කිසිසේත් නැත' },
  { value: 1, labelEn: 'Just a little', labelSi: 'මදක් ඇත' },
  { value: 2, labelEn: 'Quite a bit', labelSi: 'සැලකිය යුතු ලෙස ඇත' },
  { value: 3, labelEn: 'Very much', labelSi: 'ඉතා වැඩියෙන් ඇත' },
];
