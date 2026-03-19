import axios from 'axios';

const JISHO_BASE = 'https://jisho.org/api/v1/search/words';
const TIMEOUT = 8000;

/**
 * Search a Japanese word on Jisho API and return structured results.
 * @param {string} word - Japanese word (Kanji, Hiragana, Katakana)
 * @returns {Promise<Array>} - Array of structured word results
 */
export async function searchWord(word) {
  try {
    const response = await axios.get(JISHO_BASE, {
      params: { keyword: word },
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'JapaneseLearnBot/1.0' }
    });

    const data = response.data?.data;
    if (!data || data.length === 0) return [];

    return data.slice(0, 5).map(parseJishoEntry).filter(Boolean);

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      throw new Error('Jisho API timeout');
    }
    throw new Error(`Jisho API error: ${err.message}`);
  }
}

/**
 * Parse a single Jisho API entry into a clean structured object.
 * @param {Object} entry - Raw Jisho API entry
 * @returns {Object|null}
 */
function parseJishoEntry(entry) {
  if (!entry) return null;

  const japanese = entry.japanese || [];
  const senses = entry.senses || [];

  // Primary word form
  const primary = japanese[0] || {};
  const kanji = primary.word || null;
  const reading = primary.reading || null;

  // All kanji/reading variants
  const variants = japanese.slice(0, 4).map(j => ({
    kanji: j.word || null,
    reading: j.reading || null
  }));

  // Meanings (English)
  const meanings = senses.flatMap(s =>
    (s.english_definitions || []).slice(0, 3)
  ).filter(Boolean).slice(0, 6);

  // Part of speech
  const partsOfSpeech = senses[0]?.parts_of_speech || [];

  // Tags (common word, JLPT level, etc.)
  const jlptLevel = entry.jlpt?.[0] || null;
  const isCommon = entry.is_common || false;

  // Example sentences from senses (not always available)
  const examples = senses
    .flatMap(s => s.sentences || [])
    .slice(0, 3);

  return {
    kanji,
    reading,
    variants,
    meanings,
    partsOfSpeech,
    jlptLevel,
    isCommon,
    examples,
    uzbekMeanings: [] // filled later by translator
  };
}

/**
 * Search example sentences via Jisho sentence search.
 * @param {string} word
 * @returns {Promise<Array>}
 */
export async function searchExamples(word) {
  try {
    const response = await axios.get(JISHO_BASE, {
      params: { keyword: `${word} #sentences` },
      timeout: TIMEOUT,
    });

    const data = response.data?.data || [];
    return data.slice(0, 3).map(entry => {
      const sense = entry.senses?.[0];
      return {
        japanese: entry.japanese?.[0]?.word || entry.japanese?.[0]?.reading || '',
        english: sense?.english_definitions?.[0] || ''
      };
    }).filter(e => e.japanese);

  } catch {
    return [];
  }
}
