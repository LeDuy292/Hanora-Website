import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  LayoutDashboard,
  TrendingUp,
  UserRound
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Trang chủ', icon: LayoutDashboard, end: true },
  { to: '/reader', label: 'Dịch thuật', icon: BookOpen },
  { to: '/flashcards', label: 'Flashcard', icon: Layers },
  { to: '/dashboard', label: 'Tiến trình', icon: TrendingUp },
  { to: '/profile', label: 'Cá nhân', icon: UserRound }
];

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl xl:hidden"
      aria-label="Điều hướng chính trên mobile"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2.4} />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
