import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Clock,
  Bookmark,
  Layers,
  Plus,
  FileText,
  ArrowRight,
  Trophy,
  TrendingUp,
  Check,
  Lock,
  Award,
  BookOpen,
  Mic
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { progressApi } from '../services/progressService';
import { Button } from '../components/common/Button';
import streakBadgeImg from '../assets/Gemini_Generated_Image_idwcryidwcryidwc.png';

// Maps the short weekday label used by the growth chart from an ISO date.
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Default icon per achievement code so the trophy room keeps its visual variety.
const ACHIEVEMENT_ICONS = {
  first_doc: BookOpen,
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Flame,
  vocab_10: Bookmark,
  vocab_50: Bookmark,
  vocab_100: Bookmark,
  vocab_500: Bookmark,
  mastered_10: Award,
  mastered_100: Award,
  first_quiz: Layers,
  perfect_quiz: Trophy,
  match_master: Layers,
  flashcard_100: Layers,
  top10_weekly: Trophy,
};

function formatVnDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, updateProfileOnServer } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(20);
  const [activePoint, setActivePoint] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const dashboard = await progressApi.getDashboard();
        if (!cancelled) {
          setData(dashboard);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không thể tải bảng điều khiển.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Safe accessors with graceful fallbacks while loading / on error.
  const streak = data?.streak ?? 0;
  const xp = data?.xp ?? 0;
  const level = data?.level ?? 1;
  const wordsSaved = data?.wordsSaved ?? 0;
  const reviewToday = data?.reviewToday ?? 0;

  const targetMinutes = data?.dailyGoal?.target ?? 20;
  const todayMins = data?.dailyGoal?.current ?? 0;
  const progressPercent = targetMinutes > 0
    ? Math.min(Math.round((todayMins / targetMinutes) * 100), 100)
    : 0;

  const notebookProgress = data?.notebookProgress ?? [];
  const growthChart = data?.growthChart ?? [];
  const recentDocuments = data?.recentDocuments ?? [];
  const achievements = data?.achievements ?? [];

  // SVG circle specifications
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Consistency Calendar days matching current week
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const todayIdx = currentDay === 0 ? 6 : currentDay - 1; // Map Monday to 0, Sunday to 6

  const weekDays = [
    { name: 'T2', label: 'Thứ 2' },
    { name: 'T3', label: 'Thứ 3' },
    { name: 'T4', label: 'Thứ 4' },
    { name: 'T5', label: 'Thứ 5' },
    { name: 'T6', label: 'Thứ 6' },
    { name: 'T7', label: 'Thứ 7' },
    { name: 'CN', label: 'Chủ nhật' }
  ];

  const isDayCompleted = (idx) => {
    if (idx < todayIdx) {
      return streak >= (todayIdx - idx);
    }
    if (idx === todayIdx) {
      return todayMins > 0 || streak > 0;
    }
    return false;
  };

  const streakDisplayDays = weekDays.map((day, idx) => ({
    ...day,
    completed: isDayCompleted(idx),
    today: idx === todayIdx,
  }));

  // Growth chart points derived from the backend's 7-day series.
  const graphPoints = growthChart.map((p) => {
    const d = new Date(p.date);
    const label = Number.isNaN(d.getTime()) ? '' : WEEKDAY_LABELS[d.getDay()];
    const dateStr = Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return { day: label, count: p.count ?? 0, date: dateStr };
  });

  const maxVal = Math.max(...graphPoints.map(p => p.count), 10);
  const chartPoints = graphPoints.map((p, idx) => ({
    x: 40 + idx * 70,
    y: 100 - (p.count / maxVal) * 85, // Scale graph heights slightly better
    ...p,
    idx
  }));

  // Generate cubic bezier curve for a modern curved look
  let bezierPath = '';
  if (chartPoints.length > 0) {
    bezierPath = `M ${chartPoints[0].x},${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i];
      const p1 = chartPoints[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      bezierPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // XP milestone progress: distance to the next 1000-XP level band (spec thresholds).
  const xpBandSize = xp < 100 ? 100 : xp < 300 ? 300 : xp < 600 ? 600 : 1000;
  const xpBandStart = xp < 100 ? 0 : xp < 300 ? 100 : xp < 600 ? 300 : Math.floor(xp / 1000) * 1000;
  const xpBandEnd = xp < 100 ? 100 : xp < 300 ? 300 : xp < 600 ? 600 : xpBandStart + 1000;
  const xpPercent = Math.min(
    Math.round(((xp - xpBandStart) / (xpBandEnd - xpBandStart)) * 100),
    100
  );

  const handleOpenDoc = (id) => {
    navigate(`/reader/${id}`);
  };

  if (loading && !data) {
    return (
      <div className="space-y-8 page-transition">
        <div className="h-32 bg-white border border-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 page-transition">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* Top Welcome / XP Progress Milestone Header Card */}
      {user && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-8 bg-white border border-slate-100 rounded-3xl gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-3 flex-grow max-w-2xl">
            <span className="text-blue-600 text-xs font-extrabold uppercase tracking-widest block">
              Bảng điều khiển học tập
            </span>
            <h2 className="text-2xl font-extrabold font-display text-slate-800">
              Chào mừng trở lại, {user.name}!
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cấp độ của bạn: <span className="text-blue-600 font-bold">Level {level}</span> ({xp} XP). Duy trì thói quen học tập hàng ngày để mở khóa huy hiệu vinh danh.
            </p>

            {/* XP progress bar */}
            <div className="space-y-2 pt-1 max-w-md">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>Tiến trình lên Level {level + 1}</span>
                <span>{xp} / {xpBandEnd} XP</span>
              </div>
              <div className="h-2 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => navigate('/reader', { state: { openUpload: true } })}
            >
              Nhập tài liệu mới
            </Button>
          </div>
        </div>
      )}

      {/* Grid: Stat Summary Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Streak card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center">
            <Flame className="w-6 h-6 fill-orange-500/10" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chuỗi học tập</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{streak} Ngày</h4>
          </div>
        </div>

        {/* Study Time Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Học hôm nay</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{todayMins} / {targetMinutes} phút</h4>
          </div>
        </div>

        {/* Notebook count */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            <Bookmark className="w-6 h-6 fill-sky-500/10" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sổ tay từ vựng</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{wordsSaved} Từ đã lưu</h4>
          </div>
        </div>

        {/* Reviews due */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cần ôn tập SRS</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{reviewToday} Từ đến hạn</h4>
          </div>
        </div>

      </div>

      {/* Grid: SVG Goal Ring (left) vs Streak Calendar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SVG Goal Ring */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between items-center text-center gap-6 shadow-sm">
          <div className="w-full flex justify-between items-center border-b border-slate-50 pb-3 text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Mục Tiêu Mỗi Ngày</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="number" 
                    min="1" 
                    max="180" 
                    value={tempGoal} 
                    onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)} 
                    className="w-12 px-1 py-0.5 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  <button 
                    onClick={async () => {
                      if (tempGoal > 0) {
                        const res = await updateProfileOnServer({ name: user.name, email: user.email, dailyMinutesGoal: tempGoal });
                        if (res.success) {
                          setData(prev => ({
                            ...prev,
                            dailyGoal: {
                              ...prev.dailyGoal,
                              target: tempGoal
                            }
                          }));
                          setIsEditingGoal(false);
                        }
                      }
                    }}
                    className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-blue-700 transition"
                  >
                    Lưu
                  </button>
                  <button 
                    onClick={() => setIsEditingGoal(false)}
                    className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold hover:bg-slate-200 transition"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setTempGoal(targetMinutes);
                    setIsEditingGoal(true);
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-700 ml-1.5 font-bold hover:underline"
                >
                  (Sửa)
                </button>
              )}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
              HÔM NAY
            </span>
          </div>

          <div className="relative w-40 h-40 flex items-center justify-center my-4">
            <svg className="w-full h-full transform -rotate-90 z-10 relative" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                className="stroke-slate-100 fill-transparent"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                className="stroke-blue-600 fill-transparent transition-all duration-1000 ease-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center z-20 w-full h-full">
              <span className="text-3xl font-black text-slate-800 font-display leading-tight">
                {progressPercent}%
              </span>
              <span className="text-xs text-slate-500 font-bold mt-1">
                {todayMins} / {targetMinutes} phút
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            {progressPercent >= 100
              ? '🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu học tập hôm nay!'
              : `Còn ${Math.max(targetMinutes - todayMins, 0)} phút nữa để đạt chỉ tiêu ngày.`}
          </div>
        </div>

        {/* Streak card with daily sequence */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 shadow-xl text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl"></div>
          <img 
            src={streakBadgeImg} 
            alt="Streak Badge" 
            className="pointer-events-none absolute right-6 top-8 h-24 w-24 object-cover rounded-full" 
          />

          <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
            <div className="max-w-xl">
              <span className="text-[10px] uppercase tracking-[0.35em] text-sky-100/80 font-semibold">
                Chuỗi ngày học

              </span>
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <h3 className="text-[5rem] font-extrabold tracking-tighter text-white leading-[1]">
                    {streak}
                  </h3>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-100/90 mt-1">
                    NGÀY LIÊN TIẾP
                  </p>
                </div>
                <div className="rounded-[2rem] bg-white/10 p-4 border border-white/20 shadow-inner flex items-center justify-center backdrop-blur-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[#FFB03A] to-[#FF8116] shadow-[0_4px_12px_rgba(255,129,22,0.5)]">
                    <Flame className="h-6 w-6 text-white drop-shadow-sm" fill="currentColor" />
                  </span>
                </div>
              </div>
            </div>

            {/* Panda Image / Mascot */}
            <div className="rounded-[2rem] bg-gradient-to-b from-[#7FB2FF]/30 to-[#4E8DFF]/30 p-2 border border-white/20 shadow-inner backdrop-blur-md hidden sm:block overflow-hidden relative">
              <img src={StreakImage} alt="Mascot" className="w-[100px] h-[100px] object-cover rounded-[1.5rem]" />
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-white/10 border border-white/15 p-5 backdrop-blur-md relative z-10">
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white">
                  TUẦN NÀY
                </p>
                <p className="text-[11px] text-blue-100 mt-1 font-medium">Hoàn thành mỗi ngày để giữ streak tiếp tục.</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white border border-white/20 shadow-sm">
                {streak} NGÀY
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              {streakDisplayDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-sm transition shadow-sm ${
                    day.completed 
                      ? 'bg-white text-[#1E5BDB]' 
                      : 'border border-white/20 bg-white/5 text-blue-100'
                  }`}>
                    {day.completed ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <span className="font-bold">{day.name}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-100">
                    {day.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 text-xs sm:text-[13px] leading-relaxed text-blue-100/90 font-medium relative z-10">
            Tiếp tục học mỗi ngày và giữ chuỗi ổn định. Bạn đang trên đường xây dựng thói quen học tiếng Trung bền vững.
          </div>
        </div>

      </div>

      {/* Grid: SRS Study Card + Notebook Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* SRS quick study widget */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 space-y-4.5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-amber-500" /> Ôn tập thông minh SRS
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
            <div>
              <span className="text-2xl font-black text-slate-800 font-display block">
                {reviewToday}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                từ vựng cần ôn tập hôm nay
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Ôn tập theo thuật toán Spaced Repetition nâng cao hiệu quả nhớ từ lâu hơn.
            </p>

            <Button
              variant={reviewToday > 0 ? 'primary' : 'secondary'}
              className="w-full shadow-sm"
              icon={Layers}
              onClick={() => navigate('/flashcards')}
              disabled={wordsSaved === 0}
            >
              Bắt đầu ôn tập ngay
            </Button>
          </div>
        </div>

        {/* Vocabulary notebook distribution (per document) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bookmark className="w-4 h-4" style={{ color: '#2563eb' }} />
              Sổ Tay Từ Vựng
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
              Tiến độ học từ vựng theo từng tài liệu
            </p>
          </div>

          <div className="space-y-4">
            {notebookProgress.length > 0 ? (
              notebookProgress.map((doc) => {
                const percent = doc.total > 0
                  ? Math.min(Math.round((doc.learned / doc.total) * 100), 100)
                  : 0;
                return (
                  <div key={doc.documentId} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[60%]">{doc.title}</span>
                      <span className="text-slate-500 font-semibold">{doc.learned} / {doc.total || '?'} từ ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent || 2}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                Chưa có từ vựng nào được lưu theo tài liệu.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Vocabulary Growth SVG Line Chart vs Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Vocabulary Growth SVG Line Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Biểu Đồ Tăng Trưởng Từ Vựng
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">
              7 Ngày Qua
            </span>
          </div>

          <div className="relative w-full bg-gradient-to-b from-slate-50/50 to-white rounded-2xl p-6 border border-slate-100/80 shadow-sm overflow-hidden select-none flex-grow flex items-center">
            {/* Absolute HTML Floating Tooltip */}
            {activePoint && (
              <div 
                className="absolute bg-slate-900 border border-slate-800/80 text-white px-3 py-2 rounded-2xl shadow-xl pointer-events-none transition-all duration-150 z-20 flex flex-col items-center gap-0.5 text-center leading-none"
                style={{ 
                  left: `${(activePoint.x / 500) * 100}%`, 
                  top: `${(activePoint.y / 130) * 100 - 15}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">
                  {activePoint.day} ({activePoint.date})
                </span>
                <span className="text-xs text-yellow-300 font-black mt-1 block">
                  +{activePoint.count} từ mới
                </span>
              </div>
            )}

            <svg
              viewBox="0 0 500 130"
              className="w-full overflow-visible"
            >
              {/* Horizontal Grid lines */}
              <line x1="30" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="30" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="30" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />

              <defs>
                <linearGradient id="chartStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="chartProgressGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Hover Crosshair Vertical line */}
              {activePoint && (
                <line 
                  x1={activePoint.x} 
                  y1="10" 
                  x2={activePoint.x} 
                  y2="100" 
                  stroke="#3B82F6" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,4" 
                  className="transition-all"
                  opacity="0.35"
                />
              )}

              {/* Glow Area under smoothed Bézier path */}
              {chartPoints.length > 0 && (
                <path
                  d={`${bezierPath} L ${chartPoints[chartPoints.length - 1].x},100 L ${chartPoints[0].x},100 Z`}
                  fill="url(#chartProgressGlow)"
                />
              )}

              {/* Smooth Bézier curve line */}
              {chartPoints.length > 0 && (
                <path
                  d={bezierPath}
                  fill="none"
                  stroke="url(#chartStrokeGradient)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
                />
              )}

              {/* Pulsing glow ring on active dot */}
              {activePoint && (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="8"
                  fill="#3B82F6"
                  opacity="0.25"
                  className="animate-ping pointer-events-none"
                />
              )}

              {/* Active and regular dots */}
              {chartPoints.map((p, idx) => {
                const isActive = activePoint?.idx === idx;
                return (
                  <g key={idx} className="pointer-events-none">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? "5.5" : "4"}
                      className={`fill-white stroke-[2.5] transition-all duration-200 ${
                        isActive ? 'stroke-blue-600 shadow-lg scale-110' : 'stroke-blue-500/80'
                      }`}
                    />
                  </g>
                );
              })}

              {/* X-axis Weekday labels */}
              {chartPoints.map((p, idx) => {
                const isActive = activePoint?.idx === idx;
                return (
                  <text
                    key={idx}
                    x={p.x}
                    y="118"
                    className={`text-[9px] font-bold font-sans transition-all duration-200 ${
                      isActive ? 'fill-slate-800 scale-105' : 'fill-slate-400'
                    }`}
                    textAnchor="middle"
                  >
                    {p.day}
                  </text>
                );
              })}

              {/* Invisible vertical hover zones for easy hover interaction */}
              {chartPoints.map((p, idx) => (
                <rect
                  key={`hover-${idx}`}
                  x={p.x - 30}
                  y="0"
                  width="60"
                  height="125"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActivePoint({ x: p.x, y: p.y, count: p.count, day: p.day, date: p.date, idx })}
                  onMouseLeave={() => setActivePoint(null)}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Recent Documents Grid List */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              Tài liệu đọc gần đây
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{recentDocuments.length} Tài liệu</span>
          </div>

          <div className="flex-grow flex flex-col justify-center">
            {recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {recentDocuments.slice(0, 2).map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-sm transition-all duration-200 gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            onClick={() => handleOpenDoc(doc.id)}
                            className="text-xs font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-[200px]"
                          >
                            {doc.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                            Đọc gần nhất: {formatVnDate(doc.lastReadAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                        <span>Tiến trình</span>
                        <span>{Math.round(doc.progressPercent || 0)}%</span>
                      </div>
                      <div className="h-1 bg-slate-100 border border-slate-200/55 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
                          style={{ width: `${doc.progressPercent || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{doc.charCount} ký tự</span>
                        <span>&bull;</span>
                        <span>{doc.readingMinutes} phút</span>
                      </div>

                      <button
                        onClick={() => handleOpenDoc(doc.id)}
                        className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:text-blue-500"
                      >
                        Đọc tiếp <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                Không có tài liệu nào gần đây. Hãy nhập một file văn bản hoặc thêm mẫu có sẵn.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Expanded Trophy Room / Achievements block */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-6 shadow-sm">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-amber-500 fill-amber-500/10" />
              Phòng Danh Hiệu (Achievements)
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
              Huy hiệu vinh danh cá nhân và cột mốc học tập
            </p>
          </div>

          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Award className="w-4 h-4 fill-amber-500/10" />
            {unlockedCount} / {achievements.length} Đạt được
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.code] || Award;
            const progressText = achievement.target > 0
              ? `${achievement.progress}/${achievement.target}`
              : '—';

            return (
              <div
                key={achievement.code}
                className={`p-5 rounded-2xl border flex flex-col justify-between h-[180px] transition-all duration-300 relative overflow-hidden group ${
                  achievement.unlocked
                    ? 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                    : 'bg-slate-50/50 border-slate-100/60 opacity-60'
                }`}
              >
                {achievement.unlocked && (
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                )}

                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl border transition-colors ${
                    achievement.unlocked
                      ? 'bg-blue-50 border-blue-100 text-blue-600'
                      : 'bg-slate-100 border-slate-150 text-slate-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex items-center">
                    {achievement.unlocked ? (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                        Đã đạt
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Khóa
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mt-3">
                  <h4 className={`text-xs font-bold ${achievement.unlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                    {achievement.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                    {achievement.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                  <span>+{achievement.xpReward} XP</span>
                  <span className={achievement.unlocked ? 'text-blue-600 font-extrabold' : 'text-slate-500'}>
                    {progressText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
