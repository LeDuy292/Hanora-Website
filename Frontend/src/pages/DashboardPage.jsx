import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Clock,
  Target,
  Bookmark,
  Layers,
  TrendingUp,
  Check,
  X,
  Lock,
  Award,
  Trophy,
  Crown,
  BookOpen,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { progressApi } from '../services/progressService';
import { leaderboardApi } from '../services/leaderboardService';
import { toast } from '../store/notificationStore';
import streakBadgeImg from '../assets/StreakImage.png';

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

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(90);
  const [isCustomGoal, setIsCustomGoal] = useState(false);
  const [activePoint, setActivePoint] = useState(null);

  // Global Study Timer state
  const timerState = useTimerStore((s) => s.timerState);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const finishTimer = useTimerStore((s) => s.finishTimer);

  const formatTime = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs} : ${mins} : ${secs}`;
  };

  const handleFinishTimer = async () => {
    try {
      const saved = await finishTimer(async (minutesTracked) => {
        toast.success(`🎉 Tuyệt vời! Bạn đã ghi nhận thêm ${minutesTracked} phút học tập.`);
      });
      if (saved) {
        // Reload dashboard progress data
        const dashboard = await progressApi.getDashboard();
        setData(dashboard);
      } else {
        toast.warning("Phiên học kết thúc nhưng chưa đủ 1 phút để tích lũy.");
      }
    } catch (err) {
      toast.error(`Lỗi ghi nhận thời gian: ${err.message}`);
    }
  };

  // Auto-start study countdown timer as soon as dashboard data resolves
  useEffect(() => {
    if (data && timerState === 'inactive') {
      startTimer();
    }
  }, [data, timerState, startTimer]);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch progress dashboard data
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

  // Fetch leaderboard data when period changes
  useEffect(() => {
    let cancelled = false;
    async function fetchLeaderboard() {
      setLeaderboardLoading(true);
      try {
        const result = await leaderboardApi.getLeaderboard(leaderboardPeriod, 'default');
        if (!cancelled) {
          setLeaderboardData(result);
        }
      } catch (err) {
        console.error('Failed to load leaderboard in dashboard', err);
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    }
    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [leaderboardPeriod]);

  // Safe accessors with graceful fallbacks
  const streak = data?.streak ?? 0;
  const xp = data?.xp ?? 0;
  const level = data?.level ?? 1;
  const wordsSaved = data?.wordsSaved ?? 0;
  const reviewToday = data?.reviewToday ?? 0;

  const targetMinutes = data?.dailyGoal?.target ?? 90;
  const todayMins = data?.dailyGoal?.current ?? 0;
  const currentSessionMinutes = timerState !== 'inactive' ? elapsedSeconds / 60 : 0;
  const totalMinsTodayCalculated = todayMins + currentSessionMinutes;
  const progressPercent = targetMinutes > 0
    ? Math.min(Math.round((totalMinsTodayCalculated / targetMinutes) * 100), 100)
    : 0;

  const growthChart = data?.growthChart ?? [];
  const achievements = data?.achievements ?? [];

  // SVG circle specifications
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Consistency Calendar days matching current week
  const today = new Date();
  const currentDay = today.getDay(); 
  const todayIdx = currentDay === 0 ? 6 : currentDay - 1; 

  const weekDays = [
    { name: 'T2', label: 'Thứ 2' },
    { name: 'T3', label: 'Thứ 3' },
    { name: 'T4', label: 'Thứ 4' },
    { name: 'T5', label: 'Thứ 5' },
    { name: 'T6', label: 'Thứ 6' },
    { name: 'T7', label: 'Thứ 7' },
    { name: 'CN', label: 'Chủ nhật' }
  ];

  // Monday of the current week in local time
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);

  const streakDisplayDays = weekDays.map((day, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayDate.getDate()).padStart(2, '0');
    const dayIso = `${y}-${m}-${d}`;

    const completed = data?.activeDaysThisWeek?.includes(dayIso) ?? false;

    return {
      ...day,
      completed,
      today: idx === todayIdx,
      isPast: idx < todayIdx,
    };
  });

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
    y: 100 - (p.count / maxVal) * 85,
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

  const nextLevelXp = data?.nextLevelXp ?? 300;
  const levelProgressPercent = data?.levelProgressPercent ?? 0;

  if (loading && !data) {
    return (
      <div className="space-y-6 sm:space-y-8 page-transition">
        <div className="h-32 bg-white border border-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 h-96 bg-white border border-slate-100 rounded-3xl animate-pulse" />
          <div className="lg:col-span-4 h-96 bg-white border border-slate-100 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 page-transition">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      {/* Greeting & Level XP Progress Header (No Import Button) */}
          {user && (
            <div className="p-6 sm:p-8 bg-white border border-slate-100 rounded-3xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-4">
                <span className="text-blue-600 text-xs font-extrabold uppercase tracking-widest block">
                  Bảng điều khiển học tập
                </span>
                <h2 className="text-2xl font-extrabold font-display text-slate-800">
                  Chào mừng trở lại, {user.name}!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cấp độ của bạn: <span className="text-blue-600 font-bold">Level {level}</span> ({xp} XP). Duy trì thói quen học tập hàng ngày để mở khóa huy hiệu vinh danh.
                </p>

                {/* Level progress bar */}
                <div className="space-y-2 pt-1 max-w-xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>Tiến trình lên Level {level + 1}</span>
                    <span>{xp} / {nextLevelXp} XP</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-500"
                      style={{ width: `${levelProgressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid: Stat Summary Blocks (4 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Streak */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 fill-orange-500/10" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chuỗi học tập</span>
                <h4 className="text-base font-extrabold text-slate-800 mt-0.5 truncate">{streak} Ngày</h4>
              </div>
            </div>

            {/* Time Today */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Học hôm nay</span>
                <h4 className="text-base font-extrabold text-slate-800 mt-0.5 truncate">{todayMins} / {targetMinutes} phút</h4>
              </div>
            </div>

            {/* Saved Vocab */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5 fill-sky-500/10" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sổ tay từ vựng</span>
                <h4 className="text-base font-extrabold text-slate-800 mt-0.5 truncate">{wordsSaved} Từ đã lưu</h4>
              </div>
            </div>

            {/* SRS count */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3.5 shadow-sm cursor-pointer hover:border-slate-200 transition" onClick={() => navigate('/flashcards')}>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cần ôn tập SRS</span>
                <h4 className="text-base font-extrabold text-slate-800 mt-0.5 truncate">{reviewToday} Từ đến hạn</h4>
              </div>
            </div>

          </div>

      {/* ===== MAIN DASHBOARD GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        {/* ===== TOP ROW LEFT: DAILY GOAL & MY RANK (4/12) ===== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Daily Goal Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Mục tiêu hôm nay</h3>
              </div>
              <button 
                onClick={() => setIsEditingGoal(!isEditingGoal)} 
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition border border-blue-100/50"
              >
                {isEditingGoal ? 'Đóng' : 'Thay đổi'}
              </button>
            </div>

            {isEditingGoal ? (
              <div className="flex flex-col gap-4 py-2 text-left" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Chọn phút học mỗi ngày</span>
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  {[30, 60, 90, 120].map((mins) => (
                    <label key={mins} className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100/70 border border-slate-150 p-2 rounded-xl transition text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="dailyGoalPreset"
                        checked={!isCustomGoal && tempGoal === mins}
                        onChange={() => {
                          setTempGoal(mins);
                          setIsCustomGoal(false);
                        }}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300"
                      />
                      <span>{mins} phút</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                  <button onClick={() => setIsEditingGoal(false)} className="px-3 py-1 text-xs bg-white border border-slate-200 text-slate-500 rounded-xl font-bold">Hủy</button>
                  <button 
                    onClick={async () => {
                      if (tempGoal <= 0) return;
                      try {
                        const updatedDashboard = await progressApi.setGoal(tempGoal);
                        setData(updatedDashboard);
                        setIsEditingGoal(false);
                        await useAuthStore.getState().refreshStats();
                        toast.success("Cập nhật mục tiêu thành công!");
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                    className="px-3.5 py-1 text-xs bg-blue-600 text-white rounded-xl font-bold"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-around gap-4 py-2 w-full">
                <div className="flex items-center justify-around w-full">
                  <div className="flex flex-col items-center text-center gap-1 shrink-0">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Đã học</span>
                    <div className="relative w-24 h-24 flex items-center justify-center select-none">
                      <svg className="w-full h-full transform -rotate-90 z-10 relative" viewBox="0 0 130 130">
                        <circle cx="65" cy="65" r={radius} className="stroke-slate-100 fill-transparent" strokeWidth={strokeWidth} />
                        <circle cx="65" cy="65" r={radius} className="stroke-blue-600 fill-transparent transition-all duration-1000 ease-out" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center z-20 w-full h-full">
                        <span className="text-lg font-black text-slate-800 font-display leading-tight">{progressPercent}%</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                      {Math.round(totalMinsTodayCalculated)} / {targetMinutes} phút
                    </div>
                  </div>

                  <div className="h-24 w-px bg-slate-100"></div>

                  <div className="flex flex-col items-center text-center gap-1.5 max-w-[150px]">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      {totalMinsTodayCalculated >= targetMinutes ? "Vượt mục tiêu" : "Đếm ngược"}
                    </span>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-2.5 w-full flex flex-col items-center shadow-inner">
                      <span className="text-sm font-black text-blue-600 font-mono tracking-tight leading-tight">
                        {formatTime(Math.max(0, Math.round((targetMinutes - totalMinsTodayCalculated) * 60)))}
                      </span>
                    </div>

                    <div className="w-full flex gap-1 mt-0.5">
                      {timerState === 'running' ? (
                        <button
                          onClick={pauseTimer}
                          className="flex-1 flex items-center justify-center gap-0.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-1 px-1 rounded-lg font-bold transition text-[9px]"
                        >
                          <Pause className="w-2.5 h-2.5 fill-current" />
                          <span>Tạm dừng</span>
                        </button>
                      ) : (
                        <button
                          onClick={timerState === 'paused' ? resumeTimer : startTimer}
                          className="flex-1 flex items-center justify-center gap-0.5 bg-blue-600 hover:bg-blue-700 text-white py-1 px-1 rounded-lg font-bold transition text-[9px]"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{timerState === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!isEditingGoal && (
                  <div className="text-[9.5px] text-slate-500 font-semibold border-t border-slate-50 pt-2 text-center w-full">
                    {totalMinsTodayCalculated >= targetMinutes ? (
                      <span className="text-blue-600 font-bold">🎉 Đã đạt mục tiêu ngày!</span>
                    ) : (
                      <span>Còn {Math.max(0, Math.ceil(targetMinutes - totalMinsTodayCalculated))} phút nữa để hoàn thành.</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. My Personal Rank Card */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-5 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] text-blue-100 font-bold uppercase tracking-widest block">Thứ hạng cá nhân</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black">
                    {leaderboardData?.currentUser ? `#${leaderboardData.currentUser.rank}` : '—'}
                  </span>
                  <span className="text-[10px] text-blue-100/90 font-bold">
                    / {leaderboardData?.rankings ? leaderboardData.rankings.length + (leaderboardData.top3?.length || 0) : '0'} người học
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shadow-xs">
                <Award className="w-5 h-5 text-yellow-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3 text-xs font-bold">
              <div>
                <span className="text-blue-100/70 text-[9px] uppercase tracking-wider block font-black">Cấp độ</span>
                <span className="text-sm">{level}</span>
              </div>
              <div>
                <span className="text-blue-100/70 text-[9px] uppercase tracking-wider block font-black">Tổng điểm XP</span>
                <span className="text-sm">{xp.toLocaleString()} XP</span>
              </div>
              <div>
                <span className="text-blue-100/70 text-[9px] uppercase tracking-wider block font-black">Từ vựng đã lưu</span>
                <span className="text-sm">{wordsSaved} từ</span>
              </div>
              <div>
                <span className="text-blue-100/70 text-[9px] uppercase tracking-wider block font-black">Chuỗi ngày (Streak)</span>
                <span className="text-sm">{streak} ngày</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-300 mt-3.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ Tiếp tục học để tăng hạng tuần này</span>
            </div>
          </div>

        </div>

        {/* ===== TOP ROW RIGHT: STREAK & CHART (8/12) ===== */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Streak Calendar Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 shadow-xl text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl"></div>

            <div className="flex flex-col xl:flex-row justify-between items-start gap-6 relative z-10">
              <div className="max-w-xl">
                <span className="text-[10px] uppercase tracking-[0.35em] text-sky-100/80 font-bold">
                  Chuỗi ngày học liên tiếp
                </span>
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex flex-col">
                    <h3 className="text-[4.5rem] font-extrabold tracking-tighter text-white leading-[1]">
                      {streak}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-100/90 mt-1">
                      NGÀY LIÊN TIẾP
                    </p>
                  </div>
                  <div className="rounded-[2rem] bg-white/10 p-3.5 border border-white/20 shadow-inner flex items-center justify-center backdrop-blur-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#FFB03A] to-[#FF8116] shadow-[0_4px_12px_rgba(255,129,22,0.5)]">
                      <Flame className="h-5.5 w-5.5 text-white drop-shadow-sm" fill="currentColor" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-gradient-to-b from-[#7FB2FF]/30 to-[#4E8DFF]/30 p-2 border border-white/20 shadow-inner backdrop-blur-md hidden sm:block overflow-hidden relative">
                <img src={streakBadgeImg} alt="Mascot" className="w-[90px] h-[90px] object-cover rounded-[1.5rem]" />
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-white/10 border border-white/15 p-4.5 backdrop-blur-md relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    TUẦN NÀY
                  </p>
                  <p className="text-[11px] text-blue-100 mt-0.5 font-medium">Hoàn thành mỗi ngày để giữ streak tiếp tục.</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white border border-white/20 shadow-sm">
                  {streak} NGÀY
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                {streakDisplayDays.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs transition shadow-sm ${
                      day.completed 
                        ? 'bg-white text-[#1E5BDB]' 
                        : day.isPast
                          ? 'bg-red-500/20 border border-red-500/50 text-red-200'
                          : 'border border-white/20 bg-white/5 text-blue-100'
                    }`}>
                      {day.completed ? (
                        <Check className="h-4.5 w-4.5" strokeWidth={3} />
                      ) : day.isPast ? (
                        <X className="h-4.5 w-4.5" strokeWidth={3} />
                      ) : (
                        <span className="font-bold">{day.name}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-blue-100">
                      {day.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vocabulary Growth SVG Line Chart */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Biểu Đồ Tăng Trưởng Từ Vựng
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">7 ngày qua</span>
            </div>

            <div className="relative w-full bg-gradient-to-b from-slate-50/50 to-white rounded-2xl p-4 border border-slate-100/80 shadow-sm overflow-hidden select-none min-h-[140px] flex items-center">
              {activePoint && (
                <div className="absolute bg-slate-900 border border-slate-800/80 text-white px-2.5 py-1.5 rounded-xl shadow-xl pointer-events-none z-20 flex flex-col items-center text-center leading-none" style={{ left: `${(activePoint.x / 500) * 100}%`, top: `${(activePoint.y / 130) * 100 - 15}%`, transform: 'translate(-50%, -100%)' }}>
                  <span className="text-[7px] text-slate-400 font-extrabold tracking-widest">{activePoint.day} ({activePoint.date})</span>
                  <span className="text-[10px] text-yellow-300 font-black mt-1">+{activePoint.count} từ mới</span>
                </div>
              )}
              <svg viewBox="0 0 500 130" className="w-full overflow-visible">
                <line x1="30" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="30" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="30" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <defs>
                  <linearGradient id="chartStrokeGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient>
                  <linearGradient id="chartProgressGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" /><stop offset="100%" stopColor="#3B82F6" stopOpacity="0" /></linearGradient>
                </defs>
                {activePoint && <line x1={activePoint.x} y1="10" x2={activePoint.x} y2="100" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.35" />}
                {chartPoints.length > 0 && <path d={`${bezierPath} L ${chartPoints[chartPoints.length - 1].x},100 L ${chartPoints[0].x},100 Z`} fill="url(#chartProgressGlow)" />}
                {chartPoints.length > 0 && <path d={bezierPath} fill="none" stroke="url(#chartStrokeGradient)" strokeWidth="3.2" strokeLinecap="round" className="drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]" />}
                {chartPoints.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r={activePoint?.idx === idx ? "5.5" : "4"} className={`fill-white stroke-[2.5] transition-all duration-200 ${activePoint?.idx === idx ? 'stroke-blue-600 scale-110' : 'stroke-blue-500/80'}`} />
                ))}
                {chartPoints.map((p, idx) => (
                  <text key={idx} x={p.x} y="118" className={`text-[8px] font-bold transition-all duration-200 ${activePoint?.idx === idx ? 'fill-slate-800 font-black' : 'fill-slate-400 font-semibold'}`} textAnchor="middle">{p.day}</text>
                ))}
                {chartPoints.map((p, idx) => (
                  <rect key={`hover-${idx}`} x={p.x - 30} y="0" width="60" height="125" fill="transparent" className="cursor-pointer" onMouseEnter={() => setActivePoint({ x: p.x, y: p.y, count: p.count, day: p.day, date: p.date, idx })} onMouseLeave={() => setActivePoint(null)} />
                ))}
              </svg>
            </div>
          </div>

        </div>

      </div>

      {/* ===== MIDDLE ROW: SPACIOUS LEADERBOARD & REWARDS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans mt-6">
        
        {/* LEADERBOARD (8/12 - SPACIOUS WIDE VIEW) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500/10" />
                Bảng Xếp Hạng Người Học
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Xếp hạng tính theo tổng điểm kinh nghiệm (XP)</p>
            </div>
            
            {/* Period Selector Tabs */}
            <div className="flex bg-slate-50 border border-slate-150 rounded-2xl p-1 self-start sm:self-auto">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'weekly', label: 'Tuần này' },
                { id: 'monthly', label: 'Tháng này' },
                { id: 'global', label: 'Tất cả' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLeaderboardPeriod(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    leaderboardPeriod === p.id 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Top 10 list — SPACIOUS DESIGN */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {leaderboardLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold animate-pulse">
                Đang cập nhật bảng xếp hạng...
              </div>
            ) : (
              <>
                {[
                  ...(leaderboardData?.top3 || []),
                  ...(leaderboardData?.rankings || [])
                ].slice(0, 10).map((row, index) => {
                  const isCurrentUser = row.userId === user?.id;
                  const displayRank = index + 1;
                  return (
                    <div 
                      key={row.userId} 
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl transition border ${
                        isCurrentUser 
                          ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Rank Badge */}
                        <div className="w-8 text-center shrink-0">
                          {displayRank === 1 ? (
                            <span className="text-lg">🥇</span>
                          ) : displayRank === 2 ? (
                            <span className="text-lg">🥈</span>
                          ) : displayRank === 3 ? (
                            <span className="text-lg">🥉</span>
                          ) : (
                            <span className="text-xs font-black text-slate-400">#{displayRank}</span>
                          )}
                        </div>
                        
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full border border-slate-150 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt={row.displayName} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                              {row.displayName.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Display Name & Details */}
                        <div className="min-w-0">
                          <span className={`text-sm font-extrabold block truncate ${isCurrentUser ? 'text-blue-600' : 'text-slate-800'}`}>
                            {row.displayName} {isCurrentUser && <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md ml-2">BẠN</span>}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                              Lvl {row.level}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 inline" /> {row.streak} ngày streak
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* XP score */}
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-slate-800 block">
                          {row.score.toLocaleString()} <span className="text-xs text-blue-600">XP</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Highlight current user if not in top 10 */}
                {leaderboardData?.currentUser && leaderboardData.currentUser.rank > 10 && (
                  <>
                    <div className="text-center text-slate-300 font-bold py-1 select-none tracking-widest">...</div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-blue-50/60 border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="w-8 text-center text-xs font-black text-blue-600">
                          #{leaderboardData.currentUser.rank}
                        </span>
                        <div className="w-10 h-10 rounded-full border border-blue-200 overflow-hidden flex items-center justify-center shrink-0 bg-blue-100 text-blue-600 text-xs font-black">
                          B
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-blue-600 block">Bạn</span>
                          <span className="text-[10px] font-bold text-slate-500">Lvl {level} &bull; {streak} ngày streak</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-blue-600 block">
                          {leaderboardData.currentUser.score.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* WEEKLY REWARDS CARD (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 p-6 text-white shadow-xl h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white">Giải Thưởng Tuần</h3>
                  <p className="text-[10px] text-white/50 font-medium">Quy đổi 00:00 Thứ Hai hàng tuần</p>
                </div>
              </div>

              {/* Reward list */}
              <div className="space-y-2.5 pt-2 text-xs font-semibold text-slate-300">
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="flex items-center gap-2">🥇 <span className="font-extrabold text-white">Top 1</span></span>
                  <span className="text-yellow-400 font-black text-sm">+1,000 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="flex items-center gap-2">🥈 <span className="font-extrabold text-white">Top 2</span></span>
                  <span className="font-bold text-slate-200">+700 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="flex items-center gap-2">🥉 <span className="font-extrabold text-white">Top 3</span></span>
                  <span className="font-bold text-slate-200">+500 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3">
                  <span className="flex items-center gap-2">🎖️ <span>Top 4-5</span></span>
                  <span className="font-bold text-slate-400">+300 XP</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3">
                  <span className="flex items-center gap-2">🎖️ <span>Top 6-10</span></span>
                  <span className="font-bold text-slate-400">+200 XP</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-white/40 font-medium leading-relaxed text-center border-t border-white/10 pt-3 mt-4 relative z-10">
              Phần thưởng XP sẽ tự động cộng vào tài khoản khi tuần kết thúc.
            </div>
          </div>
        </div>

      </div>

      {/* ===== FULL WIDTH BOTTOM SECTION: TROPHY ROOM / ACHIEVEMENTS ===== */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-5 shadow-sm mt-6">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              Phòng Danh Hiệu (Achievements)
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Huy hiệu vinh danh cá nhân và cột mốc học tập</p>
          </div>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {unlockedCount} / {achievements.length} Đạt được
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {achievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.code] || Award;
            const progressText = achievement.target > 0 ? `${achievement.progress}/${achievement.target}` : '—';

            return (
              <div key={achievement.code} className={`p-4 rounded-xl border flex flex-col justify-between h-[150px] relative overflow-hidden group ${achievement.unlocked ? 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md' : 'bg-slate-50/50 border-slate-100/60 opacity-65'}`}>
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl border ${achievement.unlocked ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-150 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] font-bold">{achievement.unlocked ? 'Đạt' : 'Khóa'}</span>
                </div>
                <div className="space-y-0.5 mt-2">
                  <h4 className="text-[11px] font-extrabold text-slate-800">{achievement.name}</h4>
                  <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">{achievement.description}</p>
                </div>
                <div className="border-t border-slate-100 pt-1.5 mt-2 flex justify-between text-[8px] text-slate-400 font-bold">
                  <span>+{achievement.xpReward} XP</span>
                  <span className={achievement.unlocked ? 'text-blue-600 font-extrabold' : 'text-slate-550'}>{progressText}</span>
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
