import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  Gamepad2,
  Activity,
  Settings,
  FileBarChart,
  BookOpen,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  labelSi?: string;
  path: string;
  matchPaths?: string[];
  icon: LucideIcon;
  badge?: string;
  description?: string;
  componentOwner?: string;
}

export interface NavGroupConfig {
  id: string;
  title: string;
  titleSi?: string;
  items: NavItemConfig[];
}

export interface RouteMeta {
  title: string;
  titleSi?: string;
  desc: string;
  descSi?: string;
  breadcrumbLabel?: string;
}

export const PARENT_NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'parent-main',
    title: 'Core Management',
    titleSi: 'ප්‍රධාන කළමනාකරණය',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        labelSi: 'දළ විශ්ලේෂණය',
        path: '/parent/dashboard',
        matchPaths: ['/parent/dashboard'],
        icon: LayoutDashboard,
        description: 'Dashboard summary & child quick-switch',
      },
      {
        id: 'children',
        label: 'My Children',
        labelSi: 'මගේ දරුවන්',
        path: '/learners',
        matchPaths: ['/learners', '/parent/dashboard/children'],
        icon: Users,
        description: 'Register and manage child accounts',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'learner-profiles',
        label: 'Learner Profiles',
        labelSi: 'ඉගෙනුම් පැතිකඩ',
        path: '/parent/dashboard/learner-profiles',
        matchPaths: ['/parent/dashboard/learner-profiles'],
        icon: GraduationCap,
        description: 'Evidence-aware math profiles & levels',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'assessments',
        label: 'Onboarding & Assessments',
        labelSi: 'ඇගයීම් සහ ප්‍රශ්නාවලි',
        path: '/parent/dashboard/assessments',
        matchPaths: ['/parent/dashboard/assessments'],
        icon: ClipboardCheck,
        description: 'SNAP-IV & baseline diagnostic assessments',
        componentOwner: 'Learner Profile Component',
      },
    ],
  },
  {
    id: 'parent-analytics',
    title: 'Learning & Support',
    titleSi: 'ඉගෙනීම සහ සහාය',
    items: [
      {
        id: 'progress',
        label: 'Learning Progress',
        labelSi: 'ඉගෙනුම් ප්‍රගතිය',
        path: '/parent/dashboard/progress',
        matchPaths: ['/parent/dashboard/progress'],
        icon: TrendingUp,
        description: 'Mathematics mastery & curriculum progress',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'recommendations',
        label: 'Personalized Recommendations',
        labelSi: 'පුද්ගලාරෝපිත නිර්දේශ',
        path: '/parent/dashboard/recommendations',
        matchPaths: ['/parent/dashboard/recommendations'],
        icon: Sparkles,
        description: 'Explainable pedagogical strategies',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'activities',
        label: 'Learning Activities',
        labelSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
        path: '/parent/dashboard/activities',
        matchPaths: ['/parent/dashboard/activities'],
        icon: Gamepad2,
        description: 'Adaptive math games & activities',
        componentOwner: 'Content Adaptation',
      },
      {
        id: 'behaviour',
        label: 'Behaviour Insights',
        labelSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
        path: '/parent/dashboard/behaviour',
        matchPaths: ['/parent/dashboard/behaviour'],
        icon: Activity,
        description: 'ADHD engagement & attention patterns',
        componentOwner: 'Behaviour Monitoring',
      },
    ],
  },
  {
    id: 'parent-settings',
    title: 'Account',
    titleSi: 'ගිණුම',
    items: [
      {
        id: 'settings',
        label: 'Account Settings',
        labelSi: 'ගිණුම් සැකසුම්',
        path: '/parent/dashboard/settings',
        matchPaths: ['/parent/dashboard/settings', '/profile'],
        icon: Settings,
        description: 'Account profile & preferences',
        componentOwner: 'User Profile Component',
      },
    ],
  },
];

