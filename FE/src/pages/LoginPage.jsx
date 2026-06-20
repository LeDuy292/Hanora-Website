import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Globe, ShieldCheck, Info } from 'lucide-react';

import cover1 from '../assets/cover1.png';
import cover2 from '../assets/cover2.png';
import cover3 from '../assets/cover3.png';

const DECK_COVERS = [
  { title: 'HSK 1 Standard', badge: 'HSK 1', chars: '你好', pinyin: 'nǐ hǎo', desc: 'Chân Trời Mới', color: 'from-emerald-600/80 to-teal-950/90 text-emerald-400 border-emerald-500/30', bgImage: cover1 },
  { title: 'HSK 2 Standard', badge: 'HSK 2', chars: '朋友', pinyin: 'péngyou', desc: 'Kết Nối Bạn Bè', color: 'from-blue-600/80 to-indigo-950/90 text-blue-400 border-blue-500/30', bgImage: cover2 },
  { title: 'HSK 3 Standard', badge: 'HSK 3', chars: '汉语', pinyin: 'Hànyǔ', desc: 'Mở Rộng Tầm Nhìn', color: 'from-purple-600/80 to-violet-950/90 text-purple-400 border-purple-500/30', bgImage: cover3 },
  { title: 'Đường Thi Tuyển Tập', badge: 'Thơ Đường', chars: '唐诗', pinyin: 'Tángshī', desc: 'Văn Học Cổ Điển', color: 'from-amber-700/80 to-amber-950/90 text-amber-400 border-amber-500/30', bgImage: cover1 },
  { title: 'Giao Tiếp Hàng Ngày', badge: 'Hội Thoại', chars: '再见', pinyin: 'zàijiàn', desc: 'Hội Thoại Đời Sống', color: 'from-rose-600/80 to-rose-950/90 text-rose-400 border-rose-500/30', bgImage: cover2 },
  { title: 'Du Lịch Bắc Kinh', badge: 'Du Lịch', chars: '故宫', pinyin: 'Gùgōng', desc: 'Khám Phá Trung Hoa', color: 'from-cyan-600/80 to-cyan-950/90 text-cyan-400 border-cyan-500/30', bgImage: cover3 },
  { title: 'Ẩm Thực Trung Hoa', badge: 'Văn Hóa', chars: '饺子', pinyin: 'jiǎozi', desc: 'Tinh Hoa Ẩm Thực', color: 'from-orange-600/80 to-red-950/90 text-orange-400 border-orange-500/30', bgImage: cover1 },
  { title: 'HSK 4 Standard', badge: 'HSK 4', chars: '未来', pinyin: 'wèilái', desc: 'Làm Chủ Ngữ Pháp', color: 'from-indigo-600/80 to-purple-950/90 text-indigo-400 border-indigo-500/30', bgImage: cover2 },
  { title: 'Từ Vựng HSK 5', badge: 'HSK 5', chars: '智慧', pinyin: 'zhìhuì', desc: 'Bứt Phá Từ Vựng', color: 'from-fuchsia-600/80 to-fuchsia-950/90 text-fuchsia-400 border-fuchsia-500/30', bgImage: cover3 },
  { title: 'Thành Ngữ Trung Hoa', badge: 'Thành Ngữ', chars: '成语', pinyin: 'chéngyǔ', desc: 'Thành Ngữ Ý Nghĩa', color: 'from-yellow-600/80 to-yellow-950/90 text-yellow-400 border-yellow-500/30', bgImage: cover1 },
  { title: 'Tiếng Trung Thương Mại', badge: 'Thương Mại', chars: '商贸', pinyin: 'shāngmào', desc: 'Thương Mại Thực Tế', color: 'from-slate-700/80 to-slate-900/90 text-slate-400 border-slate-500/30', bgImage: cover2 },
  { title: 'Giáo Trình HSK 6', badge: 'HSK 6', chars: '高峰', pinyin: 'gāofēng', desc: 'Chinh Phục Đỉnh Cao', color: 'from-violet-750/80 to-slate-950/90 text-violet-400 border-violet-500/30', bgImage: cover3 },
];

