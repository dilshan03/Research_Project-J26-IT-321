import { localized } from './language';

/**
 * Teacher portal and shared portal-shell wording (Sinhala and English, same shape).
 * Follows the global language switch. Sinhala wording is proposed and pending review.
 */

const si = {
  portal: {
    label: 'ගුරු අංශය',
    headerAria: 'ගුරු අංශයේ ශීර්ෂය',
    homeAria: 'ගුරු අංශයේ මුල් පිටුව',
    publicWebsite: 'ප්‍රධාන වෙබ් අඩවිය',
    account: 'ගුරු ගිණුම',
    signedIn: 'ගුරු ගිණුමට පිවිස ඇත',
    navAria: 'ගුරු අංශයේ මෙනුව',
    openNav: 'මෙනුව විවෘත කරන්න',
    closeNav: 'මෙනුව වසන්න',
    footerTitle: 'MathQuest පර්යේෂණ',
    footerText: 'ADHD සහාය අවශ්‍ය දරුවන් සඳහා අනුවර්තී සිංහල ගණිත ඉගෙනුම් වේදිකාව.',
    loading: 'ගුරු අංශය පූරණය වෙමින්...',
    authTitle: 'කරුණාකර පිවිසෙන්න',
    authText: 'මෙම අංශය බැලීමට ඔබේ ගුරු ගිණුමට පිවිසිය යුතුයි.',
    signIn: 'පිවිසෙන්න',
    breadcrumbAria: 'ඔබ සිටින ස්ථානය',
    breadcrumbRoot: 'ගුරු අංශය',
    home: 'මුල් පිටුව',
    verifyingSession: 'ගිණුම තහවුරු කරමින්...',
  },
  userMenu: {
    role: 'ගුරු',
    signedInAs: 'පිවිස ඇත්තේ',
    portalActive: 'ගුරු ගිණුමට පිවිස ඇත',
    studio: 'ගුරු ස්ටුඩියෝව',
    adminDashboard: 'පරිපාලක පුවරුව',
    publicWebsite: 'ප්‍රධාන වෙබ් අඩවිය',
    signOut: 'ගිණුමෙන් ඉවත් වන්න',
    accountMenu: 'ගිණුම් මෙනුව',
  },
  overview: {
    badge: 'ගුරු අංශය',
    welcome: (name: string) => `ආයුබෝවන්, ${name}!`,
    teacherFallback: 'ගුරුතුමනි',
    intro:
      'පන්තියේ ගණිත ඉගැන්වීම දරුවන්ට ගැළපෙන ලෙස සකසන්න, විෂය ප්‍රගතිය බලන්න, ගුරු ස්ටුඩියෝවේ සිංහල ක්‍රීඩා අන්තර්ගතය සකසන්න සහ ඉගැන්වීම් නිර්දේශ බලන්න.',
    openStudio: 'ගුරු ස්ටුඩියෝව විවෘත කරන්න',
    statAssigned: 'පවරා ඇති ඉගෙනුම්කරුවන්',
    statOnboarded: 'ආරම්භක ඇගයීම අවසන්',
    statSupport: 'සහාය අවශ්‍යයි',
    statBlueprints: 'සක්‍රිය අන්තර්ගත සැලසුම්',
    privacyTitle: 'ළමා දත්ත රහස්‍යතාව සහ ප්‍රවේශ අවසර',
    privacySubtitle: 'දැඩි ප්‍රවේශ පාලනය ළමා දත්ත ආරක්ෂණ මාර්ගෝපදේශ අනුගමනය කරයි.',
    privacyText:
      'පර්යේෂණ ආචාර ධර්ම සහ රහස්‍යතා ආරක්ෂණ අනුව, ලියාපදිංචි සියලු දරුවන්ගේ තොරතුරු ගුරුවරුන්ට ස්වයංක්‍රීයව නොලැබේ. තහවුරු කළ දෙමාපිය හෝ පාසල් පන්ති පැවරීමකින් පසුව පමණක් ඉගෙනුම්කරුගේ දත්ත ලබා ගත හැක. දෙමාපියන්ගේ පෞද්ගලික ප්‍රශ්නාවලි (උදා: SNAP-IV පිළිතුරු) රහසිගතව තබා ඇති අතර ඒවා පෙන්වන්නේ නැත.',
    emptyTitle: 'තවම ඉගෙනුම්කරුවන් පවරා නැත',
    emptyText:
      'ගුරු-ඉගෙනුම්කරු පන්ති ලැයිස්තු කළමනාකරණය දැනට සකස් වෙමින් පවතී. ඔබේ පාසල් පරිපාලක විසින් දෙමාපිය අවසරය සහ දරුවන් සම්බන්ධ කිරීම සිදු කළ පසු, ඔබට පවරා ඇති ඉගෙනුම්කරුවන් ආරක්ෂිත ඉගෙනුම් ප්‍රගති දර්ශක සමඟ මෙහි පෙන්වයි.',
    rosterLink: 'පන්ති ලැයිස්තු සම්බන්ධ කිරීම ගැන',
    studioLink: 'අන්තර්ගත අනුවර්තන ස්ටුඩියෝවට යන්න',
    cardStudioTitle: 'අන්තර්ගත අනුවර්තන ස්ටුඩියෝව',
    cardStudioText: '1–5 ශ්‍රේණි සඳහා AI මගින් සැකසූ සිංහල ගණිත ප්‍රශ්න සැලසුම් සමාලෝචනය කර, සකසා, අනුමත කරන්න.',
    cardStudioAction: 'ස්ටුඩියෝව විවෘත කරන්න',
    cardTipsTitle: 'ඉගැන්වීම් නිර්දේශ',
    cardTipsText: 'පියවරෙන් පියවර සහාය, කොටස්වලට බෙදූ උපදෙස් සහ බහුමාධ්‍ය උපකාර ගැන බලන්න.',
    cardTipsAction: 'ක්‍රමෝපායන් බලන්න',
    cardSecurityTitle: 'ආරක්ෂිත පර්යේෂණ ඒකාබද්ධතාව',
    cardSecurityText: 'MathQuest සංරචක අතර දත්ත හුවමාරුව සංවේදී තොරතුරු ආරක්ෂා කරමින් ගුරුවරුන්ට උදව් කරන ආකාරය.',
    cardSecurityAction: 'ආරක්ෂණ විස්තර බලන්න',
  },
  learners: {
    title: 'පන්තියේ ඉගෙනුම්කරුවන්',
    description: 'ඔබට පවරා ඇති සිසුන්ගේ ලැයිස්තු සහ පන්තියේ ඉගෙනුම් වෙනස්කම් බලන්න.',
    rosterTitle: 'පන්තියේ ඉගෙනුම්කරුවන්ගේ ලැයිස්තුව',
    rosterText: 'ගුරු-ඉගෙනුම්කරු සම්බන්ධ කිරීම සිදු වන්නේ පාසල් පරිපාලක පැවරීම සහ තහවුරු කළ දෙමාපිය අවසරය මගිනි.',
    boundaryTitle: 'ප්‍රවේශ ආරක්ෂණ සීමාව',
    boundaryText1: 'අනවසර ප්‍රවේශය වැළැක්වීමට, සක්‍රිය පන්ති පැවරීමක් ඇති විට පමණක් සිසුන්ගේ පැතිකඩ සහ ප්‍රගති වාර්තා ලබා ගත හැක.',
    boundaryText2: 'MathQuest ආරක්ෂණ මාර්ගෝපදේශ අනුව, ව්‍යාජ හෝ අනවසර ළමා දත්ත කිසිවක් පෙන්වන්නේ නැත.',
    studioLink: 'ගුරු අනුවර්තන ස්ටුඩියෝවට යන්න',
  },
  profiles: {
    title: 'ඉගෙනුම් පැතිකඩ',
    description: 'ආරක්ෂිතව සැකසූ ගණිත කුසලතා මට්ටම්, අවිනිශ්චිතතා පරාස සහ සහාය අවශ්‍යතා බලන්න.',
    heading: 'ඉගැන්වීම සඳහා ඉගෙනුම් පැතිකඩ',
    text: 'ඔබේ පන්තියට ඉගෙනුම්කරුවන් පැවරූ විට, ගණිත කුසලතා, අවිනිශ්චිතතා පරාස සහ ඉගැන්වීමේ ක්‍රමෝපායන් පමණක් ඇතුළත් ආරක්ෂිත පැතිකඩ මෙහි දැකිය හැක.',
    architectureTitle: 'සංරචක අතර ආරක්ෂිත දත්ත හුවමාරුව:',
    exposes: 'පෙන්වයි: ගණිත කුසලතා මට්ටම්, අවිනිශ්චිතතා පරාස සහ පැහැදිලි කළ හැකි නිර්දේශ.',
    protects: 'ආරක්ෂා කරයි: SNAP-IV පිළිතුරු, දෙමාපියන්ගේ පෞද්ගලික සටහන් සහ වෛද්‍ය ප්‍රමිතික සඟවා තබයි.',
    studioLink: 'ගුරු අනුවර්තන ස්ටුඩියෝව විවෘත කරන්න',
  },
  recommendations: {
    title: 'ඉගැන්වීම් නිර්දේශ',
    description: 'ADHD සහාය අවශ්‍ය ප්‍රාථමික ගණිත ඉගැන්වීම සඳහා සාක්ෂි මත පදනම් වූ ක්‍රමෝපායන් සහ මාර්ගෝපදේශ.',
    heading: 'ADHD ගැන සැලකිලිමත් ඉගැන්වීම් මාර්ගෝපදේශ',
    intro: 'MathQuest ඉගැන්වීම් එන්ජිම ADHD සහාය අවශ්‍ය ප්‍රාථමික ගණිත ඉගැන්වීම සඳහා නිර්දේශ කරන සාක්ෂි මත පදනම් වූ ක්‍රමෝපායන් මේවාය.',
    strategies: {
      VISUAL_MANIPULATIVES: {
        title: 'දෘශ්‍ය නිරූපණ සහ සැබෑ ද්‍රව්‍ය භාවිතය',
        desc: 'සංඛ්‍යා සමීකරණවලට යාමට පෙර සංඛ්‍යා රේඛා, දහයේ රාමු සහ පින්තූර ගණක භාවිත කරන්න.',
      },
      CHUNKING_PACING: {
        title: 'කාර්යයන් කොටස්වලට බෙදීම සහ කෙටි විවේක',
        desc: 'එක් පුහුණු වාරයක් ප්‍රශ්න 3–5කට සීමා කරන්න. අවධානය වෙනස් වන දරුවන්ගේ මානසික වෙහෙස වළක්වන්න.',
      },
      MULTIMODAL_INSTRUCTION: {
        title: 'බහුමාධ්‍ය ශ්‍රව්‍ය සහ පාඨ සහාය',
        desc: 'ලිඛිත සිංහල ගණිත ගැටලු හඬ උපදෙස් සමඟ ඉදිරිපත් කර කාර්ය මතකයේ බර අඩු කරන්න.',
      },
      POSITIVE_FEEDBACK_LOOPS: {
        title: 'ක්ෂණික ධනාත්මක ප්‍රතිචාර',
        desc: 'අවසාන පිළිතුර පමණක් නොව, අතරමැද පියවරවලදීත් මෘදු දිරිගැන්වීමක් ලබා දෙන්න.',
      },
    },
  },
  placeholder: {
    status: 'පර්යේෂණ සහ සංවර්ධනය කරමින් පවතී',
    researchModule: (component: string) => `පර්යේෂණ සංරචකය: ${component}.`,
    responsible: (component: string) => `වගකිව යුතු සංරචකය: ${component}`,
    architectureTitle: 'පර්යේෂණ සංරචක ඒකාබද්ධතාව',
    architectureText: 'මෙම පිටුව MathQuest පුවරුවේ ලියාපදිංචි කර ඇති අතර, එය වෙන් කර ඇත්තේ ස්වාධීන',
    architectureTextEnd: 'සංරචකය සඳහාය.',
    components: {
      pedagogical: 'ඉගැන්වීම් එන්ජිම',
      content: 'අන්තර්ගත අනුවර්තනය',
      behaviour: 'හැසිරීම් නිරීක්ෂණය',
    },
    progress: {
      name: 'පන්තියේ ගණිත ප්‍රගතිය සහ සංසන්දනය',
      desc: 'පවරා ඇති පන්ති කණ්ඩායම් සඳහා විෂය ප්‍රගතිය, කුසලතා ප්‍රගුණ කිරීම සහ ඉගෙනුම් වේගය පිළිබඳ සාරාංශ.',
    },
    activities: {
      name: 'ගුරු අන්තර්ගත අනුවර්තන ස්ටුඩියෝව',
      desc: 'ඔබේ පන්තිය සඳහා ADHD හිතකාමී සිංහල විෂය ප්‍රශ්න සහ ක්‍රීඩා සැලසුම් සකසා, සමාලෝචනය කර, අනුමත කරන්න.',
      action: 'අනුවර්තන ස්ටුඩියෝව විවෘත කරන්න',
    },
    behaviour: {
      name: 'පන්තියේ අවධානය පිළිබඳ නිරීක්ෂණ',
      desc: 'පන්තියේ වේගය සැලසුම් කිරීමට උදව් වන අවධාන කාල පරාස, ප්‍රශ්නවලදී නැවතීම් සහ අපහසුතා දර්ශකවල සාරාංශ.',
    },
    reports: {
      name: 'ප්‍රගති සහ ඇගයීම් වාර්තා',
      desc: 'ADHD සහාය අවශ්‍ය සිසුන් සඳහා අපනයනය කළ හැකි ප්‍රගති වාර්තා සහ සාක්ෂි මත පදනම් වූ සාරාංශ.',
    },
  },
  state: {
    loading: 'පූරණය වෙමින්...',
    retry: 'නැවත උත්සාහ කරන්න',
    dismiss: 'වසන්න',
  },
};

