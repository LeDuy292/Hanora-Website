import { useMemo } from 'react';
import { useReaderStore } from '../../store/readerStore';
import { useVocabularyStore } from '../../store/vocabularyStore';
import { splitSentences, segmentChineseText } from '../../utils/chineseUtils';

export function ReaderContent({ content }) {
  const { fontSize, showPinyin, setSelectedWord, setSelectedSentence } = useReaderStore();
  const { isWordSaved } = useVocabularyStore();

  // Split text into paragraphs
  const paragraphs = useMemo(() => {
    if (!content) return [];
    return content.split('\n').map(p => p.trim()).filter(Boolean);
  }, [content]);

  // Handle clicking on a word
  const handleWordClick = (e, wordToken, fullSentenceText) => {
    e.stopPropagation();
    if (!wordToken.isWord) return;

    // Set word details
    setSelectedWord({
      text: wordToken.text,
      pinyin: wordToken.pinyin || "",
      translation: wordToken.translation || "Definition lookup...",
      hsk: wordToken.hsk || 1
    });

    // Set full sentence translation/explanation drawer
    setSelectedSentence(fullSentenceText);
  };

  return (
    <div
      className="space-y-6 select-text max-w-3xl mx-auto py-4 font-sans focus:outline-none"
      style={{ fontSize: `${fontSize}px` }}
    >
      {paragraphs.map((paraText, pIdx) => {
        // Split paragraph into sentences
        const sentences = splitSentences(paraText);

        return (
          <p
            key={pIdx}
            className="leading-loose tracking-wide whitespace-pre-wrap transition-colors duration-200"
          >
            {sentences.map((sentText, sIdx) => {
              // Tokenize each sentence
              const tokens = segmentChineseText(sentText);

              return (
                <span
                  key={sIdx}
                  className="sentence-span hover:bg-blue-500/[0.03] transition-colors rounded px-0.5"
                >
                  {tokens.map((token, tIdx) => {
                    // Non-Chinese punctuation/whitespace
                    if (!token.isWord) {
                      return (
                        <span key={tIdx} className="text-slate-400 font-sans mx-0.5">
                          {token.text}
                        </span>
                      );
                    }

                    const saved = isWordSaved(token.text);

                    // Chinese interactive word
                    return (
                      <span
                        key={tIdx}
                        onClick={(e) => handleWordClick(e, token, sentText)}
                        className={`inline-block mx-0.5 relative group cursor-pointer transition-all duration-150 py-1 ${saved
                            ? 'border-b-2 border-blue-500 text-blue-600 font-semibold bg-blue-50/50 px-0.5 rounded-t-md'
                            : 'hover:text-blue-600 hover:bg-blue-50/70 rounded px-0.5'
                          }`}
                      >
                        {showPinyin && token.pinyin ? (
                          <ruby className="ruby-align flex flex-col items-center">
                            <span className="font-display leading-tight">{token.text}</span>
                            <rt className="text-[10px] font-bold text-slate-450 group-hover:text-blue-500 tracking-normal leading-none mb-1 select-none pointer-events-none uppercase">
                              {token.pinyin}
                            </rt>
                          </ruby>
                        ) : (
                          <span className="font-display">{token.text}</span>
                        )}
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
export default ReaderContent;
