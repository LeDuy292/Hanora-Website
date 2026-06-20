export const HSK_LEVELS = {
  1: { label: "HSK 1", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  2: { label: "HSK 2", color: "bg-blue-50 text-blue-600 border-blue-100" },
  3: { label: "HSK 3", color: "bg-orange-50 text-orange-600 border-orange-100" },
  4: { label: "HSK 4", color: "bg-red-50 text-red-500 border-red-100" }
};

export const THEMES = {
  dark: { label: "Imperial Dark", class: "reader-theme-dark" },
  light: { label: "Classic Light", class: "reader-theme-light" },
  warm: { label: "Warm Sepia", class: "reader-theme-warm" }
};

export const DEFAULT_DOCUMENTS = [
  {
    id: "demo-1",
    title: "Learning Chinese (学习汉语)",
    content: "你好！很高兴認識你。学习汉语很有意思，但是也很难。我不喜欢看书，但是我喜欢听音乐 và 喝咖啡。我喜欢我的汉语老师，她很漂亮。我们 đều 努力学习，希望提高汉语身体。今天我们去商店买苹果 và 茶，明天 we 去旅游。再见！",
    date: "2026-06-01",
    wordCount: 56,
    charCount: 94,
    readTimeMins: 1,
    hskDistribution: { hsk1: 65, hsk2: 25, hsk3: 10, unknown: 0 }
  },
  {
    id: "demo-2",
    title: "A Busy Day (忙碌的一天)",
    content: "今天工作特别忙。我刚才去医院照顾朋友，现在必须去學校。突然开始下雨了，我害怕迟到。我经常遇到简单和难的问题，但是我都努力解决。我的身体很好，总是高高兴兴的工作。谢谢你 的幫助，我很满意！再见。",
    date: "2026-06-02",
    wordCount: 48,
    charCount: 88,
    readTimeMins: 1,
    hskDistribution: { hsk1: 45, hsk2: 30, hsk3: 25, unknown: 0 }
  }
];

export const PRONUNCIATION_SAMPLES = [
  {
    id: 'hsk1-01',
    title: 'Đi siêu thị',
    category: 'HỘI THOẠI HÀNG NGÀY',
    context: 'Tại khu chợ nông sản',
    level: 'HSK 1',
    duration: '2m',
    color: 'text-blue-500 bg-blue-50',
    sentences: [
      {
        id: 1,
        chinese: '你好，这个苹果多少钱一斤？',
        pinyin: 'Nǐ hǎo, zhè ge píngguǒ duōshǎo qián yī jīn?',
        vietnamese: 'Chào bạn, táo này bao nhiêu tiền một cân?'
      },
      {
        id: 2,
        chinese: '四块五毛钱一斤。',
        pinyin: 'Sì kuài wǔ máo qián yī jīn.',
        vietnamese: 'Bốn tệ năm hào một cân.'
      },
      {
        id: 3,
        chinese: '太贵了，四块钱可以吗？',
        pinyin: 'Tài guì le, sì kuài qián kěyǐ ma?',
        vietnamese: 'Đắt quá, bốn tệ được không?'
      }
    ]
  },
  {
    id: 'hsk3-01',
    title: 'Học tập tại Bắc Kinh',
    category: 'DU HỌC',
    context: 'Tại khuôn viên trường đại học',
    level: 'HSK 3',
    duration: '45s',
    color: 'text-sky-500 bg-sky-50',
    sentences: [
        {
            id: 1,
            chinese: '我想在北京学习。',
            pinyin: 'Wǒ xiǎng zài Běijīng xuéxí.',
            vietnamese: 'Tôi muốn học tập tại Bắc Kinh.'
        }
    ]
  }
];
