import { useEffect } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/common/ToastContainer';
import './styles/globals.css';

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const trackStudyTime = useAuthStore((s) => s.trackStudyTime);

  // Re-validate any persisted session token against the backend on load.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
      <ToastContainer />
    </div>
  );
}

export default App;
//