import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Timer as ClockIcon,
  Target,
  Zap,
  BrainCircuit,
  BookOpen,
  Flag,
  Sparkles,
  RotateCcw,
  History,
  AlertTriangle,
  Check
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import '../styles/Quiz.css';

// Selectable question types shown on the config screen.
const QUESTION_TYPES = [
  { id: 'multiple_choice_meaning', label: 'Chọn nghĩa tiếng Việt' },
  { id: 'multiple_choice_word', label: 'Chọn từ tiếng Trung' },
  { id: 'pinyin_match', label: 'Chọn Pinyin' },
  { id: 'fill_in_blank', label: 'Điền từ còn thiếu' },
  { id: 'example_match', label: 'Chọn câu ví dụ phù hợp' },
  { id: 'context', label: 'Câu hỏi ngữ cảnh' }
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Dễ' },
  { id: 'medium', label: 'Trung bình' },
  { id: 'hard', label: 'Khó' },
  { id: 'adaptive', label: 'Adaptive (AI quyết định)' }
];

const prettyType = (t) =>
  QUESTION_TYPES.find(q => q.id === t)?.label ||
  String(t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    startQuiz, submitIndividualAnswer, finishQuiz, flagQuestion,
    fetchInProgressQuiz, quizLoading, vocabList, fetchUserFlashcards
  } = useVocabularyStore();

  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState('intro'); // intro | quiz | result
  
  const searchParams = new URLSearchParams(location.search);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // keyed by questionId
  const [selectedOption, setSelectedOption] = useState(null);
  const [flags, setFlags] = useState(new Set());

  const [timer, setTimer] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);

  // Config state
  const [targetCount, setTargetCount] = useState(10);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(['multiple_choice_meaning', 'pinyin_match']);
  const [aiMixed, setAiMixed] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError] = useState('');

  // Resume support
  const [resumable, setResumable] = useState(null);

  useEffect(() => {
    fetchUserFlashcards();
    // Offer resume of an unfinished test.
    fetchInProgressQuiz().then(s => {
      if (s && s.quizQuestions?.length) setResumable(s);
    });
  }, []);

  // ---- Timers ----
  const startGlobalTimer = (from = 0) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(from);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
  };
  const stopGlobalTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };
  useEffect(() => () => stopGlobalTimer(), []);

  // ---- Derived ----
  const currentQuestion = session?.quizQuestions?.[currentIndex];
  const options = useMemo(() => {
    if (!currentQuestion?.options) return [];
    try { return JSON.parse(currentQuestion.options); } catch { return []; }
  }, [currentQuestion]);

  const toggleType = (id) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const beginSessionState = (newSession, resume = false) => {
    setSession(newSession);
    setCurrentStep('quiz');
    // Restore prior answers/flags on resume.
    const restored = {};
    const restoredFlags = new Set();
    newSession.quizQuestions.forEach((q, idx) => {
      if (q.userAnswer) restored[q.id] = { questionId: q.id, userAnswer: q.userAnswer, timeSpent: q.responseMs || 0 };
      if (q.flagged) restoredFlags.add(idx);
    });
    setAnswers(restored);
    setFlags(restoredFlags);
    setCurrentIndex(0);
    setSelectedOption(restored[newSession.quizQuestions[0]?.id]?.userAnswer || null);
    setQuestionStartTime(Date.now());
    startGlobalTimer(0);
  };

  const handleStart = async () => {
    const deckId = searchParams.get('deckId');
    const maxParam = searchParams.get('max');
    const maxAvailableWords = maxParam ? Number(maxParam) : vocabList.length;

    if (targetCount > maxAvailableWords) {
      setError(`Bạn chỉ có ${maxAvailableWords} từ vựng. Vui lòng chọn số lượng ít hơn.`);
      return;
    }
    if (!aiMixed && selectedTypes.length === 0) {
      setError('Vui lòng chọn ít nhất một dạng câu hỏi hoặc bật AI Mixed Mode.');
      return;
    }
    setError('');

    const newSession = await startQuiz({
      questionCount: targetCount,
      questionTypes: aiMixed ? [] : selectedTypes,
      difficulty,
      deckId: deckId ? Number(deckId) : undefined
    });
    if (newSession?.quizQuestions?.length) {
      beginSessionState(newSession);
    } else {
      setError('Không thể tạo bài thi. Vui lòng thử lại.');
    }
  };

  const handleResume = () => {
    if (resumable) beginSessionState(resumable, true);
  };

  // ---- Answering ----
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        userAnswer: option,
        timeSpent: Date.now() - questionStartTime
      }
    }));
  };

  const autoSaveCurrent = async () => {
    const ans = answers[currentQuestion?.id];
    if (ans) {
      await submitIndividualAnswer({
        questionId: ans.questionId,
        userAnswer: ans.userAnswer,
        responseMs: ans.timeSpent
      });
    }
  };

  const goTo = (index) => {
    setCurrentIndex(index);
    const q = session.quizQuestions[index];
    setSelectedOption(answers[q.id]?.userAnswer || null);
    setQuestionStartTime(Date.now());
  };

  const handleNext = async () => {
    await autoSaveCurrent();
    if (currentIndex < session.quizQuestions.length - 1) {
      goTo(currentIndex + 1);
    } else {
      finalizeQuiz();
    }
  };

  const handlePrevious = async () => {
    await autoSaveCurrent();
    if (currentIndex > 0) goTo(currentIndex - 1);
  };

  const skipQuestion = () => handleNext();

  const toggleFlag = async () => {
    const newFlags = new Set(flags);
    const isFlagged = !newFlags.has(currentIndex);
    if (isFlagged) newFlags.add(currentIndex); else newFlags.delete(currentIndex);
    setFlags(newFlags);
    await flagQuestion(currentQuestion.id, isFlagged);
  };

  const finalizeQuiz = async () => {
    await autoSaveCurrent();
    stopGlobalTimer();
    const result = await finishQuiz(session.id);
    if (result) {
      setSession(result);
      setCurrentStep('result');
    }
  };

  const formatTime = (seconds) => {
    const s = Number(seconds) || 0;
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const radarData = useMemo(() => {
    if (!session?.skillsJson) return [];
    try {
      const skills = JSON.parse(session.skillsJson);
      return Object.entries(skills).map(([key, value]) => ({ subject: key, A: value, fullMark: 100 }));
    } catch { return []; }
  }, [session]);

  const resetToIntro = () => {
    setCurrentStep('intro');
    setSession(null);
    setCurrentIndex(0);
    setAnswers({});
    setFlags(new Set());
    setSelectedOption(null);
    setResumable(null);
  };

  // Hand off the weak words back to the flashcard review flow.
  const reviewWeakWords = () => {
    const words = (session.quizReviews || [])
      .map(r => r.vocabulary?.word)
      .filter(Boolean);
    navigate('/flashcards', { state: { reviewWords: words } });
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (quizLoading && currentStep === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <p className="text-xl font-bold text-slate-800">AI đang tạo đề thi phù hợp với bạn...</p>
        <p className="text-slate-500 mt-2">Việc này có thể mất vài giây.</p>
      </div>
    );
  }

  // ============================================================
  // INTRO / CONFIG
  // ============================================================
  if (currentStep === 'intro') {
    return (
      <div className="quiz-page-wrapper flex flex-col items-center py-6 px-4 w-full justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full bg-white p-6 sm:p-10 rounded-[3rem] shadow-2xl shadow-blue-100/50 border border-slate-100/80 animate-in">
          
          {/* Hero Section */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-200/50 mb-3 hover:scale-105 transition-transform duration-300">
              <Trophy className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">AI Practice Test</h1>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">Bài kiểm tra cá nhân hóa do AI tạo từ bộ Flashcard của bạn.</p>
            
            <div className="flex justify-center mt-3">
              <button 
                onClick={() => navigate('/practice/history')} 
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 hover:bg-blue-100 hover:text-blue-700 transition shadow-xs text-xs"
              >
                <History className="w-3.5 h-3.5" /> Lịch sử làm bài
              </button>
            </div>
          </div>

          {/* Resume banner */}
          {resumable && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
              <div className="flex-1">
                <div className="font-black text-amber-800 text-sm">Bạn có một bài thi đang làm dở</div>
                <div className="text-xs text-amber-700">{resumable.quizQuestions.length} câu • {resumable.difficulty}</div>
              </div>
              <Button variant="primary" className="rounded-xl px-4 py-1.5 text-xs shadow-sm" onClick={handleResume}>Tiếp tục</Button>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 text-left">
            {/* Left Column: Question Count & Difficulty */}
            <div className="space-y-6 flex flex-col justify-between">
              
              {/* Question Count Card */}
              <div className="quiz-selection-box bg-slate-50 p-7 sm:p-8 rounded-[2rem] border border-slate-100 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-800 mb-4 text-base sm:text-lg tracking-tight">Số lượng câu hỏi</h4>
                  <div className="grid grid-cols-5 gap-2 mb-4 w-full">
                    {[10, 20, 30, 50].map(n => (
                      <button 
                        key={n} 
                        onClick={() => { setTargetCount(n); setShowCustomInput(false); setError(''); }}
                        className={`py-3 rounded-xl font-black text-sm transition-all text-center border ${targetCount === n && !showCustomInput ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:border-blue-200 border-slate-200/50'}`}
                      >
                        {n}
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowCustomInput(true)}
                      className={`py-3 rounded-xl font-black text-sm transition-all text-center border ${showCustomInput ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:border-blue-200 border-slate-200/50'}`}
                    >
                      Khác
                    </button>
                  </div>
                  
                  {showCustomInput && (
                    <input 
                      type="number" 
                      min="1" 
                      className="w-full max-w-[240px] h-11 bg-white border-2 border-blue-100 rounded-xl text-center text-lg font-bold animate-fade-in focus:outline-none focus:border-blue-500"
                      placeholder="Nhập số..." 
                      value={targetCount} 
                      onChange={e => setTargetCount(parseInt(e.target.value) || 0)} 
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs mt-4 pt-4 border-t border-slate-200/50">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>
                    📖 Bạn đang có <strong className="text-slate-800">{searchParams.get('max') ? searchParams.get('max') : vocabList.length}</strong> từ vựng {searchParams.get('deckId') ? 'trong bộ thẻ này' : ''}
                  </span>
                </div>
              </div>

              {/* Difficulty Card */}
              <div className="quiz-selection-box bg-slate-50 p-7 sm:p-8 rounded-[2rem] border border-slate-100 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-800 mb-4 text-base sm:text-lg tracking-tight">Độ khó</h4>
                  <div className="grid grid-cols-4 gap-2.5 w-full">
                    {DIFFICULTIES.map(d => (
                      <button 
                        key={d.id} 
                        onClick={() => setDifficulty(d.id)}
                        className={`w-full py-3 rounded-xl font-bold transition-all text-xs sm:text-sm text-center border ${difficulty === d.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 hover:border-blue-200 border-slate-200/50'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {difficulty === 'adaptive' && (
                    <p className="text-[10px] text-blue-600 font-bold italic mt-3 animate-fade-in">
                      * Adaptive: AI tự động điều chỉnh độ khó dựa trên khả năng của bạn.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Question Types Card */}
            <div className="quiz-selection-box bg-slate-50 p-7 sm:p-8 rounded-[2rem] border border-slate-100 text-left flex flex-col justify-between">
              <div>
                <h4 className="font-black text-slate-800 mb-4 text-base sm:text-lg tracking-tight">Loại câu hỏi</h4>
                
                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer mb-4 transition-all ${aiMixed ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-150 bg-white hover:border-blue-200'}`}>
                  <input type="checkbox" className="hidden" checked={aiMixed} onChange={() => setAiMixed(v => !v)} />
                  <span className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center transition ${aiMixed ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 border border-slate-200'}`}>
                    {aiMixed ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-755 text-sm">✨ AI Mixed Mode</span>
                    <span className="text-slate-400 font-medium text-[11px] mt-0.5">AI tự chọn dạng câu hỏi phù hợp nhất</span>
                  </div>
                </label>
                
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity duration-300 ${aiMixed ? 'opacity-35 pointer-events-none' : ''}`}>
                  {QUESTION_TYPES.map(t => {
                    const active = selectedTypes.includes(t.id);
                    return (
                      <label 
                        key={t.id} 
                        className={`flex items-center gap-3 p-3 px-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${active ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50/50'}`}
                      >
                        <input type="checkbox" className="hidden" checked={active} onChange={() => toggleType(t.id)} />
                        <span className={`w-5 h-5 rounded flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 border border-slate-250'}`}>
                          {active && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span className="font-bold text-slate-700 text-xs sm:text-sm">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="mb-6 p-4 bg-rose-50 text-rose-605 rounded-2xl text-sm font-bold">{error}</div>}

          <div className="flex justify-center w-full mt-4">
            <Button 
              variant="primary" 
              className="w-full max-w-md h-14 rounded-2xl text-lg font-bold shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-[1.01] hover:shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5"
              onClick={handleStart} 
              disabled={vocabList.length === 0}
            >
              <Sparkles className="w-5 h-5 mr-2 animate-pulse" /> Bắt đầu bài thi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // QUIZ RUNNER
  // ============================================================
  if (currentStep === 'quiz' && currentQuestion) {
    const total = session.quizQuestions.length;
    const progress = ((currentIndex + 1) / total) * 100;
    const isLast = currentIndex === total - 1;
    const showTarget = currentQuestion.questionType === 'multiple_choice_meaning'
      || currentQuestion.questionType === 'pinyin_match';

    return (
      <div className="quiz-page-wrapper flex flex-col items-center justify-center py-6 px-4 w-full min-h-[calc(100vh-80px)]">
        <div className="quiz-card animate-in w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100/50">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">Practice Session</h2>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-slate-150">{session.difficulty}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-slate-150">{total} câu</span>
                  {session.generator === 'ai' && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</span>}
                </div>
              </div>
              <div className="quiz-timer bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-100 flex items-center gap-2 font-black text-slate-700 text-sm">
                <ClockIcon className="w-4 h-4 text-blue-500" />
                {formatTime(timer)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-xs font-black text-slate-450">{currentIndex + 1} / {total}</span>
            </div>
          </div>

          {/* Question */}
          <div className="p-6 sm:p-10 flex flex-col items-center">
            <span className="text-blue-650 font-black uppercase tracking-[0.15em] text-[10px] bg-blue-50 px-3.5 py-1.5 rounded-full mb-4 inline-block border border-blue-100/50">
              {prettyType(currentQuestion.questionType)}
            </span>
            <div className="text-center mb-6 w-full">
              {showTarget && (
                <div className="text-5xl md:text-6xl font-black text-slate-900 font-noto mb-2 tracking-tight">
                  {currentQuestion.vocabulary?.word}
                </div>
              )}
              <div className="text-xl md:text-2xl font-black text-slate-800 leading-snug">{currentQuestion.questionText}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
              {options.map((opt, i) => (
                <button key={i} onClick={() => handleOptionSelect(opt)}
                  className={`group p-4 sm:p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 w-full ${selectedOption === opt ? 'border-blue-600 bg-blue-50/50 shadow-xs' : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50/30'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${selectedOption === opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500'}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-base sm:text-lg font-extrabold line-clamp-2 ${selectedOption === opt ? 'text-blue-900' : 'text-slate-650'}`}>{opt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0} className="h-11 sm:h-12 rounded-xl px-5 border-slate-200 text-xs font-bold uppercase tracking-wider">
                <ChevronLeft className="mr-1 w-4 h-4" /> Trước
              </Button>
              <Button variant="outline" onClick={skipQuestion} className="h-11 sm:h-12 rounded-xl px-5 border-slate-200 text-xs font-bold uppercase tracking-wider">Bỏ qua</Button>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleFlag}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${flags.has(currentIndex) ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-xs' : 'bg-white border border-slate-200 text-slate-405 hover:border-amber-200 hover:text-amber-500'}`}>
                <Flag className={`w-5 h-5 ${flags.has(currentIndex) ? 'fill-amber-605' : ''}`} />
              </button>
              <Button variant="primary" onClick={handleNext}
                className={`h-11 sm:h-12 rounded-xl px-8 font-bold shadow-sm text-xs uppercase tracking-wider ${isLast ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                {isLast ? 'Nộp bài' : 'Câu tiếp'}
                <ChevronRight className="ml-1.5 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RESULT
  // ============================================================
  if (currentStep === 'result' && session) {
    const accuracy = session.accuracyPercent || 0;
    const xp = session.xp || 0;
    const score = session.score || 0;
    const wrongQuestions = session.quizQuestions.filter(q => !q.isCorrect);
    const weakWords = (session.quizReviews || []).map(r => r.vocabulary?.word).filter(Boolean);

    return (
      <div className="quiz-page-wrapper flex flex-col items-center justify-center py-6 px-4 w-full min-h-[calc(100vh-80px)]">
        <div className="w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-12 animate-in border border-slate-50">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Hoàn thành bài thi!</h1>
            <p className="text-base text-slate-500">Phân tích chi tiết kết quả của bạn.</p>
          </div>

          {/* Score + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center mb-8 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100/50">
            <div className="flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <div className="w-36 h-36 rounded-full border-[8px] border-slate-100 flex flex-col items-center justify-center relative bg-white shadow-sm">
                <svg className="absolute inset-0 -rotate-90 w-full h-full">
                  <circle cx="50%" cy="50%" r="64" fill="transparent" stroke="#3b82f6" strokeWidth="8"
                    strokeDasharray={`${(accuracy / 100) * 402} 402`} strokeLinecap="round" />
                </svg>
                <span className="text-4xl font-black text-slate-900 leading-none">{score}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">điểm</span>
              </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="stat-card p-4 bg-emerald-50 rounded-2xl border border-emerald-100/70 text-center shadow-xs">
                <div className="text-emerald-605 font-black text-2xl mb-0.5">{session.correctAnswers}</div>
                <div className="text-emerald-700 uppercase tracking-wider font-extrabold text-[9px]">Đúng</div>
              </div>
              <div className="stat-card p-4 bg-rose-50 rounded-2xl border border-rose-100/70 text-center shadow-xs">
                <div className="text-rose-605 font-black text-2xl mb-0.5">{session.totalQuestions - session.correctAnswers}</div>
                <div className="text-rose-750 uppercase tracking-wider font-extrabold text-[9px]">Sai</div>
              </div>
              <div className="stat-card p-4 bg-blue-50 rounded-2xl border border-blue-100/70 text-center shadow-xs">
                <div className="text-blue-600 font-black text-2xl mb-0.5">{accuracy}%</div>
                <div className="text-blue-750 uppercase tracking-wider font-extrabold text-[9px]">Chính xác</div>
              </div>
              <div className="stat-card p-4 bg-indigo-50 rounded-2xl border border-indigo-100/70 text-center shadow-xs">
                <div className="text-indigo-600 font-black text-2xl mb-0.5">{formatTime(session.timeSpentSeconds)}</div>
                <div className="text-indigo-750 uppercase tracking-wider font-extrabold text-[9px]">Thời gian</div>
              </div>
              <div className="stat-card p-4 bg-amber-50 rounded-2xl border border-amber-100/70 text-center shadow-xs">
                <div className="text-amber-600 font-black text-2xl mb-0.5 flex items-center justify-center gap-1">
                  <Zap className="w-5 h-5 fill-amber-500 text-amber-500" /> +{xp}
                </div>
                <div className="text-amber-750 uppercase tracking-wider font-extrabold text-[9px]">XP</div>
              </div>
              <div className="stat-card p-4 bg-slate-900 rounded-2xl text-center flex flex-col items-center justify-center shadow-xs">
                <div className="text-white font-black text-lg mb-0.5">{session.generator === 'ai' ? 'AI' : 'Tiêu chuẩn'}</div>
                <div className="text-slate-400 uppercase tracking-wider font-extrabold text-[9px]">Chế độ</div>
              </div>
            </div>
          </div>

          {/* Radar + AI feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-6 sm:p-7 rounded-[2rem] border border-slate-100">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-slate-800"><Target className="w-5 h-5 text-blue-600" /> Kỹ năng</h3>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#cbd5e1" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                    <Radar name="Level" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-blue-600 p-6 sm:p-7 rounded-[2rem] text-white flex flex-col shadow-lg shadow-blue-100/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black">AI Teacher</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed text-blue-50 whitespace-pre-line flex-1">
                {session.aiFeedback || "Tuyệt vời, bạn đã hoàn thành bài thi! Hãy tiếp tục luyện tập đều đặn nhé."}
              </p>
              {weakWords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <h4 className="font-black mb-2 uppercase tracking-widest text-[10px] text-blue-200">Từ cần ôn lại</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {weakWords.slice(0, 8).map((w, i) => (
                      <span key={i} className="bg-white/10 px-2.5 py-1 rounded-lg text-sm font-black">{w}</span>
                    ))}
                  </div>
                  <Button variant="secondary" className="rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs px-3 py-1.5" onClick={reviewWeakWords}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Ôn lại từ yếu
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Per-question review */}
          <div className="mb-10">
            <h3 className="font-black text-2xl mb-6 flex items-center gap-3"><BookOpen className="w-6 h-6 text-blue-600" /> Xem lại bài làm</h3>
            <div className="space-y-4">
              {session.quizQuestions.map((q, i) => {
                const opts = (() => { try { return JSON.parse(q.options); } catch { return []; } })();
                const correct = q.isCorrect;
                return (
                  <div key={q.id} className={`p-6 rounded-3xl border-2 ${correct ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${correct ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                        {correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </span>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Câu {i + 1} • {prettyType(q.questionType)}</div>
                        <div className="font-black text-slate-800 text-lg">{q.questionText}</div>
                      </div>
                    </div>
                    <div className="pl-11 flex flex-wrap gap-2 mb-3">
                      {opts.map((opt, oi) => {
                        const isCorrectOpt = opt.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
                        const isUserOpt = opt.trim().toLowerCase() === q.userAnswer?.trim().toLowerCase();
                        return (
                          <span key={oi} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isCorrectOpt ? 'bg-emerald-500 text-white' : isUserOpt ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                            {opt}{isUserOpt && !isCorrectOpt ? ' (bạn chọn)' : ''}
                          </span>
                        );
                      })}
                      {!q.userAnswer && <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200 text-slate-500">Chưa trả lời</span>}
                    </div>
                    {(q.aiExplanation || q.explanation) && (
                      <div className="pl-11">
                        <div className="bg-white/70 rounded-2xl p-4 border border-slate-100 text-slate-600 text-sm leading-relaxed">
                          <span className="font-black text-blue-600">Giải thích: </span>
                          {q.aiExplanation || q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <Button variant="primary" className="flex-1 h-16 rounded-[1.5rem] text-xl font-black shadow-xl" onClick={resetToIntro}>
              Làm bài mới
            </Button>
            <Button variant="outline" className="flex-1 h-16 rounded-[1.5rem] text-xl font-black border-2" onClick={() => navigate('/flashcards')}>
              Về Flashcard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default QuizPage;
