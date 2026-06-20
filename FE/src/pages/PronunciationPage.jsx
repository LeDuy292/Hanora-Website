import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, ChevronRight, AlertCircle, RefreshCw, Award, Smile } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';

const PRACTICE_SENTENCES = [
  {
    chinese: '你好！',
    pinyin: 'Nǐ hǎo!',
    vietnamese: 'Xin chào!',
    level: 'HSK 1',
    description: 'Lời chào cơ bản nhất trong tiếng Trung.'
  },
  {
    chinese: '谢谢你。',
    pinyin: 'Xièxie nǐ.',
    vietnamese: 'Cảm ơn bạn.',
    level: 'HSK 1',
    description: 'Cách nói cảm ơn phổ biến hàng ngày.'
  },
  {
    chinese: '很高兴认识你！',
    pinyin: 'Hěn gāoxìng rènshi nǐ!',
    vietnamese: 'Rất vui được quen biết bạn!',
    level: 'HSK 2',
    description: 'Sử dụng khi gặp gỡ người mới lần đầu.'
  },
  {
    chinese: '今天天气非常好。',
    pinyin: 'Jīntiān tiānqì fēicháng hǎo.',
    vietnamese: 'Thời tiết hôm nay cực kỳ tốt.',
    level: 'HSK 2',
    description: 'Miêu tả thời tiết đẹp.'
  },
  {
    chinese: '我想去商场买些衣服。',
    pinyin: 'Wǒ xiǎng qù shāngchǎng mǎi xiē yīfu.',
    vietnamese: 'Tôi muốn đi trung tâm thương mại mua ít quần áo.',
    level: 'HSK 3',
    description: 'Nói về dự định mua sắm đồ dùng cá nhân.'
  },
  {
    chinese: '保护环境，人人有责。',
    pinyin: 'Bǎohù huánjìng, rénrén yǒuzé.',
    vietnamese: 'Bảo vệ môi trường là trách nhiệm của mỗi người.',
    level: 'HSK 4',
    description: 'Thành ngữ tuyên truyền ý thức cộng đồng.'
  },
  {
    chinese: '坚持就是胜利。',
    pinyin: 'Jiānchí jiùshì shènglì.',
    vietnamese: 'Kiên trì chính là thắng lợi.',
    level: 'HSK 5',
    description: 'Lời khuyên kiên trì để vượt qua khó khăn.'
  }
];

