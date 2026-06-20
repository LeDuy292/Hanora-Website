import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loadGoogleScript, GOOGLE_CLIENT_ID } from '../services/authService';
import { Globe, Info, Loader2 } from 'lucide-react';

import backgroundLogin from '../assets/backgroundLogin.png';
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

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin, isLoading, error: storeError, clearError } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(() => {
    return location.state?.isSignUp === true;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  const googleBtnRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState(
    GOOGLE_CLIENT_ID ? '' : 'Chưa cấu hình Google Client ID.'
  );

  const error = localError || storeError;
  const redirectTo = location.state?.from || '/dashboard';

  const handleGoogleCredential = async (response) => {
    setLocalError('');
    const ok = await googleLogin(response.credential);
    if (ok) navigate(redirectTo, { replace: true });
  };

  // Initialise Google Identity Services and render its button.
  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) return;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: 340,
          });
        }
        setGoogleReady(true);
      })
      .catch((err) => setGoogleError(err.message));

    return () => { cancelled = true; };
    // Re-render the button when toggling sign-up/sign-in (the node remounts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    if (isSignUp && !name) {
      setLocalError('Vui lòng điền họ và tên.');
      return;
    }

    const ok = isSignUp
      ? await register(name, email, password)
      : await login(email, password);

    if (ok) navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden select-none font-sans">

      {/* 1. BRANDED BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        <img 
          src={backgroundLogin} 
          alt="Login Background" 
          className="w-full h-full object-cover opacity-100"
        />
      </div>

      {/* Lightened vignettes */}
      <div className="absolute inset-0 bg-[#07080d]/20 pointer-events-none z-0"></div>

      {/* 2. TOP BRANDING HEADER */}
      <header className="relative z-10 w-full max-w-7xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Hano<span className="text-blue-500">ra</span>
          </h1>
        </div>

        {/* Top-Right Language Picker */}
        <button className="flex items-center gap-1.5 text-xs text-slate-300 bg-black/45 border border-white/10 px-3.5 py-1.8 rounded-lg hover:bg-white/10 transition-colors">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>English</span>
          <span className="text-[8px] text-slate-500 ml-0.5">▼</span>
        </button>
      </header>

      {/* 3. CENTRAL GLASSMORPHIC LOGIN/SIGNUP CARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="w-full max-w-[420px] bg-[#fdfbf7]/85 backdrop-blur-3xl border border-[#d6cfc7] rounded-2xl p-8 md:p-10 shadow-[0_24px_50px_rgba(0,0,0,0.15),0_0_80px_rgba(175,56,43,0.05)] flex flex-col gap-6 font-sans">

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#5c2a25] tracking-tight">
              {isSignUp ? 'Đăng ký' : 'Đăng nhập'}
            </h2>
            <p className="text-sm text-[#7e746b] font-medium whitespace-pre-line">
               {isSignUp ? 'Tạo tài khoản để bắt đầu học tập' : 'Chào mừng bạn quay trở lại Hanora'}
            </p>
          </div>

          {error && (
            <div className="bg-[#af382b]/5 border border-[#af382b]/20 text-[#af382b] rounded-xl p-3.5 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[#af382b] ml-1">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên của bạn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/90 border border-[#e8e2d9] rounded-xl px-4 py-3.5 text-sm text-[#2d2a26] placeholder-[#b8b0a5] focus:outline-none focus:border-[#af382b] focus:ring-1 focus:ring-[#af382b] transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
               <label className="text-[11px] font-black uppercase tracking-widest text-[#af382b] ml-1">Email</label>
                <input
                  type="email"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/90 border border-[#e8e2d9] rounded-xl px-4 py-3.5 text-sm text-[#2d2a26] placeholder-[#b8b0a5] focus:outline-none focus:border-[#af382b] focus:ring-1 focus:ring-[#af382b] transition-all"
                />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#af382b] ml-1">Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/90 border border-[#e8e2d9] rounded-xl px-4 py-3.5 text-sm text-[#2d2a26] placeholder-[#b8b0a5] focus:outline-none focus:border-[#af382b] focus:ring-1 focus:ring-[#af382b] transition-all"
              />
            </div>

            {/* Remember me & Helper links */}
            {!isSignUp && (
              <div className="flex items-center justify-between text-xs text-[#7e746b] pt-1 px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-white border-[#d6cfc7] text-[#af382b] focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    defaultChecked
                  />
                  <span>Ghi nhớ tôi</span>
                </label>
                <button type="button" className="hover:underline hover:text-[#af382b] font-medium transition-colors">Quên mật khẩu?</button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#af382b] hover:bg-[#8c2d22] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white font-black py-4 px-4 rounded-xl text-sm transition-all shadow-xl shadow-[#af382b]/20 mt-4 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#d6cfc7]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a89f95]">Hoặc</span>
            <div className="h-px flex-1 bg-[#d6cfc7]" />
          </div>

          {/* Google Sign-In (rendered by Google Identity Services) */}
          <div className="flex flex-col items-center gap-2">
            <div ref={googleBtnRef} className="flex justify-center min-h-[44px] w-full [&>div]:!w-full" />
            {!googleReady && !googleError && (
              <div className="flex items-center gap-2 text-xs text-[#7e746b]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải Google Sign-In…</span>
              </div>
            )}
            {googleError && (
              <p className="text-[11px] text-[#af382b] text-center">{googleError}</p>
            )}
          </div>

          {/* Toggle switcher at the bottom */}
          <div className="text-center text-xs text-[#7e746b] mt-2">
            <span>
              {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLocalError('');
                clearError();
              }}
              className="text-[#af382b] font-black hover:underline ml-1.5"
            >
              {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. FOOTER CREDITS */}
      <footer className="relative z-10 w-full max-w-7xl px-6 py-5 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <span>© {new Date().getFullYear()} Hanora Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
export default LoginPage;
