import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Sparkles,
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
  Square,
  RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { useVocabularyStore } from '../store/vocabularyStore';
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

  // Vocabulary store state
  const vocabList = useVocabularyStore((s) => s.vocabList);
  const fetchUserFlashcards = useVocabularyStore((s) => s.fetchUserFlashcards);

  useEffect(() => {
    fetchUserFlashcards();
  }, [fetchUserFlashcards]);
  const timerState = useTimerStore((s) => s.timerState);
  const elapsedSeconds = useTimerStore((s) => s.elapsedSeconds);
  const countdownTargetSeconds = useTimerStore((s) => s.countdownTargetSeconds);
  const addExtraSeconds = useTimerStore((s) => s.addExtraSeconds);
  const resetTimer = useTimerStore((s) => s.resetTimer);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resumeTimer = useTimerStore((s) => s.resumeTimer);
  const finishTimer = useTimerStore((s) => s.finishTimer);
  const showWidget = useTimerStore((s) => s.showWidget);

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

  const timerTargetMins = Math.ceil((countdownTargetSeconds || 0) / 60);
  const targetMinutes = timerTargetMins > 0 ? timerTargetMins : (data?.dailyGoal?.target ?? user?.targetDailyMinutes ?? 90);
  const todayMins = data?.dailyGoal?.current ?? 0;
  const currentSessionMinutes = timerState !== 'inactive' ? elapsedSeconds / 60 : 0;
  const totalMinsTodayCalculated = todayMins + currentSessionMinutes;
  const progressPercent = targetMinutes > 0
    ? Math.min(Math.round((totalMinsTodayCalculated / targetMinutes) * 100), 100)
    : 0;

  // Automatically synchronize timer countdown target with daily goal minutes
  useEffect(() => {
    if (targetMinutes && targetMinutes > 0 && timerState === 'inactive') {
      useTimerStore.getState().setCountdownTargetSeconds(targetMinutes * 60);
    }
  }, [targetMinutes, timerState]);

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

      {/* ===== TOP ROW: LEVEL XP & INTEGRATED TODAY'S GOAL HEADER CARD ===== */}
      {user && (
        <div id="dashboard-header" data-tour="header-banner" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 via-sky-400/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            {/* Left: User Welcome & Level XP Progress (7/12) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-850 tracking-tight flex items-center gap-2">
                  <span>Chào mừng trở lại, {user.name}!</span>
                  <span className="text-xl animate-bounce">👋</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 font-black px-3.5 py-1.5 rounded-2xl text-xs shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                  Level {level}
                </span>
              </div>

              {/* Level progress bar & XP numbers */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Tiến trình lên Level {level + 1}
                  </span>
                  <span className="font-extrabold text-blue-600">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                </div>
                <div className="h-3.5 bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${levelProgressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right: Integrated Today's Goal Progress Card (5/12) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden flex flex-col justify-between min-h-[125px] transition-all">
              <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/10 blur-xl"></div>
              
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-md">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-100">
                    Mục Tiêu Học Hôm Nay
                  </span>
                </div>
                <button
                  id="edit-goal"
                  onClick={() => setIsEditingGoal(!isEditingGoal)}
                  className="px-3 py-1 bg-white/15 hover:bg-white text-white hover:text-blue-600 border border-white/20 rounded-xl text-xs font-bold transition-all backdrop-blur-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{isEditingGoal ? 'Hủy' : 'Sửa mục tiêu'}</span>
                </button>
              </div>

              {isEditingGoal ? (
                <div className="relative z-10 pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-extrabold text-blue-100 uppercase tracking-wider block">Chọn số phút học mỗi ngày</span>
                  <div id="study-duration" data-tour="goal-presets" className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTempGoal(mins)}
                        className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                          tempGoal === mins
                            ? 'bg-white text-blue-600 shadow-md scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        }`}
                      >
                        {mins}P
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      onClick={async () => {
                        if (tempGoal <= 0) return;
                        try {
                          const updatedDashboard = await progressApi.setGoal(tempGoal);
                          setData(updatedDashboard);
                          setIsEditingGoal(false);
                          await useAuthStore.getState().refreshStats();
                          useTimerStore.getState().resetTimer();
                          useTimerStore.getState().setCountdownTargetSeconds(tempGoal * 60);
                          showWidget();
                          toast.success(`Đã đặt lại mục tiêu mới ${tempGoal} phút/ngày!`);
                        } catch (err) {
                          toast.error(err.message);
                        }
                      }}
                      className="w-full py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-black text-xs shadow-md transition cursor-pointer"
                    >
                      Lưu mục tiêu mới
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 space-y-2 pt-2">
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black font-display tracking-tight text-white">
                      {Math.round(totalMinsTodayCalculated)} <span className="text-xs font-bold text-blue-100">/ {targetMinutes} phút</span>
                    </div>
                    <span className="text-xs font-black text-blue-100 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                      {Math.min(100, Math.round((totalMinsTodayCalculated / Math.max(1, targetMinutes)) * 100))}%
                    </span>
                  </div>

                  {/* Mini Progress Bar inside banner */}
                  <div className="h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/15">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-300 to-teal-200 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min(100, Math.round((totalMinsTodayCalculated / Math.max(1, targetMinutes)) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ===== MAIN DASHBOARD TWO-COLUMN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        {/* ===== LEFT COLUMN: CHUỖI HỌC, MỤC TIÊU & TĂNG TRƯỞNG TỪ VỰNG (8/12 - RỘNG HƠN) ===== */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. CHUỖI NGÀY HỌC LIÊN TIẾP */}
          <div id="streak" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 shadow-xl text-white">
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

          {/* 2. TĂNG TRƯỞNG TỪ VỰNG */}
          <div id="vocabulary-growth" className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Tăng Trưởng Từ Vựng
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">7 ngày qua</span>
            </div>

            <div className="relative w-full bg-gradient-to-b from-slate-50/50 to-white rounded-2xl p-4 border border-slate-100/80 shadow-sm overflow-hidden select-none min-h-[160px] flex items-center">
              {activePoint && (
                <div className="absolute bg-slate-900 border border-slate-800/80 text-white px-2 py-1 rounded-xl shadow-xl pointer-events-none z-20 flex flex-col items-center text-center leading-none" style={{ left: `${(activePoint.x / 500) * 100}%`, top: `${(activePoint.y / 130) * 100 - 15}%`, transform: 'translate(-50%, -100%)' }}>
                  <span className="text-[7px] text-slate-400 font-extrabold tracking-widest">{activePoint.day} ({activePoint.date})</span>
                  <span className="text-[10px] text-yellow-300 font-black mt-1">+{activePoint.count} từ</span>
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

        {/* ===== RIGHT COLUMN: BẢNG XẾP HẠNG (4/12 - THỌT GỌN HƠN) ===== */}
        <div className="lg:col-span-4 space-y-6">

          {/* BẢNG XẾP HẠNG */}
          <div id="leaderboard" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-start relative overflow-hidden">
            
            {/* Header & Period Tabs */}
            <div className="space-y-3 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Trophy className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/10" />
                  Bảng Xếp Hạng
                </h3>
              </div>

              <div className="flex bg-slate-50 border border-slate-150 rounded-2xl p-1 justify-between">
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'weekly', label: 'Tuần này' },
                  { id: 'monthly', label: 'Tháng này' },
                  { id: 'global', label: 'Tất cả' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setLeaderboardPeriod(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all flex-1 text-center ${
                      leaderboardPeriod === p.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ranking List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {leaderboardLoading ? (
                <div className="text-center py-10 text-slate-400 text-xs font-bold animate-pulse">
                  Đang cập nhật xếp hạng...
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
                        key={`${row.userId || 'user'}-${index}`} 
                        className={`flex items-center justify-between px-3 py-2.5 rounded-2xl transition border ${
                          isCurrentUser 
                            ? 'bg-blue-50/70 border-blue-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <div className="w-6 text-center shrink-0">
                            {displayRank === 1 ? (
                              <span className="text-base">🥇</span>
                            ) : displayRank === 2 ? (
                              <span className="text-base">🥈</span>
                            ) : displayRank === 3 ? (
                              <span className="text-base">🥉</span>
                            ) : (
                              <span className="text-[11px] font-black text-slate-400">#{displayRank}</span>
                            )}
                          </div>
                          
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full border border-slate-150 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                            {row.avatarUrl ? (
                              <img src={row.avatarUrl} alt={row.displayName} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                {row.displayName.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Display Name & Details */}
                          <div className="min-w-0">
                            <span className={`text-xs font-extrabold block truncate ${isCurrentUser ? 'text-blue-600' : 'text-slate-800'}`}>
                              {row.displayName} {isCurrentUser && <span className="text-[8px] font-black uppercase text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded-md ml-1">BẠN</span>}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-md">
                                Lvl {row.level}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-orange-500 fill-orange-500/20 inline" /> {row.streak}d
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* XP score */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-800 block">
                            {row.score.toLocaleString()} <span className="text-[10px] text-blue-600">XP</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ===== BOTTOM STANDALONE SECTION: PHÒNG DANH HIỆU (ĐỨNG 1 MÌNH CẢ BẢNG) ===== */}
      <div id="achievements" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm relative overflow-hidden font-sans">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-150 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-6 h-6 fill-amber-500/20" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-850">
                Phòng Danh Hiệu (Achievements)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Huy hiệu vinh danh cá nhân và các cột mốc học tập đã chinh phục
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-700 bg-amber-50/80 border border-amber-200/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs shrink-0">
            <Award className="w-4 h-4 text-amber-600" />
            {unlockedCount} / {achievements.length} Huy hiệu đạt được
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const Icon = ACHIEVEMENT_ICONS[achievement.code] || Award;
            const progressText = achievement.target > 0 ? `${achievement.progress} / ${achievement.target}` : '—';

            return (
              <div 
                key={achievement.code} 
                className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-200 group ${
                  achievement.unlocked 
                    ? 'bg-white border-slate-150 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5' 
                    : 'bg-slate-50/60 border-slate-100/80 opacity-70'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl border transition ${
                    achievement.unlocked 
                      ? 'bg-blue-50 border-blue-100 text-blue-600 group-hover:scale-105' 
                      : 'bg-slate-100 border-slate-200/70 text-slate-400'
                  }`}>
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                    achievement.unlocked 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}>
                    {achievement.unlocked ? 'ĐÃ ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                </div>

                <div className="space-y-1 mt-3">
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-850 group-hover:text-blue-600 transition">
                    {achievement.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                    {achievement.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-2.5 mt-3 flex justify-between items-center text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                    +{achievement.xpReward} XP
                  </span>
                  <span className={achievement.unlocked ? 'text-blue-600 font-black' : 'text-slate-400'}>
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
