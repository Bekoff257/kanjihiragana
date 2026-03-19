/**
 * Detects the type of Japanese characters in a given string.
 * Unicode ranges:
 *   Hiragana: U+3041–U+3096
 *   Katakana: U+30A0–U+30FF
 *   Kanji (CJK Unified Ideographs): U+4E00–U+9FFF
 *   Kanji extensions: U+3400–U+4DBF, U+F900–U+FAFF
 */

const RANGES = {
  hiragana: /[\u3041-\u3096]/,
  katakana: /[\u30A0-\u30FF]/,
  kanji: /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/,
};

/**
 * Detect the primary Japanese character type in the input string.
 * Priority: Kanji > Hiragana > Katakana
 * @param {string} text
 * @returns {'kanji' | 'hiragana' | 'katakana' | 'unknown'}
 */
export function detectJapaneseType(text) {
  if (!text || typeof text !== 'string') return 'unknown';

  const cleaned = text.trim();

  // Check if the string contains ANY Japanese characters at all
  const hasJapanese =
    RANGES.hiragana.test(cleaned) ||
    RANGES.katakana.test(cleaned) ||
    RANGES.kanji.test(cleaned);

  if (!hasJapanese) return 'unknown';

  // Count character types for majority detection
  let kanjiCount = 0;
  let hiraganaCount = 0;
  let katakanaCount = 0;

  for (const char of cleaned) {
    if (RANGES.kanji.test(char)) kanjiCount++;
    else if (RANGES.hiragana.test(char)) hiraganaCount++;
    else if (RANGES.katakana.test(char)) katakanaCount++;
  }

  // Priority: if ANY kanji present, treat as kanji input
  if (kanjiCount > 0) return 'kanji';

  // Pure hiragana vs pure katakana (or mixed → hiragana wins)
  if (hiraganaCount >= katakanaCount) return 'hiragana';
  return 'katakana';
}

/**
 * Check if a string contains only hiragana (no kanji, no katakana).
 * @param {string} text
 * @returns {boolean}
 */
export function isPureHiragana(text) {
  return /^[\u3041-\u3096\s]+$/.test(text.trim());
}

/**
 * Check if a string is purely kanji characters.
 * @param {string} text
 * @returns {boolean}
 */
export function isPureKanji(text) {
  return /^[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]+$/.test(text.trim());
}

/**
 * Remove all non-Japanese characters from string.
 * @param {string} text
 * @returns {string}
 */
export function extractJapanese(text) {
  return text.replace(/[^\u3041-\u3096\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g, '').trim();
}