type Widen<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends (...args: never[]) => string ? T[K] : Widen<T[K]>;
};
export type TeacherDictionary = Widen<typeof si>;

const en: TeacherDictionary = {
  portal: {
    label: 'Teacher Portal',
    headerAria: 'Teacher Portal Header',
    homeAria: 'Teacher Portal Home',
    publicWebsite: 'Public Website',
    account: 'Teacher Account',
    signedIn: 'Signed in to the teacher account',
    navAria: 'Teacher Dashboard Navigation',
    openNav: 'Open navigation sidebar',
    closeNav: 'Close navigation sidebar',
    footerTitle: 'MathQuest Research',
    footerText: 'Adaptive Sinhala maths learning platform for children with ADHD support needs.',
    loading: 'Loading the teacher portal...',
    authTitle: 'Please sign in',
    authText: 'You must sign in with your teacher account to access this dashboard.',
    signIn: 'Sign In to Continue',
    breadcrumbAria: 'Dashboard Breadcrumb',
    breadcrumbRoot: 'Teacher Dashboard',
    home: 'Home',
    verifyingSession: 'Verifying session...',
  },
  userMenu: {
    role: 'Teacher',
    signedInAs: 'Signed in as',
    portalActive: 'Teacher portal active',
    studio: 'Teacher Studio',
    adminDashboard: 'Admin Dashboard',
    publicWebsite: 'Public Website',
    signOut: 'Sign Out',
    accountMenu: 'User account menu',
  },
  overview: {
    badge: 'Educator Portal',
    welcome: (name: string) => `Welcome, ${name}!`,
    teacherFallback: 'Teacher',
    intro:
      'Manage classroom mathematics differentiation, review curriculum progress, adapt Sinhala game content in the Teacher Studio, and monitor instructional recommendations.',
    openStudio: 'Open Teacher Studio',
    statAssigned: 'Assigned Learners',
    statOnboarded: 'Onboarded',
    statSupport: 'Support Needed',
    statBlueprints: 'Active Blueprints',
    privacyTitle: 'Student Privacy & Authorization Governance',
    privacySubtitle: 'Strict access control adheres to child data protection guidelines.',
    privacyText:
      'In compliance with ethical research standards and privacy protections, teachers do not automatically receive access to all registered platform children. Learner data is accessible only upon verified parental or institutional classroom assignment. Private parental questionnaires (such as raw SNAP-IV items) remain strictly confidential and are not exposed.',
    emptyTitle: 'No Learners Assigned Yet',
    emptyText:
      'Teacher-to-learner classroom roster management is currently in integration. Once parent consent and student linkage is established by your school administrator, your assigned learners will appear here with sanitized learning progress indicators.',
    rosterLink: 'Learn About Roster Linking',
    studioLink: 'Go to Content Adaptation Studio',
    cardStudioTitle: 'Content Adaptation Studio',
    cardStudioText: 'Review, adjust, and approve AI-generated Sinhala mathematics question blueprints for Grades 1–5.',
    cardStudioAction: 'Open Studio',
    cardTipsTitle: 'Teaching Recommendations',
    cardTipsText: 'Explore pedagogical scaffolding strategies, chunked instruction guides, and multimodal aids.',
    cardTipsAction: 'Explore Strategies',
    cardSecurityTitle: 'Sanitized Research Integration',
    cardSecurityText: 'Understand how MathQuest cross-component APIs protect sensitive data while empowering educators.',
    cardSecurityAction: 'View Security Spec',
  },
  learners: {
    title: 'Classroom Learners',
    description: 'View and manage assigned student rosters and classroom learning differentiation.',
    rosterTitle: 'Classroom Learner Roster',
    rosterText: 'Authorized teacher-to-learner roster linking is governed by school administrator assignment and verified parental consent.',
    boundaryTitle: 'Authorization Security Boundary',
    boundaryText1:
      'To prevent unauthorized access across student populations, individual student profiles and progress records are accessible only when an active classroom assignment exists.',
    boundaryText2: 'No mock, dummy, or unauthorized child data is displayed in accordance with MathQuest security guidelines.',
    studioLink: 'Go to Teacher Adaptation Studio',
  },
  profiles: {
    title: 'Learner Profiles',
    description: 'Review sanitized pedagogical skill levels, credible intervals, and support requirements.',
    heading: 'Pedagogical Learner Profiles',
    text: 'When learners are assigned to your class, you will see sanitized pedagogical profiles focusing strictly on mathematics skill mastery, credible intervals, and instructional strategies.',
    architectureTitle: 'Sanitized Cross-Component Architecture:',
    exposes: 'Exposes: Mathematics skill levels, credible intervals, and explainable recommendations.',
    protects: 'Protects: Raw SNAP-IV ratings, private parental notes, and clinical scale metrics remain hidden.',
    studioLink: 'Open Teacher Adaptation Studio',
  },
  recommendations: {
    title: 'Teaching Recommendations',
    description: 'Evidence-based pedagogical strategies and instructional guidelines for primary mathematics with ADHD support needs.',
    heading: 'ADHD-Informed Pedagogical Guidelines',
    intro: 'These evidence-based strategies are recommended by MathQuest’s Pedagogical Engine for primary mathematics instruction with ADHD support needs.',
    strategies: {
      VISUAL_MANIPULATIVES: {
        title: 'Visual Representation & Concrete Manipulatives',
        desc: 'Use number lines, ten-frames, and pictorial counters before transitioning to abstract numerical equations.',
      },
      CHUNKING_PACING: {
        title: 'Chunked Tasks & Frequent Low-Stakes Breaks',
        desc: 'Limit single practice bursts to 3–5 structured questions. Prevent cognitive fatigue in learners with attention variance.',
      },
      MULTIMODAL_INSTRUCTION: {
        title: 'Multimodal Audio & Text Scaffolding',
        desc: 'Pair written Sinhala mathematical word problems with synchronized audio prompts to ease working-memory load.',
      },
      POSITIVE_FEEDBACK_LOOPS: {
        title: 'Immediate Constructive Micro-Feedback',
        desc: 'Provide gentle encouragement upon intermediate steps rather than evaluating only the final calculation output.',
      },
    },
  },
  placeholder: {
    status: 'In Active Research & Development',
    researchModule: (component: string) => `Research Module: ${component}.`,
    responsible: (component: string) => `Responsible Component: ${component}`,
    architectureTitle: 'Research Component Integration Architecture',
    architectureText: 'This route is registered in the MathQuest Dashboard shell and is reserved for the independent',
    architectureTextEnd: 'module.',
    components: {
      pedagogical: 'Pedagogical Engine',
      content: 'Content Adaptation',
      behaviour: 'Behaviour Monitoring',
    },
    progress: {
      name: 'Classroom Mathematics Progression & Benchmarking',
      desc: 'Aggregated curriculum progression, domain-level skill mastery heatmaps, and learning pacing distributions for assigned classroom groups.',
    },
    activities: {
      name: 'Teacher Content Adaptation Studio',
      desc: 'Generate, review, adjust, and approve ADHD-friendly Sinhala curriculum questions and game blueprints for your classroom.',
      action: 'Open Adaptation Studio',
    },
    behaviour: {
      name: 'Classroom Attention & Focus Variance Observations',
      desc: 'Synthesized focus intervals, question-pause patterns, and frustration indicators to inform classroom pacing.',
    },
    reports: {
      name: 'Comprehensive Progress & Assessment Reports',
      desc: 'Exportable progress reports, evidence-backed summaries, and IEP documentation support for students with ADHD.',
    },
  },
  state: {
    loading: 'Loading data...',
    retry: 'Retry',
    dismiss: 'Dismiss',
  },
};

/** Teacher portal / shared shell text in the current language. */
export const teacherText: TeacherDictionary = localized<TeacherDictionary>({ si, en });
