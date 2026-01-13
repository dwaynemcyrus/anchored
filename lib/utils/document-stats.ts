export type DocumentStats = {
  wordCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
  paragraphCount: number;
  readingTimeMinutes: number;
};

const WORDS_PER_MINUTE = 200;

/**
 * Calculate document statistics from markdown text.
 */
export function calculateStats(text: string): DocumentStats {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      wordCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      paragraphCount: 0,
      readingTimeMinutes: 0,
    };
  }

  // Word count: split on whitespace and filter empty strings
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Character counts
  const characterCount = trimmed.length;
  const characterCountNoSpaces = trimmed.replace(/\s/g, "").length;

  // Paragraph count: split on double newlines (or more)
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  // Reading time: words divided by reading speed, minimum 1 minute if there's content
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    paragraphCount,
    readingTimeMinutes,
  };
}

/**
 * Format reading time as a human-readable string.
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 0) {
    return "0 min read";
  }
  if (minutes === 1) {
    return "1 min read";
  }
  return `${minutes} min read`;
}

/**
 * Format a number with locale-appropriate separators.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
