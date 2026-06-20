

export function Loading({ 
  message = "Loading...", 
  size = "md",
  className = "" 
}) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4"
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-4 ${className}`}>
      <div className="relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-xl animate-pulse-subtle"></div>
        {/* Spinner */}
        <div className={`${sizeClasses[size]} border-slate-800 border-t-brand-500 rounded-full animate-spin relative z-10`}></div>
      </div>
      {message && (
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
export default Loading;