export function PronunciationPage() {
  const { addXp, updateProfile } = useAuthStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [scoreDetails, setScoreDetails] = useState([]);
  
  const [supportSpeech] = useState(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  });

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const activeSentence = PRACTICE_SENTENCES[currentIndex];

  // Grade speech transcription against target sentence
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
          // Remove character from buffer to prevent double matching
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

    // Gamification XP Reward
    let xpGained = 0;
    if (finalScore >= 90) {
      xpGained = 15;
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      updateProfile({ hasHighSpeechScore: true });
    } else if (finalScore >= 70) {
      xpGained = 8;
    } else if (finalScore > 30) {
      xpGained = 3;
    }

    if (xpGained > 0) {
      addXp(xpGained);
    }
  }, [addXp, updateProfile]);

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN'; // Chinese Mandarin locale
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setScore(null);
      setScoreDetails([]);
      setErrorMessage('');
    };

    rec.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      gradePronunciation(activeSentence.chinese, resultText);
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage('Không có quyền truy cập microphone. Vui lòng cho phép quyền micro.');
      } else {
        setErrorMessage(`Lỗi nhận dạng: ${event.error}. Thử nói lại.`);
      }
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [activeSentence, gradePronunciation]);

  // Chinese TTS pronunciation reader
  const handlePlaySample = () => {
    if (!window.speechSynthesis) {
      alert('Trình duyệt không hỗ trợ tổng hợp giọng nói TTS.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(activeSentence.chinese);
    utterance.lang = 'zh-CN';

    utterance.onstart = () => setIsSynthesizing(true);
    utterance.onend = () => setIsSynthesizing(false);
    utterance.onerror = () => setIsSynthesizing(false);

    // Try to find a high quality Chinese voice if available
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(voice => voice.lang.includes('zh') || voice.lang.includes('CN'));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Microphone toggle button handler
  const handleMicToggle = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setTranscript('');
      setScore(null);
      setScoreDetails([]);
      setErrorMessage('');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
          recognitionRef.current.stop();
        }
      } else {
        setErrorMessage('Trình duyệt của bạn hiện chưa hỗ trợ nhận dạng giọng nói. Vui lòng thử Chrome/Edge hoặc bật microphone.');
      }
    }
  };

  const handleNextSentence = () => {
    const nextIdx = (currentIndex + 1) % PRACTICE_SENTENCES.length;
    setCurrentIndex(nextIdx);
    setTranscript('');
    setScore(null);
    setScoreDetails([]);
    setErrorMessage('');
  };

  // Helper colors for rating scores in light theme
  const getScoreColor = () => {
    if (score >= 90) return 'text-emerald-600 border-emerald-250 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 border-amber-250 bg-amber-50';
    return 'text-rose-500 border-rose-250 bg-rose-50';
  };

  const getScoreMessage = () => {
    if (score >= 90) return 'Tuyệt vời! Phát âm của bạn rất chính xác và trôi chảy.';
    if (score >= 70) return 'Khá tốt! Một vài ký âm chưa chuẩn xác nhưng rất đáng khen.';
    return 'Cố gắng lên! Hãy nghe lại phát âm mẫu và luyện tập lại câu này nhé.';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-transition">
      {/* Title Header area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white border border-slate-100 rounded-3xl gap-4 shadow-sm">
        <div>
          <span className="text-blue-600 text-xs font-extrabold uppercase tracking-widest block mb-1">
            Luyện nói tiếng Trung AI
          </span>
          <h2 className="text-xl font-extrabold font-display text-slate-800 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-500" />
            Luyện Phát Âm Chuẩn AI
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Đọc to các mẫu câu HSK dưới đây để kiểm tra và nhận nâng cấp kỹ năng giao tiếp.
          </p>
        </div>

        {/* Browser support badge */}
        <div className="flex items-center gap-2">
          {!supportSpeech && (
            <span className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" /> Trình duyệt chưa hỗ trợ nhận dạng giọng nói
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Sentences list */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 space-y-3 h-[520px] overflow-y-auto shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
            Danh sách câu mẫu
          </h3>
          <div className="space-y-2">
            {PRACTICE_SENTENCES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setTranscript('');
                  setScore(null);
                  setScoreDetails([]);
                  setErrorMessage('');
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 ${
                  idx === currentIndex
                    ? 'bg-blue-50/50 border-blue-200 text-blue-600'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-850'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    idx === currentIndex 
                      ? 'bg-blue-100/60 text-blue-600 border border-blue-200' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {item.level}
                  </span>
                </div>
                <div className="font-extrabold text-sm truncate font-sans">
                  {item.chinese}
                </div>
                <div className="text-[10px] text-slate-400 font-bold truncate leading-none">
                  {item.vietnamese}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Micro / Grade Workspace */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-8 flex flex-col justify-between min-h-[520px] shadow-sm">
          
          {/* Active sentence card */}
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-650 px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ color: '#2563eb' }}>
                Đọc mẫu câu {activeSentence.level}
              </span>
            </div>

            <div className="py-4 space-y-3">
              {/* Chinese text showing grading color character-by-character */}
              <div className="text-3xl sm:text-4xl font-black text-slate-800 font-sans tracking-wide leading-relaxed select-none">
                {scoreDetails.length > 0 ? (
                  scoreDetails.map((item, i) => (
                    <span 
                      key={i} 
                      className={
                        item.status === 'correct' 
                          ? 'text-emerald-600' 
                          : item.status === 'incorrect' 
                            ? 'text-red-500 underline decoration-red-500/40 underline-offset-8 font-bold' 
                            : 'text-slate-400'
                      }
                    >
                      {item.char}
                    </span>
                  ))
                ) : (
                  activeSentence.chinese
                )}
              </div>
              <p className="text-sm text-blue-600 font-bold tracking-wide select-none">
                {activeSentence.pinyin}
              </p>
              <p className="text-xs text-slate-500 font-medium italic max-w-md mx-auto">
                "{activeSentence.vietnamese}"
              </p>
            </div>

            {/* Listen native sound */}
            <div className="flex justify-center">
              <button
                onClick={handlePlaySample}
                disabled={isSynthesizing}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 border rounded-xl transition-all duration-200 ${
                  isSynthesizing
                    ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-blue-600'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSynthesizing ? 'animate-pulse' : ''}`} />
                {isSynthesizing ? 'Đang phát âm...' : 'Nghe phát âm mẫu'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-500 rounded-xl p-3.5 text-xs text-center flex items-center justify-center gap-2 max-w-md mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Interactive Mic Area */}
          <div className="flex flex-col items-center justify-center space-y-4">
            
            {/* Waveform visualizer */}
            {isRecording ? (
              <div className="flex items-center gap-1 h-8 justify-center select-none">
                <div className="w-1 bg-blue-500 rounded-full animate-bounce h-6" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 bg-blue-400 rounded-full animate-bounce h-8" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 bg-sky-500 rounded-full animate-bounce h-5" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-1 bg-blue-600 rounded-full animate-bounce h-7" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 bg-sky-400 rounded-full animate-bounce h-4" style={{ animationDelay: '0.4s' }}></div>
              </div>
            ) : (
              <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {score !== null ? 'Hoàn thành lượt nói' : 'Nhấp Mic để bắt đầu nói'}
              </div>
            )}

            {/* Mic button action */}
            <button
              onClick={handleMicToggle}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all duration-300 relative ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/20 hover:bg-rose-600'
                  : 'bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:scale-105 active:scale-95 shadow-blue-500/10'
              }`}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              
              {/* Outer pulsing ring when recording */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-rose-550 animate-ping opacity-35" style={{ borderColor: '#f43f5e' }}></div>
              )}
            </button>
          </div>

          {/* Score Result Panel */}
          {score !== null && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 animate-scale-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-150 pb-3">
                <div className="flex items-center gap-3">
                  {/* Circular Score display */}
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm ${getScoreColor()}`}>
                    {score}%
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kết quả phát âm</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 select-text">
                      Nhận dạng: "{transcript || 'Không nghe thấy âm thanh'}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                  <Award className="w-3.5 h-3.5 text-blue-500" />
                  <span>{score >= 90 ? '+15 XP' : score >= 70 ? '+8 XP' : '+3 XP'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-left">
                <Smile className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {getScoreMessage()}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls footer */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4">
            <button
              onClick={() => {
                setTranscript('');
                setScore(null);
                setScoreDetails([]);
                setErrorMessage('');
              }}
              disabled={score === null}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                score === null 
                  ? 'text-slate-350 cursor-not-allowed'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Luyện tập lại
            </button>
            <Button
              variant="primary"
              icon={ChevronRight}
              onClick={handleNextSentence}
            >
              Câu tiếp theo
            </Button>
          </div>

        </div>

      </div>

    </div>
  );
}
export default PronunciationPage;
