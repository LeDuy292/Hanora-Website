import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Sparkles, BookOpen, Target, CheckCircle2, ChevronRight, Award } from 'lucide-react';

const HSK_LEVELS = [
  { id: 'HSK 1', title: 'HSK 1 - Sơ cấp 1', desc: 'Nhận biết 150+ từ căn bản' },
  { id: 'HSK 2', title: 'HSK 2 - Sơ cấp 2', desc: 'Nhận biết 300+ từ hội thoại ngắn' },
  { id: 'HSK 3', title: 'HSK 3 - Trung cấp 1', desc: 'Hiểu 600+ từ & câu ghép' },
  { id: 'HSK 4', title: 'HSK 4 - Trung cấp 2', desc: 'Đọc hiểu 1200+ từ & báo chí' },
  { id: 'HSK 5', title: 'HSK 5 - Cao cấp 1', desc: 'Đọc hiểu 2500+ từ & phim ảnh' },
  { id: 'HSK 6', title: 'HSK 6 - Cao cấp 2', desc: 'Thành thạo 5000+ từ như bản ngữ' },
];

const LEARNING_GOALS = [
  { id: 'Đọc tài liệu & sách báo', title: '📖 Đọc tài liệu & Sách báo', desc: 'Hỗ trợ dịch OCR, tra từ trực tiếp trên PDF/Ảnh' },
  { id: 'Luyện thi HSK', title: '🎯 Luyện thi HSK', desc: 'Tập trung từ vựng HSK, ôn tập thẻ Spaced Repetition' },
  { id: 'Giao tiếp & Công việc', title: '💼 Giao tiếp & Công việc', desc: 'Phát âm chuẩn, hội thoại chuyên ngành' },
  { id: 'Tự do khám phá', title: '🚀 Tự do khám phá', desc: 'Học từ vựng theo tài liệu cá nhân tải lên' },
];

export function OnboardingModal({ isOpen, onClose }) {
  const { user, updatePreferences, updateProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(user?.level || 'HSK 3');
  const [selectedGoal, setSelectedGoal] = useState(user?.preferences?.learningGoal || 'Đọc tài liệu & sách báo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      updatePreferences({
        learningGoal: selectedGoal,
        level: selectedLevel,
        onboardingCompleted: true,
      });
      updateProfile({
        level: selectedLevel,
        needsOnboarding: false,
        isNewAccount: false,
      });
    } catch (e) {
      console.warn('Could not save onboarding preferences:', e);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-100">
        
        {/* Header gradient banner: Blue & White theme */}
        <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> Chào mừng bạn đến với Hanora
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Cá nhân hóa lộ trình học</h2>
          <p className="text-sky-100 text-sm mt-1">Chỉ 2 bước đơn giản để Hanora hỗ trợ bạn tốt nhất</p>

          {/* Stepper indicator */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? 'text-white' : 'text-white/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === 1 ? 'bg-white text-blue-600' : 'bg-white/20'}`}>1</span>
              Trình độ
            </div>
            <div className="w-8 h-0.5 bg-white/30" />
            <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? 'text-white' : 'text-white/60'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step === 2 ? 'bg-white text-blue-600' : 'bg-white/20'}`}>2</span>
              Mục tiêu
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 ? (
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                <Award className="w-5 h-5 text-blue-600" />
                Trình độ Tiếng Trung hiện tại của bạn?
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HSK_LEVELS.map((lvl) => {
                  const isSelected = selectedLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-blue-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{lvl.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{lvl.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold text-lg">
                <Target className="w-5 h-5 text-blue-600" />
                Mục tiêu chính khi sử dụng Hanora?
              </div>
              <div className="space-y-3">
                {LEARNING_GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-blue-300 bg-white text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{goal.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{goal.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Quay lại
            </button>
          ) : <div />}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="ml-auto inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
            >
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Hoàn tất & Khám phá'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
