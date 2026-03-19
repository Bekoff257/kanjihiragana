import axios from 'axios';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const TIMEOUT = 5000;

// Simple in-memory translation cache to reduce API calls
const translationCache = new Map();
const MAX_CACHE_SIZE = 500;

/**
 * Translate English text to Uzbek using MyMemory free API.
 * Falls back to original text if translation fails.
 * @param {string} text - English text to translate
 * @returns {Promise<string>} - Uzbek translation or original
 */
export async function translateToUzbek(text) {
  if (!text || typeof text !== 'string') return '';

  const cacheKey = text.toLowerCase().trim();
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await axios.get(MYMEMORY_URL, {
      params: {
        q: text,
        langpair: 'en|uz',
        de: 'learnjapanese@bot.com' // recommended by MyMemory for higher limits
      },
      timeout: TIMEOUT
    });

    const result = response.data?.responseData?.translatedText;

    // MyMemory sometimes returns the same text or an error string
    if (!result || result === text || result.includes('MYMEMORY WARNING')) {
      return applyManualTranslation(text);
    }

    const translated = cleanTranslation(result);

    // Cache the result
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translated);

    return translated;

  } catch {
    // Silently fall back — translation failure shouldn't break the bot
    return applyManualTranslation(text);
  }
}

/**
 * Manual dictionary for ultra-common Japanese learning terms.
 * Provides instant, accurate Uzbek translations without API call.
 */
const MANUAL_DICT = {
  'bridge': "ko'prik",
  'river': "daryo",
  'mountain': "tog'",
  'water': "suv",
  'fire': "olov",
  'person': "odam, shaxs",
  'people': "odamlar",
  'book': "kitob",
  'school': "maktab",
  'eat': "yemoq",
  'drink': "ichmoq",
  'go': "bormoq",
  'come': "kelmoq",
  'see': "ko'rmoq",
  'hear': "eshitmoq",
  'speak': "gapirmoq",
  'write': "yozmoq",
  'read': "o'qimoq",
  'know': "bilmoq",
  'think': "o'ylamoq",
  'love': "sevmoq",
  'like': "yoqtirmoq",
  'house': "uy",
  'car': "mashina",
  'train': "poyezd",
  'food': "taom, ovqat",
  'money': "pul",
  'time': "vaqt",
  'day': "kun",
  'night': "tun",
  'morning': "ertalab",
  'evening': "kechqurun",
  'friend': "do'st",
  'family': "oila",
  'mother': "ona",
  'father': "ota",
  'child': "bola",
  'work': "ish",
  'study': "o'qish",
  'Japan': "Yaponiya",
  'Japanese': "yapon",
  'beautiful': "chiroyli",
  'big': "katta",
  'small': "kichik",
  'good': "yaxshi",
  'bad': "yomon",
  'new': "yangi",
  'old': "eski, qari",
  'fast': "tez",
  'slow': "sekin",
  'flower': "gul",
  'tree': "daraxt",
  'sun': "quyosh",
  'moon': "oy",
  'sky': "osmon",
  'sea': "dengiz",
  'cat': "mushuk",
  'dog': "it",
};

function applyManualTranslation(text) {
  const key = text.toLowerCase().trim();
  return MANUAL_DICT[key] || text;
}

/**
 * Clean up translation artifacts from MyMemory output.
 */
function cleanTranslation(text) {
  return text
    .replace(/^["']|["']$/g, '')   // remove surrounding quotes
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}
