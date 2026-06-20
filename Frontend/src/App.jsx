import { useEffect } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import './styles/globals.css';

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  // Re-validate any persisted session token against the backend on load.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <AppRoutes />
    </div>
  );
}

export default App;
