import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/public/HomePage';
import ContentAdaptationPage from './features/content-adaptation/ContentAdaptationPage';
import { SignInPage } from './features/auth/pages/SignInPage';
import { SignUpPage } from './features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { ProfilePage } from './pages/profile/ProfilePage';
import { UserProfilePage } from './features/user-profile/pages/UserProfilePage';
import {
  LearnersPage,
  OnboardingPlaceholderPage,
  ParentOverviewPage,
  ParentLearnerProfilesPage,
  ParentAssessmentsPage,
  ParentRecommendationsPage,
} from './features/learner-profile';
import { DashboardLayout } from './shared/layouts/DashboardLayout';
import { FeaturePlaceholder } from './shared/components/FeaturePlaceholder';
import TeacherOverviewPage from './pages/teacher/TeacherOverviewPage';
import TeacherLearnersPage from './pages/teacher/TeacherLearnersPage';
import TeacherLearnerProfilesPage from './pages/teacher/TeacherLearnerProfilesPage';
import TeacherRecommendationsPage from './pages/teacher/TeacherRecommendationsPage';

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
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function App() {
  const hash = useHashRoute();

  // Preserve existing hash-based sub-app routes for Content Adaptation
  if (hash.startsWith('#/adapt')) return <ContentAdaptationPage mode="studio" />;
  if (hash.startsWith('#/play')) return <ContentAdaptationPage mode="play" />;

  return (
    <AuthProvider>
      <BrowserRouter>
        {/* ------------------------------------------------------------- */}
        {/* [DEV TEMP] Quick Floating Button to Test 3D Agent (Remove later) */}
        {/* ------------------------------------------------------------- */}
        {window.location.pathname !== '/agent-test' && (
          <a
            href="/agent-test"
            className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-emerald-600 text-white font-bold rounded-full shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer border-2 border-white/40"
          >
            <span>🤖</span>
            <span>Test 3D Agent</span>
          </a>
        )}
        {/* ------------------------------------------------------------- */}

        <Routes>
          {/* ========================================================= */}
          {/* 1. Public & Core Authentication Routes                    */}
          {/* ========================================================= */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ========================================================= */}
          {/* 2. Preserved Existing Routes                              */}
          {/* ========================================================= */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* ------------------------------------------------------------- */}
          {/* [DEV TEMP] Pedagogical Agent Test Route (Remove later) */}
          {/* ------------------------------------------------------------- */}
          <Route path="/agent-test" element={<AgentTestPage />} />
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
          </Route>

          <Route
            path="/learners/:learnerId/onboarding"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <OnboardingPlaceholderPage />
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
            <Route
              path="progress"
              element={
                <FeaturePlaceholder
                  featureName="Mathematics Learning Progress & Skill Mastery"
                  responsibleComponent="Pedagogical Engine"
                  description="Real-time curriculum tracking, skill progression trees, and mastery milestone visualizations are managed by the Pedagogical Engine."
                  integrationStatus="In Active Research & Development"
                />
              }
            />

            {/* 6. Personalized Recommendations */}
            <Route path="recommendations" element={<ParentRecommendationsPage />} />

            {/* 7. Learning Activities (Content Adaptation) */}
            <Route
              path="activities"
              element={
                <FeaturePlaceholder
                  featureName="Adaptive Learning Activities & Games"
                  responsibleComponent="Content Adaptation"
                  description="Interactive Sinhala mathematical games and personalized story themes adapted to each child's working memory and pacing profile."
                  integrationStatus="In Active Research & Development"
                  actionLink={{
                    label: 'Launch Available Learner Games',
                    href: '#/play',
                    isExternalHash: true,
                  }}
                />
              }
            />

            {/* 8. Behaviour Insights (Behaviour Monitoring) */}
            <Route
              path="behaviour"
              element={
                <FeaturePlaceholder
                  featureName="Behaviour Insights & ADHD Engagement Monitoring"
                  responsibleComponent="Behaviour Monitoring"
                  description="Real-time attention span, interaction latency, and engagement heatmaps captured during learning sessions are synthesized by the Behaviour Monitoring component."
                  integrationStatus="In Active Research & Development"
                />
              }
            />

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