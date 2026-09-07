import React from 'react';
import { useLanguageStore } from '../../store/languageStore';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ variant = 'default', className = '' }) {
  const { language, setLanguage } = useLanguageStore();

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center bg-white/15 backdrop-blur-md p-0.5 rounded-full border border-white/25 shadow-xs ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('vi')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
            language === 'vi'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-white/80 hover:text-white'
          }`}
          title="Tiếng Việt"
        >
          <span>🇻🇳</span>
          <span>VI</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
            language === 'en'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-white/80 hover:text-white'
          }`}
          title="English"
        >
          <span>🇬🇧</span>
          <span>EN</span>
        </button>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`w-full p-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pl-1">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span>{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
        </div>
        <div className="inline-flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage('vi')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
              language === 'vi'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🇻🇳</span>
            <span>VI</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>
      </div>
    );
  }

  // Default header variant
  return (
    <div className={`inline-flex items-center bg-white/20 hover:bg-white/25 backdrop-blur-md p-1 rounded-full border border-white/30 shadow-sm transition-colors ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('vi')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          language === 'vi'
            ? 'bg-white text-blue-600 shadow-md scale-100'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        title="Tiếng Việt"
      >
        <span className="text-sm leading-none">🇻🇳</span>
        <span>VI</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          language === 'en'
            ? 'bg-white text-blue-600 shadow-md scale-100'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        title="English"
      >
        <span className="text-sm leading-none">🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
export default LanguageSwitcher;
