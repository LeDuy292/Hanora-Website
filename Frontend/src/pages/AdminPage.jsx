import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Languages,
  Loader2,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Unlock,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '../services/adminService';
import { toast } from '../store/notificationStore';

const BLUE = '#0b74e5';
const NAVY = '#005cb9';
const SURFACE = 'bg-[#f9f9ff]';
const CARD = 'rounded-2xl border border-[#c1c6d6]/60 bg-white shadow-sm';

const STATUS_STYLES = {
  Admin: 'bg-[#d5e0f8] text-[#005cb9] border-[#abc7ff]',
  User: 'bg-[#f2f3fd] text-[#414753] border-[#c1c6d6]',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Locked: 'bg-red-50 text-red-700 border-red-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS = {
  Admin: 'Admin',
  User: 'Học viên',
  Active: 'Hoạt động',
  Locked: 'Đã khóa',
  Pending: 'Chờ duyệt',
  Completed: 'Hoàn tất',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

function getScreenFromHash() {
  const id = window.location.hash.replace('#', '');
  return ['dashboard', 'revenue', 'users', 'search', 'translations'].includes(id) ? id : 'dashboard';
}

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(value ?? 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] || 'bg-[#f2f3fd] text-[#414753] border-[#c1c6d6]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {STATUS_LABELS[value] || value}
    </span>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#005cb9]">{eyebrow}</p>
        <h1 className="text-2xl font-black tracking-tight text-[#181c22] sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#414753]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, delta, icon: Icon, tone = 'blue' }) {
  const positive = !String(delta || '').includes('-');
  const toneClass = tone === 'red'
    ? 'bg-red-50 text-red-700'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-[#d7e3ff] text-[#005cb9]';

  return (
    <div className={`${CARD} group relative overflow-hidden p-6 transition hover:shadow-md`}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#d7e3ff]/50 opacity-60 transition duration-700 group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#717785]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#181c22]">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`${CARD} p-6 ${className}`}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#181c22]">{title}</h2>
          {subtitle && <p className="mt-1 text-xs font-semibold text-[#717785]">{subtitle}</p>}
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#414753] transition hover:bg-[#ecedf7]">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[52vh] items-center justify-center">
      <div className={`${CARD} flex items-center gap-3 px-5 py-4 text-sm font-black text-[#414753]`}>
        <Loader2 className="h-5 w-5 animate-spin text-[#005cb9]" />
        Đang tải dữ liệu Admin
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title }) {
  return (
    <div className={`${CARD} p-10 text-center`}>
      <Icon className="mx-auto h-9 w-9 text-[#717785]" />
      <p className="mt-3 text-sm font-black text-[#414753]">{title}</p>
    </div>
  );
}

export function AdminPage() {
  const [screen, setScreen] = useState(getScreenFromHash);
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [usersData, setUsersData] = useState({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, activeTotal: 0, lockedTotal: 0, adminTotal: 0 });
  const [searchStats, setSearchStats] = useState(null);
  const [translations, setTranslations] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [translationKind, setTranslationKind] = useState('all');
  const [translationStatus, setTranslationStatus] = useState('Pending');
  const [translationWarning, setTranslationWarning] = useState('all');
  const [translationDateFrom, setTranslationDateFrom] = useState('');
  const [translationDateTo, setTranslationDateTo] = useState('');
  const [translationQuery, setTranslationQuery] = useState('');
  const [translationPage, setTranslationPage] = useState(1);
  const [translationPageSize, setTranslationPageSize] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onHashChange = () => setScreen(getScreenFromHash());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.history.replaceState(null, '', '#dashboard');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const loadOverview = useCallback(async () => {
    const data = await adminApi.overview();
    setOverview(data);
  }, []);

  const loadScreen = useCallback(async () => {
    setLoading(true);
    try {
      if (!overview) await loadOverview();
      if (screen === 'revenue') setRevenue(await adminApi.revenue());
      if (screen === 'users') {
        const res = await adminApi.users({
          q: query,
          role: userRoleFilter,
          status: statusFilter,
          page: userPage,
          pageSize: userPageSize,
        });
        setUsersData(res || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, activeTotal: 0, lockedTotal: 0, adminTotal: 0 });
      }
      if (screen === 'search') setSearchStats(await adminApi.searchStats());
      if (screen === 'translations') {
        setTranslations(await adminApi.translationApprovals({
          kind: translationKind,
          status: translationStatus,
          warningType: translationWarning,
          dateFrom: translationDateFrom,
          dateTo: translationDateTo,
          q: translationQuery,
          page: translationPage,
          pageSize: translationPageSize,
        }));
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu Admin.');
    } finally {
      setLoading(false);
    }
  }, [loadOverview, overview, query, screen, statusFilter, userPage, userPageSize, userRoleFilter, translationDateFrom, translationDateTo, translationKind, translationPage, translationPageSize, translationQuery, translationStatus, translationWarning]);

  useEffect(() => {
    const timer = setTimeout(loadScreen, 150);
    return () => clearTimeout(timer);
  }, [loadScreen]);

  const refresh = async () => {
    setOverview(null);
    await loadScreen();
    toast.success('Đã làm mới dữ liệu Admin.');
  };

  const updateUser = async (user, payload) => {
    try {
      await adminApi.updateUser(user.id, payload);
      const res = await adminApi.users({
        q: query,
        role: userRoleFilter,
        status: statusFilter,
        page: userPage,
        pageSize: userPageSize,
      });
      setUsersData(res || { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1, activeTotal: 0, lockedTotal: 0, adminTotal: 0 });
      await loadOverview();
      toast.success('Đã cập nhật người dùng.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật người dùng.');
    }
  };

  const handleExportCsv = async () => {
    try {
      toast.info('Đang chuẩn bị file CSV người dùng...');
      const allUsersRes = await adminApi.users({
        q: query,
        role: userRoleFilter,
        status: statusFilter,
        page: 1,
        pageSize: 1000,
      });
      const items = allUsersRes?.items || [];
      if (!items.length) {
        toast.warning('Không có dữ liệu người dùng để xuất.');
        return;
      }
      const headers = ['ID', 'Tên hiển thị', 'Tên đăng nhập', 'Email', 'Vai trò', 'Trạng thái', 'Tổng XP', 'Chuỗi ngày (Streak)', 'Thời gian học (phút)', 'Số tài liệu', 'Số từ đã lưu', 'Ngày tham gia'];
      const csvRows = [
        headers.join(','),
        ...items.map((u) => [
          u.id,
          `"${(u.displayName || '').replace(/"/g, '""')}"`,
          `"${(u.username || '').replace(/"/g, '""')}"`,
          `"${(u.email || '').replace(/"/g, '""')}"`,
          `"${u.role || 'User'}"`,
          `"${u.isActive ? 'Hoạt động' : 'Bị khóa'}"`,
          u.totalXp || 0,
          u.currentStreakDays || 0,
          u.totalStudyMinutes || 0,
          u.documentCount || 0,
          u.vocabularyCount || 0,
          `"${formatDate(u.createdAt)}"`
        ].join(','))
      ];
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hanora_NguoiDung_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất thành công ${items.length} người dùng ra file CSV!`);
    } catch (err) {
      toast.error(err.message || 'Lỗi khi xuất file CSV.');
    }
  };

  const updateTranslation = async (item, status, translation, adminNote) => {
    try {
      await adminApi.updateTranslationApproval(item.id, { kind: item.kind, status, translation, adminNote });
      setTranslations(await adminApi.translationApprovals({
        kind: translationKind,
        status: translationStatus,
        warningType: translationWarning,
        dateFrom: translationDateFrom,
        dateTo: translationDateTo,
        q: translationQuery,
        page: translationPage,
        pageSize: translationPageSize,
      }));
      await loadOverview();
      toast.success(status === 'Rejected' ? 'Đã từ chối bản dịch.' : 'Đã lưu kết quả kiểm duyệt.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật phê duyệt.');
    }
  };

  const handleBatchApprove = async () => {
    try {
      const pendingIds = (translations?.items || []).filter((i) => i.status === 'Pending').map((i) => i.id);
      if (!pendingIds.length) {
        toast.info('Không có bản dịch nào đang chờ duyệt trên trang này.');
        return;
      }
      const res = await adminApi.batchApproveTranslations(pendingIds);
      setTranslations(await adminApi.translationApprovals({
        kind: translationKind,
        status: translationStatus,
        warningType: translationWarning,
        dateFrom: translationDateFrom,
        dateTo: translationDateTo,
        q: translationQuery,
        page: translationPage,
        pageSize: translationPageSize,
      }));
      await loadOverview();
      toast.success(`Đã phê duyệt thành công ${res.approvedCount || pendingIds.length} bản dịch!`);
    } catch (err) {
      toast.error(err.message || 'Không thể phê duyệt hàng loạt.');
    }
  };

  if (loading && !overview) return <LoadingState />;

  return (
    <div className={`${SURFACE} min-h-[calc(100vh-112px)]`}>
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {screen === 'dashboard' && <DashboardScreen overview={overview} loading={loading} onRefresh={refresh} />}
      {screen === 'revenue' && <RevenueScreen revenue={revenue} loading={loading} />}
      {screen === 'users' && (
        <UsersScreen
          data={usersData}
          query={query}
          setQuery={(val) => {
            setQuery(val);
            setUserPage(1);
          }}
          roleFilter={userRoleFilter}
          setRoleFilter={(val) => {
            setUserRoleFilter(val);
            setUserPage(1);
          }}
          statusFilter={statusFilter}
          setStatusFilter={(val) => {
            setStatusFilter(val);
            setUserPage(1);
          }}
          page={userPage}
          setPage={setUserPage}
          pageSize={userPageSize}
          setPageSize={(val) => {
            setUserPageSize(val);
            setUserPage(1);
          }}
          loading={loading}
          onUpdate={updateUser}
          onExportCsv={handleExportCsv}
        />
      )}
      {screen === 'search' && <SearchStatsScreen data={searchStats} loading={loading} />}
      {screen === 'translations' && (
        <TranslationsScreen
          items={translations}
          kind={translationKind}
          status={translationStatus}
          warning={translationWarning}
          dateFrom={translationDateFrom}
          dateTo={translationDateTo}
          query={translationQuery}
          page={translationPage}
          pageSize={translationPageSize}
          setKind={(value) => {
            setTranslationKind(value);
            setTranslationPage(1);
          }}
          setStatus={(value) => {
            setTranslationStatus(value);
            setTranslationPage(1);
          }}
          setWarning={(value) => {
            setTranslationWarning(value);
            setTranslationPage(1);
          }}
          setDateFrom={(value) => {
            setTranslationDateFrom(value);
            setTranslationPage(1);
          }}
          setDateTo={(value) => {
            setTranslationDateTo(value);
            setTranslationPage(1);
          }}
          setQuery={(value) => {
            setTranslationQuery(value);
            setTranslationPage(1);
          }}
          setPage={setTranslationPage}
          setPageSize={(value) => {
            setTranslationPageSize(value);
            setTranslationPage(1);
          }}
          loading={loading}
          onUpdate={updateTranslation}
          onBatchApprove={handleBatchApprove}
        />
      )}
    </div>
  );
}

function CustomChartTooltip({ active, payload, label, unit = 'học viên', subtitle = '' }) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Clock className="h-3.5 w-3.5 text-blue-600" />
        <span>Ngày {label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-black text-slate-900">{formatNumber(value)}</span>
        <span className="text-xs font-bold text-blue-600">{unit}</span>
      </div>
      {subtitle && <p className="mt-1 text-[11px] font-semibold text-slate-400">{subtitle}</p>}
    </div>
  );
}

function DashboardScreen({ overview, loading, onRefresh }) {
  const stats = overview?.stats || {};
  const rawActiveTrend = overview?.activeUserTrend || [];
  const rawNewUserTrend = overview?.newUserTrend || [];

  const [activeRange, setActiveRange] = useState('30'); // '7' | '14' | '30'
  const [newRange, setNewRange] = useState('30');

  const activeTrend = useMemo(() => {
    const count = parseInt(activeRange, 10);
    return rawActiveTrend.slice(-count);
  }, [rawActiveTrend, activeRange]);

  const newUserTrend = useMemo(() => {
    const count = parseInt(newRange, 10);
    return rawNewUserTrend.slice(-count);
  }, [rawNewUserTrend, newRange]);

  const activeStats = useMemo(() => {
    if (!activeTrend.length) return { latest: 0, peak: 0, peakDate: '--' };
    const latest = activeTrend[activeTrend.length - 1]?.value || 0;
    let peak = 0;
    let peakDate = '--';
    activeTrend.forEach((item) => {
      if (item.value > peak) {
        peak = item.value;
        peakDate = item.label;
      }
    });
    return { latest, peak, peakDate };
  }, [activeTrend]);

  const newStats = useMemo(() => {
    if (!newUserTrend.length) return { sum: 0, avg: 0 };
    const sum = newUserTrend.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const avg = (sum / newUserTrend.length).toFixed(1);
    return { sum, avg };
  }, [newUserTrend]);

  return (
    <section id="dashboard">
      <PageTitle
        eyebrow="Hanora AI Dashboard"
        title="Tổng quan hệ thống"
        description="Số liệu hiệu suất, người dùng, tài liệu và chỉ số tăng trưởng học viên theo thời gian thực."
        action={
          <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Tổng người dùng" value={formatNumber(stats.totalUsers)} icon={Users} />
        <MetricCard label="Người dùng hoạt động" value={formatNumber(stats.activeUsers)} icon={ShieldCheck} />
        <MetricCard label="Tài liệu mới" value={formatNumber(stats.documents7d)} icon={FileText} />
        <MetricCard label="Tổng từ vựng" value={formatNumber(stats.totalVocabulary)} icon={BookOpenCheck} />
        <MetricCard label="Tổng XP tích lũy" value={formatNumber(stats.totalXp)} icon={TrendingUp} />
        <MetricCard label="Chờ xử lý" value={formatNumber(stats.pendingReports)} icon={AlertTriangle} tone={stats.pendingReports > 0 ? 'red' : 'blue'} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Active Users Trend Chart */}
        <div className={`${CARD} flex flex-col p-6 transition hover:shadow-md`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                <h2 className="text-lg font-black text-[#181c22]">Xu hướng người dùng hoạt động</h2>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#717785]">Lượt học tập, đọc sách & làm Quiz mỗi ngày</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              {['7', '14', '30'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRange(r)}
                  className={`rounded-lg px-2.5 py-1 font-black transition ${
                    activeRange === r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-blue-100/80 bg-blue-50/40 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Hôm nay:</span>
              <span className="text-sm font-black text-blue-700">{formatNumber(activeStats.latest)} học viên</span>
            </div>
            <div className="h-3.5 w-[1px] bg-blue-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Đỉnh kỳ:</span>
              <span className="text-sm font-black text-slate-800">{formatNumber(activeStats.peak)} ({activeStats.peakDate})</span>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activeUsersGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#005cb9" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomChartTooltip unit="người hoạt động" subtitle="Học viên luyện tập & đọc tài liệu" />} />
                <Area
                  dataKey="value"
                  stroke="#005cb9"
                  strokeWidth={3}
                  fill="url(#activeUsersGradient)"
                  type="monotone"
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 3, fill: '#005cb9' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily New Users Bar Chart */}
        <div className={`${CARD} flex flex-col p-6 transition hover:shadow-md`}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <h2 className="text-lg font-black text-[#181c22]">Người dùng mới hằng ngày</h2>
              </div>
              <p className="mt-1 text-xs font-semibold text-[#717785]">Tài khoản đăng ký mới theo mốc thời gian</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              {['7', '14', '30'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRange(r)}
                  className={`rounded-lg px-2.5 py-1 font-black transition ${
                    newRange === r ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r} ngày
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-emerald-100/80 bg-emerald-50/40 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Tổng đăng ký:</span>
              <span className="text-sm font-black text-emerald-700">+{formatNumber(newStats.sum)} tài khoản</span>
            </div>
            <div className="h-3.5 w-[1px] bg-emerald-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Trung bình:</span>
              <span className="text-sm font-black text-slate-800">{newStats.avg} người/ngày</span>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={newUserTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="newUserBarGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0b74e5" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomChartTooltip unit="đăng ký mới" subtitle="Tài khoản gia nhập hệ thống" />} />
                <Bar dataKey="value" fill="url(#newUserBarGradient)" radius={[6, 6, 2, 2]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MiniList title="Top học viên xuất sắc" rows={(overview?.topUsers || []).map((u) => ({
          title: u.displayName || u.username,
          subtitle: u.email,
          value: `${formatNumber(u.totalXp)} XP`,
        }))} />
        <MiniList title="Tài liệu gần đây" rows={(overview?.recentDocuments || []).map((d) => ({
          title: d.title,
          subtitle: d.ownerEmail,
          value: d.status,
        }))} />
      </div>
    </section>
  );
}

function RevenueScreen({ revenue, loading }) {
  if (loading && !revenue) return <LoadingState />;
  if (!revenue) {
    return (
      <section id="revenue">
        <PageTitle
          eyebrow="Revenue"
          title="Doanh thu"
          description="Tong hop doanh thu quy doi tu hoat dong nguoi dung va tai lieu trong database hien tai."
          action={<button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753]"><Download className="h-4 w-4" />Xuat bao cao</button>}
        />
        <EmptyState icon={WalletCards} title="Chua tai duoc du lieu doanh thu." />
      </section>
    );
  }
  const summary = revenue?.summary || {};
  const planSegments = revenue?.planSegments || [];

  return (
    <section id="revenue">
      <PageTitle
        eyebrow="Revenue"
        title="Doanh thu"
        description="Tổng hợp doanh thu quy đổi từ hoạt động người dùng và tài liệu trong database hiện tại."
        action={<button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753]"><Download className="h-4 w-4" />Xuất báo cáo</button>}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Hôm nay" value={formatMoney(summary.today)} delta="+ realtime" icon={Clock} />
        <MetricCard label="Tuần này" value={formatMoney(summary.thisWeek)} delta="+ từ DB" icon={TrendingUp} />
        <MetricCard label="Tháng này" value={formatMoney(summary.thisMonth)} delta="+ quy đổi" icon={WalletCards} />
        <MetricCard label="Tổng đơn" value={formatNumber(summary.totalOrders)} delta="users + docs" icon={FileText} />
        <MetricCard label="Giá trị TB" value={formatMoney(summary.averageOrderValue)} delta="- ước tính" icon={ArrowDownRight} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Doanh thu hằng ngày" subtitle="14 ngày gần nhất" className="lg:col-span-2">
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={revenue?.dailyRevenue || []}>
                <CartesianGrid stroke="#e0e2ec" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ borderRadius: 12, borderColor: '#c1c6d6' }} />
                <Line dataKey="value" stroke={BLUE} strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: BLUE, strokeWidth: 2 }} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Gói sử dụng" subtitle="Phân bổ theo hoạt động DB">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={planSegments} dataKey="value" innerRadius={78} outerRadius={105} paddingAngle={4}>
                  {planSegments.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {planSegments.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2 text-[#414753]"><span className="h-3 w-3 rounded-full" style={{ background: item.color }} />{item.label}</span>
                <span>{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Xu hướng doanh thu tháng" subtitle="12 tháng trong năm">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={revenue?.monthlyRevenue || []}>
              <CartesianGrid stroke="#e0e2ec" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="value" fill={NAVY} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <TransactionsTable rows={revenue?.recentTransactions || []} />
    </section>
  );
}

function UsersScreen({
  data,
  query,
  setQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  pageSize,
  setPageSize,
  loading,
  onUpdate,
  onExportCsv,
}) {
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const activeTotal = data?.activeTotal || 0;
  const lockedTotal = data?.lockedTotal || 0;
  const adminTotal = data?.adminTotal || 0;

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  // Generate page numbers array with ellipses
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <section id="users">
      <PageTitle
        eyebrow="User Management"
        title="Quản lý người dùng"
        description="Quản lý quyền truy cập, theo dõi mức độ sử dụng, phân trang và xuất dữ liệu học viên."
      />

      {/* Summary KPI Badges */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          onClick={() => {
            setStatusFilter('All');
            setRoleFilter('All');
          }}
          className={`cursor-pointer rounded-2xl border p-3.5 transition ${
            statusFilter === 'All' && roleFilter === 'All'
              ? 'border-[#005cb9] bg-[#d5e0f8]/30'
              : 'border-[#c1c6d6]/40 bg-white hover:border-[#005cb9]/50'
          }`}
        >
          <p className="text-xs font-bold text-[#717785]">Tất cả người dùng</p>
          <p className="mt-1 text-xl font-black text-[#181c22]">{formatNumber(total)}</p>
        </div>
        <div
          onClick={() => {
            setStatusFilter('Active');
            setRoleFilter('All');
          }}
          className={`cursor-pointer rounded-2xl border p-3.5 transition ${
            statusFilter === 'Active' && roleFilter === 'All'
              ? 'border-emerald-600 bg-emerald-50'
              : 'border-[#c1c6d6]/40 bg-white hover:border-emerald-500/50'
          }`}
        >
          <p className="text-xs font-bold text-emerald-700">Đang hoạt động</p>
          <p className="mt-1 text-xl font-black text-emerald-800">{formatNumber(activeTotal)}</p>
        </div>
        <div
          onClick={() => {
            setStatusFilter('Locked');
            setRoleFilter('All');
          }}
          className={`cursor-pointer rounded-2xl border p-3.5 transition ${
            statusFilter === 'Locked'
              ? 'border-rose-600 bg-rose-50'
              : 'border-[#c1c6d6]/40 bg-white hover:border-rose-500/50'
          }`}
        >
          <p className="text-xs font-bold text-rose-700">Tài khoản bị khóa</p>
          <p className="mt-1 text-xl font-black text-rose-800">{formatNumber(lockedTotal)}</p>
        </div>
        <div
          onClick={() => {
            setRoleFilter('Admin');
            setStatusFilter('All');
          }}
          className={`cursor-pointer rounded-2xl border p-3.5 transition ${
            roleFilter === 'Admin'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-[#c1c6d6]/40 bg-white hover:border-indigo-500/50'
          }`}
        >
          <p className="text-xs font-bold text-indigo-700">Quản trị viên (Admin)</p>
          <p className="mt-1 text-xl font-black text-indigo-800">{formatNumber(adminTotal)}</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className={`${CARD} mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between`}>
        <label className="relative block w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717785]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c1c6d6]/70 bg-[#f2f3fd] pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            placeholder="Tìm theo tên, email, username..."
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] focus:border-[#0b74e5] focus:outline-none"
          >
            <option value="All">Tất cả vai trò</option>
            <option value="User">User (Học viên)</option>
            <option value="Admin">Admin (Quản trị)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] focus:border-[#0b74e5] focus:outline-none"
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Locked">Đã khóa</option>
          </select>

          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] focus:border-[#0b74e5] focus:outline-none"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>

          <button
            onClick={onExportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#005cb9] bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#004a96] active:scale-95"
            title="Tải danh sách người dùng ra định dạng CSV UTF-8"
          >
            <Download className="h-4 w-4" />
            Xuất CSV
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="Không tìm thấy người dùng phù hợp với bộ lọc." />
      ) : (
        <div className={`${CARD} overflow-hidden shadow-sm`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-[#c1c6d6]/60 bg-[#f2f3fd] text-xs uppercase tracking-wider text-[#414753]">
                <tr>
                  <th className="px-6 py-4 font-black">Học viên</th>
                  <th className="px-6 py-4 font-black">Email</th>
                  <th className="px-6 py-4 font-black">Vai trò</th>
                  <th className="px-6 py-4 font-black">Tiến độ & Học tập</th>
                  <th className="px-6 py-4 font-black">Ngày tham gia</th>
                  <th className="px-6 py-4 font-black">Trạng thái</th>
                  <th className="px-6 py-4 text-center font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c1c6d6]/30 bg-white">
                {items.map((user) => (
                  <tr key={user.id} className={`group transition hover:bg-[#f2f3fd]/70 ${!user.isActive ? 'bg-red-50/40' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d5e0f8] text-sm font-black text-[#005cb9]">
                          {(user.displayName || user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-[#181c22] group-hover:text-[#005cb9]">{user.displayName || user.username}</p>
                          <p className="text-xs text-[#717785]">@{user.username} • ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#414753]">{user.email}</td>
                    <td className="px-6 py-4"><StatusBadge value={user.role} /></td>
                    <td className="px-6 py-4 text-sm font-bold text-[#414753]">
                      <span className="text-[#005cb9]">{formatNumber(user.totalXp)} XP</span>
                      <div className="flex items-center gap-2 text-xs font-medium text-[#717785]">
                        <span>🔥 {user.currentStreakDays} ngày</span>
                        <span>•</span>
                        <span>📚 {user.documentCount} tài liệu</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#414753]">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4"><StatusBadge value={user.isActive ? 'Active' : 'Locked'} /></td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onUpdate(user, { role: user.role === 'Admin' ? 'User' : 'Admin' })}
                          title={user.role === 'Admin' ? 'Chuyển sang User thường' : 'Cấp quyền Quản trị (Admin)'}
                          className="rounded-xl p-2 text-[#414753] transition hover:bg-[#ecedf7] hover:text-[#005cb9]"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onUpdate(user, { isActive: !user.isActive })}
                          title={user.isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                          className={`rounded-xl p-2 transition ${user.isActive ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                        >
                          {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#c1c6d6]/50 bg-[#f9f9ff] px-6 py-4 sm:flex-row">
            <p className="text-sm font-bold text-[#717785]">
              Hiển thị <span className="text-[#181c22]">{startRecord} - {endRecord}</span> trong tổng số{' '}
              <span className="text-[#181c22]">{formatNumber(total)}</span> người dùng
            </p>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-xs font-black text-[#414753] transition hover:bg-[#ecedf7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 text-xs font-bold text-[#717785]">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={`page-${p}`}
                      onClick={() => setPage(p)}
                      className={`h-9 min-w-[36px] rounded-xl px-2 text-xs font-black transition ${
                        isCurrent
                          ? 'bg-[#005cb9] text-white shadow-sm'
                          : 'border border-[#c1c6d6]/60 bg-white text-[#414753] hover:bg-[#ecedf7]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-xs font-black text-[#414753] transition hover:bg-[#ecedf7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SearchStatsScreen({ data, loading }) {
  if (loading && !data) return <LoadingState />;
  const summary = data?.summary || {};

  return (
    <section id="search">
      <PageTitle
        eyebrow="Search Analytics"
        title="Thống kê tra cứu từ"
        description="Phân tích dữ liệu tra cứu, từ được lưu và người dùng học từ vựng tích cực."
        action={<button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753]">7 ngày gần nhất</button>}
      />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <MetricCard label="Tổng lượt tra cứu" value={formatNumber(summary.totalLookups)} icon={Search} />
        <MetricCard label="Lượt tra hôm nay" value={formatNumber(summary.todayLookups)} icon={Clock} />
        <MetricCard label="Người dùng đang học từ" value={formatNumber(summary.activeUsers)} icon={Users} />
      </div>

      <div className="mb-8">
        <ChartCard title="Xu hướng tra cứu từ vựng" subtitle="14 ngày gần nhất">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={data?.dailyLookups || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="lookupGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#005cb9" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip content={<CustomChartTooltip unit="lượt tra cứu" subtitle="Từ vựng được tìm kiếm & lưu" />} />
                <Area dataKey="value" stroke="#005cb9" strokeWidth={3} fill="url(#lookupGradient)" type="monotone" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#005cb9' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MiniList title="Top từ tra cứu nhiều nhất" rows={(data?.topWords || []).map((w) => ({ title: w.word, subtitle: w.pinyin, value: formatNumber(w.lookupCount) }))} />
        <MiniList title="Người dùng tích cực" rows={(data?.topUsers || []).map((u) => ({ title: u.name, subtitle: u.email, value: formatNumber(u.lookupCount) }))} />
      </div>
    </section>
  );
}

function TranslationsScreen({
  items,
  kind,
  status,
  warning,
  dateFrom,
  dateTo,
  query,
  page,
  pageSize,
  setKind,
  setStatus,
  setWarning,
  setDateFrom,
  setDateTo,
  setQuery,
  setPage,
  setPageSize,
  loading,
  onUpdate,
  onBatchApprove,
}) {
  const pageData = items || {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    vocabularyTotal: 0,
    sentenceTotal: 0,
    pendingTotal: 0,
    approvedTotal: 0,
    rejectedTotal: 0,
    correctedTotal: 0,
  };
  const rows = pageData.items || [];
  const typeOptions = [
    { value: 'all', label: 'Tất cả', count: pageData.total },
    { value: 'vocabulary', label: 'Từ vựng', count: pageData.vocabularyTotal },
    { value: 'sentence', label: 'Câu ví dụ', count: pageData.sentenceTotal },
  ];
  const statusOptions = [
    { value: 'all', label: 'Mọi trạng thái', count: pageData.total },
    { value: 'Pending', label: 'Chờ duyệt', count: pageData.pendingTotal },
    { value: 'Approved', label: 'Đã duyệt', count: pageData.approvedTotal },
    { value: 'Corrected', label: 'Đã chỉnh sửa', count: pageData.correctedTotal },
    { value: 'Rejected', label: 'Từ chối', count: pageData.rejectedTotal },
  ];
  const warningOptions = [
    { value: 'all', label: 'Mọi cảnh báo' },
    { value: 'low_confidence', label: 'AI confidence thấp' },
    { value: 'idiom', label: 'Thành ngữ' },
    { value: 'specialized_term', label: 'Thuật ngữ' },
    { value: 'new_word', label: 'Từ mới' },
    { value: 'user_reported', label: 'User báo cáo' },
    { value: 'inconsistent_ai', label: 'AI không nhất quán' },
    { value: 'abnormal_content', label: 'Nội dung bất thường' },
    { value: 'missing_vi_translation', label: 'Thiếu bản dịch VI' },
  ];
  const start = pageData.total === 0 ? 0 : (pageData.page - 1) * pageData.pageSize + 1;
  const end = Math.min(pageData.page * pageData.pageSize, pageData.total);

  return (
    <section id="translations">
      <PageTitle
        eyebrow="Translation Approval"
        title="Phê duyệt dịch thuật"
        description="Xem xét các từ/câu đang thiếu bản dịch tiếng Việt và phê duyệt nội dung để đưa vào kho học liệu."
        action={
          <button
            onClick={onBatchApprove}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Phê duyệt trang này
          </button>
        }
      />

      <div className={`${CARD} mb-5 p-4`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                  kind === option.value
                    ? 'border-[#abc7ff] bg-[#d5e0f8] text-[#005cb9]'
                    : 'border-[#c1c6d6]/70 bg-white text-[#414753] hover:bg-[#ecedf7]'
                }`}
              >
                {option.value === 'sentence' ? <Languages className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}
                {option.label}
                <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs">{formatNumber(option.count)}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717785]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#c1c6d6]/70 bg-[#f2f3fd] pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
                placeholder="Tìm từ, pinyin, nghĩa, câu..."
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label} ({formatNumber(option.count)})</option>
              ))}
            </select>
            <select
              value={warning}
              onChange={(event) => setWarning(event.target.value)}
              className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            >
              {warningOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
              aria-label="Lọc từ ngày"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
              aria-label="Lọc đến ngày"
            />
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            >
              <option value={5}>5 / trang</option>
              <option value={8}>8 / trang</option>
              <option value={12}>12 / trang</option>
              <option value={20}>20 / trang</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState icon={Languages} title="Không có bản dịch nào cần phê duyệt." /> : (
        <>
          <div className="mb-4 flex flex-col gap-2 text-sm font-bold text-[#414753] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Hiển thị {formatNumber(start)}-{formatNumber(end)} trong {formatNumber(pageData.total)} mục cần duyệt
            </span>
            <span className="text-xs uppercase tracking-wider text-[#717785]">
              Trang {formatNumber(pageData.page)} / {formatNumber(pageData.totalPages)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {rows.map((item) => (
              <TranslationCard key={`${item.kind}-${item.id}`} item={item} onUpdate={onUpdate} />
            ))}
          </div>

          <div className={`${CARD} mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
            <p className="text-sm font-bold text-[#414753]">
              {formatNumber(pageData.total)} mục, chia thành {formatNumber(pageData.totalPages)} trang
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={pageData.page <= 1}
                onClick={() => setPage(Math.max(1, pageData.page - 1))}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-black text-[#414753] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                type="button"
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setPage(Math.min(pageData.totalPages, pageData.page + 1))}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function TranslationCard({ item, onUpdate }) {
  const [translation, setTranslation] = useState(item.userSuggestion || '');
  const [adminNote, setAdminNote] = useState(item.note || '');
  const warningLabel = {
    low_confidence: 'AI confidence thấp',
    idiom: 'Thành ngữ',
    specialized_term: 'Thuật ngữ',
    new_word: 'Từ mới',
    user_reported: 'User báo cáo',
    inconsistent_ai: 'AI không nhất quán',
    abnormal_content: 'Nội dung bất thường',
    missing_vi_translation: 'Thiếu bản dịch VI',
  }[item.warningType] || item.warningType;

  return (
    <article className={`${CARD} flex h-full flex-col p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#414753]">
          <span className="rounded-lg border border-[#c1c6d6]/70 bg-[#ecedf7] px-2.5 py-1">{item.sourceLanguage} -&gt; {item.targetLanguage}</span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">{warningLabel}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(item.createdAt)}</span>
        </div>
        <StatusBadge value={item.status} />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-xs font-black text-[#414753]">
        <div className="rounded-xl bg-[#f2f3fd] p-3">
          <p className="text-[#717785]">Confidence</p>
          <p className="mt-1 text-base text-[#181c22]">{item.confidenceScore != null ? `${Math.round(item.confidenceScore * 100)}%` : '--'}</p>
        </div>
        <div className="rounded-xl bg-[#f2f3fd] p-3">
          <p className="text-[#717785]">Báo cáo</p>
          <p className="mt-1 text-base text-[#181c22]">{formatNumber(item.reportCount || 0)}</p>
        </div>
        <div className="rounded-xl bg-[#f2f3fd] p-3">
          <p className="text-[#717785]">Ưu tiên</p>
          <p className="mt-1 text-base text-[#181c22]">{formatNumber(item.priority || 0)}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#717785]">Nguồn</p>
        <p className="text-base font-black leading-7 text-[#181c22]">{item.sourceText}</p>
        {(item.pinyin || item.wordType) && (
          <p className="mt-2 text-xs font-bold text-[#717785]">{item.pinyin || 'Không có pinyin'} · {item.wordType || 'Chưa phân loại'}</p>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4">
        <div className="rounded-xl border border-[#c1c6d6]/60 bg-[#ecedf7] p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#717785]">Bản dịch hiện tại</p>
          <p className="text-sm font-semibold leading-6 text-[#181c22]">{item.aiTranslation || 'Chưa có dữ liệu'}</p>
        </div>
        <label className="rounded-xl border border-[#0b74e5]/30 bg-[#d7e3ff]/25 p-4">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#005cb9]">Bản dịch Admin xác nhận</span>
          <textarea
            value={translation}
            onChange={(event) => setTranslation(event.target.value)}
            className="h-24 w-full resize-none rounded-lg border border-transparent bg-transparent p-2 text-sm font-semibold leading-6 text-[#181c22] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            placeholder="Nhập bản dịch chuẩn..."
          />
        </label>
        <label className="rounded-xl border border-[#c1c6d6]/50 bg-white p-4">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#717785]">Ghi chú kiểm duyệt</span>
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            className="h-20 w-full resize-none rounded-lg border border-[#c1c6d6]/50 bg-[#f9f9ff] p-2 text-sm font-semibold leading-6 text-[#181c22] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            placeholder="Lý do chỉnh sửa hoặc từ chối..."
          />
        </label>
      </div>

      {item.aiExplanation && (
        <div className="mt-4 rounded-xl border border-[#c1c6d6]/40 bg-[#f2f3fd] p-3 text-sm font-semibold italic text-[#414753]">
          {item.aiExplanation}
        </div>
      )}

      <div className="mt-4 flex flex-col justify-end gap-3 border-t border-[#c1c6d6]/50 pt-4 sm:flex-row">
        <button onClick={() => onUpdate(item, 'Corrected', translation, adminNote)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753] transition hover:bg-[#ecedf7]">
          <Languages className="h-4 w-4" />
          Lưu chỉnh sửa
        </button>
        <button onClick={() => onUpdate(item, 'Rejected', translation, adminNote)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100">
          <X className="h-4 w-4" />
          Từ chối
        </button>
        <button onClick={() => onUpdate(item, 'Approved', translation, adminNote)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]">
          <Check className="h-4 w-4" />
          Phê duyệt
        </button>
      </div>
    </article>
  );
}
function MiniList({ title, rows }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="border-b border-[#c1c6d6]/50 bg-white px-6 py-5">
        <h2 className="text-base font-black text-[#181c22]">{title}</h2>
      </div>
      <div className="divide-y divide-[#c1c6d6]/30">
        {rows.length === 0 ? (
          <div className="p-6 text-sm font-bold text-[#717785]">Chưa có dữ liệu.</div>
        ) : rows.map((row, index) => (
          <div key={`${row.title}-${index}`} className="flex items-center justify-between gap-4 bg-white px-6 py-4 transition hover:bg-[#f2f3fd]">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#181c22]">{row.title}</p>
              <p className="truncate text-xs font-semibold text-[#717785]">{row.subtitle}</p>
            </div>
            <span className="shrink-0 text-sm font-black text-[#005cb9]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTable({ rows }) {
  return (
    <div className={`${CARD} mt-8 overflow-hidden`}>
      <div className="border-b border-[#c1c6d6]/50 px-6 py-5">
        <h2 className="text-base font-black text-[#181c22]">Giao dịch gần đây</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#f2f3fd] text-xs uppercase tracking-wider text-[#414753]">
            <tr>
              <th className="px-6 py-4 font-black">ID</th>
              <th className="px-6 py-4 font-black">Khách hàng</th>
              <th className="px-6 py-4 font-black">Nội dung</th>
              <th className="px-6 py-4 font-black">Số tiền</th>
              <th className="px-6 py-4 font-black">Trạng thái</th>
              <th className="px-6 py-4 font-black">Ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c1c6d6]/30 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#f2f3fd]/70">
                <td className="px-6 py-4 text-sm font-black text-[#181c22]">{row.id}</td>
                <td className="px-6 py-4 text-sm font-semibold text-[#414753]">{row.customer}</td>
                <td className="px-6 py-4 text-sm font-semibold text-[#414753]">{row.description}</td>
                <td className="px-6 py-4 text-sm font-black text-[#005cb9]">{formatMoney(row.amount)}</td>
                <td className="px-6 py-4"><StatusBadge value={row.status} /></td>
                <td className="px-6 py-4 text-sm font-semibold text-[#414753]">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
