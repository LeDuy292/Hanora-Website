import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Timer as ClockIcon, 
  Target, 
  Zap, 
  TrendingUp,
  BrainCircuit,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Info,
  SkipForward,
  Flag,
  Volume2
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import '../styles/Quiz.css';

export function QuizPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startQuiz, submitIndividualAnswer, finishQuiz, quizLoading, vocabList, fetchUserFlashcards } = useVocabularyStore();
  
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState('intro'); // intro, quiz, result
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Store locally indexed by questionId
  const [selectedOption, setSelectedOption] = useState(null);
  const [flags, setFlags] = useState(new Set());
  
  const [timer, setTimer] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);

  const [targetCount, setTargetCount] = useState(20);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserFlashcards();
  }, []);

  const handleStart = async (count) => {
    if (count > vocabList.length) {
      setError(`Bạn chỉ có ${vocabList.length} từ vựng. Vui lòng chọn số lượng ít hơn.`);
      return;
    }
    setError('');
    const newSession = await startQuiz(count);
    if (newSession) {
      setSession(newSession);
      setCurrentStep('quiz');
      setTimer(0);
      setQuestionStartTime(Date.now());
      startGlobalTimer();
    }
  };

  const startGlobalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopGlobalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => stopGlobalTimer();
  }, []);

  const currentQuestion = session?.quizQuestions[currentIndex];
  const options = useMemo(() => {
    if (!currentQuestion?.options) return [];
    try {
      return JSON.parse(currentQuestion.options);
    } catch { return []; }
  }, [currentQuestion]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        userAnswer: option,
        timeSpent: Date.now() - questionStartTime
      }
    });
  };

  const handleNext = async () => {
    // Auto-save/Submit if answer exists
    const currentAns = answers[currentQuestion.id];
    if (currentAns) {
      await submitIndividualAnswer({
        questionId: currentAns.questionId,
        userAnswer: currentAns.userAnswer,
        responseMs: currentAns.timeSpent
      });
    }

    if (currentIndex < session.quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      const nextQ = session.quizQuestions[currentIndex + 1];
      setSelectedOption(answers[nextQ.id]?.userAnswer || null);
      setQuestionStartTime(Date.now());
    } else {
      finalizeQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevQ = session.quizQuestions[currentIndex - 1];
      setSelectedOption(answers[prevQ.id]?.userAnswer || null);
    }
  };

  const skipQuestion = () => {
    handleNext();
  };

  const toggleFlag = () => {
    const newFlags = new Set(flags);
    if (newFlags.has(currentIndex)) newFlags.delete(currentIndex);
    else newFlags.add(currentIndex);
    setFlags(newFlags);
  };

  const finalizeQuiz = async () => {
    stopGlobalTimer();
    const result = await finishQuiz(session.id);
    setSession(result);
    setCurrentStep('result');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const radarData = useMemo(() => {
    if (!session?.skillsJson) return [];
    try {
      const skills = JSON.parse(session.skillsJson);
      return Object.entries(skills).map(([key, value]) => ({ subject: key, A: value, fullMark: 100 }));
    } catch { return []; }
  }, [session]);

  if (quizLoading && currentStep !== 'quiz' && currentStep !== 'result') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <p className="text-xl font-bold text-slate-800">Đang chuẩn bị đề thi...</p>
      </div>
    );
  }

  if (currentStep === 'intro') {
    return (
      <div className="quiz-page-container flex flex-col items-center justify-center py-20">
        <div className="max-w-2xl w-full bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100/50 text-center border border-slate-100 animate-in">
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-200 mb-8">
            <Trophy className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Practice Test</h1>
          <p className="text-lg text-slate-500 mb-8">Kiểm tra mức độ ghi nhớ của bạn với lộ trình cá nhân hóa.</p>

          <div className="quiz-selection-box bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-10">
             <h4 className="font-black text-slate-800 mb-6 text-xl">Số lượng câu hỏi</h4>
             <div className="flex flex-wrap gap-3 justify-center mb-6">
                {[10, 20, 30, 50].map(n => (
                  <button key={n} onClick={() => { setTargetCount(n); setShowCustomInput(false); setError(''); }} className={`px-6 py-3 rounded-2xl font-black text-lg transition-all ${targetCount === n && !showCustomInput ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{n}</button>
                ))}
                <button onClick={() => setShowCustomInput(true)} className={`px-6 py-3 rounded-2xl font-black text-lg transition-all ${showCustomInput ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>Khác</button>
             </div>
             {showCustomInput && (
                <div className="flex justify-center mb-6 max-w-[200px] mx-auto">
                   <input type="number" className="w-full h-14 bg-white border-2 border-blue-100 rounded-2xl text-center text-xl font-bold" placeholder="Nhập số..." value={targetCount} onChange={e => setTargetCount(parseInt(e.target.value) || 0)} />
                </div>
             )}
             <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                <BookOpen className="w-4 h-4" />
                <span>Bạn đang có <strong className="text-slate-800">{vocabList.length}</strong> từ vựng</span>
             </div>
             {error && <div className="mt-4 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold">{error}</div>}
          </div>
          
          <Button variant="primary" className="w-full h-16 rounded-[1.5rem] text-xl font-bold shadow-lg" onClick={() => handleStart(targetCount)} disabled={vocabList.length === 0}>Bắt đầu bài thi</Button>
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz') {
    const progress = (currentIndex / session.quizQuestions.length) * 100;
    
    return (
      <div className="quiz-page-container">
        <div className="quiz-card animate-in max-w-4xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-2xl font-black text-slate-800">Practice Session</h2>
                   <div className="flex gap-4 mt-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">Medium Difficulty</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">{session.totalQuestions} Questions</span>
                   </div>
                </div>
                <div className="quiz-timer bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 font-black text-slate-700">
                   <ClockIcon className="w-5 h-5 text-blue-500" />
                   {formatTime(timer)}
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-sm font-black text-slate-500">{currentIndex + 1} / {session.quizQuestions.length} ({Math.round(progress)}%)</span>
             </div>
          </div>

          {/* Question Area */}
          <div className="p-12 min-h-[500px] flex flex-col items-center">
             <div className="text-center mb-10 w-full">
                <span className="text-blue-600 font-black uppercase tracking-[0.2em] text-xs bg-blue-50 px-4 py-2 rounded-full mb-6 inline-block">
                   {String(currentQuestion.questionType || '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
                
                {/* Visual Target */}
                <div className="mb-8">
                   <div className="text-6xl md:text-8xl font-black text-slate-900 font-noto mb-4">
                      {currentQuestion.questionType === 'MultipleChoiceMeaning' || currentQuestion.questionType === 'PinyinMatch' ? currentQuestion.vocabulary?.word : ''}
                   </div>
                   <div className="text-4xl font-black text-slate-800">
                      {currentQuestion.questionText}
                   </div>
                </div>
             </div>

             {/* Options */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
               {options.map((opt, i) => (
                 <button 
                   key={i} 
                   onClick={() => handleOptionSelect(opt)}
                   className={`group p-6 rounded-3xl border-2 text-left transition-all relative flex items-center gap-4 ${
                     selectedOption === opt 
                       ? 'border-blue-600 bg-blue-50 shadow-md' 
                       : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50'
                   }`}
                 >
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${
                     selectedOption === opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500'
                   }`}>
                      {String.fromCharCode(65 + i)}
                   </div>
                   <span className={`text-xl font-bold ${selectedOption === opt ? 'text-blue-900' : 'text-slate-700'}`}>{opt}</span>
                   {selectedOption === opt && <div className="ml-auto w-3 h-3 bg-blue-600 rounded-full"></div>}
                 </button>
               ))}
             </div>
          </div>

          {/* Footer Actions */}
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4">
             <div className="flex gap-4">
                <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0} className="h-14 rounded-2xl px-6 border-slate-200">
                   <ChevronLeft className="mr-2 w-5 h-5" /> Previous
                </Button>
                <Button variant="outline" onClick={skipQuestion} className="h-14 rounded-2xl px-6 border-slate-200">
                   Skip
                </Button>
             </div>
             <div className="flex gap-4">
                <button 
                  onClick={toggleFlag}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    flags.has(currentIndex) ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 'bg-white border border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'
                  }`}
                >
                   <Flag className={`w-6 h-6 ${flags.has(currentIndex) ? 'fill-amber-600' : ''}`} />
                </button>
                <Button 
                   variant="primary" 
                   onClick={handleNext} 
                   className={`h-14 rounded-2xl px-10 font-bold shadow-lg ${currentIndex === session.quizQuestions.length - 1 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                   {currentIndex === session.quizQuestions.length - 1 ? 'Submit Exam' : 'Next Question'}
                   <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'result') {
    const accuracy = session.accuracyPercent || 0;
    const xp = session.xp || 0;
    const score = session.score || 0;
    
    return (
      <div className="quiz-result-page py-20 px-4 flex flex-col items-center">
        <div className="max-w-5xl w-full bg-white rounded-[4rem] shadow-2xl p-12 animate-in border border-slate-50">
           <div className="text-center mb-16">
              <h1 className="text-5xl font-black text-slate-900 mb-4">Practice Completed!</h1>
              <p className="text-xl text-slate-500">Dưới đây là bản phân tích kết quả bài thi của bạn.</p>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center mb-16">
              {/* Score Circle */}
              <div className="flex flex-col items-center">
                 <div className="w-56 h-56 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center relative">
                    <svg className="absolute inset-0 -rotate-90">
                       <circle cx="112" cy="112" r="100" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray={`${accuracy * 6.28} 628`} strokeLinecap="round" />
                    </svg>
                    <span className="text-6xl font-black text-slate-900">{score}</span>
                    <span className="text-lg font-bold text-slate-400 uppercase tracking-widest">/ 100</span>
                 </div>
              </div>

              {/* Stats Cards */}
              <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6">
                 <div className="stat-card p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 text-center">
                    <div className="text-emerald-500 font-black text-3xl mb-1">{session.correctAnswers}</div>
                    <div className="text-emerald-700 uppercase tracking-widest font-black text-[10px]">Correct</div>
                 </div>
                 <div className="stat-card p-8 bg-rose-50 rounded-[2.5rem] border border-rose-100 text-center">
                    <div className="text-rose-500 font-black text-3xl mb-1">{session.totalQuestions - session.correctAnswers}</div>
                    <div className="text-rose-700 uppercase tracking-widest font-black text-[10px]">Wrong</div>
                 </div>
                 <div className="stat-card p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 text-center">
                    <div className="text-blue-500 font-black text-3xl mb-1">{accuracy}%</div>
                    <div className="text-blue-700 uppercase tracking-widest font-black text-[10px]">Accuracy</div>
                 </div>
                 <div className="stat-card p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 text-center">
                    <div className="text-indigo-500 font-black text-3xl mb-1">{formatTime(session.timeSpentSeconds)}</div>
                    <div className="text-indigo-700 uppercase tracking-widest font-black text-[10px]">Time</div>
                 </div>
                 <div className="stat-card p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 text-center">
                    <div className="text-amber-500 font-black text-3xl mb-1 flex items-center justify-center gap-1">
                       <Zap className="w-6 h-6 fill-amber-500" /> +{xp}
                    </div>
                    <div className="text-amber-700 uppercase tracking-widest font-black text-[10px]">XP EARNED</div>
                 </div>
                 <div className="stat-card p-8 bg-slate-900 rounded-[2.5rem] text-center">
                    <div className="text-white font-black text-3xl mb-1">PRO</div>
                    <div className="text-slate-400 uppercase tracking-widest font-black text-[10px]">Badge</div>
                 </div>
              </div>
           </div>

           <div className="main-analysis grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Radar */}
              <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                 <h3 className="font-black text-2xl mb-8 flex items-center gap-3">
                   <Target className="w-6 h-6 text-blue-600" /> Kỹ năng đã học
                 </h3>
                 <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <RadarChart data={radarData}>
                       <PolarGrid stroke="#cbd5e1" />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} />
                       <Radar name="Level" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                     </RadarChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* Feedback */}
              <div className="bg-blue-600 p-12 rounded-[3.5rem] text-white flex flex-col justify-center shadow-xl shadow-blue-100">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                       <BrainCircuit className="w-8 h-8" />
                    </div>
                    <h3 className="text-3xl font-black">AI Teacher</h3>
                 </div>
                 <p className="text-xl font-medium leading-relaxed italic text-blue-100">
                    "{session.aiFeedback || "Tuyệt vời, bạn đã hoàn thành bài thi! Hãy tiếp tục luyện tập đều đặn nhé."}"
                 </p>
                 <div className="mt-10 pt-8 border-t border-white/20">
                    <h4 className="font-black mb-4 uppercase tracking-widest text-sm opacity-60 text-blue-200">Từ vựng cần ôn lại</h4>
                    <div className="flex flex-wrap gap-2">
                       {session.quizQuestions.filter(q => !q.isCorrect).slice(0, 5).map((q, i) => (
                         <span key={i} className="bg-white/10 px-4 py-2 rounded-xl text-lg font-black">{q.vocabulary?.word}</span>
                       ))}
                       {session.quizQuestions.filter(q => !q.isCorrect).length === 0 && <span className="text-blue-200 font-bold">Không có lỗi sai nào!</span>}
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-6 mt-16">
              <Button variant="primary" className="flex-1 h-20 rounded-[2rem] text-2xl font-black shadow-xl" onClick={() => navigate('/flashcards')}>Tiếp tục học thẻ</Button>
              <Button variant="outline" className="flex-1 h-20 rounded-[2rem] text-2xl font-black border-2" onClick={() => {
                 setCurrentStep('intro');
                 setCurrentIndex(0);
                 setAnswers({});
                 setFlags(new Set());
              }}>Làm lại đề mới</Button>
           </div>
        </div>
      </div>
    );
  }

  return null;
}

export default QuizPage;
