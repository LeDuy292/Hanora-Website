import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, ChevronLeft, Trophy, Target, Timer as ClockIcon, Zap, Eye, BrainCircuit
} from 'lucide-react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useLanguageStore } from '../store/languageStore';
import { Button } from '../components/common/Button';
import '../styles/Quiz.css';

export function PracticeHistoryPage() {
  const navigate = useNavigate();
  const { fetchQuizHistory, fetchQuizResult } = useVocabularyStore();
  const { t, language } = useLanguageStore();
  const isEn = language === 'en';

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // full session detail
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchQuizHistory().then(data => {
      setHistory(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const formatTime = (seconds) => {
    const s = Number(seconds) || 0;
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };
  const formatDate = (d) => {
    if (!d) return '';
    try { 
      return new Date(d).toLocaleString(isEn ? 'en-US' : 'vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      }); 
    } catch { 
      return d; 
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    const session = await fetchQuizResult(id);
    setSelected(session);
    setDetailLoading(false);
  };

  const prettyType = (typeKey) => {
    const map = {
      multiple_choice_meaning: isEn ? 'Multiple Choice (Meaning)' : 'Chọn nghĩa',
      multiple_choice_word: isEn ? 'Multiple Choice (Word)' : 'Chọn từ',
      pinyin_match: isEn ? 'Pinyin Match' : 'Chọn Pinyin',
      fill_in_blank: isEn ? 'Fill in the Blank' : 'Điền từ',
      example_match: isEn ? 'Example Match' : 'Ví dụ',
      context: isEn ? 'Contextual Question' : 'Ngữ cảnh'
    };
    return map[typeKey] || String(typeKey || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // ---- Detail view (reuse the review layout) ----
  if (selected) {
    return (
      <div className="quiz-page-wrapper py-6 px-4 w-full mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-blue-600 font-bold mb-6 hover:underline">
          <ChevronLeft className="w-4 h-4" /> {t('practiceHistory.back')}
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{t('practiceHistory.detailTitle')}</h2>
              <p className="text-slate-400 font-medium">{formatDate(selected.completedAt || selected.startedAt)}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-600">{selected.score || 0}</div>
                <div className="text-[10px] uppercase font-black text-slate-400">{t('practiceHistory.points')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-600">{selected.accuracyPercent || 0}%</div>
                <div className="text-[10px] uppercase font-black text-slate-400">{t('practiceHistory.accuracy')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-amber-500">+{selected.xp || 0}</div>
                <div className="text-[10px] uppercase font-black text-slate-400">{t('practiceHistory.xp')}</div>
              </div>
            </div>
          </div>
          {selected.aiFeedback && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
              <BrainCircuit className="w-6 h-6 text-blue-600 shrink-0" />
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">{selected.aiFeedback}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(selected.quizQuestions || []).map((q, i) => {
            const opts = (() => { try { return JSON.parse(q.options); } catch { return []; } })();
            const correct = q.isCorrect;
            return (
              <div key={q.id} className={`p-6 rounded-3xl border-2 ${correct ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isEn ? `Question ${i + 1}` : `Câu ${i + 1}`} • {prettyType(q.questionType)}
                </div>
                <div className="font-black text-slate-800 text-lg mb-3">{q.questionText}</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {opts.map((opt, oi) => {
                    const isCorrectOpt = opt.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
                    const isUserOpt = opt.trim().toLowerCase() === q.userAnswer?.trim().toLowerCase();
                    return (
                      <span key={oi} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isCorrectOpt ? 'bg-emerald-500 text-white' : isUserOpt ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                        {opt}{isUserOpt && !isCorrectOpt ? (isEn ? ' (your choice)' : ' (bạn chọn)') : ''}
                      </span>
                    );
                  })}
                </div>
                {(q.aiExplanation || q.explanation) && (
                  <div className="bg-white/70 rounded-2xl p-4 border border-slate-100 text-slate-600 text-sm leading-relaxed">
                    <span className="font-black text-blue-600">{isEn ? 'Explanation: ' : 'Giải thích: '}</span>{q.aiExplanation || q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="quiz-page-wrapper py-6 px-4 w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-600" /> {t('practiceHistory.title')}
        </h1>
        <Button variant="primary" className="rounded-xl" onClick={() => navigate('/quiz')}>
          <Trophy className="w-4 h-4 mr-2" /> {isEn ? 'New Quiz' : 'Bài thi mới'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">{t('practiceHistory.empty')}</h3>
          <p className="text-slate-500 mb-6">{isEn ? 'Take your first quiz to track your progress.' : 'Hãy làm bài kiểm tra đầu tiên của bạn.'}</p>
          <Button variant="primary" className="rounded-xl" onClick={() => navigate('/quiz')}>{t('practiceHistory.startFirstQuiz')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-6 flex-wrap hover:shadow-md transition-shadow">
              <div className="text-center min-w-[70px]">
                <div className="text-3xl font-black text-blue-600">{item.score || 0}</div>
                <div className="text-[10px] uppercase font-black text-slate-400">{t('practiceHistory.points')}</div>
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="font-black text-slate-800">{formatDate(item.completedAt || item.startedAt)}</div>
                <div className="flex gap-4 text-sm text-slate-500 font-medium mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Target className="w-4 h-4 text-blue-400" /> {item.accuracyPercent || 0}%</span>
                  <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4 text-indigo-400" /> {formatTime(item.timeSpentSeconds)}</span>
                  <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-400" /> +{item.xp || 0} XP</span>
                  <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-full text-xs">{item.difficulty}</span>
                  <span>{item.correctAnswers}/{item.totalQuestions} {isEn ? 'qs' : 'câu'}</span>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => openDetail(item.id)} disabled={detailLoading}>
                <Eye className="w-4 h-4 mr-2" /> {t('practiceHistory.viewDetail')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PracticeHistoryPage;
