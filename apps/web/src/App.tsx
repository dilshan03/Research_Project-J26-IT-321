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
  
  if (hash.startsWith('#/adapt')) return <ContentAdaptationPage mode="studio" />;
  if (hash.startsWith('#/play')) return <ContentAdaptationPage mode="play" />;
  
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* ------------------------------------------------------------- */}
        {/* [DEV TEMP] Quick Floating Button to Test 3D Agent (Remove later) */}
        {/* ------------------------------------------------------------- */}
        <a
          href="/agent-test"
          className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-emerald-600 text-white font-bold rounded-full shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer border-2 border-white/40"
        >
          <span>🤖</span>
          <span>Test 3D Agent</span>
        </a>
        {/* ------------------------------------------------------------- */}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;