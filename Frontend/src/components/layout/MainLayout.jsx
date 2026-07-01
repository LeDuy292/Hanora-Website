import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommunityChatbox } from '../chat/CommunityChatbox';

export function MainLayout({ children }) {
  const [showBanner, setShowBanner] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      setShowBanner(false);
      return;
    }

    const checkReminder = () => {
      // 1. Is reminder enabled?
      const reminderEnabled = localStorage.getItem('hanora_reminder_enabled') !== 'false';
      if (!reminderEnabled) {
        setShowBanner(false);
        return;
      }

      // 2. Is current day of week enabled?
      const savedDays = localStorage.getItem('hanora_reminder_days');
      const reminderDays = savedDays ? JSON.parse(savedDays) : [0, 1, 2, 3, 4, 5, 6];
      const todayDay = new Date().getDay();
      
      if (!reminderDays.includes(todayDay)) {
        setShowBanner(false);
        return;
      }

      // 3. Has the user dismissed it today?
      const todayDateStr = new Date().toDateString();
      const dismissedToday = localStorage.getItem(`hanora_reminder_dismissed_${todayDateStr}`) === 'true';
      if (dismissedToday) {
        setShowBanner(false);
        return;
      }

      // 4. Is current time past 20:00?
      const now = new Date();
      const currentHour = now.getHours();
      
      // Fixed study reminder time: 20:00 (8:00 PM)
      const isPastFixedTime = currentHour >= 20;
      
      setShowBanner(isPastFixedTime);
    };

    checkReminder();
    // Recheck immediately on route changes or every 30 seconds
    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [user, location]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    const todayDateStr = new Date().toDateString();
    localStorage.setItem(`hanora_reminder_dismissed_${todayDateStr}`, 'true');
    setShowBanner(false);
  };

  const handleGoToReview = () => {
    navigate('/flashcards');
  };

  const isFlashcardPage = location.pathname === '/flashcards';
  const displayBanner = showBanner && !isFlashcardPage;

  const hideChatbox = 
    location.pathname.startsWith('/quiz') || 
    location.pathname.startsWith('/pronunciation');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden">
      {/* Background radial shapes for aesthetic continuity */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-100/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Daily Study Reminder Notification Banner */}
      {displayBanner && (
        <div className="fixed top-0 left-0 w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white z-[60] flex items-center justify-center px-12 shadow-md select-none animate-slide-down">
          <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-450"></span>
            </span>
            <span className="flex items-center gap-1.5">
              🔔 Đã đến giờ ôn tập cố định (20:00)! Hãy dành ít phút ôn từ vựng để duy trì chuỗi {user?.streak || 8} ngày học liên tục.
            </span>
            <button 
              onClick={handleGoToReview}
              className="ml-3 bg-white hover:bg-slate-100 text-blue-700 font-extrabold text-[11.5px] px-3 py-1 rounded-lg transition-all shadow-sm flex items-center gap-1 active:scale-95 hover:shadow-md"
            >
              <span>Ôn tập ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={handleDismiss}
            className="absolute right-4 p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      {/* Landing Page style header navbar for all internal pages */}
      <Header offsetTop={displayBanner} />

      {/* Main Content Pane */}
      <main className={`flex-grow ${displayBanner ? 'pt-36' : 'pt-28'} pb-16 max-w-[1600px] 2xl:max-w-[1800px] mx-auto w-[95%] px-6 relative z-10 transition-all duration-300`}>
        <div key={location.pathname} className="page-transition">
          {children}
        </div>
      </main>

      {/* Smart AI Learning Assistant Chatbox */}
      {!hideChatbox && <CommunityChatbox />}

      <Footer />
    </div>
  );
}
export default MainLayout;
