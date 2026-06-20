import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';

// Pages
import { LandingPage } from '../pages/LandingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ReaderPage } from '../pages/ReaderPage';
import { FlashcardPage } from '../pages/FlashcardPage';
import { VocabularyPage } from '../pages/VocabularyPage';
import { PronunciationPage } from '../pages/PronunciationPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';

export function AppRoutes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/"
        element={isAuthenticated ? (
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        ) : (
          <LandingPage />
        )}
      />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
      />

      {/* Protected Routes inside MainLayout */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/progress" 
        element={<Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/reader" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <ReaderPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vocabulary" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <VocabularyPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/flashcards" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <FlashcardPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/upload" 
        element={<Navigate to="/reader" replace />} 
      />

      <Route 
        path="/pronunciation" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <PronunciationPage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        } 
      />

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default AppRoutes;
