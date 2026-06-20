import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore';
import { Globe, Info } from 'lucide-react';
import mainBg from '../assets/main.jpg';

const DECK_COVERS = [
  { title: 'HSK 1 Standard', badge: 'HSK 1', chars: '你好', pinyin: 'nǐ hǎo', desc: 'Chân Trời Mới', color: 'from-emerald-600/80 to-teal-950/90' },
  { title: 'HSK 2 Standard', badge: 'HSK 2', chars: '朋友', pinyin: 'péngyou', desc: 'Kết Nối Bạn Bè', color: 'from-blue-600/80 to-indigo-950/90' },
  { title: 'HSK 3 Standard', badge: 'HSK 3', chars: '汉语', pinyin: 'Hànyǔ', desc: 'Mở Rộng Tầm Nhìn', color: 'from-purple-600/80 to-violet-950/90' },
  { title: 'Đường Thi', badge: 'Thơ Đường', chars: '唐诗', pinyin: 'Tángshī', desc: 'Văn Học Cổ Điển', color: 'from-amber-700/80 to-amber-950/90' },
  { title: 'Giao Tiếp', badge: 'Hội Thoại', chars: '再见', pinyin: 'zàijiàn', desc: 'Hội Thoại Đời Sống', color: 'from-rose-600/80 to-rose-950/90' },
  { title: 'Du Lịch', badge: 'Du Lịch', chars: '故宫', pinyin: 'Gùgōng', desc: 'Khám Phá Trung Hoa', color: 'from-cyan-600/80 to-cyan-950/90' },
  { title: 'Ẩm Thực', badge: 'Văn Hóa', chars: '饺子', pinyin: 'jiǎozi', desc: 'Tinh Hoa Ẩm Thực', color: 'from-orange-600/80 to-red-950/90' },
  { title: 'HSK 4 Standard', badge: 'HSK 4', chars: '未来', pinyin: 'wèilái', desc: 'Làm Chủ Ngữ Pháp', color: 'from-indigo-600/80 to-purple-950/90' },
  { title: 'HSK 5', badge: 'HSK 5', chars: '智慧', pinyin: 'zhìhuì', desc: 'Bứt Phá Từ Vựng', color: 'from-fuchsia-600/80 to-fuchsia-950/90' },
  { title: 'Thành Ngữ', badge: 'Thành Ngữ', chars: '成语', pinyin: 'chéngyǔ', desc: 'Thành Ngữ Ý Nghĩa', color: 'from-yellow-600/80 to-yellow-950/90' },
  { title: 'Thương Mại', badge: 'Thương Mại', chars: '商贸', pinyin: 'shāngmào', desc: 'Thương Mại Thực Tế', color: 'from-slate-700/80 to-slate-900/90' },
  { title: 'HSK 6', badge: 'HSK 6', chars: '高峰', pinyin: 'gāofēng', desc: 'Chinh Phục Đỉnh Cao', color: 'from-violet-800/80 to-slate-950/90' },
];

const COLUMN_COVERS = [
  [DECK_COVERS[0], DECK_COVERS[1]],
  [DECK_COVERS[2], DECK_COVERS[3]],
  [DECK_COVERS[4], DECK_COVERS[5]],
  [DECK_COVERS[6], DECK_COVERS[7]],
  [DECK_COVERS[8], DECK_COVERS[9]],
  [DECK_COVERS[10], DECK_COVERS[11]],
];

function GoogleSignInButton({ onSuccess, onError, disabled }) {
  return (
    <div className={`w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap={false}
        theme="filled_black"
        shape="rectangular"
        size="large"
        width="352"
        text="signin_with"
        locale="vi"
      />
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin, isLoading } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(() => location.state?.isSignUp === true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // used as username when signing up
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Vui lòng điền đầy đủ email và mật khẩu.'); return; }
    if (isSignUp && !name) { setError('Vui lòng điền username.'); return; }
    try {
      if (isSignUp) { await register(name, email, password); }
      else { await login(email, password); }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      await googleLogin(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng nhập Google thất bại.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden select-none font-sans">

      {/* Scrolling card wall background */}
      <div className="absolute inset-0 flex flex-row gap-4 md:gap-5 justify-center opacity-85 pointer-events-none overflow-hidden z-0">
        {COLUMN_COVERS.map((column, colIdx) => {
          const scrollClass = colIdx % 2 === 0 ? 'animate-scroll-up' : 'animate-scroll-down';
          let responsiveClass = 'flex';
          if (colIdx === 2) responsiveClass = 'hidden sm:flex';
          else if (colIdx === 3) responsiveClass = 'hidden md:flex';
          else if (colIdx >= 4) responsiveClass = 'hidden lg:flex';
          const repeatedCovers = [...column, ...column, ...column];
          return (
            <div key={colIdx} className={`${responsiveClass} flex-col gap-4 w-36 sm:w-40 md:w-44 lg:w-48 shrink-0 overflow-hidden h-full`}>
              <div className={`flex flex-col gap-4 shrink-0 ${scrollClass}`}>
                {repeatedCovers.map((deck, itemIdx) => (
                  <div key={itemIdx} className={`relative aspect-[2/3] w-full border border-white/10 rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-gradient-to-b ${deck.color}`}>
                    <img src={mainBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-black/40 border border-white/15 uppercase tracking-widest text-white/95 self-start">{deck.badge}</span>
                      <div className="text-center">
                        <span className="text-4xl font-extrabold font-serif text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] block">{deck.chars}</span>
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-1 block">{deck.pinyin}</span>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block truncate">{deck.title}</span>
                        <span className="text-[9px] font-bold text-white/50 block truncate">{deck.desc}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 bg-[#07080d]/45 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/65 via-transparent to-[#07080d]/65 pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#07080d]/80 via-transparent to-[#07080d]/80 pointer-events-none z-0"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl px-6 py-5 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Hano<span className="text-[#ff2e74]">ra</span>
        </h1>
        <button className="flex items-center gap-1.5 text-xs bg-black/45 border border-white/10 px-3.5 py-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>English</span>
          <span className="text-[8px] text-slate-500 ml-0.5">▼</span>
        </button>
      </header>

      {/* Login card */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="w-full max-w-[400px] bg-slate-900/30 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.7),0_0_80px_rgba(255,46,116,0.05)] flex flex-col gap-6">

          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Sign up' : 'Sign in'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <input type="text" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all" />
            )}
            <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#161824]/90 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ff2e74] focus:ring-1 focus:ring-[#ff2e74] transition-all" />

            {!isSignUp && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-[#11131e] border-white/10 text-[#ff2e74] focus:ring-0" />
                  <span>Remember me</span>
                </label>
                <button type="button" className="hover:underline hover:text-slate-200">Need help?</button>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-[#ff2e74] hover:bg-[#ff165e] active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-[#ff2e74]/20 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? 'Đang xử lý...' : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Đăng nhập Google thất bại.')}
            disabled={isLoading}
          />

          <div className="text-center text-xs text-slate-400">
            <span>{isSignUp ? 'Already have an account?' : 'New to Hanora?'}</span>
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-white font-extrabold hover:underline ml-1.5">
              {isSignUp ? 'Sign in now' : 'Sign up now'}
            </button>
          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full px-6 py-5 text-center text-[10px] text-slate-600">
        © {new Date().getFullYear()} Hanora Inc. All rights reserved.
      </footer>
    </div>
  );
}

export default LoginPage;
