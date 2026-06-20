import { Trash2, Calendar } from 'lucide-react';

export function VocabularyCard({ word, onRemove }) {
  // Setup color schema for HSK badges in light theme
  const getHskColor = (hsk) => {
    if (hsk === 1) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (hsk === 2) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-purple-50 text-purple-600 border-purple-100";
  };

  const hskLabel = `HSK ${word.hsk}`;

  const getDifficultyColor = (diff) => {
    if (diff === 'easy') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (diff === 'hard') return 'bg-red-50 text-red-500 border-red-100';
    return 'bg-amber-50 text-amber-600 border-amber-100'; // medium
  };

  const getDifficultyLabel = (diff) => {
    if (diff === 'easy') return 'Dễ';
    if (diff === 'hard') return 'Khó';
    return 'T.Bình';
  };

  const getSrsLabel = (level) => {
    if (level >= 5) return 'Thành thạo';
    if (level >= 3) return 'Khá tốt';
    if (level >= 1) return 'Đang học';
    return 'Từ mới';
  };

  const getSrsColor = (level) => {
    if (level >= 5) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (level >= 3) return 'text-sky-650 bg-sky-50 border-sky-100';
    if (level >= 1) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  return (
    <div className="relative group bg-white border border-slate-100 rounded-2xl p-6 transition-all duration-300 hover:border-slate-200 hover:shadow-md flex flex-col gap-4">
      {/* Top badges */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getHskColor(word.hsk)}`}>
          {hskLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${getSrsColor(word.srsLevel)}`}>
            {getSrsLabel(word.srsLevel)}
          </span>
          <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${getDifficultyColor(word.difficulty)}`}>
            {getDifficultyLabel(word.difficulty)}
          </span>
        </div>
      </div>

      {/* Word Content */}
      <div className="flex-1 flex flex-col justify-center text-center my-2">
        <h3 className="text-3xl font-bold text-slate-800 font-display mb-1 select-text">
          {word.text}
        </h3>
        <p className="text-sm font-bold text-blue-600 tracking-wide select-text">
          {word.pinyin}
        </p>
        <p className="text-sm text-slate-500 mt-2 select-text italic">
          "{word.translation}"
        </p>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-350" />
          <span>Ôn tập: {word.nextReviewDate}</span>
        </div>
        
        {/* Delete Trigger */}
        <button
          onClick={() => onRemove(word.text)}
          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          title="Xóa khỏi sổ tay"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
export default VocabularyCard;
