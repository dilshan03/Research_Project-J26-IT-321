
import { useEffect, useState } from 'react';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import ContentAdaptationPage from './features/content-adaptation/ContentAdaptationPage';

import { SignInPage } from './features/auth/pages/SignInPage';
import { SignUpPage } from './features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';

import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';

import { ProfilePage } from './pages/profile/ProfilePage';


import StandaloneDataCollection from './features/behaviour-monitoring/StandaloneDataCollection';
import BehaviourMonitoringPage from './features/behaviour-monitoring/BehaviourMonitoringPage';

// Parent / Teacher dashboards
import BehaviourDashboard from './features/behaviour-monitoring/BehaviourDashboard';
import InteractionDashboard from './features/behaviour-monitoring/InteractionDashboard';
import { UserProfilePage } from './features/user-profile/pages/UserProfilePage';
import {
  LearnersPage,
  OnboardingPlaceholderPage,
  ParentOverviewPage,
  ParentSnapIvPage,
  ParentSupportInfoPage,
  ParentLearnerProfilesPage,
  ParentAssessmentsPage,
  ParentRecommendationsPage,
  ParentComingSoonPage,
} from './features/learner-profile';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { FeaturePlaceholder } from './shared/components/FeaturePlaceholder';
import TeacherOverviewPage from './pages/teacher/TeacherOverviewPage';
import TeacherLearnersPage from './pages/teacher/TeacherLearnersPage';
import TeacherLearnerProfilesPage from './pages/teacher/TeacherLearnerProfilesPage';
import TeacherRecommendationsPage from './pages/teacher/TeacherRecommendationsPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import AdminDashboardPage from './features/admin/pages/AdminDashboardPage';
import { ResearchAccessGate } from './features/admin/research/ResearchLayout';
import ResearchHomePage from './features/admin/research/ResearchHomePage';
import ResearchComponentPage from './features/admin/research/ResearchComponentPage';

// -------------------------------------------------------------
// [DEV TEMP] Pedagogical Agent Test Page Import (Remove later)
// -------------------------------------------------------------
import AgentTestPage from './pages/test/AgentTestPage';
// -------------------------------------------------------------

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);

    window.addEventListener('hashchange', onChange);

    return () =>
      window.removeEventListener('hashchange', onChange);
  }, []);

  return hash;
}

// Floating dev controls removed per UI requirements

