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
          <p className="text-xs font-black uppercase tracking-wider text-[#414753]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#181c22]">{value}</p>
          {delta && (
            <span className={`mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black ${
              positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {delta}
            </span>
          )}
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
  const [users, setUsers] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [translations, setTranslations] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [translationKind, setTranslationKind] = useState('all');
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
      if (screen === 'users') setUsers(await adminApi.users({ q: query, status: statusFilter }));
      if (screen === 'search') setSearchStats(await adminApi.searchStats());
      if (screen === 'translations') {
        setTranslations(await adminApi.translationApprovals({
          kind: translationKind,
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
  }, [loadOverview, overview, query, screen, statusFilter, translationKind, translationPage, translationPageSize, translationQuery]);

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
      setUsers(await adminApi.users({ q: query, status: statusFilter }));
      await loadOverview();
      toast.success('Đã cập nhật người dùng.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật người dùng.');
    }
  };

  const updateTranslation = async (item, status, translation) => {
    try {
      await adminApi.updateTranslationApproval(item.id, { kind: item.kind, status, translation });
      setTranslations(await adminApi.translationApprovals({
        kind: translationKind,
        q: translationQuery,
        page: translationPage,
        pageSize: translationPageSize,
      }));
      await loadOverview();
      toast.success(status === 'Approved' ? 'Đã phê duyệt bản dịch.' : 'Đã từ chối bản dịch.');
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật phê duyệt.');
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
          users={users}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          loading={loading}
          onUpdate={updateUser}
        />
      )}
      {screen === 'search' && <SearchStatsScreen data={searchStats} loading={loading} />}
      {screen === 'translations' && (
        <TranslationsScreen
          items={translations}
          kind={translationKind}
          query={translationQuery}
          page={translationPage}
          pageSize={translationPageSize}
          setKind={(value) => {
            setTranslationKind(value);
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
        />
      )}
    </div>
  );
}

function DashboardScreen({ overview, loading, onRefresh }) {
  const stats = overview?.stats || {};
  const activeUserTrend = overview?.activeUserTrend || [];
  const newUserTrend = overview?.newUserTrend || [];

  return (
    <section id="dashboard">
      <PageTitle
        eyebrow="Hanora AI"
        title="Tổng quan"
        description="Số liệu hiệu suất, người dùng, tài liệu và nội dung cần xử lý theo thời gian thực."
        action={
          <div className="flex gap-3">
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753] transition hover:bg-[#ecedf7]">
              <Download className="h-4 w-4" />
              Xuất dữ liệu
            </button>
            <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Tổng người dùng" value={formatNumber(stats.totalUsers)} delta={`+${formatNumber(stats.newUsers7d)} / 7 ngày`} icon={Users} />
        <MetricCard label="Người dùng hoạt động" value={formatNumber(stats.activeUsers)} delta="Đang mở khóa" icon={ShieldCheck} />
        <MetricCard label="Tài liệu mới" value={formatNumber(stats.documents7d)} delta="7 ngày qua" icon={FileText} />
        <MetricCard label="Lượt tra cứu từ" value={formatNumber(stats.totalVocabulary)} delta={`${formatNumber(stats.vietnameseReadyVocabulary)} đã dịch`} icon={Search} />
        <MetricCard label="Tổng XP" value={formatNumber(stats.totalXp)} delta={`${formatNumber(Math.round((stats.totalStudyMinutes || 0) / 60))} giờ học`} icon={TrendingUp} />
        <MetricCard label="Chờ xử lý" value={formatNumber(stats.pendingReports)} delta="Cần kiểm duyệt" icon={AlertTriangle} tone={stats.pendingReports > 0 ? 'red' : 'blue'} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartCard title="Xu hướng người dùng hoạt động" subtitle="30 ngày gần nhất">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={activeUserTrend}>
                <defs>
                  <linearGradient id="activeUsersGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e0e2ec" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#c1c6d6' }} />
                <Area dataKey="value" stroke={BLUE} strokeWidth={3} fill="url(#activeUsersGradient)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Người dùng mới hằng ngày" subtitle="Dựa trên created_at trong database">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={newUserTrend}>
                <CartesianGrid stroke="#e0e2ec" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#717785' }} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#c1c6d6' }} />
                <Bar dataKey="value" fill={BLUE} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MiniList title="Top học viên" rows={(overview?.topUsers || []).map((u) => ({
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

function UsersScreen({ users, query, setQuery, statusFilter, setStatusFilter, loading, onUpdate }) {
  return (
    <section id="users">
      <PageTitle
        eyebrow="User Management"
        title="Quản lý người dùng"
        description="Quản lý quyền truy cập, theo dõi mức độ sử dụng và khóa/mở khóa tài khoản."
        action={<button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white"><Users className="h-4 w-4" />Tạo tài khoản</button>}
      />

      <div className={`${CARD} mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between`}>
        <label className="relative block w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717785]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-[#c1c6d6]/70 bg-[#f2f3fd] pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30" placeholder="Tìm theo tên, email, ID..." />
        </label>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-[#c1c6d6]/70 bg-white px-3 text-sm font-bold text-[#414753]">
            <option>All</option>
            <option>Active</option>
            <option>Locked</option>
          </select>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753]"><Download className="h-4 w-4" />Xuất CSV</button>
        </div>
      </div>

      {loading ? <LoadingState /> : users.length === 0 ? <EmptyState icon={Users} title="Không có người dùng phù hợp." /> : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-[#c1c6d6]/60 bg-[#f2f3fd] text-xs uppercase tracking-wider text-[#414753]">
                <tr>
                  <th className="px-6 py-4 font-black">Tên</th>
                  <th className="px-6 py-4 font-black">Email</th>
                  <th className="px-6 py-4 font-black">Vai trò</th>
                  <th className="px-6 py-4 font-black">Học tập</th>
                  <th className="px-6 py-4 font-black">Ngày tạo</th>
                  <th className="px-6 py-4 font-black">Trạng thái</th>
                  <th className="px-6 py-4 text-center font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c1c6d6]/30 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className={`group transition hover:bg-[#f2f3fd]/70 ${!user.isActive ? 'bg-red-50/40' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d5e0f8] text-sm font-black text-[#005cb9]">
                          {(user.displayName || user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-black text-[#181c22] group-hover:text-[#005cb9]">{user.displayName || user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#414753]">{user.email}</td>
                    <td className="px-6 py-5"><StatusBadge value={user.role} /></td>
                    <td className="px-6 py-5 text-sm font-bold text-[#414753]">{formatNumber(user.totalXp)} XP<br /><span className="text-xs text-[#717785]">{user.documentCount} tài liệu</span></td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#414753]">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-5"><StatusBadge value={user.isActive ? 'Active' : 'Locked'} /></td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                        <button onClick={() => onUpdate(user, { role: user.role === 'Admin' ? 'User' : 'Admin' })} className="rounded-xl p-2 text-[#414753] transition hover:bg-[#ecedf7] hover:text-[#005cb9]"><ShieldCheck className="h-4 w-4" /></button>
                        <button onClick={() => onUpdate(user, { isActive: !user.isActive })} className={`rounded-xl p-2 transition ${user.isActive ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                          {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <MetricCard label="Tổng lượt tra cứu" value={formatNumber(summary.totalLookups)} delta="từ user_vocabulary" icon={Search} />
        <MetricCard label="Lượt tra hôm nay" value={formatNumber(summary.todayLookups)} delta="+ hôm nay" icon={Clock} />
        <MetricCard label="Người dùng đang tra cứu" value={formatNumber(summary.activeUsers)} delta="real-time pulse" icon={Users} tone="red" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Lượt tra theo ngày" subtitle="7 ngày gần nhất" className="lg:col-span-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={data?.dailyLookups || []}>
                <defs>
                  <linearGradient id="lookupGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e0e2ec" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area dataKey="value" stroke={BLUE} strokeWidth={3} fill="url(#lookupGradient)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Thiết bị truy cập">
          <div className="space-y-6">
            {(data?.deviceSegments || []).map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-end justify-between text-sm font-bold">
                  <span className="text-[#414753]">{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#ecedf7]">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
              </div>
            ))}
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
  query,
  page,
  pageSize,
  setKind,
  setQuery,
  setPage,
  setPageSize,
  loading,
  onUpdate,
}) {
  const pageData = items || {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
    vocabularyTotal: 0,
    sentenceTotal: 0,
  };
  const rows = pageData.items || [];
  const typeOptions = [
    { value: 'all', label: 'Tất cả', count: pageData.total },
    { value: 'vocabulary', label: 'Từ vựng', count: pageData.vocabularyTotal },
    { value: 'sentence', label: 'Câu ví dụ', count: pageData.sentenceTotal },
  ];
  const start = pageData.total === 0 ? 0 : (pageData.page - 1) * pageData.pageSize + 1;
  const end = Math.min(pageData.page * pageData.pageSize, pageData.total);

  return (
    <section id="translations">
      <PageTitle
        eyebrow="Translation Approval"
        title="Phê duyệt dịch thuật"
        description="Xem xét các từ/câu đang thiếu bản dịch tiếng Việt và phê duyệt nội dung để đưa vào kho học liệu."
        action={<button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" />Phê duyệt hàng loạt</button>}
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

  return (
    <article className={`${CARD} p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#414753]">
          <span className="rounded-lg border border-[#c1c6d6]/70 bg-[#ecedf7] px-2.5 py-1">{item.sourceLanguage} -&gt; {item.targetLanguage}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(item.createdAt)}</span>
          <span>{item.requestedBy}</span>
        </div>
        <StatusBadge value={item.status} />
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#717785]">Nguồn</p>
        <p className="text-base font-black leading-7 text-[#181c22]">{item.sourceText}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#c1c6d6]/60 bg-[#ecedf7] p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#717785]">Bản dịch AI / hiện tại</p>
          <p className="text-sm font-semibold leading-6 text-[#181c22]">{item.aiTranslation || 'Chưa có dữ liệu'}</p>
        </div>
        <label className="rounded-xl border border-[#0b74e5]/30 bg-[#d7e3ff]/25 p-4">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#005cb9]">Đề xuất phê duyệt</span>
          <textarea
            value={translation}
            onChange={(event) => setTranslation(event.target.value)}
            className="h-28 w-full resize-none rounded-lg border border-transparent bg-transparent p-2 text-sm font-semibold leading-6 text-[#181c22] outline-none focus:border-[#0b74e5] focus:ring-4 focus:ring-[#abc7ff]/30"
            placeholder="Nhập bản dịch..."
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-[#c1c6d6]/40 bg-[#f2f3fd] p-3 text-sm font-semibold italic text-[#414753]">
        {item.note}
      </div>

      <div className="mt-4 flex flex-col justify-end gap-3 border-t border-[#c1c6d6]/50 pt-4 sm:flex-row">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c1c6d6]/70 bg-white px-4 text-sm font-black text-[#414753] transition hover:bg-[#ecedf7]">
          <Languages className="h-4 w-4" />
          Chỉnh sửa
        </button>
        <button onClick={() => onUpdate(item, 'Rejected', translation)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100">
          <X className="h-4 w-4" />
          Từ chối
        </button>
        <button onClick={() => onUpdate(item, 'Approved', translation)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#005cb9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0b74e5]">
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
