/**
 * A mock AI service simulating translation, grammar breakdown, and usage examples.
 * Features artificial delays to simulate server latency.
 */

// Simple database of pre-analyzed sentences/words for typical learner texts
const GRAMMAR_DATABASE = {
  "的": "### Particle: 的 (de)\n\n**Usage: Possessive & Attribute Marker**\n- Placed after a noun/pronoun to show possession (e.g., 我的 = my, 你的 = your).\n- Links adjectives to nouns (e.g., 漂亮的老师 = beautiful teacher).\n- Denotes qualities or attributes.",
  "了": "### Particle: 了 (le)\n\n**Usage: Change of State / Aspect Marker**\n- **Completed Action**: Placed after a verb to show that an action is finished (e.g., 我吃了苹果 = I ate the apple).\n- **New Situation**: Placed at the end of a sentence to show a change in situation or realization (e.g., 下雨了 = It's raining now).",
  "在": "### Particle/Verb: 在 (zài)\n\n**Usage: Locative & Progressive Aspect**\n- **Preposition**: Means 'at', 'in', or 'on' (e.g., 在学校 = at school).\n- **Progressive**: Indicates an action in progress, equivalent to '-ing' (e.g., 我在看书 = I am reading a book).",
  "都": "### Adverb: 都 (dōu)\n\n**Usage: Totalizing Adverb ('All' / 'Both')**\n- Always placed *before* the verb.\n- Groups the preceding subject (e.g., 我们都喜欢咖啡 = We all like coffee).\n- Can mean 'already' in certain contexts when paired with '了'.",
  "是": "### Copula: 是 (shì)\n\n**Usage: Equational 'To Be'**\n- Connects two nouns or pronouns where Subject = Object (e.g., 他是老师 = He is a teacher).\n- Cannot be used to connect a noun to an adjective (use 很 instead, e.g., 我很好, not 我是好)."
};

const defaultExamples = {
  "学习": [
    { chinese: "我喜欢学习汉语。", pinyin: "Wǒ xǐhuan xuéxí Hànyǔ.", english: "I like studying Chinese." },
    { chinese: "他在学校学习电脑。", pinyin: "Tā zài xuéxiào xuéxí diànnǎo.", english: "He studies computer science at school." }
  ],
  "喜欢": [
    { chinese: "我不喜欢喝茶。", pinyin: "Wǒ bù xǐhuan hē chá.", english: "I do not like drinking tea." },
    { chinese: "你喜欢看什么电影？", pinyin: "Nǐ xǐhuan kàn shénme diànyǐng?", english: "What movies do you like to watch?" }
  ],
  "咖啡": [
    { chinese: "这杯咖啡很舒服。", pinyin: "Zhè bēi kāfēi hěn shūfu.", english: "This cup of coffee is very comforting." },
    { chinese: "我喝了一杯热咖啡。", pinyin: "Wǒ hēle yī bēi rè kāfēi.", english: "I drank a cup of hot coffee." }
  ]
};

export const aiService = {
  /**
   * Generates English translation for a sentence.
   */
  async translateSentence(sentence) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Fallback simple translation helper
    if (sentence.includes("你好")) return "Hello!";
    if (sentence.includes("谢谢")) return "Thank you!";
    if (sentence.includes("汉语") && sentence.includes("简单")) return "Chinese language is simple.";
    if (sentence.includes("喜欢") && sentence.includes("咖啡")) return "Like coffee.";
    if (sentence.includes("看书")) return "Reading a book.";
    if (sentence.includes("工作")) return "Working at a job.";
    
    // Dynamic mock translation
    return `[AI Translation]: "${sentence}" — An illustrative translation of this sentence detailing the activities or expressions described.`;
  },

  /**
   * Explains grammar particles contained in a sentence.
   */
  async explainGrammar(sentence) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let explanations = `## Grammar Breakdown for: *"${sentence}"*\n\n`;
    let found = false;

    Object.keys(GRAMMAR_DATABASE).forEach(particle => {
      if (sentence.includes(particle)) {
        explanations += `${GRAMMAR_DATABASE[particle]}\n\n---\n\n`;
        found = true;
      }
    });

    if (!found) {
      explanations += `### General Sentence Structure\nThis sentence follows the typical Chinese **Subject + Adverb + Verb + Object (SVO)** sentence structure. No complex aspect particles (like 了, 的, 在) were detected.`;
    } else {
      explanations += `### Translation Tip\nPay close attention to particle modifiers as they define tense, emphasis, and possession in Chinese.`;
    }

    return explanations;
  },

  /**
   * Generates usage examples for a Chinese word.
   */
  async generateExamples(word) {
    await new Promise(resolve => setTimeout(resolve, 700));

    if (defaultExamples[word]) {
      return defaultExamples[word];
    }

    // Dynamic generation
    return [
      {
        chinese: `这是我第一次用“${word}”写句子。`,
        pinyin: `Zhè shì wǒ dì-yī cì yòng "${word}" xiě jùzi.`,
        english: `This is the first time I write a sentence using "${word}".`
      },
      {
        chinese: `你明白这个“${word}”的意思吗？`,
        pinyin: `Nǐ míngbai zhè ge "${word}" de yìsi ma?`,
        english: `Do you understand the meaning of this "${word}"?`
      }
    ];
  }
};
