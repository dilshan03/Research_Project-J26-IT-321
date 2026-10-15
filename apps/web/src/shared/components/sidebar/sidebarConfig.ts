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
        icon: LayoutDashboard,
        description: 'Dashboard summary & child quick-switch',
      },
      {
        id: 'children',
        label: 'My Children',
        labelSi: 'මගේ දරුවන්',
        path: '/parent/dashboard/children',
        icon: Users,
        description: 'Register and manage child accounts',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'learner-profiles',
        label: 'Learner Profiles',
        labelSi: 'ඉගෙනුම් පැතිකඩ',
        path: '/parent/dashboard/learner-profiles',
        icon: GraduationCap,
        description: 'Evidence-aware math profiles & levels',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'assessments',
        label: 'Onboarding & Assessments',
        labelSi: 'ඇගයීම් සහ ප්‍රශ්නාවලි',
        path: '/parent/dashboard/assessments',
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
        icon: TrendingUp,
        description: 'Mathematics mastery & curriculum progress',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'recommendations',
        label: 'Personalized Recommendations',
        labelSi: 'පුද්ගලාරෝපිත නිර්දේශ',
        path: '/parent/dashboard/recommendations',
        icon: Sparkles,
        description: 'Explainable pedagogical strategies',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'activities',
        label: 'Learning Activities',
        labelSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
        path: '/parent/dashboard/activities',
        icon: Gamepad2,
        description: 'Adaptive math games & activities',
        componentOwner: 'Content Adaptation',
      },
      {
        id: 'behaviour',
        label: 'Behaviour Insights',
        labelSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
        path: '/parent/dashboard/behaviour',
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
        label: 'Settings',
        labelSi: 'සැකසුම්',
        path: '/parent/dashboard/settings',
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
        icon: LayoutDashboard,
        description: 'Classroom metrics & assigned learners overview',
      },
      {
        id: 'learners',
        label: 'My Learners',
        labelSi: 'මගේ ඉගෙනුම්කරුවන්',
        path: '/teacher/dashboard/learners',
        icon: Users,
        description: 'Assigned classroom roster & statuses',
        componentOwner: 'Learner Profile Component',
      },
      {
        id: 'learner-profiles',
        label: 'Learner Profiles',
        labelSi: 'ඉගෙනුම් පැතිකඩ',
        path: '/teacher/dashboard/learner-profiles',
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
        icon: TrendingUp,
        description: 'Class-wide math curriculum progression',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'activities',
        label: 'Learning Activities',
        labelSi: 'ඉගෙනුම් ක්‍රියාකාරකම්',
        path: '/teacher/dashboard/activities',
        icon: BookOpen,
        description: 'Teacher Adaptation Studio & game reviews',
        componentOwner: 'Content Adaptation',
      },
      {
        id: 'recommendations',
        label: 'Teaching Recommendations',
        labelSi: 'ඉගැන්වීම් නිර්දේශ',
        path: '/teacher/dashboard/recommendations',
        icon: Sparkles,
        description: 'Classroom differentiation & strategies',
        componentOwner: 'Pedagogical Engine',
      },
      {
        id: 'behaviour',
        label: 'Behaviour Insights',
        labelSi: 'චර්යාත්මක තීක්ෂ්ණ බුද්ධිය',
        path: '/teacher/dashboard/behaviour',
        icon: Activity,
        description: 'Focus, pacing & frustration indicators',
        componentOwner: 'Behaviour Monitoring',
      },
      {
        id: 'reports',
        label: 'Reports',
        labelSi: 'වාර්තා',
        path: '/teacher/dashboard/reports',
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
        label: 'Settings',
        labelSi: 'සැකසුම්',
        path: '/teacher/dashboard/settings',
        icon: Settings,
        description: 'Teacher account & preferences',
        componentOwner: 'User Profile Component',
      },
    ],
  },
];
