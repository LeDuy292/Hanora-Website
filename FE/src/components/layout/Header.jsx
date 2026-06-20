import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Flame, Sparkles, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logoImg from '../../assets/logo.jpg';

export function Header({ offsetTop }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Trang chủ', end: true },
    { to: '/dashboard', label: 'Tiến trình' },
    { to: '/vocabulary', label: 'Từ vựng' },
    { to: '/flashcards', label: 'Flashcard' },
    { to: '/reader', label: 'Dịch thuật' },
    { to: '/pronunciation', label: 'Luyện phát âm' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`fixed ${offsetTop ? 'top-14' : 'top-4'} left-1/2 -translate-x-1/2 max-w-7xl w-[calc(100%-2rem)] px-6 py-3 flex items-center justify-between z-50 bg-white/80 backdrop-blur-lg rounded-2xl border border-slate-100/80 shadow-[0_8px_30px_rgb(15,23,42,0.04)] transition-all duration-300`}>
      {/* Brand Logo */}
      <NavLink to="/" className="flex items-center gap-3.5 shrink-0 hover:opacity-95 transition-opacity group">
        <img 
          src={logoImg} 
          className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-300" 
          alt="Hanora logo" 
        />
        <div className="hidden sm:block">
          <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-wide font-display leading-tight group-hover:text-blue-600 transition-colors">Hanora</h1>
          <p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase leading-none mt-0.5">Trung Tâm Học Tập</p>
        </div>
      </NavLink>

      {/* Navigation links list */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-50/50 border border-slate-100/80 rounded-xl p-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `font-semibold text-[13px] px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 bg-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-white/50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right Stats & Actions */}
      <div className="flex items-center gap-2 md:gap-3.5 shrink-0">
        {user ? (
          <>
            {/* Streak & XP info */}
            <div className="hidden sm:flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold">
              <div className="flex items-center gap-1 text-orange-500" title="Streak ngày">
                <Flame className="w-4 h-4 fill-orange-500/10 animate-pulse" />
                <span>{user.streak} ngày</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-200"></div>
              <div className="flex items-center gap-1 text-blue-600" title="Điểm kinh nghiệm (XP)">
                <Sparkles className="w-3.5 h-3.5 fill-blue-500/10" />
                <span>{user.xp} XP</span>
              </div>
            </div>

            {/* User Profile avatar info / actions */}
            <div className="flex items-center gap-2">
              <NavLink 
                to="/profile" 
                className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm hover:bg-blue-100 transition-colors"
                title="Trang cá nhân & Thiết lập"
              >
                {user.name.charAt(0)}
              </NavLink>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="Đăng xuất"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </>
        ) : (
          <NavLink 
            to="/login"
            className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl hover:from-blue-500 hover:to-sky-400 shadow-sm active:scale-95 transition-all"
          >
            Đăng nhập
          </NavLink>
        )}

        {/* Mobile menu toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-slate-50 transition-colors"
          title="Menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-slate-100/80 rounded-2xl p-4 shadow-xl flex flex-col gap-2 z-50 animate-scale-in lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `font-semibold text-sm px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between ${
                  isActive
                    ? 'text-blue-600 bg-blue-50/80 border-l-[3px] border-blue-500 pl-[13px]'
                    : 'text-slate-650 hover:text-blue-600 hover:bg-slate-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user && (
            <div className="border-t border-slate-100 pt-3 mt-1 flex items-center justify-end text-xs text-slate-500 font-bold px-2">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors animate-pulse"
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
export default Header;
