

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon,
  disabled = false,
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] text-white shadow-md hover:shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 border border-blue-500/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/50",
    accent: "bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.97] text-white shadow-md hover:shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 border border-blue-500/20",
    ghost: "text-slate-500 hover:text-blue-600 hover:bg-slate-100/60",
    danger: "bg-red-50 hover:bg-red-100 text-red-500 border border-red-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />}
      {children}
    </button>
  );
}
export default Button;
