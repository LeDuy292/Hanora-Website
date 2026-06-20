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
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';
import { useAuthStore } from '../store/authStore';
import Header from '../components/layout/Header';
import videoWeb from '../assets/video_website.mp4';
import mainImg from '../assets/main.jpg';
import logoImg from '../assets/logo.png';
import lp1 from '../assets/LandingPage1.png';
import lp2 from '../assets/LandingPage2.jpg';
import lp3 from '../assets/LandingPage3.png';
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
      <div className="absolute bottom-[-15%] right-[-15%] w-[80%] h-[80%] bg-sky-100/40 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Navbar Header layout */}
      <Header />

      {/* Hero Section Container */}
      <section className="min-h-[100dvh] flex flex-col items-center justify-center relative px-6 overflow-hidden">
        {/* Animated background blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-400/10 rounded-full blur-[120px] pointer-events-none"
        />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center z-10 relative pt-20">
          {/* Left column Pitch */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold shadow-sm shadow-blue-500/5"
            >
              <Sparkles className="w-4 h-4 text-blue-500 fill-blue-500/10" />
              <span>Trợ lý Đọc & Học tiếng Trung thông minh bằng AI</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl md:text-[64px] font-extrabold font-display leading-[1.1] text-slate-900 tracking-tight"
            >
              Nâng Cao <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">Kỹ Năng</span><br />
              Để Bứt Phá <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">Sự Nghiệp</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-slate-500 max-w-xl leading-relaxed"
            >
              Học các kỹ năng tiếng Trung hiệu quả cùng Hanora. Hệ thống học tập trực tuyến mới nhất giúp bạn bóc tách ngữ pháp, tra cứu Pinyin tự động, lưu từ mới và ôn tập lặp lại ngắt quãng để mở rộng kiến thức mỗi ngày.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-4"
            >
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                onClick={handleStart}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/25 active:scale-95 transition-all group"
              >
                Bắt đầu ngay
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-1"
                >
                </motion.span>
              </Button>
            </motion.div>

            {/* Value props list */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200/60 max-w-lg"
            >
              {[
                { emoji: "🗣️", label: "Giao tiếp tự tin" },
                { emoji: "💼", label: "Định hướng nghề" },
                { emoji: "💡", label: "Tư duy sáng tạo" }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-start gap-2 group cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                    <span className="text-sm font-black">{item.emoji}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-blue-600 transition-colors">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-full flex flex-col items-center justify-center relative scale-[1.8]"
          >
            <div className="relative w-full max-w-[600px] aspect-[4/2.8] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <video 
                src={videoWeb} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 12, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
          onClick={() => {
            const aboutSection = document.getElementById('about');
            aboutSection?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cuộn xuống</span>
          <div className="w-[30px] h-[50px] rounded-full border-2 border-slate-200 flex justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-3 bg-blue-500 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* SECTION 1: Giới thiệu (About Us) */}
      <section id="about" className="bg-white border-t border-slate-100 py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left: Illustration Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 w-full bg-slate-50 border border-slate-100 rounded-[3rem] p-8 shadow-sm relative group"
          >
            <div className="absolute top-4 right-8">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Interactive Dictionary Simulator</span>
            </div>

            {/* Interactive Demo */}
            <div className="text-xl leading-loose tracking-wide py-8 border-b border-slate-200/50 mb-6 text-slate-700">
              {demoWords.map((token, idx) => {
                if (token.isPunc) {
                  return <span key={idx} className="text-slate-300">{token.text}</span>;
                }
                const isSelected = selectedWord?.text === token.text;
                return (
                  <motion.span
                    key={idx}
                    whileHover={{ scale: 1.1, color: "#2563eb" }}
                    onClick={() => setSelectedWord(token)}
                    className={`inline-block mx-1 cursor-pointer rounded-xl transition-all duration-200 py-1 px-1.5 ${isSelected
                        ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-600 font-bold'
                        : 'hover:bg-blue-50/50'
                      }`}
                  >
                    <ruby className="flex flex-col items-center">
                      <span className="text-2xl">{token.text}</span>
                      <rt className="text-[10px] text-blue-400 font-bold leading-none select-none lowercase mt-1">
                        {token.pinyin}
                      </rt>
                    </ruby>
                  </motion.span>
                );
              })}
            </div>

            {/* Interactive lookup tooltip info card */}
            <AnimatePresence mode="wait">
              {selectedWord && (
                <motion.div
                  key={selectedWord.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-slate-100 p-6 rounded-3xl text-left space-y-4 shadow-xl shadow-blue-500/5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                      Cấp độ HSK {selectedWord.hsk}
                    </span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-slate-900 font-display">{selectedWord.text}</span>
                    <span className="text-lg font-bold text-blue-600">[{selectedWord.pinyin}]</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    <span className="text-slate-400 italic mr-2">Ý nghĩa:</span>
                    {selectedWord.translation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right: Pitch text */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 space-y-8 text-left"
          >
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Về Hanora</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-display leading-[1.1]">
                Phương Pháp Học Tiếng Trung Qua Ngữ Cảnh
              </h2>
            </div>
            
            <p className="text-lg text-slate-500 leading-relaxed">
              Hanora ra đời nhằm mang lại trải nghiệm tiếp thu ngôn ngữ tự nhiên (comprehensible input). Thay vì học thuộc lòng những từ vựng khô khan, bạn có thể tự tải lên các văn bản, tiểu thuyết hoặc tài liệu tiếng Trung yêu thích của mình.
            </p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Tiếp thu tự nhiên</h4>
                  <p className="text-sm text-slate-500">Học từ mới qua các câu chuyện và văn bản thực tế bạn yêu thích.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-sky-500/20">
                  <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Ghi nhớ vĩnh viễn</h4>
                  <p className="text-sm text-slate-500">Hệ thống AI lập kế hoạch ôn tập tối ưu cho trí nhớ của riêng bạn.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleStart}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-2xl px-10 py-4 font-bold"
              >
                Khám phá phương pháp
              </Button>
            </div>
          </motion.div>

        </div>
      </section>

      {/* SECTION 2: Tính năng nổi bật (Features) */}
      <section id="features" className="bg-slate-50 border-t border-slate-100 py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 space-y-32">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center space-y-4"
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Tính năng cốt lõi</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-display">Trải Nghiệm Học Tập Tương Tác Đột Phá</h2>
            <p className="text-slate-500 leading-relaxed text-lg">Khám phá các công cụ thông minh giúp bạn tối ưu hóa thời gian và hiệu quả tiếp thu tiếng Trung</p>
          </motion.div>

          {/* New Feature Items Replacement */}
          <div className="space-y-40">
            {/* Feature 1: Reader */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-sky-400 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                  <img src={lp1} className="w-full h-auto rounded-[2rem] object-cover" alt="Smart PDF Reader" />
                </div>
                {/* Decorative floating icon */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-8 -right-8 w-20 h-20 bg-blue-600 rounded-3xl shadow-xl flex items-center justify-center text-white"
                >
                  <Languages className="w-10 h-10" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <h3 className="text-3xl font-bold text-slate-900">Bóc Tách & Dịch Thuật Ngữ Cảnh</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Công cụ Smart PDF Reader của chúng tôi cho phép bạn tải lên tài liệu và tương tác trực tiếp với văn bản. Nhấp vào bất kỳ từ nào để tra cứu Pinyin, nghĩa và ngữ pháp ngay lập tức.
                </p>
                <ul className="space-y-4">
                  {[
                    "Tra cứu từ điển HSK tự động",
                    "Hiển thị phiên âm Pinyin thông minh",
                    "Phân tích cấu trúc câu AI",
                    "Lưu từ vựng trực tiếp vào kho cá nhân"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">✓</div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Feature 2: Flashcards (Reversed) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="order-2 lg:order-1 space-y-6"
              >
                <h3 className="text-3xl font-bold text-slate-900">Thẻ Ghi Nhớ Flashcard AI (SRS)</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Hệ thống ôn tập lặp lại ngắt quãng (Spaced Repetition System) giúp bạn ghi nhớ từ vựng vĩnh viễn. Các thẻ được cá nhân hóa dựa trên độ khó bạn cảm nhận.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-blue-600 text-2xl font-black">85%</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Ghi nhớ lâu hơn</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-blue-600 text-2xl font-black">2x</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Tốc độ học</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="order-1 lg:order-2 relative group"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-sky-500 to-blue-400 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                  <img src={lp2} className="w-full h-auto rounded-[2rem] object-cover" alt="AI Flashcards" />
                </div>
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -bottom-8 -left-8 w-20 h-20 bg-sky-500 rounded-3xl shadow-xl flex items-center justify-center text-white"
                >
                  <Layers className="w-10 h-10" />
                </motion.div>
              </motion.div>
            </div>

            {/* Feature 3: Pronunciation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-400 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                  <img src={lp3} className="w-full h-auto rounded-[2rem] object-cover" alt="AI Pronunciation" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-8 -right-8 w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl flex items-center justify-center text-white"
                >
                  <Mic className="w-10 h-10" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <h3 className="text-3xl font-bold text-slate-900">Luyện Nói & Phản Hồi Tức Thì</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Công nghệ AI nhận diện giọng nói giúp bạn sửa lỗi phát âm từng từ. Nhận đánh giá chi tiết về độ chính xác và trôi chảy ngay sau khi nói.
                </p>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-600">Phản hồi chi tiết</span>
                    <span className="text-xs font-medium text-blue-500">Mới</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "92%" }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Bạn đã đạt mức điểm 92, cao hơn 88% người học khác!</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Bảng giá (Pricing) */}
      <section id="pricing" className="bg-white border-t border-slate-100 py-32">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto space-y-4"
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Bảng giá dịch vụ</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 font-display">Lựa Chọn Gói Dịch Vụ Phù Hợp</h2>
            <p className="text-slate-500 leading-relaxed text-lg">Đăng ký gói để bứt phá giới hạn và tiếp cận trọn bộ tính năng trợ lý tiếng Trung</p>
          </motion.div>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">

            {/* Package 1: Basic */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-slate-50 border border-slate-150 rounded-[2.5rem] p-10 flex flex-col justify-between text-left hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gói Cơ Bản</h4>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-black text-slate-900">0đ</span>
                    <span className="text-sm font-bold text-slate-400">/tháng</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">Phù hợp cho các bạn mới bắt đầu làm quen với việc đọc tiếng Trung.</p>
                <div className="w-full h-[1px] bg-slate-200"></div>
                <ul className="space-y-4">
                  {[
                    "Tra cứu từ điển HSK cơ bản",
                    "Tải lên tối đa 3 tài liệu/tháng",
                    "Ôn tập flashcard SRS"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-blue-600 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-10 py-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-sm transition-all text-sm"
              >
                Bắt đầu miễn phí
              </button>
            </motion.div>

            {/* Package 2: Premium (Highlighted) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white border-2 border-blue-600 rounded-[2.5rem] p-10 flex flex-col justify-between text-left relative shadow-2xl shadow-blue-500/10 transform hover:-translate-y-3 transition-all duration-300"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-[10px] px-6 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                Phổ biến nhất
              </div>
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Gói Chuyên Nghiệp</h4>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-black text-slate-900">99k</span>
                    <span className="text-sm font-bold text-slate-400">/tháng</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">Khuyên dùng dành cho học viên ôn thi HSK và luyện đọc hàng ngày.</p>
                <div className="w-full h-[1px] bg-slate-100"></div>
                <ul className="space-y-4">
                  {[
                    "Không giới hạn lượt tải tài liệu",
                    "AI giải thích chi tiết ngữ pháp",
                    "Tra cứu ngữ cảnh vô hạn",
                    "Lưu trữ đám mây từ vựng"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                      <Check className="w-5 h-5 text-blue-600 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-500/25 transition-all text-sm"
              >
                Đăng ký ngay
              </button>
            </motion.div>

            {/* Package 3: Academic */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-slate-50 border border-slate-150 rounded-[2.5rem] p-10 flex flex-col justify-between text-left hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gói Cao Cấp</h4>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-black text-slate-900">199k</span>
                    <span className="text-sm font-bold text-slate-400">/tháng</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">Được thiết kế chuyên biệt cho nghiên cứu dịch thuật nâng cao.</p>
                <div className="w-full h-[1px] bg-slate-200"></div>
                <ul className="space-y-4">
                  {[
                    "Tất cả tính năng Pro+",
                    "Giọng đọc TTS AI cao cấp",
                    "Xuất dữ liệu PDF/Anki",
                    "Hỗ trợ ưu tiên 24/7"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-blue-600 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStart}
                className="w-full mt-10 py-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-sm transition-all text-sm"
              >
                Liên hệ tư vấn
              </button>
            </motion.div>

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
