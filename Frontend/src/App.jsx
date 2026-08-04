import { useEffect } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ui/ToastContainer';
import './styles/globals.css';

import { useState } from 'react';
import { OnboardingModal } from './components/auth/OnboardingModal';

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const trackStudyTime = useAuthStore((s) => s.trackStudyTime);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Re-validate any persisted session token against the backend on load.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Check if onboarding needs to be shown (Only on registration / first-time google login)
  useEffect(() => {
    if (isAuthenticated && user && (user.needsOnboarding || user.isNewAccount) && !user.preferences?.onboardingCompleted) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [isAuthenticated, user]);

  // Site-wide study time tracker (runs from 00:00 to 23:59 based on active app interaction)
  useEffect(() => {
    if (!isAuthenticated) return;

    let activeSeconds = parseInt(localStorage.getItem('hanora_study_active_seconds') || '0', 10);

    const interval = setInterval(() => {
      // Only count if the tab/page is visible and active
      if (document.hidden) return;

      activeSeconds += 1;

      if (activeSeconds >= 60) {
        trackStudyTime(1);
        activeSeconds = 0;
      }

      localStorage.setItem('hanora_study_active_seconds', activeSeconds.toString());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, trackStudyTime]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <AppRoutes />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <ToastContainer />
    </div>
  );
}

export default App;
//