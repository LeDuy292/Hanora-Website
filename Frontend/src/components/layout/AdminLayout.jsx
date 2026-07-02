import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Languages,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const adminSections = [
  { id: 'dashboard', label: 'Dashboard tổng quan', icon: BarChart3 },
  { id: 'revenue', label: 'Doanh thu', icon: WalletCards },
  { id: 'users', label: 'Quản lý người dùng', icon: Users },
  { id: 'search', label: 'Thống kê tra cứu từ', icon: TrendingUp },
  { id: 'translations', label: 'Phê duyệt dịch thuật', icon: BookOpenCheck },
];

export function AdminLayout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const displayName = user?.name || user?.username || user?.email || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#181c22] font-sans">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-[#c1c6d6]/70 bg-[#f9f9ff] p-4 shadow-sm md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b74e5] text-lg font-black text-white shadow-sm">
            H
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-black leading-tight tracking-tight text-[#005cb9]">Hanora AI</p>
            <p className="truncate text-xs font-semibold text-[#414753]">Bảng điều khiển Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {adminSections.map((item) => {
            const Icon = item.icon;
            const active = location.hash === `#${item.id}` || (!location.hash && item.id === 'dashboard');
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] ${
                  active
                    ? 'bg-[#d5e0f8] text-[#005cb9]'
                    : 'text-[#414753] hover:bg-[#e6e8f2] hover:text-[#005cb9]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-[#c1c6d6]/70 pt-4">
          <button className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#005cb9] text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]">
            <Sparkles className="h-4 w-4" />
            Tổng hợp dữ liệu
          </button>
          <a className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#414753] transition hover:bg-[#e6e8f2]" href="#settings">
            <Settings className="h-4 w-4" />
            Cài đặt
          </a>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#ba1a1a] transition hover:bg-[#ffdad6]/70"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#c1c6d6]/70 bg-[#f9f9ff]/90 px-4 py-3 backdrop-blur md:ml-[260px] md:h-16 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c1c6d6]/70 bg-white text-[#414753] md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden w-full max-w-md sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717785]" />
              <input
                className="h-10 w-full rounded-xl border border-[#c1c6d6]/60 bg-white/80 pl-10 pr-4 text-sm font-semibold text-[#181c22] outline-none transition focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
                placeholder="Tìm kiếm trong Admin Console..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-[#414753] transition hover:bg-[#ecedf7] hover:text-[#005cb9]">
              <Bell className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-[#414753] transition hover:bg-[#ecedf7] hover:text-[#005cb9]">
              <Languages className="h-5 w-5" />
            </button>
            <NavLink
              to="/dashboard"
              className="hidden h-10 items-center rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-xs font-black text-[#414753] transition hover:bg-[#ecedf7] sm:inline-flex"
            >
              App học viên
            </NavLink>
            <div className="ml-1 hidden h-8 w-px bg-[#c1c6d6] sm:block" />
            <div className="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-[#ecedf7]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d5e0f8] text-sm font-black text-[#005cb9]">
                {initial}
              </div>
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-black text-[#181c22]">{displayName}</p>
                <p className="truncate text-[11px] font-semibold text-[#717785]">{user?.email}</p>
              </div>
              <ShieldCheck className="hidden h-4 w-4 text-[#005cb9] sm:block" />
            </div>
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto md:hidden">
          {adminSections.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black ${
                  location.hash === `#${item.id}` || (!location.hash && item.id === 'dashboard')
                    ? 'border-[#abc7ff] bg-[#d5e0f8] text-[#005cb9]'
                    : 'border-[#c1c6d6]/70 bg-white text-[#414753]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      <main className="md:ml-[260px]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
