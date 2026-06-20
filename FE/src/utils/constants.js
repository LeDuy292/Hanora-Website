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
    content: "你好！很高兴认识你。学习汉语很有意思，但是也很难。我不喜欢看书，但是我喜欢听音乐和喝咖啡。我喜欢我的汉语老师，她很漂亮。我们都努力学习，希望提高汉语身体。今天我们去商店买苹果和茶，明天我们去旅游。再见！",
    date: "2026-06-01",
    wordCount: 56,
    charCount: 94,
    readTimeMins: 1,
    hskDistribution: { hsk1: 65, hsk2: 25, hsk3: 10, unknown: 0 }
  },
  {
    id: "demo-2",
    title: "A Busy Day (忙碌的一天)",
    content: "今天工作特别忙。我刚才去医院照顾朋友，现在必须去学校。突然开始下雨了，我害怕迟到。我经常遇到简单和难的问题，但是我都努力解决。我的身体很好，总是高高兴兴的工作。谢谢你的帮助，我很满意！再见。",
    date: "2026-06-02",
    wordCount: 48,
    charCount: 88,
    readTimeMins: 1,
    hskDistribution: { hsk1: 45, hsk2: 30, hsk3: 25, unknown: 0 }
  }
];