export const TEACHER_NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'teacher-main',
    title: 'Classroom & Learners',
    titleSi: 'පන්ති කාමරය සහ සිසුන්',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        labelSi: 'දළ විශ්ලේෂණය',
        path: '/teacher/dashboard',
        matchPaths: ['/teacher/dashboard'],
        icon: LayoutDashboard,
        description: 'Classroom metrics & assigned learners overview',
      },
      {
        id: 'learners',
        label: 'My Learners',
        labelSi: 'මගේ ඉගෙනුම්කරුවන්',
        path: '/teacher/dashboard/learners',
        matchPaths: ['/teacher/dashboard/learners'],
        icon: Users,
        description: 'Assigned classroom roster & statuses',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'learner-profiles',
        label: 'Learner Profiles',
        labelSi: 'ඉගෙනුම් පැතිකඩ',
        path: '/teacher/dashboard/learner-profiles',
        matchPaths: ['/teacher/dashboard/learner-profiles'],
        icon: GraduationCap,
        description: 'Pedagogical skill profiles & needs',
        componentOwner: 'Learner Profile Component',
      },
    ],
  },
  {
    id: 'teacher-pedagogy',
    title: 'Curriculum & Pedagogy',
    titleSi: 'විෂයමාලාව සහ ඉගැන්වීම',
    items: [
      {
        id: 'progress',
        label: 'Class Progress',
        labelSi: 'පන්තියේ ප්‍රගතිය',
        path: '/teacher/dashboard/progress',
        matchPaths: ['/teacher/dashboard/progress'],
        icon: TrendingUp,
        description: 'Class-wide math curriculum progression',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'activities',
        label: 'Learning Activities',
        labelSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
        path: '/teacher/dashboard/activities',
        matchPaths: ['/teacher/dashboard/activities'],
        icon: BookOpen,
        description: 'Teacher Adaptation Studio & game reviews',
        componentOwner: 'Content Adaptation',
      },
      {
        id: 'recommendations',
        label: 'Teaching Recommendations',
        labelSi: 'ඉගැන්වීම් නිර්දේශ',
        path: '/teacher/dashboard/recommendations',
        matchPaths: ['/teacher/dashboard/recommendations'],
        icon: Sparkles,
        description: 'Classroom differentiation & strategies',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'behaviour',
        label: 'Behaviour Insights',
        labelSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
        path: '/teacher/dashboard/behaviour',
        matchPaths: ['/teacher/dashboard/behaviour'],
        icon: Activity,
        description: 'Focus, pacing & frustration indicators',
        componentOwner: 'Behaviour Monitoring',
      },
      {
        id: 'reports',
        label: 'Reports',
        labelSi: 'වාර්තා',
        path: '/teacher/dashboard/reports',
        matchPaths: ['/teacher/dashboard/reports'],
        icon: FileBarChart,
        description: 'Progress reports & exportable summaries',
        componentOwner: 'Pedagogical Engine',
      },
    ],
  },
  {
    id: 'teacher-settings',
    title: 'Account',
    titleSi: 'ගිණුම',
    items: [
      {
        id: 'settings',
        label: 'Account Settings',
        labelSi: 'ගිණුම් සැකසුම්',
        path: '/teacher/dashboard/settings',
        matchPaths: ['/teacher/dashboard/settings', '/profile'],
        icon: Settings,
        description: 'Teacher account & preferences',
        componentOwner: 'User Profile Component',
      },
    ],
  },
];

