

export function Input({
  label,
  error,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={`w-full bg-white border ${
            error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          } rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-2 ${
            error ? 'focus:ring-red-500/20' : 'focus:ring-blue-500/10'
          } ${Icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-red-400 mt-0.5">{error}</span>
      )}
    </div>
  );
}
export default Input;
