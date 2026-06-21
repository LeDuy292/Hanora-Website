import { Button } from './Button';

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className = ""
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel max-w-md mx-auto ${className}`}>
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 mb-4 animate-bounce">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
