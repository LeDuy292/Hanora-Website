import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Search,
  Loader2, AlertCircle, BookMarked, GraduationCap,
  CheckCircle2, Hourglass, XCircle, Lock, ShieldAlert, X
} from 'lucide-react';
import { getLibraryDocuments } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { isAllowedHskUser } from '../utils/constants';

// HSK level definitions
const HSK_LEVELS = [
  { key: 'all', label: 'Tất cả', gradient: 'from-slate-500 to-slate-700' },
  { key: 'hsk1', label: 'HSK 1', gradient: 'from-emerald-400 to-teal-600' },
  { key: 'hsk2', label: 'HSK 2', gradient: 'from-sky-400 to-blue-600' },
  { key: 'hsk3', label: 'HSK 3', gradient: 'from-violet-400 to-purple-700' },
  { key: 'hsk4', label: 'HSK 4', gradient: 'from-orange-400 to-red-600' },
  { key: 'hsk5', label: 'HSK 5', gradient: 'from-pink-400 to-rose-600' },
  { key: 'hsk6', label: 'HSK 6', gradient: 'from-amber-400 to-yellow-600' },
];

function detectHskLevel(doc) {
  const text = (doc.title + ' ' + doc.originalFilename).toLowerCase();
  if (text.includes('hsk1') || text.includes('hsk 1')) return 'hsk1';
  if (text.includes('hsk2') || text.includes('hsk 2')) return 'hsk2';
  if (text.includes('hsk3') || text.includes('hsk 3')) return 'hsk3';
  if (text.includes('hsk4') || text.includes('hsk 4')) return 'hsk4';
  if (text.includes('hsk5') || text.includes('hsk 5')) return 'hsk5';
  if (text.includes('hsk6') || text.includes('hsk 6')) return 'hsk6';
  return null;
}

function detectBookType(doc) {
  const text = (doc.title + ' ' + doc.originalFilename).toLowerCase();
  if (text.includes('bài tập') || text.includes('bai tap') || text.includes('workbook')) {
    return { label: 'Sách bài tập', icon: '📝' };
  }
  if (text.includes('giáo trình') || text.includes('giao trinh') || text.includes('textbook')) {
    return { label: 'Giáo trình', icon: '📖' };
  }
  return { label: 'Tài liệu', icon: '📄' };
}

function StatusBadge({ status }) {
  if (status === 'Ready') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-2.5 h-2.5" /> Sẵn sàng
      </span>
    );
  }
  if (['Processing', 'RecognizingOcr', 'AnalyzingContent'].includes(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        <Hourglass className="w-2.5 h-2.5 animate-pulse" /> Đang xử lý
      </span>
    );
  }
  if (status === 'Failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-2.5 h-2.5" /> Lỗi
      </span>
    );
  }
  return null;
}

