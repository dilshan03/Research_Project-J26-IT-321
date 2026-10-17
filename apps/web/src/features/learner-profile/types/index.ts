export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type LanguageComprehensionLevel =
  | 'Understands a little'
  | 'Understands basic instructions'
  | 'Understands well';

export type PrimaryInstructionLanguage = 'Sinhala' | 'English';

export interface Learner {
  id: string;
  learnerId: string;
  parentId: string;
  firstName: string;
  preferredName?: string;
  age: number;
  grade: number;
  preferredLanguage: string;
  sinhalaComprehension?: LanguageComprehensionLevel | string;
  englishComprehension?: LanguageComprehensionLevel | string;
  primaryInstructionLanguage?: PrimaryInstructionLanguage | string;
  avatarId: string;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLearnerData {
  firstName: string;
  preferredName?: string;
  age: number;
  grade: number;
  preferredLanguage?: string;
  sinhalaComprehension?: LanguageComprehensionLevel | string;
  englishComprehension?: LanguageComprehensionLevel | string;
  primaryInstructionLanguage?: PrimaryInstructionLanguage | string;
  avatarId?: string;
}

export interface UpdateLearnerData {
  firstName?: string;
  preferredName?: string;
  age?: number;
  grade?: number;
  preferredLanguage?: string;
  sinhalaComprehension?: LanguageComprehensionLevel | string;
  englishComprehension?: LanguageComprehensionLevel | string;
  primaryInstructionLanguage?: PrimaryInstructionLanguage | string;
  avatarId?: string;
  onboardingStatus?: OnboardingStatus;
}

export interface LearnerApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  total?: number;
  error?: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  nameSi: string;
  icon: string;
  bgColor: string;
  borderColor: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'avatar_lion',
    name: 'Lion Cub',
    nameSi: 'සිංහ පැටියා',
    icon: '🦁',
    bgColor: 'bg-amber-100 text-amber-800',
    borderColor: 'border-amber-300',
  },
  {
    id: 'avatar_elephant',
    name: 'Baby Elephant',
    nameSi: 'අලි පැටියා',
    icon: '🐘',
    bgColor: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-300',
  },
  {
    id: 'avatar_rabbit',
    name: 'Rabbit',
    nameSi: 'හාවා',
    icon: '🐰',
    bgColor: 'bg-pink-100 text-pink-800',
    borderColor: 'border-pink-300',
  },
  {
    id: 'avatar_owl',
    name: 'Wise Owl',
    nameSi: 'බකමූණා',
    icon: '🦉',
    bgColor: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-300',
  },
  {
    id: 'avatar_fox',
    name: 'Clever Fox',
    nameSi: 'නරියා',
    icon: '🦊',
    bgColor: 'bg-orange-100 text-orange-800',
    borderColor: 'border-orange-300',
  },
  {
    id: 'avatar_monkey',
    name: 'Little Monkey',
    nameSi: 'වඳුරු පැටියා',
    icon: '🐵',
    bgColor: 'bg-emerald-100 text-emerald-800',
    borderColor: 'border-emerald-300',
  },
];
