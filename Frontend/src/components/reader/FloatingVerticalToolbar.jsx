import React, { useState } from 'react';
import {
  MousePointer, Highlighter, Pencil, Eraser, FileText, Pin,
  Undo2, Redo2, Palette, Type, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';

const GET_HIGHLIGHT_COLORS = (lang) => [
  { id: 'yellow', name: lang === 'en' ? 'Yellow (New Word)' : 'Vàng (Từ mới)', value: '#fef08a' },
  { id: 'green', name: lang === 'en' ? 'Green (Understood)' : 'Xanh lá (Đã hiểu)', value: '#bbf7d0' },
  { id: 'blue', name: lang === 'en' ? 'Blue (Important)' : 'Xanh dương (Quan trọng)', value: '#bfdbfe' },
  { id: 'purple', name: lang === 'en' ? 'Purple (Grammar)' : 'Tím (Ngữ pháp)', value: '#e9d5ff' },
  { id: 'pink', name: lang === 'en' ? 'Pink (Idiom)' : 'Hồng (Thành ngữ)', value: '#fbcfe8' },
  { id: 'red', name: lang === 'en' ? 'Red (Review)' : 'Đỏ (Cần xem lại)', value: '#fecaca' }
];

const GET_DRAWING_COLORS = (lang) => [
  { id: 'red', name: lang === 'en' ? 'Red' : 'Đỏ', value: '#ef4444' },
  { id: 'yellow', name: lang === 'en' ? 'Yellow' : 'Vàng', value: '#facc15' },
  { id: 'green', name: lang === 'en' ? 'Green' : 'Xanh lá', value: '#22c55e' },
  { id: 'blue', name: lang === 'en' ? 'Blue' : 'Xanh dương', value: '#2563eb' },
  { id: 'purple', name: lang === 'en' ? 'Purple' : 'Tím', value: '#9333ea' },
  { id: 'black', name: lang === 'en' ? 'Black' : 'Đen', value: '#111827' }
];

const PEN_WIDTHS = [
  { value: 1, label: '1px' },
  { value: 3, label: '3px' },
  { value: 5, label: '5px' },
  { value: 8, label: '8px' }
];

const GET_PEN_STYLES = (lang) => [
  { id: 'solid', name: lang === 'en' ? 'Solid' : 'Nét liền' },
  { id: 'dashed', name: lang === 'en' ? 'Dashed' : 'Nét đứt' },
  { id: 'highlight', name: 'Highlight' },
  { id: 'pencil', name: lang === 'en' ? 'Pencil' : 'Bút chì' },
  { id: 'marker', name: 'Marker' }
];

export default function FloatingVerticalToolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  penColor,
  setPenColor,
  penWidth,
  setPenWidth,
  penStyle,
  setPenStyle,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) {
  const { language, t } = useLanguageStore();
  const highlightColors = GET_HIGHLIGHT_COLORS(language);
  const drawingColors = GET_DRAWING_COLORS(language);
  const penStyles = GET_PEN_STYLES(language);
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'highlight' | 'pencil' | null
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSubMenu = (menu) => {
    setActiveSubMenu(prev => prev === menu ? null : menu);
  };

  return (
    <div className="fixed top-36 left-3 sm:left-6 z-[60] flex items-start gap-2 select-none animate-in fade-in slide-in-from-left-4 duration-200">
      {/* Main Vertical Floating Toolbar Container */}
      <div className="bg-white/90 hover:bg-white backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col items-center gap-1.5 transition-all">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          title={isCollapsed ? (language === 'en' ? "Expand toolbar" : "Mở rộng thanh công cụ") : (language === 'en' ? "Collapse" : "Thu gọn")}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5 rotate-90" />}
        </button>

        {!isCollapsed && (
          <>
            <div className="w-full h-px bg-slate-200/70 my-0.5" />

            {/* Pointer */}
            <button
              onClick={() => {
                setActiveTool('pointer');
                setActiveSubMenu(null);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'pointer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={t('reader.toolbar.pointer')}
            >
              <MousePointer className="w-4 h-4" />
            </button>

            {/* Highlighter */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveTool('highlight');
                  toggleSubMenu('highlight');
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all ${
                  activeTool === 'highlight'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={t('reader.toolbar.highlighter')}
              >
                <Highlighter className="w-4 h-4" />
                <span
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs"
                  style={{ backgroundColor: activeColor }}
                />
              </button>
            </div>

            {/* Pencil */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveTool('pencil');
                  toggleSubMenu('pencil');
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all ${
                  activeTool === 'pencil'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={t('reader.toolbar.pencil')}
              >
                <Pencil className="w-4 h-4" />
                <span
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs"
                  style={{ backgroundColor: penColor }}
                />
              </button>
            </div>

            {/* Eraser */}
            <button
              onClick={() => {
                setActiveTool('eraser');
                setActiveSubMenu(null);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'eraser'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={t('reader.toolbar.eraser')}
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Text Note */}
            <button
              onClick={() => {
                setActiveTool('textNote');
                setActiveSubMenu(null);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'textNote'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={t('reader.toolbar.textNote')}
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Sticky Note */}
            <button
              onClick={() => {
                setActiveTool('stickyNote');
                setActiveSubMenu(null);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'stickyNote'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={t('reader.toolbar.stickyNote')}
            >
              <Pin className="w-4 h-4" />
            </button>

            <div className="w-full h-px bg-slate-200/70 my-0.5" />

            {/* Undo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title={t('reader.toolbar.undo')}
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title={t('reader.toolbar.redo')}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Popout Submenus */}
      {!isCollapsed && activeSubMenu === 'highlight' && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3 flex flex-col gap-2 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-700">{language === 'en' ? 'Highlight Color' : 'Màu Highlight'}</span>
            <button onClick={() => setActiveSubMenu(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {highlightColors.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveColor(c.value);
                  setActiveTool('highlight');
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  activeColor === c.value ? 'ring-2 ring-blue-500 ring-offset-2 border-transparent' : 'border-slate-200 hover:scale-105'
                }`}
                title={c.name}
              >
                <span className="w-5 h-5 rounded-full shadow-xs border border-slate-300" style={{ backgroundColor: c.value }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {!isCollapsed && activeSubMenu === 'pencil' && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-3 flex flex-col gap-3 min-w-[210px] animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-xs font-bold text-slate-700">{language === 'en' ? 'Pen & Stroke Config' : 'Cấu hình bút nét vẽ'}</span>
            <button onClick={() => setActiveSubMenu(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pencil Colors */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{language === 'en' ? 'Pen Color' : 'Màu bút'}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {drawingColors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setPenColor(c.value)}
                  className={`w-7 h-7 rounded-full border transition-all ${
                    penColor === c.value ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent scale-110' : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Pen Widths */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{language === 'en' ? 'Stroke Width' : 'Độ nét'}</span>
            <div className="grid grid-cols-4 gap-1">
              {PEN_WIDTHS.map(w => (
                <button
                  key={w.value}
                  onClick={() => setPenWidth(w.value)}
                  className={`py-1 rounded-lg text-xs font-bold transition-all ${
                    penWidth === w.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pen Style */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">{language === 'en' ? 'Stroke Style' : 'Kiểu nét'}</span>
            <select
              value={penStyle}
              onChange={(e) => setPenStyle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {penStyles.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