const COLUMN_COVERS = [
  [DECK_COVERS[0], DECK_COVERS[1]],
  [DECK_COVERS[2], DECK_COVERS[3]],
  [DECK_COVERS[4], DECK_COVERS[5]],
  [DECK_COVERS[6], DECK_COVERS[7]],
  [DECK_COVERS[8], DECK_COVERS[9]],
  [DECK_COVERS[10], DECK_COVERS[11]],
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(() => {
    return location.state?.isSignUp === true;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email/số điện thoại và mật khẩu.');
      return;
    }

    if (isSignUp && !name) {
      setError('Vui lòng điền họ và tên.');
      return;
    }

    // Call store login and redirect to workspace dashboard
    login(email, name);
    navigate('/dashboard');
  };

  const handleDemoLogin = () => {
    login('demo@hanora.com', 'Học viên Hanora');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden select-none font-sans">

      {/* 1. BACKGROUND CHINESE STUDY CARDS GRID WITH INFINTELY SCROLLING WALL */}
      <div className="absolute inset-0 flex flex-row gap-4 md:gap-5 justify-center opacity-85 select-none pointer-events-none scale-100 overflow-hidden z-0">
        {COLUMN_COVERS.map((column, colIdx) => {
          const isScrollUp = colIdx % 2 === 0;
          const scrollClass = isScrollUp ? 'animate-scroll-up' : 'animate-scroll-down';

          // Determine responsive classes to hide some columns on smaller devices
          let responsiveClass = 'flex';
          if (colIdx === 2) responsiveClass = 'hidden sm:flex';
          else if (colIdx === 3) responsiveClass = 'hidden md:flex';
          else if (colIdx >= 4) responsiveClass = 'hidden lg:flex';

          // Duplicate covers to support seamless looping (3 repeats of the array)
          const repeatedCovers = [...column, ...column, ...column];

          return (
            <div
              key={colIdx}
              className={`${responsiveClass} flex-col gap-4 w-36 sm:w-40 md:w-44 lg:w-48 shrink-0 overflow-hidden h-full`}
            >
              <div className={`flex flex-col gap-4 shrink-0 ${scrollClass}`}>
                {repeatedCovers.map((deck, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="relative aspect-[2/3] w-full border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 shrink-0"
                  >
                    {/* Real generated background cover image */}
                    <img
                      src={deck.bgImage}
                      alt={deck.title}
                      className="absolute inset-0 w-full h-full object-cover z-0 opacity-90"
                    />

                    {/* Dark gradient overlay at the bottom for text readability, keeping top bright */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10"></div>

                    {/* Card Content Overlay */}
                    <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between z-20">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded bg-black/40 border border-white/15 uppercase tracking-widest text-white/95 shadow-sm">
                          {deck.badge}
                        </span>
                      </div>

                      <div className="text-center py-2 flex flex-col items-center justify-center">
                        <span className="text-4xl md:text-5xl font-extrabold tracking-widest block font-serif text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                          {deck.chars}
                        </span>
                        <span className="text-[10px] md:text-xs font-bold text-white/70 tracking-wider mt-1.5 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {deck.pinyin}
                        </span>
                      </div>

                      <div className="text-left space-y-0.5">
                        <span className="text-xs font-black text-white tracking-wide block truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{deck.title}</span>
                        <span className="text-[9px] md:text-[10px] font-bold text-white/50 block truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{deck.desc}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightened vignettes to make sure background shows through and glassmorphism works */}
      <div className="absolute inset-0 bg-[#07080d]/45 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/65 via-transparent to-[#07080d]/65 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#07080d]/80 via-transparent to-[#07080d]/80 pointer-events-none z-0"></div>

      {/* 2. TOP BRANDING HEADER */}
      <header className="relative z-10 w-full max-w-7xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Hano<span className="text-[#ff2e74]">ra</span>
          </h1>
        </div>

        {/* Top-Right Language Picker */}
        <button className="flex items-center gap-1.5 text-xs text-slate-350 bg-black/45 border border-white/10 px-3.5 py-1.8 rounded-lg hover:bg-white/10 transition-colors">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>English</span>
          <span className="text-[8px] text-slate-500 ml-0.5">▼</span>
        </button>
      </header>

      {/* 3. CENTRAL GLASSMORPHIC LOGIN/SIGNUP CARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="w-full max-w-[400px] bg-slate-900/30 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.7),0_0_80px_rgba(255,46,116,0.05)] flex flex-col gap-6">

          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {isSignUp ? 'Sign up' : 'Sign in'}
            </h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all"
              />
            )}

            <input
              type="text"
              placeholder="Phone number or Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all"
            />

            {/* Remember me & Helper links */}
            {!isSignUp && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-[#11131e] border-white/10 text-[#ff2e74] focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    defaultChecked
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="hover:underline hover:text-slate-200">Need help?</button>
              </div>
            )}

            {/* Vibrant solid hot pink submit button matching image reference */}
            <button
              type="submit"
              className="w-full bg-[#ff2e74] hover:bg-[#ff165e] active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[#ff2e74]/20 mt-2"
            >
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Login trigger */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full bg-white/5 border border-white/10 hover:bg-[#ff2e74]/10 hover:border-[#ff2e74]/35 text-xs font-bold py-3.5 px-4 rounded-xl text-slate-300 flex items-center justify-center gap-2 transition-all mt-1"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Đăng nhập nhanh (Chế độ dùng thử)</span>
          </button>

          {/* Toggle switcher at the bottom */}
          <div className="text-center text-xs text-slate-400 mt-2">
            <span>
              {isSignUp ? 'Already have an account?' : 'New to Hanora?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-white font-extrabold hover:underline ml-1.5"
            >
              {isSignUp ? 'Sign in now' : 'Sign up now'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. FOOTER CREDITS */}
      <footer className="relative z-10 w-full max-w-7xl px-6 py-5 text-center text-[10px] text-slate-600 font-medium">
        <span>© {new Date().getFullYear()} Hanora Inc. Premium Chinese Learning Portal. All rights reserved.</span>
      </footer>
    </div>
  );
}
export default LoginPage;