export const PORTAL_ROUTE_META: Record<string, RouteMeta> = {
  // Parent Routes
  'parent:overview': {
    title: 'Parent Dashboard Overview',
    titleSi: 'දෙමාපිය පාලක පුවරුව',
    desc: 'Monitor your children’s math progress, assessment baselines, and personalized support.',
    breadcrumbLabel: 'Overview',
  },
  'parent:learners': {
    title: 'My Children',
    titleSi: 'මගේ දරුවන්',
    desc: 'Register and manage child accounts for adaptive mathematics learning support.',
    descSi: 'MathQuest අනුවර්තී ගණිත ඉගෙනුම් සහාය සඳහා දරුවන්ගේ පැතිකඩ මෙතැනින් කළමනාකරණය කරන්න.',
    breadcrumbLabel: 'My Children',
  },
  'parent:learner-profiles': {
    title: 'Learner Profiles & Evidence Levels',
    titleSi: 'ඉගෙනුම් පැතිකඩ',
    desc: 'Evidence-aware mathematics proficiencies, Bayesian credible intervals, and skill levels.',
    breadcrumbLabel: 'Learner Profiles',
  },
  'parent:assessments': {
    title: 'Onboarding & Diagnostic Assessments',
    titleSi: 'ඇගයීම් සහ ප්‍රශ්නාවලි',
    desc: 'Learning style preferences, SNAP-IV questionnaire, and Grade-specific math baselines.',
    breadcrumbLabel: 'Onboarding & Assessments',
  },
  'parent:progress': {
    title: 'Mathematics Learning Progress',
    titleSi: 'ඉගෙනුම් ප්‍රගතිය',
    desc: 'Track skill mastery, curriculum progress, and developmental milestones.',
    breadcrumbLabel: 'Learning Progress',
  },
  'parent:recommendations': {
    title: 'Personalized Learning Recommendations',
    titleSi: 'පුද්ගලාරෝපිත නිර්දේශ',
    desc: 'Explainable, data-backed pedagogical interventions tailored to specific skill gaps.',
    breadcrumbLabel: 'Recommendations',
  },
  'parent:activities': {
    title: 'Adaptive Learning Activities',
    titleSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
    desc: 'Interactive Sinhala math games tailored to engagement, working memory, and pacing.',
    breadcrumbLabel: 'Learning Activities',
  },
  'parent:behaviour': {
    title: 'Behaviour & Engagement Insights',
    titleSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
    desc: 'ADHD-informed engagement indicators, focus duration, and session pacing observations.',
    breadcrumbLabel: 'Behaviour Insights',
  },
  'parent:settings': {
    title: 'Account Settings & Preferences',
    titleSi: 'ගිණුම් සැකසුම්',
    desc: 'Manage your profile credentials, notification settings, and session security.',
    breadcrumbLabel: 'Account Settings',
  },
  'parent:onboarding': {
    title: 'Child Onboarding & Assessment',
    titleSi: 'ආරම්භක ඇගයීම් ක්‍රියාවලිය',
    desc: 'Complete the multi-step onboarding baseline to discover your child’s tailored learning profile.',
    breadcrumbLabel: 'Onboarding',
  },

  // Teacher Routes
  'teacher:overview': {
    title: 'Teacher Dashboard Overview',
    titleSi: 'ගුරු පාලක පුවරුව',
    desc: 'Classroom curriculum progress, adaptive learning activities, and pedagogical recommendations.',
    breadcrumbLabel: 'Overview',
  },
  'teacher:learners': {
    title: 'Assigned Learners',
    titleSi: 'පන්තියේ ඉගෙනුම්කරුවන්',
    desc: 'Review assigned student profiles, assessment statuses, and learning requirements.',
    breadcrumbLabel: 'My Learners',
  },
  'teacher:learner-profiles': {
    title: 'Learner Profiles & Evidence Levels',
    titleSi: 'ඉගෙනුම් පැතිකඩ',
    desc: 'Evidence-aware mathematics proficiencies and classroom pedagogical insights.',
    breadcrumbLabel: 'Learner Profiles',
  },
  'teacher:progress': {
    title: 'Class Curriculum Progress',
    titleSi: 'පන්තියේ ප්‍රගතිය',
    desc: 'Aggregated skill progression and curriculum mastery distributions.',
    breadcrumbLabel: 'Class Progress',
  },
  'teacher:activities': {
    title: 'Learning Activities Studio',
    titleSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
    desc: 'Review, adjust, and approve ADHD-friendly Sinhala math content.',
    breadcrumbLabel: 'Learning Activities',
  },
  'teacher:recommendations': {
    title: 'Teaching & Pedagogical Recommendations',
    titleSi: 'ඉගැන්වීම් නිර්දේශ',
    desc: 'Classroom differentiation strategies and evidence-based instructional advice.',
    breadcrumbLabel: 'Recommendations',
  },
  'teacher:behaviour': {
    title: 'Classroom Behaviour Insights',
    titleSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
    desc: 'Aggregated focus intervals, latency metrics, and pacing observations.',
    breadcrumbLabel: 'Behaviour Insights',
  },
  'teacher:reports': {
    title: 'Diagnostic & Progress Reports',
    titleSi: 'වාර්තා',
    desc: 'Generate exportable mathematics summaries and learner development records.',
    breadcrumbLabel: 'Reports',
  },
  'teacher:settings': {
    title: 'Teacher Account Settings',
    titleSi: 'ගිණුම් සැකසුම්',
    desc: 'Manage credentials, school affiliation, and account preferences.',
    breadcrumbLabel: 'Account Settings',
  },
};

export const getRouteMeta = (role: 'parent' | 'teacher', pathname: string): RouteMeta => {
  // Normalize pathname
  if (role === 'parent') {
    if (pathname === '/learners' || pathname.startsWith('/parent/dashboard/children')) {
      return PORTAL_ROUTE_META['parent:learners'];
    }
    if (pathname.includes('/onboarding')) {
      return PORTAL_ROUTE_META['parent:onboarding'];
    }
  }

  const rootPath = `/${role}/dashboard`;
  const sub = pathname.replace(rootPath, '').replace(/^\//, '');

  if (!sub) {
    return PORTAL_ROUTE_META[`${role}:overview`];
  }

  const key = `${role}:${sub}`;
  return (
    PORTAL_ROUTE_META[key] || {
      title: role === 'parent' ? 'Parent Portal' : 'Teacher Portal',
      desc: 'MathQuest adaptive mathematics learning platform.',
    }
  );
};
