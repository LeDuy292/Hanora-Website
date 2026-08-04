import { useEffect } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ui/ToastContainer';
import { toast } from './store/notificationStore';
import './styles/globals.css';

import { useState } from 'react';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { FloatingStudyTimer } from './components/ui/FloatingStudyTimer';
import { SmartReviewPromptModal } from './components/vocabulary/SmartReviewPromptModal';
import { useVocabularyStore } from './store/vocabularyStore';

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const trackStudyTime = useAuthStore((s) => s.trackStudyTime);
  const pendingMilestonePrompt = useVocabularyStore((s) => s.pendingMilestonePrompt);
  const clearMilestonePrompt = useVocabularyStore((s) => s.clearMilestonePrompt);
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

  // Site-wide background document processing monitor & completion notification
  useEffect(() => {
    if (!isAuthenticated) return;

    let processingDocMap = new Map();

    const checkDocumentsBackground = async () => {
      try {
        const { getMyDocuments } = await import('./lib/api');
        const docs = await getMyDocuments();
        if (!docs || !Array.isArray(docs)) return;

        docs.forEach(doc => {
          const statusStr = String(doc.status || '').toLowerCase();
          const isProcessing = statusStr !== 'ready' && doc.status !== 4 && statusStr !== 'failed' && doc.status !== 5;
          const isReady = statusStr === 'ready' || doc.status === 4;

          const docKey = String(doc.id);

          // If doc was previously tracked as processing and now is ready
          if (processingDocMap.get(docKey) && isReady) {
            processingDocMap.delete(docKey);
            toast.success(
              `🎉 Tài liệu "${doc.title}" đã nhận diện & phân tích hoàn tất! Bạn có thể mở bài đọc ngay.`,
              4000
            );
          } else if (isProcessing) {
            processingDocMap.set(docKey, true);
          }
        });
      } catch (err) {
        // Non-fatal background check
      }
    };

    checkDocumentsBackground();
    const docInterval = setInterval(checkDocumentsBackground, 3500);

    return () => clearInterval(docInterval);
  }, [isAuthenticated]);

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
      <FloatingStudyTimer />
      <SmartReviewPromptModal
        isOpen={Boolean(pendingMilestonePrompt)}
        onClose={clearMilestonePrompt}
        wordCount={pendingMilestonePrompt?.count || 10}
        docTitle={pendingMilestonePrompt?.docTitle || ''}
      />
    </div>
  );
}

export default App;
//