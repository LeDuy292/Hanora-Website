import { useState, useEffect, useRef } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/notificationStore';
import { Clock, Play, Pause, RotateCcw, ChevronDown, ChevronUp, CheckCircle, X, GripHorizontal } from 'lucide-react';

export const FloatingStudyTimer = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const refreshStats = useAuthStore((s) => s.refreshStats);

  const {
    timerState,
    elapsedSeconds,
    countdownTargetSeconds,
    addExtraSeconds,
    setCountdownTargetSeconds,
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
    return { x: window.innerWidth - 240, y: window.innerHeight - 280 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  // Sync stats when timer mounts
  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
    }
  }, [isAuthenticated, refreshStats]);

  // Set default countdown target from daily goal if not custom
  useEffect(() => {
    if (user?.targetDailyMinutes && countdownTargetSeconds === 25 * 60 && elapsedSeconds === 0) {
      const remainingGoalMins = Math.max(1, user.targetDailyMinutes - (user.todayMinutes || 0));
      setCountdownTargetSeconds(remainingGoalMins * 60);
    }
  }, [user, countdownTargetSeconds, elapsedSeconds, setCountdownTargetSeconds]);

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
      newX = Math.max(10, Math.min(window.innerWidth - 220, newX));
      newY = Math.max(10, Math.min(window.innerHeight - 220, newY));

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
    toast.info("Đã ẩn đồng hồ học tập.");
  };

  if (!isAuthenticated || isHidden) return null;

  // Countdown calculations
  const targetSeconds = countdownTargetSeconds || 25 * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  
  const progressPercent = Math.min(100, ((targetSeconds - remainingSeconds) / targetSeconds) * 100);

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';

  // Circle SVG specs
  const radius = 76;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-[9990] flex flex-col items-center select-none font-sans animate-in fade-in zoom-in-90 duration-200 ${
        isDragging ? 'cursor-grabbing opacity-90 scale-[1.02]' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Minimized View */}
      {isMinimized ? (
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all duration-300 ${
            isRunning
              ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/20'
              : isPaused
              ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20'
              : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <GripHorizontal className="w-3.5 h-3.5 opacity-40 cursor-grab shrink-0" />
          <div
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 cursor-pointer"
            title="Mở rộng đồng hồ đếm ngược"
          >
            <Clock className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="text-sm font-black font-mono tracking-tight">{formatMMSS(remainingSeconds)}</span>
            <ChevronUp className="w-3.5 h-3.5 opacity-70" />
          </div>

          <button
            onClick={handleClose}
            className="p-1 hover:bg-black/10 rounded-full transition-colors ml-0.5"
            title="Ẩn đồng hồ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Circular Countdown Clock Container */
        <div className="relative group">
          {/* Top Bar Floating Controls */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full shadow-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <GripHorizontal className="w-3 h-3 text-slate-300 cursor-grab" />
            <button
              onClick={() => setIsMinimized(true)}
              className="hover:text-purple-300 p-0.5 transition"
              title="Thu nhỏ"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClose}
              className="hover:text-red-400 p-0.5 transition"
              title="Ẩn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main White Circular Card */}
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-white shadow-2xl border border-slate-100 flex flex-col items-center justify-center p-3 select-none overflow-hidden">
            
            {/* SVG Gradient Circular Stroke Ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none p-1.5" viewBox="0 0 170 170">
              <defs>
                <linearGradient id="purpleRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333EA" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              {/* Background Ring */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                className="stroke-slate-100 fill-transparent"
                strokeWidth={strokeWidth}
              />
              {/* Active Animated Progress Ring */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke="url(#purpleRingGrad)"
                className="fill-transparent transition-all duration-1000 ease-linear"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner Content Stack */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-1">
              
              {/* 1. Top Pill Badge: +1 min */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addExtraSeconds(60);
                  toast.success("Đã thêm +1 phút!");
                }}
                className="text-[11px] font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-2.5 py-0.5 rounded-full transition shadow-2xs active:scale-95 flex items-center gap-0.5 cursor-pointer"
                title="Thêm 1 phút đếm ngược"
              >
                +1 min
              </button>

              {/* 2. Center Digits: 02:30 */}
              <div className="py-0.5">
                <span className="text-3xl sm:text-[2.25rem] font-black font-mono tracking-tight text-slate-900 leading-none">
                  {formatMMSS(remainingSeconds)}
                </span>
              </div>

              {/* 3. Solid Purple Horizontal Line Divider */}
              <div className="w-24 h-[2px] bg-purple-600 rounded-full my-1 shadow-xs"></div>

              {/* 4. Controls Row: Pause/Play (Purple circle) & Reset (Gray circle) */}
              <div className="flex items-center gap-2.5 pt-1">
                {/* Primary Button: Play / Pause */}
                {isRunning ? (
                  <button
                    onClick={pauseTimer}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md hover:shadow-purple-500/30 transition transform active:scale-95"
                    title="Tạm dừng"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (isPaused) resumeTimer();
                      else startTimer();
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-md hover:shadow-purple-500/30 transition transform active:scale-95"
                    title="Bắt đầu"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}

                {/* Secondary Button: Reset / Restart */}
                <button
                  onClick={() => {
                    resetTimer();
                    toast.info("Đã đặt lại đồng hồ.");
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80 flex items-center justify-center transition transform active:scale-95"
                  title="Đặt lại"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