function App() {
  const hash = useHashRoute();

  if (hash.startsWith('#/adapt')) {
    return <ContentAdaptationPage mode="studio" />;
  }

  if (hash.startsWith('#/play')) {
    return <ContentAdaptationPage mode="play" />;
  }
  // Preserve existing hash-based sub-app routes for Content Adaptation
  if (hash.startsWith('#/adapt')) return <ContentAdaptationPage mode="studio" />;
  if (hash.startsWith('#/play')) return <ContentAdaptationPage mode="play" />;

  return (
    <AuthProvider>
      <BrowserRouter>
        
        <Routes>

          {/* ========================================================= */}
          {/* 1. Public & Core Authentication Routes                    */}
          {/* ========================================================= */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ========================================================= */}
          {/* 2. Preserved Existing & Student Dashboard Routes          */}
          {/* ========================================================= */}
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/dashboard/:learnerId" element={<StudentDashboardPage />} />
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Learner management */}
          {/* ------------------------------------------------------------- */}
          {/* [DEV TEMP] Pedagogical Agent Test Route (Remove later) */}
          {/* ------------------------------------------------------------- */}
          <Route path="/agent-test" element={<AgentTestPage />} />
          <Route path="/test/agent" element={<AgentTestPage />} />
          {/* ------------------------------------------------------------- */}
          {/* Canonical My Children Route (Unified in Parent Portal Layout) */}
          <Route
            path="/learners"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <DashboardLayout role="parent" />
              </ProtectedRoute>
            }
          >
            <Route index element={<LearnersPage />} />
            {/* Optional SNAP-IV, opened from the parent dashboard */}
            <Route path=":learnerId/snap-iv" element={<ParentSnapIvPage />} />
          </Route>
      

          <Route
            path="/learners/:learnerId/onboarding"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <OnboardingPlaceholderPage />
              </ProtectedRoute>
            }
          />

          {/* Standalone behaviour data collection */}
          <Route
            path="/behaviour-data-collection"
            element={<StandaloneDataCollection />}
          />

          {/* Standalone behaviour game */}
          <Route
            path="/behaviour-monitoring"
            element={<BehaviourMonitoringPage />}
          />

          {/* Behaviour Dashboard */}
          <Route
            path="/parent/behaviour"
            element={
              <ProtectedRoute>
                <BehaviourDashboard
                  learnerName="ශිෂ්‍යයා"
                  sessions={[]}
                />
              </ProtectedRoute>
            }
          />
          {/* Read-only admin dashboard (role 'admin' is set manually; every read is audit-logged) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Research & Model Analytics: admin role + researchAnalyticsAccess (enforced by the server on every request) */}
          <Route
            path="/admin/research"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ResearchAccessGate><ResearchHomePage /></ResearchAccessGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/research/:componentId/:tab?"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ResearchAccessGate><ResearchComponentPage /></ResearchAccessGate>
              </ProtectedRoute>
            }
          />

          {/* Interaction Dashboard */}
          <Route
            path="/parent/interaction"
            element={
              <ProtectedRoute>
                <InteractionDashboard
                  learnerName="ශිෂ්‍යයා"
                  sessions={[]}
                />
              </ProtectedRoute>
            }
          />

          {/* Compatibility Redirects */}
          <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
          <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />

          {/* ========================================================= */}
          {/* 3. Parent Dashboard (Role-Protected Nested Routes)       */}
          {/* ========================================================= */}
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <DashboardLayout role="parent" />
              </ProtectedRoute>
            }
          >
            {/* 1. Overview */}
            <Route index element={<ParentOverviewPage />} />

            {/* 2. My Children (Canonical redirect to /learners) */}
            <Route path="children" element={<Navigate to="/learners" replace />} />

            {/* 3. Learner Profiles */}
            <Route path="learner-profiles" element={<ParentLearnerProfilesPage />} />

            {/* 4. Onboarding & Assessments */}
            <Route path="assessments" element={<ParentAssessmentsPage />} />

            {/* 5. Learning Progress (Pedagogical Engine) */}
            <Route path="progress" element={<ParentComingSoonPage feature="progress" />} />

            {/* 6. Personalized Recommendations */}
            <Route path="recommendations" element={<ParentRecommendationsPage />} />

            {/* 7. Learning Activities (Content Adaptation) */}
            <Route path="activities" element={<ParentComingSoonPage feature="activities" />} />

            {/* 8. Behaviour Insights (Behaviour Monitoring) */}
            <Route path="behaviour" element={<ParentComingSoonPage feature="behaviour" />} />

            {/* Parent-reported ADHD information and SNAP-IV history */}
            <Route path="support-info" element={<ParentSupportInfoPage />} />

            {/* 9. Settings (Reuses User Profile) */}
            <Route path="settings" element={<UserProfilePage hideNavbar={true} />} />
          </Route>

          {/* ========================================================= */}
          {/* 4. Teacher Dashboard (Role-Protected Nested Routes)      */}
          {/* ========================================================= */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout role="teacher" />
              </ProtectedRoute>
            }
          >
            {/* 1. Overview */}
            <Route index element={<TeacherOverviewPage />} />

            {/* 2. My Learners */}
            <Route path="learners" element={<TeacherLearnersPage />} />

            {/* 3. Learner Profiles */}
            <Route path="learner-profiles" element={<TeacherLearnerProfilesPage />} />

            {/* 4. Class Progress (Pedagogical Engine) */}
            <Route
              path="progress"
              element={
                <FeaturePlaceholder
                  featureName="Classroom Mathematics Progression & Benchmarking"
                  responsibleComponent="Pedagogical Engine"
                  description="Aggregated curriculum progression, domain-level skill mastery heatmaps, and learning pacing distributions for assigned classroom groups."
                  integrationStatus="In Active Research & Development"
                />
              }
            />

            {/* 5. Learning Activities (Content Adaptation Studio) */}
            <Route
              path="activities"
              element={
                <FeaturePlaceholder
                  featureName="Teacher Content Adaptation Studio"
                  responsibleComponent="Content Adaptation"
                  description="Generate, review, adjust, and approve ADHD-friendly Sinhala curriculum questions and game blueprints for your classroom."
                  integrationStatus="In Active Research & Development"
                  actionLink={{
                    label: 'Open Adaptation Studio',
                    href: '#/adapt',
                    isExternalHash: true,
                  }}
                />
              }
            />

            {/* 6. Teaching Recommendations */}
            <Route path="recommendations" element={<TeacherRecommendationsPage />} />

            {/* 7. Behaviour Insights (Behaviour Monitoring) */}
            <Route
              path="behaviour"
              element={
                <FeaturePlaceholder
                  featureName="Classroom Attention & Focus Variance Observations"
                  responsibleComponent="Behaviour Monitoring"
                  description="Synthesized focus intervals, question-pause patterns, and frustration indicators to inform classroom pacing."
                  integrationStatus="In Active Research & Development"
                />
              }
            />

            {/* 8. Reports (Pedagogical Engine & Reporting) */}
            <Route
              path="reports"
              element={
                <FeaturePlaceholder
                  featureName="Comprehensive Progress & Assessment Reports"
                  responsibleComponent="Pedagogical Engine"
                  description="Exportable progress reports, evidence-backed diagnostic summaries, and IEP documentation support for students with ADHD."
                  integrationStatus="In Active Research & Development"
                />
              }
            />

            {/* 9. Settings (Reuses User Profile) */}
            <Route path="settings" element={<UserProfilePage hideNavbar={true} />} />
          </Route>

          {/* Catch-all Wildcard Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
