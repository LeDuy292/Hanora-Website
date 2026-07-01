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
  BookMarked
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import logoImg from '../../assets/logo.png';

export function Sidebar() {
  const { user } = useAuthStore();

  // Safe display helpers — backend users may not have every field.
  const displayName = user?.name || user?.username || user?.email || 'Học viên';
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { to: '/', label: 'Trang chủ', icon: LayoutDashboard, end: true },
    { to: '/dashboard', label: 'Tiến trình', icon: TrendingUp },
    { to: '/vocabulary', label: 'Từ vựng', icon: BookMarked },
    { to: '/flashcards', label: 'Flashcard', icon: Layers },
    { to: '/reader', label: 'Dịch thuật', icon: BookOpen },
    { to: '/pronunciation', label: 'Luyện phát âm', icon: Mic },
    { to: '/leaderboard', label: 'Bảng xếp hạng', icon: Award },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed top-0 left-0 z-30 overflow-y-auto shadow-[0_8px_30px_rgb(15,23,42,0.02)]">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <img
          src={logoImg}
          className="w-9 h-9 object-contain rounded-xl border border-slate-100"
          alt="Hanora logo"
        />
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-wide">Hanora</h1>
          <p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase">Trung Tâm Học Tập</p>
        </div>
      </div>

      {/* User Stats Card */}
      {user && (
        <NavLink
          to="/profile"
          className="p-4 mx-4 my-6 bg-slate-50/50 hover:bg-blue-55/5 border border-slate-100 hover:border-blue-200/50 rounded-2xl flex flex-col gap-3 transition-all group/card cursor-pointer"
          title="Trang cá nhân & Thiết lập"
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
                {user.streak ?? 0} ngày
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">XP points</span>
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
                  useToastStore.getState().addToast('Tính năng hiện đang được phát triển!', 'info');
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

      {/* Footer / Copyright */}
      <div className="p-6 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
        &copy; 2026 Hanora App
      </div>
    </aside>
  );
}
export default Sidebar;
