import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, ChevronRight, AlertCircle, RefreshCw, Award, Smile, Info, Languages, Heart, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../store/authStore';
import { PRONUNCIATION_SAMPLES } from '../utils/constants';
import { statsApi } from '../services/statsService';

import marketContextImg from '../assets/market_context_1780676138450.png';

export function PronunciationPracticePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addXp, updateProfile } = useAuthStore();
  
  const [activeLesson, setActiveLesson] = useState(null);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [scoreDetails, setScoreDetails] = useState([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState('single'); // 'single' or 'full'

  const recognitionRef = useRef(null);

  // Load lesson details
  useEffect(() => {
    const lesson = PRONUNCIATION_SAMPLES.find(s => s.id === id);
    if (!lesson) {
      navigate('/pronunciation');
      return;
    }
    setActiveLesson(lesson);
  }, [id, navigate]);

  const activeSentence = activeLesson?.sentences[currentSentenceIdx];

  // Grading logic
  const gradePronunciation = useCallback((target, input) => {
    const cleanStr = (str) => str.replace(/[^\w\u4e00-\u9fa5]/g, "").trim().toLowerCase();
    const tClean = cleanStr(target);
    const ipClean = cleanStr(input);

    if (!ipClean) {
      setScore(0);
      setScoreDetails(target.split('').map(char => ({ char, status: 'incorrect' })));
      return;
    }

    let tempInput = ipClean;
    let matchesCount = 0;
    const details = [];

    for (let i = 0; i < target.length; i++) {
        const char = target[i];
        const isPunc = !/[\w\u4e00-\u9fa5]/.test(char);
  
        if (isPunc) {
          details.push({ char, status: 'punc' });
        } else {
          const idx = tempInput.indexOf(char.toLowerCase());
          if (idx !== -1) {
            details.push({ char, status: 'correct' });
            matchesCount++;
            tempInput = tempInput.substring(0, idx) + tempInput.substring(idx + 1);
          } else {
            details.push({ char, status: 'incorrect' });
          }
        }
      }

    const calculatedScore = Math.round((matchesCount / (tClean.length || 1)) * 100);
    const finalScore = Math.min(calculatedScore, 100);

    setScore(finalScore);
    setScoreDetails(details);

    // Save pronunciation stats to the database in real-time
    statsApi.savePronunciationScore(finalScore).catch(() => {});

    if (finalScore >= 80) {
      addXp(10);
      if (finalScore >= 95) confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  }, [addXp]);

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !activeSentence) return;

    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setScore(null);
      setErrorMessage('');
    };

    rec.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      gradePronunciation(activeSentence.chinese, resultText);
    };

    rec.onerror = (event) => {
      if (event.error === 'not-allowed') setErrorMessage('Không có quyền micro.');
      setIsRecording(false);
    };

    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;

    return () => recognitionRef.current?.abort();
  }, [activeSentence, gradePronunciation]);

  const handlePlaySample = () => {
    if (!window.speechSynthesis || !activeSentence) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeSentence.chinese);
    utterance.lang = 'zh-CN';
    utterance.onstart = () => setIsSynthesizing(true);
    utterance.onend = () => setIsSynthesizing(false);
    
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
    if (zhVoice) utterance.voice = zhVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleMicToggle = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        recognitionRef.current?.stop();
      }
    }
  };

  const handleNext = () => {
    if (currentSentenceIdx < activeLesson.sentences.length - 1) {
      setCurrentSentenceIdx(currentSentenceIdx + 1);
      setScore(null);
      setTranscript('');
    }
  };

  if (!activeLesson) return null;

  return (
    <div className="w-full pb-24 lg:pb-10 py-10 page-transition bg-[#FBFDFF] min-h-screen">
      
      {/* Header Info Bar */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
           <span className="px-4 py-1 bg-[#32A0F4] text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              {activeLesson.category}
           </span>
           <h1 className="text-sm font-bold text-slate-500">
              Bài {id.split('-')[1]}: {activeLesson.title}
           </h1>
        </div>
        <div className="flex items-center gap-5 text-slate-400">
           <Languages className="w-5 h-5 hover:text-blue-500 cursor-pointer transition-colors" />
           <Info className="w-5 h-5 hover:text-blue-500 cursor-pointer transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Dialogue Display */}
        <div className="lg:col-span-8 space-y-12">
           <div className="space-y-4">
              {activeLesson.sentences.map((sentence, idx) => (
                 <div 
                   key={sentence.id}
                   onClick={() => {
                      setCurrentSentenceIdx(idx);
                      setScore(null);
                      setTranscript('');
                   }}
                   className={`p-10 rounded-[2.5rem] transition-all duration-500 cursor-pointer ${
                      idx === currentSentenceIdx 
                      ? 'bg-[#EBF5FF] shadow-xl shadow-blue-500/5' 
                      : 'bg-transparent hover:bg-slate-50 opacity-40 hover:opacity-100'
                   }`}
                 >
                    <div className="space-y-3">
                       <p className={`text-lg font-medium transition-colors ${idx === currentSentenceIdx ? 'text-slate-400' : 'text-slate-300'}`}>
                          {sentence.pinyin}
                       </p>
                       <h2 className={`text-4xl md:text-5xl font-black tracking-tight leading-snug font-display transition-colors ${idx === currentSentenceIdx ? 'text-slate-800' : 'text-slate-400'}`}>
                          {sentence.chinese}
                       </h2>
                       <p className={`text-lg font-bold transition-colors ${idx === currentSentenceIdx ? 'text-slate-400' : 'text-slate-300'}`}>
                          {sentence.vietnamese}
                       </p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Right Column: Controls & Feedback */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* Mode & Score Card */}
           <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border-2 border-slate-50">
              <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl mb-8">
                 <button 
                    onClick={() => setMode('single')}
                    className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                 >
                    Từng câu
                 </button>
                 <button 
                    onClick={() => setMode('full')}
                    className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'full' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                 >
                    Cả bài
                 </button>
              </div>

              <div className="flex justify-between items-center">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-350">Điểm phát âm</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-4xl font-black text-slate-800">{score !== null ? score : '--'}</span>
                       <span className="text-slate-300 font-bold text-lg">/100</span>
                    </div>
                 </div>
                 <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="32" cy="32" r="28" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                       <circle 
                          cx="32" cy="32" r="28" fill="none" stroke="#32A0F4" strokeWidth="6" 
                          strokeDasharray={175.9}
                          strokeDashoffset={175.9 - (175.9 * (score || 0)) / 100}
                          className="transition-all duration-1000"
                       />
                    </svg>
                    <span className="absolute text-[10px] font-black text-blue-600">{score >= 80 ? 'A' : score >= 60 ? 'B' : '...'}</span>
                 </div>
              </div>
           </div>

           {/* Mic & Waveform Card */}
           <div className="bg-white rounded-[2rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border-2 border-slate-50 space-y-10">
              <div className="flex flex-col items-center gap-6">
                 <div className="flex items-end gap-1.5 h-10">
                    {[0,1,2,3,4,5,6].map(i => (
                       <div 
                         key={i} 
                         className={`w-1.5 bg-[#32A0F4] rounded-full ${isRecording ? 'animate-bounce' : 'opacity-20'}`} 
                         style={{ height: isRecording ? `${30 + Math.random() * 70}%` : '20%', animationDelay: `${i * 0.1}s` }} 
                       />
                    ))}
                 </div>
                 <p className="text-[11px] font-bold text-slate-400">
                    {isRecording ? 'Đang phân tích âm điệu của bạn...' : 'Sẵn sàng ghi âm'}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                 <button 
                   onClick={handlePlaySample}
                   className="flex flex-col items-center gap-3 py-6 rounded-3xl bg-[#F1F5F9] text-slate-500 hover:bg-[#E2E8F0] transition-all font-black text-[10px] uppercase tracking-widest"
                 >
                    <PlayCircle className="w-8 h-8 opacity-60" />
                    Nghe mẫu
                 </button>
                 <button 
                   onClick={handleMicToggle}
                   className={`flex flex-col items-center gap-3 py-6 rounded-3xl transition-all font-black text-[10px] uppercase tracking-widest ${
                      isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#005BAC] text-white shadow-xl shadow-blue-500/20'
                   }`}
                 >
                    {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    Ghi âm
                 </button>
              </div>

              <div className="space-y-4 pt-4">
                 <button 
                   onClick={handleNext}
                   disabled={currentSentenceIdx >= activeLesson.sentences.length - 1}
                   className="w-full py-5 border-2 border-slate-100 rounded-2xl flex items-center justify-between px-6 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed group"
                 >
                    <div className="flex items-center gap-3">
                       <ArrowRight className="w-4 h-4" />
                       Câu tiếp theo
                    </div>
                    <span className="text-slate-300 group-hover:text-blue-300">{currentSentenceIdx + 1}/{activeLesson.sentences.length}</span>
                 </button>

                 <div className="flex gap-4">
                    <button 
                       onClick={() => { setScore(null); setTranscript(''); }}
                       className="flex-1 py-4 bg-[#F8FAFC] border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                       <RefreshCw className="w-3.5 h-3.5" />
                       Thử lại
                    </button>
                    <button className="p-4 bg-[#F8FAFC] border-2 border-slate-50 rounded-2xl text-slate-300 hover:text-rose-400 transition-all">
                       <Heart className="w-5 h-5" />
                    </button>
                 </div>
              </div>
           </div>

           {/* Context Card */}
           <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.03)] border-2 border-slate-50 relative group">
              <img 
                src={marketContextImg} 
                alt="Context" 
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                 <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-90">
                    Bối cảnh: {activeLesson.context}
                 </p>
              </div>
           </div>

        </div>
      </div>

      {/* Mobile Sticky Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-3 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between lg:hidden transition-all duration-300 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">ĐIỂM</span>
            <span className="text-base font-black text-slate-800 leading-none">{score !== null ? score : '--'}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">TIẾN TRÌNH</span>
            <span className="text-xs font-bold text-slate-650 leading-none">{currentSentenceIdx + 1}/{activeLesson.sentences.length}</span>
          </div>
        </div>

        {/* Center: Record button & Play Sample & Reset */}
        <div className="flex items-center gap-3.5">
          <button 
            onClick={handlePlaySample}
            className={`p-2.5 rounded-full ${isSynthesizing ? 'bg-blue-50 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} transition-all`}
            title="Nghe mẫu"
          >
            <PlayCircle className="w-5 h-5 opacity-80" />
          </button>

          <button 
            onClick={handleMicToggle}
            className={`p-3.5 rounded-full text-white shadow-lg transition-all ${
              isRecording 
                ? 'bg-rose-500 animate-pulse shadow-rose-500/20' 
                : 'bg-[#005BAC] shadow-blue-500/20'
            }`}
            title="Ghi âm"
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => { setScore(null); setTranscript(''); }}
            className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
            title="Thử lại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Next button */}
        <button 
          onClick={handleNext}
          disabled={currentSentenceIdx >= activeLesson.sentences.length - 1}
          className="flex items-center gap-1 px-3 py-2 rounded-full bg-[#32A0F4] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Tiếp
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}

const PlayCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

export default PronunciationPracticePage;
