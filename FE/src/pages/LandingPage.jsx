import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Layers,
  Video,
  GraduationCap,
  Star,
  Check,
  Quote,
  Mic,
  Languages,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { useAuthStore } from '../store/authStore';
import mainImg from '../assets/main.jpg';
import logoImg from '../assets/logo.jpg';
import avatar1 from '../assets/avatar1.png';
import avatar2 from '../assets/avatar2.png';
import avatar3 from '../assets/avatar3.png';
import avatar4 from '../assets/avatar4.png';
import avatar5 from '../assets/avatar5.png';
import avatar6 from '../assets/avatar6.png';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (path) => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  const [activeTab, setActiveTab] = useState(0);
  const [autoplayActive, setAutoplayActive] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

  const [questionPhone, setQuestionPhone] = useState('');
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (!questionPhone.trim()) return;
    setQuestionSubmitted(true);
  };

  // Auto-switch tabs every 5 seconds
  useEffect(() => {
    if (!autoplayActive) return;
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoplayActive]);

  // Auto flip flashcard every 2.5s if active tab is 0
  useEffect(() => {
    if (activeTab !== 0) return;
    const flipTimer = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, 2500);
    return () => clearInterval(flipTimer);
  }, [activeTab]);

  // Interactive mini-preview state for the hero demo
  const [selectedWord, setSelectedWord] = useState({
    text: "学习", pinyin: "xuéxí", translation: "học tập; nghiên cứu", hsk: 1
  });

  const demoWords = [
    { text: "你好", pinyin: "nǐhǎo", translation: "xin chào", hsk: 1 },
    { text: "！", isPunc: true },
    { text: "很高兴", pinyin: "hěngāoxìng", translation: "rất vui", hsk: 2 },
    { text: "认识", pinyin: "rènshi", translation: "quen biết; gặp gỡ", hsk: 2 },
    { text: "你", pinyin: "nǐ", translation: "bạn; anh; chị", hsk: 1 },
    { text: "。", isPunc: true },
    { text: "学习", pinyin: "xuéxí", translation: "học tập; nghiên cứu", hsk: 1 },
    { text: "汉语", pinyin: "Hànyǔ", translation: "tiếng Trung Quốc", hsk: 1 },
    { text: "很有意思", pinyin: "hěnyǒuyìsi", translation: "rất có ý nghĩa; thú vị", hsk: 3 },
    { text: "！", isPunc: true },
  ];

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden select-none">

      {/* Background radial shapes */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-100/40 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Navbar Header layout */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 max-w-7xl w-[calc(100%-2rem)] px-6 py-3 flex items-center justify-between z-50 bg-white/80 backdrop-blur-lg rounded-2xl border border-slate-100/80 shadow-[0_8px_30px_rgb(15,23,42,0.04)] transition-all duration-300">

        {/* Brand Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3.5 shrink-0 hover:opacity-95 transition-opacity group text-left"
        >
          <img
            src={logoImg}
            className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-300"
            alt="Hanora logo"
          />
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-wide font-display leading-tight group-hover:text-blue-600 transition-colors">Hanora</h1>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase leading-none mt-0.5">Trung Tâm Học Tập</p>
          </div>
        </button>

        {/* Navigation links list */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-50/50 border border-slate-100/80 rounded-xl p-1">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-sm font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200"
          >
            Trang chủ
          </button>
          <button
            onClick={() => handleNav('/dashboard')}
            className="text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-sm font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200"
          >
            Tiến trình
          </button>
          <button
            onClick={() => handleNav('/flashcards')}
            className="text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-sm font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200"
          >
            Flashcard
          </button>
          <button
            onClick={() => handleNav('/reader')}
            className="text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-sm font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200"
          >
            Dịch thuật
          </button>
          <button
            onClick={() => handleNav('/pronunciation')}
            className="text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-sm font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200"
          >
            Luyện phát âm
          </button>
        </nav>

        {/* Buttons Sign In/Up */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-slate-650 font-bold text-xs">Chào, {user?.name}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] text-white font-semibold text-xs md:text-[13px] py-2 px-4 shadow-md hover:shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 rounded-xl transition-all duration-200"
              >
                Vào học ngay
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/login', { state: { isSignUp: false } })}
                className="text-slate-600 hover:text-blue-600 font-semibold text-xs md:text-[13px] px-2.5 md:px-4 py-2 rounded-xl hover:bg-slate-50 transition-all duration-200"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate('/login', { state: { isSignUp: true } })}
                className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] text-white font-semibold text-xs md:text-[13px] py-2 px-3.5 md:px-5 shadow-md hover:shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 rounded-xl transition-all duration-200"
              >
                Tạo tài khoản
              </button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-slate-50 transition-colors"
            title="Menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-slate-100/80 rounded-2xl p-4 shadow-xl flex flex-col gap-2 z-50 animate-scale-in md:hidden">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 text-left text-slate-700 hover:text-blue-600 transition-all duration-200"
            >
              Trang chủ
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleNav('/dashboard');
              }}
              className="font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 text-left text-slate-700 hover:text-blue-600 transition-all duration-200"
            >
              Tiến trình
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); handleNav('/flashcards'); }}
              className="font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 text-left text-slate-700 hover:text-blue-600 transition-all duration-200"
            >
              Flashcard
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); handleNav('/reader'); }}
              className="font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 text-left text-slate-700 hover:text-blue-600 transition-all duration-200"
            >
              Dịch thuật
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); handleNav('/pronunciation'); }}
              className="font-semibold text-sm px-4 py-3 rounded-xl hover:bg-slate-50 text-left text-slate-700 hover:text-blue-600 transition-all duration-200"
            >
              Luyện phát âm
            </button>
          </div>
        )}
      </header>

      {/* Hero Section Container */}
      <section className="max-w-7xl mx-auto w-full px-6 pt-24 pb-12 md:pt-36 md:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 relative">

        {/* Left column Pitch */}
        <ScrollReveal className="lg:col-span-7 space-y-8 text-left" animation="slide-up" delay={100}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold shadow-sm shadow-blue-500/5">
            <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500/10" />
            <span>Trợ lý Đọc & Học tiếng Trung thông minh bằng AI</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[54px] font-extrabold font-display leading-[1.1] text-slate-900 tracking-tight">
            Nâng Cao <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">Kỹ Năng</span><br />
            Để Bứt Phá <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">Sự Nghiệp</span>
          </h1>

          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            Học các kỹ năng tiếng Trung hiệu quả cùng Hanora. Hệ thống học tập trực tuyến mới nhất giúp bạn bóc tách ngữ pháp, tra cứu Pinyin tự động, lưu từ mới và ôn tập lặp lại ngắt quãng để mở rộng kiến thức mỗi ngày.
          </p>

          <div className="flex gap-4">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              onClick={handleStart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Bắt đầu ngay
            </Button>
          </div>

          {/* Value props list */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/60 max-w-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <span className="text-xs font-black">🗣️</span>
              </div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Giao tiếp tự tin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <span className="text-xs font-black">💼</span>
              </div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Định hướng nghề</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <span className="text-xs font-black">💡</span>
              </div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">Tư duy sáng tạo</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Right column illustration */}
        <ScrollReveal className="lg:col-span-5 w-full flex flex-col items-center justify-center relative" animation="scale-in" delay={250}>

          {/* Main graphic container */}
          <div className="relative w-full max-w-[420px] h-[420px] flex items-center justify-center select-none">

            {/* Background circle shape in ocean blue */}
            <div className="absolute w-[320px] h-[320px] md:w-[330px] md:h-[330px] rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 opacity-90 shadow-2xl z-0"></div>

            {/* User photo main.jpg */}
            <img
              src={mainImg}
              className="absolute w-[320px] h-[320px] md:w-[330px] md:h-[330px] object-cover rounded-full z-10 border-[6px] border-white shadow-2xl"
              alt="Main illustration banner"
            />


          </div>

        </ScrollReveal>
      </section>

      {/* SECTION 1: Giới thiệu (About Us) */}
      <section id="about" className="bg-white border-t border-slate-100 py-20 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left: Illustration Mockup */}
          <ScrollReveal className="lg:col-span-6 w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm relative" animation="slide-left">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Trình mô phỏng từ điển thông minh</span>

            {/* Interactive Demo */}
            <div className="text-lg leading-loose tracking-wide py-4 border-b border-slate-200/50 mb-4 text-slate-700">
              {demoWords.map((token, idx) => {
                if (token.isPunc) {
                  return <span key={idx} className="text-slate-400">{token.text}</span>;
                }
                const isSelected = selectedWord?.text === token.text;
                return (
                  <span
                    key={idx}
                    onClick={() => setSelectedWord(token)}
                    className={`inline-block mx-0.5 cursor-pointer rounded transition-all duration-150 py-1 ${isSelected
                        ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-600 font-bold px-0.5'
                        : 'hover:text-blue-600 hover:bg-slate-100 px-0.5'
                      }`}
                  >
                    <ruby className="flex flex-col items-center">
                      <span>{token.text}</span>
                      <rt className="text-[9px] text-slate-400 font-bold leading-none select-none lowercase">
                        {token.pinyin}
                      </rt>
                    </ruby>
                  </span>
                );
              })}
            </div>

            {/* Interactive lookup tooltip info card */}
            {selectedWord ? (
              <div className="bg-white border border-slate-100 p-4 rounded-2xl text-left space-y-2.5 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Cấp độ HSK {selectedWord.hsk}
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tra từ liên kết</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-display">{selectedWord.text}</span>
                  <span className="text-xs font-bold text-blue-600">[{selectedWord.pinyin}]</span>
                </div>
                <p className="text-xs text-slate-500 italic">"{selectedWord.translation}"</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6">Nhấp vào bất kỳ từ nào để tra cứu Pinyin và nghĩa!</p>
            )}
          </ScrollReveal>

          {/* Right: Pitch text */}
          <ScrollReveal className="lg:col-span-6 space-y-6 text-left" animation="slide-right" delay={150}>
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Về Hanora</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display leading-tight">
              Phương Pháp Học Tiếng Trung Qua Ngữ Cảnh Hiệu Quả Nhất
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Hanora ra đời nhằm mang lại trải nghiệm tiếp thu ngôn ngữ tự nhiên (comprehensible input). Thay vì học thuộc lòng những từ vựng khô khan, bạn có thể tự tải lên các văn bản, tiểu thuyết hoặc tài liệu tiếng Trung yêu thích của mình.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Hệ thống AI thông minh của chúng tôi tự động chia từ, gán Pinyin tương ứng, phân tích cấu trúc câu và lập kế hoạch ôn tập ghi nhớ giúp bạn thành thạo tiếng Trung nhanh gấp hai lần phương pháp truyền thống.
            </p>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleStart}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl"
              >
                Khám phá thêm về phương pháp
              </Button>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* SECTION 2: Tính năng nổi bật (Features) */}
      <section id="features" className="bg-slate-50 border-t border-slate-100 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 space-y-12">

          <ScrollReveal className="max-w-lg mx-auto text-center space-y-3" animation="slide-up">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Tính năng cốt lõi</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">Trải Nghiệm Học Tập Tương Tác Đột Phá</h2>
            <p className="text-xs text-slate-400">Khám phá các công cụ thông minh giúp bạn tối ưu hóa thời gian và hiệu quả tiếp thu tiếng Trung</p>
          </ScrollReveal>

          {/* Tab system container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">

            {/* Left column: Tabs list */}
            <div className="lg:col-span-5 flex flex-col gap-4">

              {/* Tab 0 */}
              <button
                onClick={() => { setActiveTab(0); setAutoplayActive(false); }}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${activeTab === 0
                    ? 'bg-white border-blue-100 shadow-md shadow-blue-500/5'
                    : 'bg-white/40 backdrop-blur-sm border-transparent hover:bg-white/70'
                  }`}
              >
                <div className={`p-3 rounded-xl transition-colors ${activeTab === 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Thẻ Ghi Nhớ Flashcard 3D (SRS)</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ôn tập thông minh với hệ thống flashcard lặp lại ngắt quãng thích ứng theo trí nhớ của bạn.
                  </p>
                  {activeTab === 0 && (
                    <div className="w-full bg-slate-100 h-[3px] rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full w-full animate-loading-bar origin-left"></div>
                    </div>
                  )}
                </div>
              </button>

              {/* Tab 1 */}
              <button
                onClick={() => { setActiveTab(1); setAutoplayActive(false); }}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${activeTab === 1
                    ? 'bg-white border-blue-100 shadow-md shadow-blue-500/5'
                    : 'bg-white/40 backdrop-blur-sm border-transparent hover:bg-white/70'
                  }`}
              >
                <div className={`p-3 rounded-xl transition-colors ${activeTab === 1 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Luyện Phát Âm Chuẩn AI</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Thu âm và nhận đánh giá chấm điểm phát âm tiếng Trung theo thời gian thực chuẩn xác.
                  </p>
                  {activeTab === 1 && (
                    <div className="w-full bg-slate-100 h-[3px] rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full w-full animate-loading-bar origin-left"></div>
                    </div>
                  )}
                </div>
              </button>

              {/* Tab 2 */}
              <button
                onClick={() => { setActiveTab(2); setAutoplayActive(false); }}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${activeTab === 2
                    ? 'bg-white border-blue-100 shadow-md shadow-blue-500/5'
                    : 'bg-white/40 backdrop-blur-sm border-transparent hover:bg-white/70'
                  }`}
              >
                <div className={`p-3 rounded-xl transition-colors ${activeTab === 2 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Languages className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[15px] font-extrabold text-slate-800">Bóc Tách & Dịch Thuật Ngữ Cảnh</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Dịch tài liệu, phân tích trợ từ ngữ pháp khó và hiển thị phiên âm Pinyin tự động.
                  </p>
                  {activeTab === 2 && (
                    <div className="w-full bg-slate-100 h-[3px] rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-full w-full animate-loading-bar origin-left"></div>
                    </div>
                  )}
                </div>
              </button>

            </div>

            {/* Right column: Interactive transparent preview card */}
            <div className="lg:col-span-7 w-full h-[360px] relative flex items-center justify-center bg-white/30 backdrop-blur-md border border-white/50 rounded-3xl p-6 shadow-xl overflow-hidden min-h-[360px]">

              {/* Preview 0: Flashcard 3D */}
              {activeTab === 0 && (
                <div className="w-full max-w-[280px] h-[220px] [perspective:1000px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                  <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

                    {/* Front of card */}
                    <div className="absolute w-full h-full [backface-visibility:hidden] bg-white border border-slate-100 rounded-2xl shadow-md p-6 flex flex-col justify-between items-center text-center">
                      <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">HSK 1</span>
                      <div className="my-auto space-y-2">
                        <span className="text-4xl font-extrabold text-slate-900 font-display">学习</span>
                        <p className="text-xs text-slate-400 font-bold">[xuéxí]</p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Bấm để lật thẻ</span>
                    </div>

                    {/* Back of card */}
                    <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white border border-slate-100 rounded-2xl shadow-md p-6 flex flex-col justify-between text-left">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Nghĩa</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Flashcard SRS</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">học tập, nghiên cứu</h4>
                        <div className="space-y-1 border-t border-slate-100 pt-2.5">
                          <p className="text-[11px] text-slate-400 font-bold">Ví dụ:</p>
                          <p className="text-xs font-semibold text-slate-700">我们必须每天学习汉语。</p>
                          <p className="text-[10px] text-slate-500 italic">Chúng ta phải học tiếng Trung mỗi ngày.</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 justify-end">
                        <span className="text-[9px] font-bold bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-md">Khó</span>
                        <span className="text-[9px] font-bold bg-yellow-50 text-yellow-600 border border-yellow-100 px-2 py-0.5 rounded-md">Bình thường</span>
                        <span className="text-[9px] font-bold bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-md">Dễ</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Preview 1: Pronunciation AI */}
              {activeTab === 1 && (
                <div className="w-full max-w-sm space-y-6 text-center animate-fade-in">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Luyện đọc câu</span>
                    <h4 className="text-xl font-extrabold text-slate-800 font-display">很高兴认识你！</h4>
                    <p className="text-xs text-slate-400 font-bold">[hěn gāoxìng rènshi nǐ!]</p>
                  </div>

                  {/* Audio Waveforms */}
                  <div className="flex items-center gap-1.5 h-12 justify-center">
                    <div className="w-1.5 bg-blue-500 rounded-full animate-bounce h-8" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 bg-blue-400 rounded-full animate-bounce h-12" style={{ animationDelay: '0.3s' }}></div>
                    <div className="w-1.5 bg-sky-500 rounded-full animate-bounce h-6" style={{ animationDelay: '0.5s' }}></div>
                    <div className="w-1.5 bg-blue-600 rounded-full animate-bounce h-10" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 bg-sky-400 rounded-full animate-bounce h-7" style={{ animationDelay: '0.4s' }}></div>
                  </div>

                  <div className="flex justify-center items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shadow-md animate-pulse">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div className="text-left bg-white border border-slate-100 rounded-2xl px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-[11px] text-green-600 font-extrabold">Điểm số: 96%</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">Phát âm rất chuẩn! Hãy tiếp tục phát huy.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview 2: Dịch thuật & Phân tách câu */}
              {activeTab === 2 && (
                <div className="w-full max-w-md space-y-4 animate-fade-in text-left">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Câu gốc</span>
                    <div className="text-sm font-semibold text-slate-800 leading-relaxed flex flex-wrap gap-2.5 py-1">
                      <span className="border-b-2 border-blue-500 text-blue-600 font-bold px-0.5">学习</span>
                      <span className="hover:text-blue-500 px-0.5">汉语</span>
                      <span className="hover:text-blue-500 px-0.5">很有意思</span>
                      <span className="text-slate-400">！</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Tra cứu thông minh</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">HSK 1</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-slate-900 font-display">学习</span>
                        <span className="text-xs font-bold text-blue-600">[xuéxí]</span>
                      </div>
                      <p className="text-xs text-slate-500 italic">"học tập, học hỏi, nghiên cứu"</p>
                    </div>

                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Dịch nghĩa câu</span>
                      <p className="text-xs font-semibold text-slate-600">Học tiếng Trung Quốc rất thú vị!</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* SECTION 3: Bảng giá (Pricing) */}
      <section id="pricing" className="bg-white border-t border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">

          <ScrollReveal className="max-w-lg mx-auto space-y-3" animation="slide-up">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Bảng giá dịch vụ</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">Lựa Chọn Gói Dịch Vụ Phù Hợp</h2>
            <p className="text-xs text-slate-400">Đăng ký gói để bứt phá giới hạn và tiếp cận trọn bộ tính năng trợ lý tiếng Trung</p>
          </ScrollReveal>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

            {/* Package 1: Basic */}
            <ScrollReveal className="bg-slate-50 border border-slate-150 rounded-3xl p-8 flex flex-col justify-between text-left hover:scale-[1.02] transition-transform duration-200" animation="slide-up" delay={0}>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gói Cơ Bản</h4>
                  <p className="text-2xl font-black text-slate-900 mt-2">0đ <span className="text-xs font-medium text-slate-500">/ tháng</span></p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Phù hợp cho các bạn mới bắt đầu làm quen với việc đọc tiếng Trung.</p>
                <div className="w-full h-[1px] bg-slate-200"></div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Tra cứu từ điển HSK cơ bản
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Tải lên tối đa 3 tài liệu/tháng
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Ôn tập flashcard lặp lại ngắt quãng
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-8 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs shadow-sm transition-all"
              >
                Bắt đầu miễn phí
              </button>
            </ScrollReveal>

            {/* Package 2: Premium (Highlighted) */}
            <ScrollReveal className="bg-white border-2 border-blue-600 rounded-3xl p-8 flex flex-col justify-between text-left relative shadow-xl shadow-blue-500/5 hover:scale-[1.02] transition-transform duration-200" animation="slide-up" delay={150}>
              <span className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Phổ biến nhất
              </span>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Gói Chuyên Nghiệp</h4>
                  <p className="text-2xl font-black text-slate-900 mt-2">99.000đ <span className="text-xs font-medium text-slate-500">/ tháng</span></p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Khuyên dùng dành cho học viên ôn thi HSK và luyện đọc hàng ngày.</p>
                <div className="w-full h-[1px] bg-slate-100"></div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2 font-bold text-slate-700">
                    <Check className="w-4 h-4 text-blue-600" /> Không giới hạn lượt tải tài liệu
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> AI giải thích chi tiết ngữ pháp câu văn
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Tra cứu từ ngữ cảnh không giới hạn
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Lưu trữ kho từ vựng cá nhân đám mây
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition-all"
              >
                Đăng ký ngay
              </button>
            </ScrollReveal>

            {/* Package 3: Academic */}
            <ScrollReveal className="bg-slate-50 border border-slate-150 rounded-3xl p-8 flex flex-col justify-between text-left hover:scale-[1.02] transition-transform duration-200" animation="slide-up" delay={300}>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gói Cao Cấp</h4>
                  <p className="text-2xl font-black text-slate-900 mt-2">199.000đ <span className="text-xs font-medium text-slate-500">/ tháng</span></p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Được thiết kế chuyên biệt cho nghiên cứu dịch thuật nâng cao.</p>
                <div className="w-full h-[1px] bg-slate-200"></div>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Tất cả tính năng của gói Premium
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Giọng đọc máy TTS AI chất lượng cao
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Xuất dữ liệu học tập PDF/Anki Format
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" /> Hỗ trợ giải đáp ưu tiên 24/7
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-8 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 text-xs shadow-sm transition-all"
              >
                Liên hệ tư vấn
              </button>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* SECTION 4: Feedback học viên (Customer Reviews) */}
      <section id="feedback" className="bg-slate-50 border-t border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">

          <ScrollReveal className="max-w-lg mx-auto space-y-3" animation="slide-up">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Ý kiến học viên</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-display">Nhận Xét Từ Cộng Đồng Hanora</h2>
            <p className="text-xs text-slate-400">Hãy nghe câu chuyện từ các bạn học viên đã nâng tầm tiếng Trung thành công</p>
          </ScrollReveal>

          {/* Feedback marquee layout */}
          <ScrollReveal className="relative w-full overflow-hidden py-4" animation="fade-in">
            {/* Edge fade gradient overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none"></div>

            {/* Scrolling track */}
            <div className="animate-marquee gap-8 py-2">

              {/* First group of cards */}
              <div className="flex gap-8 shrink-0">
                {/* Feedback 1 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Nhờ Hanora mình đã tăng gấp đôi tốc độ đọc báo tiếng Trung. Bấm từ nào ra pinyin từ đó rất tiện, không còn phải tốn thời gian gõ tra từ điển ngoài."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">MA</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Nguyễn Minh Anh</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 4</p>
                    </div>
                  </div>
                </div>

                {/* Feedback 2 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Hệ thống ôn tập flashcard lặp lại ngắt quãng SRS của app cực tốt. Học từ mới qua văn bản thực tế giúp mình hiểu ngữ cảnh sử dụng và nhớ từ lâu hơn hẳn."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-100 text-blue-600 font-bold flex items-center justify-center text-xs">TH</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Trần Thanh Hải</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 5</p>
                    </div>
                  </div>
                </div>

                {/* Feedback 3 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Tính năng AI bóc tách câu dịch rất chuẩn. Đặc biệt là những trợ từ khó hiểu như 了 hay 把 đều được hệ thống liệt kê thành ngữ pháp ngắn gọn dễ nắm vững."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">TT</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Lê Thu Trang</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 3</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second group of cards for seamless infinite scroll */}
              <div className="flex gap-8 shrink-0">
                {/* Feedback 1 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Nhờ Hanora mình đã tăng gấp đôi tốc độ đọc báo tiếng Trung. Bấm từ nào ra pinyin từ đó rất tiện, không còn phải tốn thời gian gõ tra từ điển ngoài."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">MA</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Nguyễn Minh Anh</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 4</p>
                    </div>
                  </div>
                </div>

                {/* Feedback 2 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Hệ thống ôn tập flashcard lặp lại ngắt quãng SRS của app cực tốt. Học từ mới qua văn bản thực tế giúp mình hiểu ngữ cảnh sử dụng và nhớ từ lâu hơn hẳn."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-100 text-blue-600 font-bold flex items-center justify-center text-xs">TH</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Trần Thanh Hải</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 5</p>
                    </div>
                  </div>
                </div>

                {/* Feedback 3 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left relative hover:-translate-y-1 transition-transform w-[320px] md:w-[360px] shrink-0 h-[220px]">
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-blue-500/10 fill-current" />
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Tính năng AI bóc tách câu dịch rất chuẩn. Đặc biệt là những trợ từ khó hiểu như 了 hay 把 đều được hệ thống liệt kê thành ngữ pháp ngắn gọn dễ nắm vững."
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">TT</div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800">Lê Thu Trang</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Học viên HSK 3</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 5: Đăng ký tư vấn / Hỗ trợ (Q&A Banner) */}
      <section className="bg-slate-50 pb-20 px-6">
        <ScrollReveal className="max-w-6xl mx-auto" animation="slide-up">
          <div className="relative w-full bg-white rounded-[32px] md:rounded-[40px] px-6 py-12 md:py-16 text-center text-slate-800 overflow-hidden shadow-[0_24px_50px_rgba(37,99,235,0.06)] border border-blue-100/80">

            {/* Background soft glow blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-sky-100/40 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Floating circular avatar profiles with real generated photos */}
            {/* Top Left avatar */}
            <div className="absolute left-[8%] top-[15%] hidden lg:flex items-center justify-center w-14 h-14 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle">
              <img src={avatar1} className="w-full h-full object-cover" alt="Student avatar 1" />
            </div>
            {/* Mid Left avatar */}
            <div className="absolute left-[4%] top-[50%] hidden lg:flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle" style={{ animationDelay: '0.5s' }}>
              <img src={avatar2} className="w-full h-full object-cover" alt="Student avatar 2" />
            </div>
            {/* Bottom Left avatar */}
            <div className="absolute left-[12%] bottom-[15%] hidden lg:flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle" style={{ animationDelay: '1s' }}>
              <img src={avatar3} className="w-full h-full object-cover" alt="Student avatar 3" />
            </div>

            {/* Top Right avatar */}
            <div className="absolute right-[8%] top-[15%] hidden lg:flex items-center justify-center w-14 h-14 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle" style={{ animationDelay: '0.3s' }}>
              <img src={avatar4} className="w-full h-full object-cover" alt="Teacher avatar" />
            </div>
            {/* Mid Right avatar */}
            <div className="absolute right-[4%] top-[50%] hidden lg:flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle" style={{ animationDelay: '0.8s' }}>
              <img src={avatar5} className="w-full h-full object-cover" alt="Academic avatar" />
            </div>
            {/* Bottom Right avatar */}
            <div className="absolute right-[12%] bottom-[15%] hidden lg:flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl shadow-blue-500/5 animate-pulse-subtle" style={{ animationDelay: '1.2s' }}>
              <img src={avatar6} className="w-full h-full object-cover" alt="Boy avatar" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display leading-tight tracking-tight text-blue-950">
                Bạn vẫn còn câu hỏi thắc mắc?
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Đừng ngần ngại để lại số điện thoại của bạn. Đội ngũ Hanora sẽ liên hệ trực tiếp trong thời gian sớm nhất để tư vấn lộ trình học phù hợp nhất!
              </p>

              {/* Input capsule form */}
              <form onSubmit={handleQuestionSubmit} className="pt-2">
                {questionSubmitted ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center max-w-md mx-auto animate-scale-in">
                    <p className="text-sm font-extrabold text-blue-900">🎉 Đăng ký thành công!</p>
                    <p className="text-[11px] text-blue-600 mt-1 font-semibold">Chúng tôi sẽ gọi lại cho bạn trong thời gian sớm nhất.</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row bg-slate-50 hover:bg-slate-100/50 rounded-2xl p-1.5 shadow-inner border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 max-w-md mx-auto items-center gap-2 transition-all duration-200">
                    <input
                      type="tel"
                      required
                      value={questionPhone}
                      onChange={(e) => setQuestionPhone(e.target.value)}
                      placeholder="Nhập số điện thoại của bạn..."
                      className="w-full bg-transparent px-4 py-3 outline-none text-slate-800 placeholder-slate-400 text-sm font-semibold"
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all duration-200 whitespace-nowrap"
                    >
                      Đăng ký tư vấn
                    </button>
                  </div>
                )}
              </form>
            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* Footer in Vietnamese */}
      <footer className="py-12 bg-white border-t border-slate-100 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img
                src={logoImg}
                className="w-8 h-8 object-contain rounded-lg"
                alt="Hanora logo"
              />
              <span className="text-sm font-extrabold text-slate-800">Hanora</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trung tâm hỗ trợ ôn tập, đọc hiểu chữ Hán hàng đầu Việt Nam giúp bạn làm chủ tiếng Trung tự nhiên qua từng văn cảnh.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Đường dẫn</h4>
            <ul className="space-y-2 text-slate-500">
              <li><a href="#" className="hover:text-blue-600">Trang chủ</a></li>
              <li><a href="#about" className="hover:text-blue-600">Giới thiệu</a></li>
              <li><a href="#features" className="hover:text-blue-600">Tính năng</a></li>
              <li><a href="#pricing" className="hover:text-blue-600">Bảng giá</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hỗ trợ</h4>
            <ul className="space-y-2 text-slate-500">
              <li><a href="#" className="hover:text-blue-600">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="hover:text-blue-600">Điều khoản dịch vụ</a></li>
              <li><a href="#" className="hover:text-blue-600">Chính sách bảo mật</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Liên hệ</h4>
            <p className="text-xs text-slate-400">Email: support@hanora.com</p>
            <p className="text-xs text-slate-400">Hotline: 1900 6868</p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          &copy; {new Date().getFullYear()} Hanora Learning Hub. Bảo lưu mọi quyền.
        </div>
      </footer>

    </div>
  );
}
export default LandingPage;
