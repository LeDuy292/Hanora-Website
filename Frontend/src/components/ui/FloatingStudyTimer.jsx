import { useState, useEffect, useRef } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/notificationStore';
import { Clock, Play, Pause, RotateCcw, Square, ChevronDown, ChevronUp, CheckCircle, X, GripHorizontal } from 'lucide-react';

export const FloatingStudyTimer = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const refreshStats = useAuthStore((s) => s.refreshStats);

  const {
    timerState,
    elapsedSeconds,
    countdownTargetSeconds,
    isHidden,
    isMinimized,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    finishTimer,
    hideWidget,
    setIsMinimized
  } = useTimerStore();

  // Drag position state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('hanora_timer_pos');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { x: window.innerWidth - 310, y: window.innerHeight - 250 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  // Sync stats when timer mounts
  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
    }
  }, [isAuthenticated, refreshStats]);

  // Drag Event Handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      let newX = dragStartRef.current.posX + deltaX;
      let newY = dragStartRef.current.posY + deltaY;

      // Screen bounds check
      newX = Math.max(10, Math.min(window.innerWidth - 300, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 200, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('hanora_timer_pos', JSON.stringify(position));
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, position]);

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handleClose = (e) => {
    e.stopPropagation();
    hideWidget();
    toast.info("Đã ẩn đồng hồ học tập. Bắt đầu tính giờ hoặc nhấp biểu tượng đồng hồ trên thanh điều hướng để mở lại.");
  };

  if (!isAuthenticated || isHidden) return null;

  // Map directly with user's today's daily goal & today's studied minutes
  const targetMinutes = Math.ceil((countdownTargetSeconds || 0) / 60) || user?.targetDailyMinutes || user?.preferences?.dailyGoalMinutes || 90;
  const todayMinutes = user?.todayMinutes || 0;
  const currentMinutes = Math.floor(elapsedSeconds / 60);
  const totalMinsToday = todayMinutes + currentMinutes;

  const progressPercent = Math.min(100, Math.round((totalMinsToday / targetMinutes) * 100));
  const remainingMins = Math.max(0, targetMinutes - totalMinsToday);

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    try {
      const saved = await finishTimer((mins) => {
        toast.success(`Đã hoàn thành ${mins} phút học! +${mins * 10} XP đã cộng vào tài khoản.`);
      });
      if (!saved) {
        toast.info("Thời gian học dưới 1 phút chưa đủ để ghi nhận.");
      } else {
        await refreshStats();
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra khi lưu thời gian học.");
    }
  };

  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isGoalReached = totalMinsToday >= targetMinutes;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-[9990] flex flex-col items-end select-none font-sans animate-in fade-in zoom-in-90 duration-200 ${
        isDragging ? 'cursor-grabbing opacity-90 scale-[1.02]' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Minimized View */}
      {isMinimized ? (
        <div
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all duration-300 ${
            isGoalReached
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20'
              : isRunning
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20'
              : isPaused
              ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <GripHorizontal className="w-3.5 h-3.5 opacity-40 cursor-grab shrink-0" />
          <div
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 cursor-pointer"
            title="Mở rộng đồng hồ mục tiêu học tập"
          >
            <div className="relative flex items-center justify-center">
              {isGoalReached ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <Clock className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              )}
              {isRunning && !isGoalReached && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black font-mono tracking-tight">
              <span>{formatMMSS(elapsedSeconds)}</span>
              <span className="opacity-40">|</span>
              <span className="font-sans text-[11px]">{totalMinsToday}/{targetMinutes}p ({progressPercent}%)</span>
            </div>
            <ChevronUp className="w-3.5 h-3.5 opacity-70" />
          </div>

          <button
            onClick={handleClose}
            className="p-1 hover:bg-black/10 rounded-full transition-colors ml-1"
            title="Ẩn đồng hồ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Expanded Floating Clock Card */
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 w-72 space-y-3.5 text-slate-800 transition-all duration-300">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 cursor-grab">
              <GripHorizontal className="w-4 h-4 text-slate-300 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide leading-tight flex items-center gap-1">
                    ĐỒNG HỒ MỤC TIÊU
                    {isGoalReached && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-1.5 py-0.2 rounded-md">
                        ĐẠT GOAL
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Mục tiêu: <span className="text-blue-600 font-black">{targetMinutes} phút/ngày</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Thu nhỏ đồng hồ"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Ẩn đồng hồ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time Counter Display */}
          <div className="bg-slate-50/80 border border-slate-150 rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phiên đang học</span>
              <span className="text-3xl font-black font-mono text-blue-600 leading-none mt-1">
                {formatMMSS(elapsedSeconds)}
              </span>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tiến trình ngày</span>
              <span className="text-sm font-black text-slate-800 block leading-tight mt-0.5">
                {totalMinsToday} / {targetMinutes} <span className="text-xs text-slate-500 font-bold">phút</span>
              </span>
              {isGoalReached ? (
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 border border-blue-100/50">
                  🎉 Hoàn thành!
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-1 border border-slate-200/50">
                  Còn {remainingMins} phút
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Đã hoàn thành</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className={`h-full transition-all duration-500 rounded-full ${isGoalReached ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-600 to-sky-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex items-center gap-1.5 pt-1">
            {isRunning ? (
              <button
                onClick={pauseTimer}
                className="flex-grow py-2 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer animate-in fade-in"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Tạm dừng</span>
              </button>
            ) : isPaused ? (
              <button
                onClick={resumeTimer}
                className="flex-grow py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer animate-in fade-in"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Tiếp tục</span>
              </button>
            ) : (
              <button
                onClick={startTimer}
                className="flex-grow py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer animate-in fade-in"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Bắt đầu tính giờ</span>
              </button>
            )}

            {/* Reset Button (RotateCcw) */}
            {(isRunning || isPaused || elapsedSeconds > 0) && (
              <button
                onClick={() => {
                  resetTimer();
                  toast.info("Đã đặt lại đồng hồ học tập.");
                }}
                className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 rounded-full font-bold text-xs flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer animate-in slide-in-from-right duration-200"
                title="Đặt lại"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save XP button */}
            {(isRunning || isPaused || elapsedSeconds > 0) && (
              <button
                onClick={handleFinish}
                className="py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer animate-in slide-in-from-right duration-200"
                title="Lưu thời gian học nhận XP"
              >
                <Square className="w-3.5 h-3.5 fill-current text-emerald-600" />
                <span>Lưu XP</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

