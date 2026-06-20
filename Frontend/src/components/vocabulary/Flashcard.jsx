import { useState } from 'react';
import { Volume2, Star, Lightbulb } from 'lucide-react';

// Static database of high-quality sample sentences and contexts for common vocabulary
const WORD_DETAILS_DB = {
  "学习": {
    translation: "Học tập; nghiên cứu",
    exampleChinese: "我喜欢学习汉语。",
    examplePinyin: "Wǒ xǐhuan xuéxí Hànyǔ.",
    exampleVietnamese: "Tôi thích học tiếng Trung.",
    context: "Trong giao tiếp, “学习” thường đi với các môn học hoặc kỹ năng cụ thể."
  },
  "喜欢": {
    translation: "Thích; ưa thích",
    exampleChinese: "我不喜欢喝茶。",
    examplePinyin: "Wǒ bù xǐhuan hē chá.",
    exampleVietnamese: "Tôi không thích uống trà.",
    context: "Biểu đạt sở thích cá nhân đối với người, đồ vật hoặc hành động."
  },
  "咖啡": {
    translation: "Cà phê",
    exampleChinese: "我喝了一杯 hot 咖啡 / 我喝了一杯热咖啡。",
    examplePinyin: "Wǒ hēle yī bēi rè kāfēi.",
    exampleVietnamese: "Tôi đã uống một cốc cà phê nóng.",
    context: "Từ mượn phiên âm từ tiếng Anh 'coffee' trong tiếng Trung."
  },
  "将军": {
    translation: "Tướng quân.",
    exampleChinese: "这位将军在战场上表现得非常勇敢。",
    examplePinyin: "Zhè wèi jiāngjūn zài zhànchǎng shàng biǎoxiàn de fēicháng yǒnggǎn.",
    exampleVietnamese: "Vị tướng quân này đã thể hiện rất dũng cảm trên chiến trường.",
    context: "Trong bài đọc, “将军” chỉ người chỉ huy quân đội, có vai trò quan trọng trong việc lãnh đạo và quyết định các chiến lược quân sự."
  },
  "你好": {
    translation: "Xin chào",
    exampleChinese: "你好！很高兴认识 ti.",
    examplePinyin: "Nǐ hǎo! Hěn gāoxìng rènshi nǐ.",
    exampleVietnamese: "Xin chào! Rất vui được gặp bạn.",
    context: "Lời chào hỏi thông dụng nhất trong tiếng Trung, dùng được mọi lúc."
  },
  "谢谢": {
    translation: "Cảm ơn",
    exampleChinese: "谢谢你的 bāngzhù / 谢谢你的帮助。",
    examplePinyin: "Xièxie nǐ de bāngzhù.",
    exampleVietnamese: "Cảm ơn sự giúp đỡ của bạn.",
    context: "Sử dụng để bày tỏ lòng biết ơn đối với người khác."
  },
  "再见": {
    translation: "Tạm biệt",
    exampleChinese: "老师，再见！",
    examplePinyin: "Lǎoshī, zàijiàn!",
    exampleVietnamese: "Tạm biệt thầy cô!",
    context: "Lời tạm biệt trang trọng hoặc thông thường."
  },
  "对不起": {
    translation: "Xin xin lỗi / Xin lỗi",
    exampleChinese: "对不起，我 bận / 对不起，我来晚了。",
    examplePinyin: "Duìbuqǐ, wǒ lái wǎn le.",
    exampleVietnamese: "Xin lỗi, tôi đến muộn rồi.",
    context: "Dùng để xin lỗi khi mắc lỗi hoặc gây phiền phức."
  },
  "没关系": {
    translation: "Không sao đâu",
    exampleChinese: "没关系，别 lo lắng / 没关系，别担心。",
    examplePinyin: "Méi guānxi, bié dānxīn.",
    exampleVietnamese: "Không sao đâu, đừng lo lắng.",
    context: "Đáp lại lời xin lỗi của người khác."
  },
  "爸爸": {
    translation: "Bố / Cha",
    exampleChinese: "我爸爸是医生。",
    examplePinyin: "Wǒ bàba shì yīshēng.",
    exampleVietnamese: "Bố tôi là bác sĩ.",
    context: "Danh từ xưng hô thân mật với người cha."
  },
  "妈妈": {
    translation: "Mẹ",
    exampleChinese: "我妈妈做饭很好吃。",
    examplePinyin: "Wǒ māma zuò fàn hěn hào chī.",
    exampleVietnamese: "Mẹ tôi nấu ăn rất ngon.",
    context: "Danh từ xưng hô thân mật với người mẹ."
  },
  "哥哥": {
    translation: "Anh trai",
    exampleChinese: "我哥哥比我高。",
    examplePinyin: "Wǒ gēge bǐ wǒ gāo.",
    exampleVietnamese: "Anh trai tôi cao hơn tôi.",
    context: "Dùng cho anh trai ruột hoặc người lớn tuổi hơn mình một chút."
  },
  "姐姐": {
    translation: "Chị gái",
    exampleChinese: "我姐姐喜欢唱歌。",
    examplePinyin: "Wǒ jiějie xǐhuan chànggē.",
    exampleVietnamese: "Chị gái tôi thích ca hát.",
    context: "Chỉ chị gái ruột hoặc người lớn tuổi hơn mình một chút."
  },
  "朋友": {
    translation: "Bạn bè",
    exampleChinese: "我们是好朋友。",
    examplePinyin: "Wǒmen shì hǎo péngyou.",
    exampleVietnamese: "Chúng tôi là bạn tốt.",
    context: "Dùng để chỉ những người có mối quan hệ bạn bè thân thiết."
  },
  "米饭": {
    translation: "Cơm",
    exampleChinese: "我每天中午吃米饭。",
    examplePinyin: "Wǒ měitiān zhōngwǔ chī mǐfàn.",
    exampleVietnamese: "Tôi ăn cơm vào mỗi buổi trưa.",
    context: "Món ăn chính quen thuộc hàng ngày của người Trung Quốc."
  },
  "茶": {
    translation: "Trà",
    exampleChinese: "喝茶对身体很好。",
    examplePinyin: "Hē chá duì shēntǐ hěn hǎo.",
    exampleVietnamese: "Uống trà rất tốt cho sức khỏe.",
    context: "Đồ uống truyền thống lâu đời của Trung Quốc."
  },
  "苹果": {
    translation: "Quả táo",
    exampleChinese: "我想吃一个苹果。",
    examplePinyin: "Wǒ xiǎng chī yī gè píngguǒ.",
    exampleVietnamese: "Tôi muốn ăn một quả táo.",
    context: "Trái cây phổ biến trong tiếng Trung."
  },
  "今天": {
    translation: "Hôm nay",
    exampleChinese: "今天天气很好。",
    examplePinyin: "Jīntiān tiānqì hěn hǎo.",
    exampleVietnamese: "Thời tiết hôm nay rất đẹp.",
    context: "Dùng để chỉ ngày hiện tại."
  },
  "下雨": {
    translation: "Mưa",
    exampleChinese: "外面下雨了，别忘带雨伞。",
    examplePinyin: "Wàimiàn xiàyǔ le, bié wàng dài yǔsǎn.",
    exampleVietnamese: "Bên ngoài trời mưa rồi, đừng quên mang ô.",
    context: "Hiện tượng thời tiết tự nhiên."
  },
  "学校": {
    translation: "Trường học",
    exampleChinese: "我们学校很大。",
    examplePinyin: "Wǒmen xuéxiào hěn dà.",
    exampleVietnamese: "Trường học của chúng tôi rất lớn.",
    context: "Nơi học sinh đến học tập."
  },
  "商店": {
    translation: "Cửa hàng",
    exampleChinese: "我去商店买东西。",
    examplePinyin: "Wǒ qù shāngdiàn mǎi dōngxi.",
    exampleVietnamese: "Tôi đi cửa hàng mua đồ.",
    context: "Nơi kinh doanh bán các mặt hàng khác nhau."
  },
  "北京": {
    translation: "Bắc Kinh",
    exampleChinese: "我想去北京旅游。",
    examplePinyin: "Wǒ xiǎng qù Běijīng lǚyóu.",
    exampleVietnamese: "Tôi muốn đi du lịch Bắc Kinh.",
    context: "Thủ đô của nước Cộng hòa Nhân dân Trung Hoa."
  }
};

