import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  BookMarked, 
  Layers, 
  BookOpen, 
  Mic, 
  Crown, 
  ChevronRight, 
  HelpCircle, 
  Award,
  Loader2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { leaderboardApi } from '../services/leaderboardService';
import { useAuthStore } from '../store/authStore';

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('global');
  const [criteria, setCriteria] = useState('default');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const result = await leaderboardApi.getLeaderboard(period, criteria);
        setData(result);
      } catch (err) {
        console.error('Failed to load leaderboard', err);
        setError('Không thể tải bảng xếp hạng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [period, criteria]);

  // Period Tabs
  const periods = [
    { id: 'global', label: 'Tất cả' },
    { id: 'weekly', label: 'Hàng tuần' },
    { id: 'monthly', label: 'Hàng tháng' }
  ];

  // Criteria Filters with matching icons
  const criteriaFilters = [
    { id: 'default', label: 'Tổng Điểm', icon: Sparkles, color: 'text-amber-500 bg-amber-50' },
    { id: 'vocabulary', label: 'Từ Vựng', icon: BookMarked, color: 'text-indigo-500 bg-indigo-50' },
    { id: 'practice', label: 'Luyện Tập', icon: Layers, color: 'text-sky-500 bg-sky-50' },
    { id: 'reading', label: 'Đọc Dịch', icon: BookOpen, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'pronunciation', label: 'Phát Âm', icon: Mic, color: 'text-rose-500 bg-rose-50' }
  ];

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-medium">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  const currentUserCard = data?.currentUser;
  const top3 = data?.top3 || [];
  const rankings = data?.rankings || [];
  const hallOfFame = data?.hallOfFame;

  // Podium mappings to rearrange visually: Rank 2 on Left, Rank 1 in Center, Rank 3 on Right
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], podiumRank: 2, height: 'h-40 md:h-48', color: 'from-slate-200 to-slate-300 border-slate-300 text-slate-700', badgeColor: 'bg-slate-100 text-slate-600 border-slate-200' });
  if (top3[0]) podiumOrder.push({ ...top3[0], podiumRank: 1, height: 'h-48 md:h-56', color: 'from-amber-300 to-yellow-450 border-yellow-400 text-yellow-900', badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-200' });
  if (top3[2]) podiumOrder.push({ ...top3[2], podiumRank: 3, height: 'h-32 md:h-40', color: 'from-amber-600 to-amber-700 border-amber-600 text-amber-900', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' });

  return (
    <div className="py-6 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* HEADER BANNER */}
      <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-r from-blue-600 via-[#32A0F4] to-cyan-500 p-8 md:p-12 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
              <Trophy className="w-4 h-4 text-yellow-300 fill-yellow-300/30" />
              <span>Leaderboard System</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Bảng Xếp Hạng Người Học
            </h1>
            <p className="text-white/80 font-medium text-sm md:text-base max-w-xl mt-3">
              Cạnh tranh lành mạnh, tích lũy điểm thưởng và nâng cao trình độ tiếng Trung mỗi ngày.
            </p>
          </div>

          {/* DYNAMIC USER RANKING CARD */}
          {currentUserCard && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl min-w-[280px] shrink-0 transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest block">Thứ hạng của bạn</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black">#{currentUserCard.rank}</span>
                    <span className="text-xs font-bold text-white/80">
                      (Cấp {currentUserCard.level})
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 shadow-inner">
                  <Award className="w-5 h-5 text-yellow-300" />
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white/65">ĐIỂM HIỆN TẠI</span>
                  <span>{currentUserCard.score.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-yellow-200 mt-2 bg-yellow-450/20 px-3 py-1.5 rounded-xl border border-yellow-300/25">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{currentUserCard.secondaryValue}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
        {/* Period selection */}
        <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 shrink-0 self-start">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                period === p.id 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Criteria filters list */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          {criteriaFilters.map((cf) => {
            const Icon = cf.icon;
            const isActive = criteria === cf.id;
            return (
              <button
                key={cf.id}
                onClick={() => setCriteria(cf.id)}
                className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl text-xs font-bold tracking-tight shrink-0 transition-all border ${
                  isActive 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-white/20 text-white' : cf.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{cf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: TOP 3 PODIUM & TABLE RANKINGS */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Top 3 Podium layout */}
            {top3.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-end">
                <div className="text-center mb-6">
                  <h3 className="text-base font-bold text-slate-800">Top 3 Dẫn Đầu</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bảng vàng vinh danh những người học đứng đầu</p>
                </div>

                <div className="flex justify-center items-end gap-3 md:gap-8 pt-8">
                  {podiumOrder.map((user) => (
                    <div key={user.userId} className="flex flex-col items-center w-28 md:w-36 transition-transform duration-300 hover:-translate-y-1">
                      
                      {/* Avatar & Crown block */}
                      <div className="relative mb-3 flex flex-col items-center">
                        {user.podiumRank === 1 && (
                          <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/40 absolute -top-7 rotate-12 drop-shadow-md animate-bounce" />
                        )}
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 p-0.5 shadow-lg overflow-hidden flex items-center justify-center bg-white ${
                          user.podiumRank === 1 ? 'border-yellow-400' : user.podiumRank === 2 ? 'border-slate-300' : 'border-amber-600'
                        }`}>
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-lg font-black text-slate-500 uppercase">
                              {user.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className={`absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${user.badgeColor}`}>
                          #{user.podiumRank}
                        </span>
                      </div>

                      {/* Display name & Stats */}
                      <div className="text-center w-full mt-1">
                        <span className="font-bold text-slate-800 text-xs md:text-sm block truncate px-2" title={user.displayName}>
                          {user.displayName}
                        </span>
                        <div className="flex justify-center items-center gap-1.5 mt-1">
                          <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-400 font-black px-1.5 py-0.5 rounded-md">
                            Lvl {user.level}
                          </span>
                          <span className="text-[10px] text-blue-500 font-black">
                            {user.streak} <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 inline" />
                          </span>
                        </div>
                      </div>

                      {/* Podium Pedestal */}
                      <div className={`w-full mt-4 rounded-t-2xl bg-gradient-to-b border-t shadow-inner flex flex-col justify-center items-center text-center ${user.height} ${user.color}`}>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-75">Score</span>
                        <span className="text-sm md:text-lg font-black mt-0.5 leading-none">{user.score.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Table List */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Xếp Hạng Người Học</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bảng xếp hạng cập nhật thời gian thực</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                  {rankings.length + top3.length} người học
                </span>
              </div>

              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {rankings.length === 0 && top3.length <= 3 && (
                  <div className="p-12 text-center text-slate-400">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">Không có thêm thứ hạng nào khác ngoài Top 3.</p>
                  </div>
                )}
                
                {rankings.map((row) => (
                  <div 
                    key={row.userId} 
                    className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50 group border-l-4 border-transparent ${
                      row.userId === user?.id ? 'bg-blue-50/20 border-l-blue-500' : 'hover:border-l-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Number */}
                      <span className="w-8 text-center text-xs font-black text-slate-450">
                        {row.rank}
                      </span>
                      
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full border border-slate-100 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt={row.displayName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 uppercase">
                            {row.displayName.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Display name & level badge */}
                      <div>
                        <span className={`text-xs font-bold block ${row.userId === user?.id ? 'text-blue-600' : 'text-slate-800'}`}>
                          {row.displayName} {row.userId === user?.id && <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider bg-blue-100 px-1.5 py-0.5 rounded-md ml-1.5">BẠN</span>}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-450 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wide">
                            Lvl {row.level}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-orange-500 fill-orange-500/20" /> {row.streak} ngày
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Criteria Value */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800 block">
                        {row.score.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                        {row.secondaryValue || 'Score'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: HALL OF FAME & REWARDS PANEL */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* HALL OF FAME BENTO GRID */}
            {hallOfFame && (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Đền Danh Vọng (All-time)</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Những người học nổi bật hàng đầu hệ thống</p>
                </div>

                <div className="space-y-4">
                  
                  {/* Category Card helper */}
                  {[
                    { winner: hallOfFame.vocabularyKing, title: 'Vocabulary King', icon: BookMarked, color: 'text-indigo-500 bg-indigo-50', unit: 'từ' },
                    { winner: hallOfFame.practiceMaster, title: 'Practice Master', icon: Layers, color: 'text-sky-500 bg-sky-50', unit: 'test' },
                    { winner: hallOfFame.readingChampion, title: 'Reading Champion', icon: BookOpen, color: 'text-emerald-500 bg-emerald-50', unit: 'bài đọc' },
                    { winner: hallOfFame.pronunciationMaster, title: 'Pronunciation Master', icon: Mic, color: 'text-rose-500 bg-rose-50', unit: 'điểm trung bình' },
                    { winner: hallOfFame.longestStreak, title: 'Longest Streak', icon: Flame, color: 'text-orange-500 bg-orange-50', unit: 'ngày' }
                  ].map((category, index) => {
                    const Icon = category.icon;
                    const w = category.winner;
                    if (!w) return null;

                    return (
                      <div key={index} className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-slate-55 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block leading-none">
                            {category.title}
                          </span>
                          <span className="text-xs font-bold text-slate-800 mt-1 block truncate" title={w.displayName}>
                            {w.displayName}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-800 block">
                            {w.value.toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5 block leading-none">
                            {category.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEKLY REWARDS CARD */}
            <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 p-6 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-450/20 border border-yellow-450/30 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wide">Giải Thưởng Hàng Tuần</h3>
                    <p className="text-[10px] text-white/50 font-medium">Nhận thưởng mỗi 00:00 Thứ Hai</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🥇</span>
                      <span className="text-xs font-bold">Top 1 Hàng Tuần</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-yellow-400 block">+1,000 XP</span>
                      <span className="text-[9px] text-yellow-400/70 font-semibold tracking-tight uppercase">Badge Champion</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🥈</span>
                      <span className="text-xs font-semibold">Top 2 Hàng Tuần</span>
                    </div>
                    <span className="text-xs font-bold text-slate-300">+700 XP</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🥉</span>
                      <span className="text-xs font-semibold">Top 3 Hàng Tuần</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600">+500 XP</span>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🎖️</span>
                      <span className="text-xs font-semibold">Top 10 Hàng Tuần</span>
                    </div>
                    <span className="text-xs font-bold text-blue-400">+200 XP</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
