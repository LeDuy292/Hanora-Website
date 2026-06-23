import { segmentChineseText, isChinese } from './chineseUtils';

/**
 * Reads a file object (.txt or .pdf) and returns a promise resolving to its text contents.
 * @param {File} file - File object from input
 * @returns {Promise<string>}
 */
export async function readFileAsText(file) {
  const fileExtension = file.name.split('.').pop().toLowerCase();
  
  if (fileExtension === 'pdf') {
    return readPdfFileAsText(file);
  }
  
  // Default: Read as plain text (.txt)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Extracts text from a PDF file using PDF.js.
 * @param {File} file - The PDF file object
 * @returns {Promise<string>}
 */
async function readPdfFileAsText(file) {
  const arrayBuffer = await file.arrayBuffer();
  
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("Thư viện xử lý PDF chưa được tải xong. Vui lòng tải lại trang hoặc thử lại sau giây lát.");
  }
  
  // Set worker source URL
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
  
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY = undefined;
    let pageText = "";
    
    for (const item of textContent.items) {
      if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 8) {
        // If Y coordinate has changed significantly, insert a line break
        pageText += "\n";
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    
    fullText += pageText + "\n\n";
  }
  
  return fullText.trim();
}

/**
 * Calculates learning metrics for a block of Chinese text.
 * Returns word count, character count, estimated reading time, and HSK level statistics.
 * 
 * @param {string} text - Chinese text content
 * @returns {object} - Analyzed statistics
 */
export function analyzeChineseText(text) {
  if (!text) {
    return {
      wordCount: 0,
      charCount: 0,
      readTimeMins: 0,
      hskDistribution: { hsk1: 0, hsk2: 0, hsk3: 0, unknown: 0 }
    };
  }

  // Count Chinese characters
  let charCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (isChinese(text[i])) {
      charCount++;
    }
  }

  // Segment text into tokens
  const tokens = segmentChineseText(text);
  const words = tokens.filter(t => t.isWord);
  const wordCount = words.length;

  // HSK distribution counts
  let hsk1Count = 0;
  let hsk2Count = 0;
  let hsk3Count = 0;
  let unknownCount = 0;

  words.forEach(w => {
    if (w.isFallback) {
      unknownCount++;
    } else if (w.hsk === 1) {
      hsk1Count++;
    } else if (w.hsk === 2) {
      hsk2Count++;
    } else if (w.hsk === 3) {
      hsk3Count++;
    } else {
      unknownCount++;
    }
  });

  const totalWords = wordCount || 1;
  const hskDistribution = {
    hsk1: Math.round((hsk1Count / totalWords) * 100),
    hsk2: Math.round((hsk2Count / totalWords) * 100),
    hsk3: Math.round((hsk3Count / totalWords) * 100),
    unknown: Math.round((unknownCount / totalWords) * 100)
  };

  // Average reading speed for Chinese language learners is around 100 characters per minute
  const readTimeMins = Math.max(1, Math.ceil(charCount / 100));

  return {
    wordCount,
    charCount,
    readTimeMins,
    hskDistribution
  };
}
