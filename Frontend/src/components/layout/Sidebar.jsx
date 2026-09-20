import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  Flame,
  Award,
  Sparkles,
  Mic,
  TrendingUp,
  LayoutDashboard,
  BookMarked,
  Library,
  Crown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useLanguageStore } from '../../store/languageStore';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import logoImg from '../../assets/logo.png';
import { isAllowedHskUser } from '../../utils/constants';

export function Sidebar() {
  const { user } = useAuthStore();
  const { t, language } = useLanguageStore();

  // Safe display helpers — backend users may not have every field.
  const displayName = user?.name || user?.username || user?.email || (language === 'en' ? 'Student' : 'Học viên');
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { to: '/', label: t('nav.home'), icon: LayoutDashboard, end: true },
    { to: '/dashboard', label: t('nav.progress'), icon: TrendingUp },
    { to: '/vocabulary', label: t('nav.vocabulary'), icon: BookMarked },
    { to: '/flashcards', label: t('nav.flashcards'), icon: Layers },
    ...(isAllowedHskUser(user) ? [{ to: '/library', label: t('nav.library'), icon: Library }] : []),
    { to: '/reader', label: t('nav.reader'), icon: BookOpen },
    { to: '/pronunciation', label: t('nav.pronunciation'), icon: Mic },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed top-0 left-0 z-30 overflow-y-auto shadow-[0_8px_30px_rgb(15,23,42,0.02)]">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-center bg-gradient-to-b from-blue-50/70 via-sky-50/30 to-white">
        <NavLink to="/" className="flex items-center justify-center w-full group">
          <img
            src={logoImg}
            className="h-16 sm:h-18 w-auto max-w-[210px] object-contain transition-transform duration-300 group-hover:scale-105"
            alt="Hanora logo"
          />
        </NavLink>
      </div>

      {/* User Stats Card */}
      {user && (
        <NavLink
          to="/profile"
          className="p-4 mx-4 my-6 bg-slate-50/50 hover:bg-blue-55/5 border border-slate-100 hover:border-blue-200/50 rounded-2xl flex flex-col gap-3 transition-all group/card cursor-pointer"
          title={language === 'en' ? "Profile & Settings" : "Trang cá nhân & Thiết lập"}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm group-hover/card:from-blue-600 group-hover/card:to-sky-450 group-hover/card:text-white transition-all duration-300 overflow-hidden">
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
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-slate-800 truncate group-hover/card:text-blue-600 transition-colors">{displayName}</h4>
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                <Award className="w-3 h-3" /> {user.level || 'HSK 1'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2.5 mt-0.5">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">Streak</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                <Flame className="w-4 h-4 fill-orange-500/10" />
                {user.streak ?? 0} {t('common.days')}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">XP</span>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                <Sparkles className="w-3.5 h-3.5 fill-blue-500/10" />
                {user.xp ?? 0}
              </div>
            </div>
          </div>
        </NavLink>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.to === '/pronunciation') {
            return (
              <div
                key={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  useToastStore.getState().addToast(language === 'en' ? 'Feature is currently in development!' : 'Tính năng hiện đang được phát triển!', 'info');
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                  ? 'bg-blue-50/80 text-blue-600 border-l-[3px] border-blue-500 pl-[13px] shadow-sm shadow-blue-500/5'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Pro Upgrade Widget if not Pro */}
      {!user?.isPro && user?.role !== 'Admin' && (
        <div className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 text-white shadow-lg shadow-blue-500/20 text-center relative overflow-hidden">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-xs font-black uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>Nâng Cấp Hanora Pro</span>
          </div>
          <p className="text-[10px] text-blue-100 mb-2.5 leading-snug">
            Mở khóa OCR tài liệu & AI không giới hạn
          </p>
          <NavLink
            to="/payment"
            className="block w-full py-1.5 rounded-xl bg-white text-blue-700 font-extrabold text-xs shadow-sm hover:bg-blue-50 transition-all active:scale-[0.98]"
          >
            Mua gói ngay
          </NavLink>
        </div>
      )}

      {/* Language Switcher in Sidebar */}
      <div className="px-4 py-2 border-t border-slate-100">
        <LanguageSwitcher variant="sidebar" />
      </div>

      {/* Footer / Copyright */}
      <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
        &copy; 2026 Hanora App
      </div>
    </aside>
  );
}
export default Sidebar;
