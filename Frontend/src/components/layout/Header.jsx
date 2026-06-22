import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Flame, Sparkles, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logoImg from '../../assets/logo.png';

export function Header({ offsetTop }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Safe display helpers — backend users may not have every field.
  const displayName = user?.name || user?.username || user?.email || 'Học viên';
  const initial = displayName.charAt(0).toUpperCase();

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
  };

  return (
    <header className={`fixed ${offsetTop ? 'top-10' : 'top-0'} left-0 w-full px-6 md:px-12 h-20 flex items-center justify-between z-50 bg-[#32A0F4]/95 backdrop-blur-md border-b border-white/20 shadow-[0_10px_40px_rgba(50,160,244,0.3)] transition-all duration-300`}>
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <NavLink to="/" className="hover:opacity-90 transition-opacity group">
          <img 
            src={logoImg} 
            className="h-12 md:h-16 w-auto object-contain brightness-0 invert filter transition-transform duration-500 group-hover:scale-105" 
            alt="Hanora logo" 
          />
        </NavLink>
      </div>

      {/* Center: Navigation links list */}
      <nav className="hidden lg:flex items-center gap-10">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative font-bold text-[15px] py-2 transition-all duration-300 group tracking-tight ${
                isActive
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                <span className={`absolute bottom-[-4px] left-0 w-full h-[3px] bg-white rounded-full transition-all duration-300 transform origin-center ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right: Actions / CTA */}
      <div className="flex items-center gap-4 shrink-0">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-5 text-[11px] font-black uppercase tracking-widest text-white/80">
               <div className="flex items-center gap-1.5 text-white">
                <Flame className="w-4 h-4 fill-white/20" />
                <span>{user.streak ?? 0} NGÀY</span>
              </div>
              <div className="flex items-center gap-1.5 text-white">
                <Sparkles className="w-3.5 h-3.5 fill-white/20" />
                <span>{user.xp ?? 0} XP</span>
              </div>
            </div>

            <NavLink
              to="/profile"
              title={displayName}
              className="w-10 h-10 rounded-full bg-white/20 text-white border border-white/30 flex items-center justify-center font-black text-sm hover:bg-white hover:text-[#32A0F4] transition-all shadow-lg overflow-hidden"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initial
              )}
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-1 px-2 text-white/70 hover:text-white transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        ) : (
          <NavLink 
            to="/login"
            className="px-8 py-2.5 text-sm font-black text-[#32A0F4] bg-white hover:bg-slate-50 rounded-lg shadow-xl active:scale-95 transition-all text-center uppercase tracking-widest"
          >
            Đăng nhập
          </NavLink>
        )}

        {/* Mobile menu toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-white hover:text-white/80 transition-colors"
        >
          {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#32A0F4] border-t border-white/20 p-8 flex flex-col gap-5 z-50 lg:hidden shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `font-black text-lg py-1 transition-all ${
                  isActive ? 'text-white border-l-4 border-white pl-4' : 'text-white/70 pl-0'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user && (
            <button 
              onClick={() => { setIsMenuOpen(false); handleLogout(); }}
              className="text-white/90 font-black text-lg text-left mt-4 uppercase tracking-widest border-t border-white/20 pt-4"
            >
              Đăng xuất
            </button>
          )}
        </div>
      )}
    </header>
  );
}
export default Header;

//
