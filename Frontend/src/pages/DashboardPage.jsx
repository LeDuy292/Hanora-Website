import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Clock, 
  Bookmark, 
  Layers, 
  Plus, 
  FileText, 
  ArrowRight, 
  Trash2, 
  Trophy, 
  TrendingUp, 
  Check, 
  Lock, 
  Award, 
  BookOpen, 
  Mic 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore } from '../store/documentStore';
import { useVocabularyStore } from '../store/vocabularyStore';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatDate';
import pandaImg from '../assets/Gemini_Generated_Image_idwcryidwcryidwc.png';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { documents, setActiveDocument, deleteDocument } = useDocumentStore();
  const { vocabList, getReviewQueue } = useVocabularyStore();

  const dueQueue = getReviewQueue();

  // Daily target configuration
  const targetMinutes = user?.targetDailyMinutes || 20;
  const todayMins = user?.todayMinutes || 0;
  const progressPercent = Math.min(Math.round((todayMins / targetMinutes) * 100), 100);

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
      return (user?.streak || 0) >= (todayIdx - idx);
    }
    if (idx === todayIdx) {
      return todayMins > 0 || (user?.streak || 0) > 0;
    }
    return false;
  };

  const streakDisplayDays = weekDays.map((day, idx) => ({
    ...day,
    completed: isDayCompleted(idx),
    today: idx === todayIdx,
  }));

  const streakLength = user?.streak || 0;

  // Vocabulary HSK stats grouping
  const hsk1Count = vocabList.filter(v => v.hsk === 1).length;
  const hsk2Count = vocabList.filter(v => v.hsk === 2).length;
  const hsk3Count = vocabList.filter(v => v.hsk === 3).length;

  const hskLevels = [
    { level: 'HSK 1', count: hsk1Count, target: 150, color: 'from-blue-600 to-sky-400' },
    { level: 'HSK 2', count: hsk2Count, target: 150, color: 'from-blue-500 to-indigo-400' },
    { level: 'HSK 3', count: hsk3Count, target: 300, color: 'from-indigo-600 to-purple-500' }
  ];

  // Graph Points for growth tracking
  const graphPoints = [
    { day: "Mon", count: 8 },
    { day: "Tue", count: 12 },
    { day: "Wed", count: 18 },
    { day: "Thu", count: 15 },
    { day: "Fri", count: 24 },
    { day: "Sat", count: 28 },
    { day: "Sun", count: vocabList.length }
  ];

  const maxVal = Math.max(...graphPoints.map(p => p.count), 30);
  const svgPoints = graphPoints.map((p, idx) => {
    const x = 40 + idx * 70;
    const y = 100 - (p.count / maxVal) * 80;
    return `${x},${y}`;
  }).join(' ');

  // Achievements
  const achievements = [
    {
      id: 'beginner_reader',
      title: 'Độc giả tập sự',
      desc: 'Tải lên tài liệu học đầu tiên của bạn để dịch thuật.',
      icon: BookOpen,
      unlocked: documents.length > 0,
      requirement: 'Tải lên ít nhất 1 tài liệu',
      progress: `${documents.length}/1`,
      badgeColor: 'bg-blue-50 border-blue-100 text-blue-600',
      iconColor: 'text-blue-500'
    },
    {
      id: 'streak_master',
      title: 'Chiến thần chuyên cần',
      desc: 'Duy trì chuỗi học tập liên tục 5 ngày để tạo thói quen tốt.',
      icon: Flame,
      unlocked: (user?.streak || 0) >= 5,
      requirement: 'Đạt chuỗi học tập từ 5 ngày',
      progress: `${user?.streak || 0}/5`,
      badgeColor: 'bg-orange-50 border-orange-100 text-orange-600',
      iconColor: 'text-orange-500'
    },
    {
      id: 'vocab_collector',
      title: 'Nhà sưu tầm từ vựng',
      desc: 'Lưu 20 từ vựng trở lên vào sổ tay ghi nhớ của riêng bạn.',
      icon: Bookmark,
      unlocked: vocabList.length >= 20,
      requirement: 'Lưu ít nhất 20 từ vựng',
      progress: `${vocabList.length}/20`,
      badgeColor: 'bg-sky-50 border-sky-100 text-sky-600',
      iconColor: 'text-sky-500'
    },
    {
      id: 'ai_speaker',
      title: 'Phát âm chuẩn AI',
      desc: 'Đạt điểm số từ 90% trở lên khi luyện đọc phát âm với AI.',
      icon: Mic,
      unlocked: !!user?.hasHighSpeechScore,
      requirement: 'Điểm phát âm AI đạt từ 90%+',
      progress: user?.hasHighSpeechScore ? '1/1' : '0/1',
      badgeColor: 'bg-indigo-50 border-indigo-100 text-indigo-600',
      iconColor: 'text-indigo-500'
    }
  ];

  // Helper for XP milestones
  const getXpProgress = () => {
    const xp = user?.xp || 0;
    if (xp < 200) {
      return { current: xp, next: 200, percent: (xp / 200) * 100, nextLevel: 'HSK 2' };
    } else if (xp < 500) {
      return { current: xp - 200, next: 300, percent: ((xp - 200) / 300) * 100, nextLevel: 'HSK 3' };
    } else if (xp < 800) {
      return { current: xp - 500, next: 300, percent: ((xp - 500) / 300) * 100, nextLevel: 'HSK 4' };
    } else {
      return { current: xp - 800, next: 1200, percent: Math.min(((xp - 800) / 1200) * 100, 100), nextLevel: 'HSK 5 Max' };
    }
  };

  const xpProgress = getXpProgress();


  const handleOpenDoc = (id) => {
    setActiveDocument(id);
    navigate('/reader');
  };

  return (
    <div className="space-y-8 page-transition">
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
              Cấp độ của bạn: <span className="text-blue-600 font-bold">{user.level || 'HSK 1'}</span> ({user.xp} XP). Duy trì thói quen học tập hàng ngày để mở khóa huy hiệu vinh danh.
            </p>

            {/* XP progress bar */}
            <div className="space-y-2 pt-1 max-w-md">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>Tiến trình lên {xpProgress.nextLevel}</span>
                <span>{user.xp} / {xpProgress.next === 1200 ? '2000' : xpProgress.next + (user.xp < 200 ? 0 : user.xp < 500 ? 200 : 500)} XP</span>
              </div>
              <div className="h-2 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-500" 
                  style={{ width: `${xpProgress.percent}%` }}
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
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{user?.streak || 0} Ngày</h4>
          </div>
        </div>

        {/* Study Time Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Học hôm nay</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{user?.todayMinutes || 0} / {user?.targetDailyMinutes || 20} phút</h4>
          </div>
        </div>

        {/* Notebook count */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            <Bookmark className="w-6 h-6 fill-sky-500/10" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sổ tay từ vựng</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{vocabList.length} Từ đã lưu</h4>
          </div>
        </div>

        {/* Reviews due */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cần ôn tập SRS</span>
            <h4 className="text-lg font-bold text-slate-800 mt-0.5">{dueQueue.length} Từ đến hạn</h4>
          </div>
        </div>

      </div>

      {/* Grid: SVG Goal Ring (left) vs Streak Calendar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Goal Ring */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 flex flex-col justify-between items-center text-center gap-6 shadow-sm">
          <div className="w-full flex justify-between items-center border-b border-slate-100 pb-3 text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Mục Tiêu Mỗi Ngày
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
              Hôm Nay
            </span>
          </div>

          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
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
                className="stroke-blue-600 fill-transparent transition-all duration-500"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800 font-display">
                {progressPercent}%
              </span>
              <span className="text-[9px] text-slate-500 font-bold tracking-wide mt-0.5">
                {todayMins} / {targetMinutes} phút
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed font-medium">
            {progressPercent >= 100 
              ? '🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu học tập hôm nay!'
              : `Còn ${Math.max(targetMinutes - todayMins, 0)} phút nữa để đạt chỉ tiêu ngày.`}
          </div>
        </div>

        {/* Streak card with daily sequence */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700 p-6 shadow-xl text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl"></div>
          <div className="pointer-events-none absolute right-6 top-8 h-24 w-24 rounded-full bg-white/20"></div>

          <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
            <div className="max-w-xl">
              <span className="text-[10px] uppercase tracking-[0.35em] text-sky-100/80 font-semibold">
                Chuỗi ngày học
              </span>
              <div className="mt-4 flex items-end gap-4">
                <div>
                  <h3 className="text-[3.5rem] font-extrabold tracking-tight text-white leading-none">
                    {streakLength}
                  </h3>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-100/80 mt-1">
                    ngày liên tiếp
                  </p>
                </div>
                <div className="rounded-[1.7rem] bg-white/15 px-4 py-3 border border-white/20 shadow-inner flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-amber-300 to-rose-400 shadow-[0_14px_32px_-18px_rgba(252,165,24,0.9)]">
                    <Flame className="h-5 w-5 text-white drop-shadow-lg" />
                  </span>
                </div>
              </div>
            </div>

            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-3xl border border-white/20 bg-white/10 blur-sm"></div>
              <img
                src={pandaImg}
                alt="Panda streak"
                className="relative z-10 h-36 w-36 rounded-[2rem] object-cover shadow-2xl shadow-slate-900/10"
              />
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] bg-white/10 border border-white/15 p-4 shadow-inner">
            <div className="flex justify-between items-center gap-4 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-sky-100/80 font-semibold">
                  Tuần này
                </p>
                <p className="text-xs text-sky-100/80 mt-1">Hoàn thành mỗi ngày để giữ streak tiếp tục.</p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-sky-100/80 border border-white/15">
                {streakLength} ngày
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {streakDisplayDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`relative flex h-12 w-12 items-center justify-center rounded-3xl border text-sm font-bold transition ${day.completed ? 'bg-white text-sky-700 border-white shadow-sm' : day.today ? 'border-orange-300 bg-orange-100/20 text-white shadow-[0_0_0_4px_rgba(255,255,255,0.08)]' : 'border-white/15 bg-white/10 text-sky-100'}`}>
                    {day.completed ? (
                      <Check className="h-4 w-4" />
                    ) : day.today ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      day.name
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-sky-100/80">
                    {day.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-sm leading-relaxed text-sky-100/80">
            Tiếp tục học mỗi ngày và giữ chuỗi ổn định. Bạn đang trên đường xây dựng thói quen học tiếng Trung bền vững.
          </div>
        </div>

      </div>

      {/* Grid: SRS Study Card + HSK Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SRS quick study widget */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 space-y-4.5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-amber-500" /> Ôn tập thông minh SRS
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
            <div>
              <span className="text-2xl font-black text-slate-800 font-display block">
                {dueQueue.length}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                từ vựng cần ôn tập hôm nay
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Ôn tập theo thuật toán Spaced Repetition nâng cao hiệu quả nhớ từ lâu hơn.
            </p>

            <Button
              variant={dueQueue.length > 0 ? 'primary' : 'secondary'}
              className="w-full shadow-sm"
              icon={Layers}
              onClick={() => navigate('/flashcards')}
              disabled={vocabList.length === 0}
            >
              Bắt đầu ôn tập ngay
            </Button>
          </div>
        </div>

        {/* HSK Vocabulary notebook distribution */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-blue-550" style={{ color: '#2563eb' }} />
              Sổ Tay Từ Vựng HSK
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
              Phân bố từ vựng đã lưu theo cấp độ HSK
            </p>
          </div>

          <div className="space-y-4">
            {hskLevels.map((hsk, idx) => {
              const percent = Math.min(Math.round((hsk.count / hsk.target) * 100), 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{hsk.level}</span>
                    <span className="text-slate-500 font-semibold">{hsk.count} / {hsk.target} từ ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full bg-gradient-to-r ${hsk.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent || 2}%` }} 
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Vocabulary Growth SVG Line Chart */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Biểu Đồ Tăng Trưởng Từ Vựng
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg">
            Tuần Này
          </span>
        </div>

        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <svg 
            viewBox="0 0 500 130" 
            className="w-full overflow-visible"
          >
            <line x1="30" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="30" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="30" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />

            <defs>
              <linearGradient id="chartProgressGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 40,100 L ${svgPoints} L 460,100 Z`}
              fill="url(#chartProgressGlow)"
            />

            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              points={svgPoints}
              className="drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
            />

            {graphPoints.map((p, idx) => {
              const x = 40 + idx * 70;
              const y = 100 - (p.count / maxVal) * 80;
              return (
                <g key={idx} className="group/dot cursor-pointer">
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    className="fill-white stroke-blue-500 stroke-[2.5] hover:r-6 transition-all"
                  />
                  <text
                    x={x}
                    y={y - 10}
                    className="text-[9px] font-extrabold fill-blue-600 font-sans text-center opacity-0 group-hover/dot:opacity-100 transition-opacity"
                    textAnchor="middle"
                  >
                    {p.count}
                  </text>
                </g>
              );
            })}

            {graphPoints.map((p, idx) => (
              <text
                key={idx}
                x={40 + idx * 70}
                y="118"
                className="text-[9px] font-bold fill-slate-400 font-sans"
                textAnchor="middle"
              >
                {p.day}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Recent Documents Grid List */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-500" />
            Tài liệu đọc gần đây
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{documents.length} Tài liệu</span>
        </div>

        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="group flex flex-col justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-sm transition-all duration-200 gap-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 
                        onClick={() => handleOpenDoc(doc.id)}
                        className="text-xs font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Ngày tải: {formatDate(doc.date)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>Tiến trình đọc</span>
                    <span>{doc.progress || 0}%</span>
                  </div>
                  <div className="h-1 bg-slate-100 border border-slate-200/55 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full" 
                      style={{ width: `${doc.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-3 font-semibold">
                    <span>{doc.charCount} ký tự</span>
                    <span>&bull;</span>
                    <span>{doc.readTimeMins} phút đọc</span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenDoc(doc.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:text-blue-500"
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
            {achievements.filter(a => a.unlocked).length} / {achievements.length} Đạt được
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            
            return (
              <div 
                key={achievement.id}
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
                      ? achievement.badgeColor
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
                    {achievement.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                    {achievement.desc}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                  <span>{achievement.requirement}</span>
                  <span className={achievement.unlocked ? 'text-blue-600 font-extrabold' : 'text-slate-500'}>
                    {achievement.progress}
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
