import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Search, Plus, Clock, Star, Info, PlayCircle, PlusCircle } from 'lucide-react';
import { PRONUNCIATION_SAMPLES } from '../utils/constants';

// Image assets
import heroTabletImg from '../assets/pronunciation_hero_tablet_1780674163687.png';
import calligraphyImg from '../assets/calligraphy_challenge_1780674185129.png';

export function PronunciationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSamples = PRONUNCIATION_SAMPLES.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.sentences.some(sent => sent.chinese.includes(searchQuery))
  );

  const handleStartPractice = (lessonId) => {
    navigate(`/pronunciation/practice/${lessonId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-10 page-transition bg-[#F8FAFC] min-h-screen">
      
      {/* Hero Section */}
      <div className="relative bg-[#2088E2] rounded-[2rem] overflow-hidden p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 shadow-lg group">
        <div className="flex-1 space-y-6 relative z-10 text-white">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 opacity-80">
              LUYỆN NÓI TIẾNG TRUNG AI
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Luyện Phát Âm Chuẩn AI
            </h1>
            <p className="text-base text-blue-50 font-medium max-w-md leading-relaxed opacity-90 pt-2">
              Cải thiện ngữ điệu và độ chính xác của bạn với hệ thống phân tích giọng nói thông minh. 
              Chọn từ thư viện mẫu hoặc tự thêm nội dung của riêng bạn.
            </p>
          </div>
          
          <button className="flex items-center gap-3 px-6 py-3.5 bg-[#011C3A] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#002B5B] transition-all shadow-md active:scale-95">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            Tự thêm bài luyện tập
          </button>
        </div>

        <div className="flex-1 max-w-md">
           <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl skew-y-1 transform transition-transform duration-700 group-hover:skew-y-0 group-hover:scale-105">
              <img 
                src={heroTabletImg} 
                alt="AI Practice" 
                className="w-full h-auto object-cover"
              />
           </div>
        </div>
      </div>

      {/* List Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
           Danh sách Văn mẫu Có sẵn
        </h2>
        
        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Tìm kiếm văn mẫu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full focus:outline-none focus:border-blue-400 transition-all text-xs font-bold text-slate-600 placeholder:text-slate-300 shadow-sm"
          />
        </div>
      </div>

      {/* Grid: Lesson Cards based on User Snippet 100% */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSamples.filter(s => !s.isChallenge).map((lesson) => (
          <div key={lesson.id} className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold scale-90 origin-left ${
                lesson.level === 'HSK 1' ? 'bg-blue-50 text-blue-700' : 
                lesson.level === 'HSK 3' ? 'bg-indigo-50 text-indigo-700' :
                'bg-emerald-50 text-emerald-700'
              }`}>
                {lesson.level}
              </span>
              <span className="text-slate-400 flex items-center gap-1 font-bold text-[13px]">
                <span className="material-symbols-outlined text-[16px]">schedule</span> 
                {lesson.duration}
              </span>
            </div>
            <h3 className="text-[26px] font-bold text-slate-800 mb-1 leading-tight font-display">
              {lesson.sentences[0].chinese}
            </h3>
            <p className="text-slate-400 italic mb-2 text-[14px]">
              {lesson.sentences[0].pinyin}
            </p>
            <p className="text-slate-500 mb-6 text-[15px]">
              "{lesson.sentences[0].vietnamese}"
            </p>
            <button 
              onClick={() => handleStartPractice(lesson.id)}
              className="w-full py-2.5 bg-slate-50 text-[#2088E2] font-black rounded-full hover:bg-[#2088E2] hover:text-white transition-all flex items-center justify-center gap-2 text-[15px] active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
              Luyện tập ngay
            </button>
          </div>
        ))}

        {/* Challenge Section based on User Snippet 100% */}
        {filteredSamples.filter(s => s.isChallenge).map(challenge => (
          <div key={challenge.id} className="md:col-span-2 bg-gradient-to-br from-white to-slate-50 border border-slate-100 p-8 rounded-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-6 items-center group">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[11px] font-bold scale-90 origin-left uppercase tracking-wider">
                  {challenge.level} - Thử thách
                </span>
                <span className="text-slate-400 flex items-center gap-1 font-bold text-[13px]">
                  <span className="material-symbols-outlined text-[16px]">wb_sunny</span> 
                  Bonus Point
                </span>
              </div>
              <h3 className="text-[32px] font-black text-slate-800 mb-2 font-display leading-tight">
                {challenge.sentences[0].chinese}
              </h3>
              <p className="text-slate-400 italic mb-3 text-[15px]">
                {challenge.sentences[0].pinyin}
              </p>
              <p className="text-slate-500 mb-6 text-[16px] leading-relaxed">
                "{challenge.sentences[0].vietnamese}"
              </p>
              <button 
                onClick={() => handleStartPractice(challenge.id)}
                className="px-8 py-3 bg-[#005BAC] text-white font-bold rounded-xl hover:bg-[#004A8C] transition-all text-[15px] active:scale-95 shadow-md"
              >
                Bắt đầu thử thách
              </button>
            </div>
            <div className="w-full md:w-[40%] aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
              <img 
                alt="Traditional Chinese Scroll" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                src={calligraphyImg}
              />
            </div>
          </div>
        ))}

        {/* Custom Card based on User Snippet 100% */}
        <button className="border-2 border-dashed border-slate-200 p-6 rounded-[24px] flex flex-col items-center justify-center gap-4 hover:border-[#2088E2] hover:bg-white transition-all min-h-[250px] group shadow-sm active:scale-95 bg-white/50">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-[#2088E2] transition-colors">
            <span className="material-symbols-outlined text-[28px]">add</span>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px] mb-1">Thêm nội dung riêng</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Dán văn bản bất kỳ để luyện tập</p>
          </div>
        </button>
      </div>

    </div>
  );
}
export default PronunciationPage;