export function Flashcard({ 
  word, 
  isFlipped, 
  onFlip, 
  translationFirst = false,
  currentIndex = 0,
  totalCount = 1,
  toggleStar,
  isFullscreen = false
}) {

  // Fetch or dynamically generate details
  const getWordDetails = () => {
    if (WORD_DETAILS_DB[word.text]) {
      return WORD_DETAILS_DB[word.text];
    }
    // Fallback if not found in db
    return {
      translation: word.translation || "Chưa dịch.",
      exampleChinese: `我们一起用“${word.text}”写句子吧。`,
      examplePinyin: `Wǒmen yīqǐ yòng "${word.pinyin}" xiě jùzi ba.`,
      exampleVietnamese: `Chúng ta hãy cùng viết câu với từ "${word.text}" nhé.`,
      context: `Từ vựng "${word.text}" (${word.pinyin}) được sử dụng phổ biến trong tiếng Trung.`
    };
  };

  const details = getWordDetails();

  // Dynamic light colors for HSK badges
  const getHskColor = (hsk) => {
    switch (hsk) {
      case 1:
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 2:
        return "bg-blue-50 text-blue-600 border-blue-100";
      case 3:
        return "bg-amber-50 text-amber-600 border-amber-100";
      case 4:
        return "bg-purple-50 text-purple-600 border-purple-100";
      case 5:
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  // TTS audio handler
  const speakWord = (e) => {
    e.stopPropagation(); // Stop card flipping
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.text);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStarClick = (e) => {
    e.stopPropagation(); // Stop card flipping
    if (toggleStar) {
      toggleStar(word.text);
    }
  };

  const isStarred = word.starred === true;

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* 3D Flip Card Container with Mockup Size */}
      <div 
        className={`w-full perspective-1000 cursor-pointer transition-all duration-300 ${isFullscreen ? 'h-[430px]' : 'h-[560px]'}`}
        onClick={onFlip}
      >
        <div 
          className={`w-full h-full relative transform-style-3d transition-transform duration-500 rounded-[2.2rem] ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE (CLEAN OR DETAILED BASED ON MODE) */}
          <div className="absolute inset-0 w-full h-full bg-white border border-slate-200/80 rounded-[2.2rem] p-7 md:p-8 flex flex-col justify-between items-center backface-hidden shadow-md text-slate-800">
            {/* Header Row */}
            <div className="w-full flex justify-between items-center">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getHskColor(word.hsk)}`}>
                HSK {word.hsk}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold tracking-wider">
                  {currentIndex + 1} / {totalCount}
                </span>
                <button 
                  onClick={handleStarClick}
                  className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                  title="Đánh dấu từ"
                >
                  <Star className={`w-4.5 h-4.5 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>
            
            {/* Front Card Center Word */}
            <div className="text-center px-4 flex-1 flex flex-col justify-center items-center">
              {translationFirst ? (
                <h2 className="text-4xl font-extrabold text-slate-850 tracking-tight font-sans leading-normal">
                  {details.translation}
                </h2>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-6xl font-extrabold text-slate-850 font-display select-text">
                    {word.text}
                  </h2>
                  <button
                    onClick={speakWord}
                    className="p-2.5 text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100/70 rounded-full transition-colors self-center shadow-sm"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Interaction indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold font-sans mt-2">
              <span>👆 Nhấp vào thẻ để xem mặt sau</span>
            </div>
          </div>

          {/* BACK FACE (FULL DETAILED VIEW MATCHING MOCKUP) */}
          <div className="absolute inset-0 w-full h-full bg-white border border-slate-200/80 rounded-[2.2rem] p-7 md:p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-md text-slate-800">
            {/* Header Row */}
            <div className="w-full flex justify-between items-center">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getHskColor(word.hsk)}`}>
                HSK {word.hsk}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold tracking-wider">
                  {currentIndex + 1} / {totalCount}
                </span>
                <button 
                  onClick={handleStarClick}
                  className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                  title="Đánh dấu từ"
                >
                  <Star className={`w-4.5 h-4.5 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>
            
            {/* Card Content Details */}
              <div className={`flex-1 flex flex-col justify-start mt-2 overflow-y-auto pr-1 select-text ${isFullscreen ? 'gap-2.5 py-1' : 'gap-4 py-2'}`}>
              {/* Word Display with pronunciation */}
              <div className="flex items-center justify-start gap-4">
                <h3 className="text-4xl font-extrabold text-slate-850 font-display select-text">
                  {word.text}
                </h3>
                <span className="text-sm text-slate-400 font-bold tracking-wider">
                  [{word.pinyin}]
                </span>
                <button
                  onClick={speakWord}
                  className="p-2 text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100/70 rounded-full transition-colors shadow-sm ml-auto"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              
              {/* Meaning Block */}
              <div className="space-y-1.5 text-left">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block font-sans">Nghĩa</span>
                <div className="bg-blue-50/20 border border-slate-150 rounded-2xl p-4 shadow-inner">
                  <p className="text-blue-650 font-black text-base select-text leading-tight">
                    {details.translation}
                  </p>
                </div>
              </div>

              {/* Example Sentences Block */}
              <div className="space-y-1.5 text-left select-text">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block font-sans">Ví dụ</span>
                <div className="space-y-1 pl-1 font-sans">
                  <p className="text-sm font-bold text-slate-800 leading-normal">{details.exampleChinese}</p>
                  <p className="text-xs text-slate-450 font-semibold">{details.examplePinyin}</p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{details.exampleVietnamese}</p>
                </div>
              </div>

              {/* Context Block */}
              <div className="space-y-1.5 text-left">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block font-sans">Ngữ cảnh</span>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-3 shadow-inner">
                  <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed font-sans select-text">
                    {details.context}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Interaction indicator */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-bold font-sans mt-2 self-center">
              <span>👆 Nhấp vào thẻ để xem mặt trước</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;
