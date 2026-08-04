import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, Layers, ArrowRight, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useVocabularyStore } from '../../store/vocabularyStore';
import { toast } from '../../store/notificationStore';

export const SmartReviewPromptModal = ({ isOpen, onClose, wordCount = 10, docTitle = '' }) => {
  const navigate = useNavigate();
  const createQuickDeckFromRecent = useVocabularyStore((s) => s.createQuickDeckFromRecent);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);

  if (!isOpen) return null;

  const estimatedMinutes = Math.max(2, Math.ceil((wordCount * 20) / 60));

  const handleStartReview = async () => {
    setIsCreatingDeck(true);
    try {
      const createdDeck = await createQuickDeckFromRecent(wordCount);
      onClose();
      if (createdDeck && createdDeck.id) {
        toast.success(`Đã tạo bộ Flashcard tạm ôn tập ${wordCount} từ vừa lưu!`);
        navigate(`/flashcards?mode=quick&deckId=${createdDeck.id}`);
      } else {
        navigate(`/flashcards?mode=quick&deck=recent&count=${wordCount}`);
      }
    } catch (e) {
      onClose();
      navigate(`/flashcards?mode=quick&deck=recent&count=${wordCount}`);
    } finally {
      setIsCreatingDeck(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative overflow-hidden select-none space-y-5 animate-in zoom-in-95 duration-200">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge & Title */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi Ý Ôn Tập Thông Minh (SRS)</span>
          </div>

          <h3 className="text-lg font-black text-slate-850 leading-tight">
            Bạn vừa lưu {wordCount} từ mới!
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {docTitle ? `Từ bài đọc "${docTitle}".` : 'Dữ liệu từ vựng vừa được bổ sung.'} Bạn có muốn bắt đầu phiên ôn tập ngắn ngay bây giờ để chuyển từ vựng vào bộ nhớ dài hạn không?
          </p>
        </div>

        {/* Session Stats Box */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thẻ cần ôn</span>
                <span className="text-sm font-black text-slate-800">{wordCount} Từ mới</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thời gian ước tính</span>
              <span className="text-sm font-black text-blue-600 flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5 inline" /> ~{estimatedMinutes} phút
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-2 flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Tự động xếp lịch ôn tập theo đường cong xói mòn trí nhớ Ebbinghaus.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors text-center"
          >
            Nhắc tôi sau
          </button>
          <button
            onClick={handleStartReview}
            disabled={isCreatingDeck}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 group"
          >
            {isCreatingDeck ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tạo bộ từ...</span>
              </>
            ) : (
              <>
                <span>Tạo bộ & Ôn {estimatedMinutes}p</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