function BookCard({ doc, levelInfo, bookType, isAllowed, onOpen, onRestrictedClick }) {
  const gradient = levelInfo?.gradient || 'from-slate-400 to-slate-600';
  const isReady = doc.status === 'Ready';
  const isProcessing = ['Processing', 'RecognizingOcr', 'AnalyzingContent'].includes(doc.status);

  const handleClick = () => {
    if (!isReady) return;
    if (isAllowed) {
      onOpen();
    } else {
      onRestrictedClick();
    }
  };

  return (
    <div
      onClick={isReady ? handleClick : undefined}
      className={`group relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col
        ${isReady ? (isAllowed ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer hover:border-blue-200' : 'cursor-pointer hover:border-amber-300 hover:shadow-md') : 'opacity-75 cursor-default'}
      `}
    >
      {/* Book Cover */}
      <div className={`h-36 bg-gradient-to-br ${gradient} relative flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 right-4 h-px bg-white/60 rounded" />
          <div className="absolute top-7 left-6 right-6 h-px bg-white/40 rounded" />
          <div className="absolute top-10 left-4 right-4 h-px bg-white/30 rounded" />
          <div className="absolute bottom-4 left-4 right-4 h-px bg-white/50 rounded" />
          <div className="absolute bottom-7 left-6 right-6 h-px bg-white/30 rounded" />
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/10 rounded-l-2xl" />
        <span className="text-4xl drop-shadow-lg z-10 transition-transform duration-300 group-hover:scale-110">
          {bookType.icon}
        </span>

        {/* Lock Overlay Badge if not allowed */}
        {!isAllowed && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200/90 backdrop-blur-sm border border-amber-300 px-2 py-0.5 rounded-full shadow-sm">
            <Lock className="w-2.5 h-2.5" /> Giới hạn
          </span>
        )}

        {levelInfo && levelInfo.key !== 'all' && (
          <span className="absolute top-3 right-3 text-[10px] font-black text-white bg-white/20 backdrop-blur-sm border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
            {levelInfo.label}
          </span>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-[10px] font-bold text-white/90">Đang xử lý...</span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {doc.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
          <span>{bookType.label}</span>
        </div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <StatusBadge status={doc.status} />
          {doc.fileSizeBytes && (
            <span className="text-[10px] text-slate-400 font-medium">
              {(doc.fileSizeBytes / 1024 / 1024).toFixed(0)} MB
            </span>
          )}
        </div>
        {isReady && (
          isAllowed ? (
            <div className="mt-1 w-full py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[11px] font-bold text-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
              Mở đọc →
            </div>
          ) : (
            <div className="mt-1 w-full py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center gap-1.5 group-hover:bg-amber-100 group-hover:text-amber-800 transition-all duration-200">
              <Lock className="w-3 h-3 text-slate-400 group-hover:text-amber-700" />
              Khóa quyền đọc
            </div>
          )
        )}
      </div>
    </div>
  );
}

function AccessDeniedModal({ isOpen, onClose, userEmail }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 border border-amber-200 text-amber-600">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-1.5">
            Tính năng đọc sách đang bị khóa
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Hiện tại tính năng mở và đọc sách trong <strong>Thư viện HSK</strong> đang trong giai đoạn thử nghiệm có giới hạn và chỉ khả dụng cho các tài khoản được ủy quyền.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-left mb-5">
            <div className="text-[11px] text-slate-400 font-semibold mb-1">Tài khoản hiện tại của bạn:</div>
            <div className="text-xs font-bold text-slate-800 break-all flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              {userEmail || 'Chưa đăng nhập'}
            </div>
            <div className="text-[10px] text-amber-700 font-medium mt-1">
              (Chưa nằm trong danh sách mở khóa)
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLevel, setActiveLevel] = useState(() => {
    const lvl = searchParams.get('level');
    return HSK_LEVELS.find(l => l.key === lvl) ? lvl : 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAllowed = isAllowedHskUser(user);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLibraryDocuments();
      const hskDocs = data.filter(doc => detectHskLevel(doc) !== null);
      setDocuments(hskDocs);
    } catch (err) {
      setError('Không thể tải danh sách sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filteredDocs = documents.filter(doc => {
    const docLevel = detectHskLevel(doc);
    const matchesLevel = activeLevel === 'all' || docLevel === activeLevel;
    const matchesSearch = !searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const levelCounts = HSK_LEVELS.reduce((acc, lvl) => {
    acc[lvl.key] = lvl.key === 'all'
      ? documents.length
      : documents.filter(d => detectHskLevel(d) === lvl.key).length;
    return acc;
  }, {});

  const activeLevelInfo = HSK_LEVELS.find(l => l.key === activeLevel);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      <AccessDeniedModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        userEmail={user?.email}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookMarked className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Thư viện HSK</h1>
                <p className="text-xs text-slate-500 font-medium">Sách giáo trình &amp; bài tập từ HSK 1 đến HSK 6</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sách..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-64"
              />
            </div>
          </div>

          {/* HSK Level Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            {HSK_LEVELS.map(level => {
              const isActive = activeLevel === level.key;
              const count = levelCounts[level.key] || 0;
              return (
                <button
                  key={level.key}
                  onClick={() => setActiveLevel(level.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200
                    ${isActive
                      ? `bg-gradient-to-r ${level.gradient} text-white shadow-lg shadow-blue-500/15`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                >
                  {level.key !== 'all' && <GraduationCap className="w-3.5 h-3.5" />}
                  {level.label}
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-white text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Đang tải thư viện sách...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={fetchDocs} className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
              Thử lại
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <BookOpen className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500">
                {documents.length === 0 ? 'Chưa có sách nào trong thư viện' : `Không tìm thấy sách ${activeLevel !== 'all' ? activeLevelInfo?.label : ''} nào`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {documents.length === 0 ? 'Sách HSK sẽ xuất hiện ở đây sau khi được tải lên.' : 'Thử chọn cấp độ khác hoặc xóa từ khóa tìm kiếm.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {activeLevelInfo?.key === 'all' ? 'Tất cả sách' : activeLevelInfo?.label}
                <span className="ml-1.5">({filteredDocs.length} cuốn)</span>
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredDocs.map(doc => {
                const level = detectHskLevel(doc);
                const levelInfo = HSK_LEVELS.find(l => l.key === level);
                const bookType = detectBookType(doc);
                return (
                  <BookCard
                    key={doc.id}
                    doc={doc}
                    levelInfo={levelInfo}
                    bookType={bookType}
                    isAllowed={isAllowed}
                    onOpen={() => navigate(`/reader/${doc.id}`)}
                    onRestrictedClick={() => setIsAccessModalOpen(true)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LibraryPage;
