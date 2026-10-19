
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/public/HomePage';
import ContentAdaptationPage from './features/content-adaptation/ContentAdaptationPage';

import { SignInPage } from './features/auth/pages/SignInPage';
import { SignUpPage } from './features/auth/pages/SignUpPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';

import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';

import { ProfilePage } from './pages/profile/ProfilePage';

import {
  LearnersPage,
  OnboardingPlaceholderPage,
} from './features/learner-profile';

import StandaloneDataCollection from './features/behaviour-monitoring/StandaloneDataCollection';
import BehaviourMonitoringPage from './features/behaviour-monitoring/BehaviourMonitoringPage';

// Parent / Teacher dashboards
import BehaviourDashboard from './features/behaviour-monitoring/BehaviourDashboard';
import InteractionDashboard from './features/behaviour-monitoring/InteractionDashboard';

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

function App() {
  const hash = useHashRoute();

  if (hash.startsWith('#/adapt')) {
    return <ContentAdaptationPage mode="studio" />;
  }

  if (hash.startsWith('#/play')) {
    return <ContentAdaptationPage mode="play" />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public pages */}
          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/sign-in"
            element={<SignInPage />}
          />

          <Route
            path="/sign-up"
            element={<SignUpPage />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Learner management */}
          <Route
            path="/learners"
            element={
              <ProtectedRoute>
                <LearnersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/learners/:learnerId/onboarding"
            element={
              <ProtectedRoute>
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

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
