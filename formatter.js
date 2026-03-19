import { searchExamples } from './jisho.js';

/**
 * Format top search results into a clean Telegram message.
 * @param {Array} results - Translated results array
 * @param {string} inputType - 'kanji' | 'hiragana' | 'katakana'
 * @param {string} originalText - The user's original input
 * @returns {string} - Markdown-formatted Telegram message
 */
export function formatResults(results, inputType, originalText) {
  const lines = [];

  lines.push(`🇯🇵 *Natijalar: ${escapeMarkdown(originalText)}*`);

  if (inputType === 'kanji') {
    lines.push(`_Tur: Kanji so'z_\n`);
  } else if (inputType === 'hiragana') {
    lines.push(`_Tur: Hiragana — mos Kanji variantlari_\n`);
  } else {
    lines.push(`_Tur: Katakana_\n`);
  }

  results.forEach((r, i) => {
    lines.push(`━━━━━━━━━━━━━━━`);
    lines.push(`*${i + 1}. natija*`);

    if (inputType === 'kanji') {
      // Kanji input → show reading
      if (r.kanji) lines.push(`📘 *So'z:* ${r.kanji}`);
      if (r.reading) lines.push(`🔤 *O'qish:* ${r.reading}`);
    } else {
      // Hiragana/Katakana input → show kanji variants
      if (r.reading) lines.push(`🔤 *O'qish:* ${r.reading}`);
      if (r.kanji) lines.push(`📘 *Kanji:* ${r.kanji}`);

      // Show alternate kanji variants
      const extras = r.variants
        .filter(v => v.kanji && v.kanji !== r.kanji)
        .map(v => v.kanji)
        .slice(0, 3);
      if (extras.length > 0) {
        lines.push(`🔀 *Variantlar:* ${extras.join(' | ')}`);
      }
    }

    // Uzbek meanings
    if (r.uzbekMeanings && r.uzbekMeanings.length > 0) {
      const meaningsStr = r.uzbekMeanings
        .filter(Boolean)
        .slice(0, 2)
        .join(', ');
      lines.push(`💡 *Ma'no:* ${escapeMarkdown(meaningsStr)}`);
    }

    // Part of speech
    if (r.partsOfSpeech && r.partsOfSpeech.length > 0) {
      const pos = r.partsOfSpeech[0];
      lines.push(`🏷 *Tur:* ${escapeMarkdown(pos)}`);
    }

    // Badges
    const badges = [];
    if (r.isCommon) badges.push('✅ Keng tarqalgan');
    if (r.jlptLevel) badges.push(`📊 ${r.jlptLevel.toUpperCase()}`);
    if (badges.length > 0) lines.push(badges.join('  '));
  });

  lines.push(`━━━━━━━━━━━━━━━`);
  lines.push(`_Quyidagi tugmalardan foydalaning_ 👇`);

  return lines.join('\n');
}

export async function formatMoreMeanings(results, translateToUzbek) {
  const lines = [`📖 *Batafsil ma'nolar*\n`];

  for (const [i, r] of results.entries()) {
    lines.push(`*${i + 1}. ${r.kanji || r.reading || '—'}*`);

    if (r.meanings && r.meanings.length > 0) {
      const translated = await Promise.all(
        r.meanings.slice(0, 5).map(m => translateToUzbek(m))
      );
      translated.filter(Boolean).forEach((m, idx) => {
        lines.push(`  ${idx + 1}. ${escapeMarkdown(m)}`);
      });
    }

    if (r.variants && r.variants.length > 1) {
      lines.push(`\n🔀 *Barcha variantlar:*`);
      r.variants.forEach(v => {
        const parts = [v.kanji, v.reading].filter(Boolean).join(' → ');
        if (parts) lines.push(`  • ${parts}`);
      });
    }

    lines.push('');
  }

  return lines.join('\n');
}


export async function formatExamples(results, translateToUzbek) {
  const lines = [`📝 *Misol jumlalar*\n`];

  const primaryWord = results[0]?.kanji || results[0]?.reading;
  if (!primaryWord) {
    return '😔 Bu so\'z uchun misol jumlalar topilmadi.';
  }

  try {
    const examples = await searchExamples(primaryWord);

    if (!examples || examples.length === 0) {
      return `😔 *${primaryWord}* uchun misol jumlalar topilmadi.`;
    }

    for (const [i, ex] of examples.entries()) {
      lines.push(`*${i + 1}. Misol:*`);
      if (ex.japanese) lines.push(`🇯🇵 ${ex.japanese}`);
      if (ex.english) {
        const uzbek = await translateToUzbek(ex.english);
        lines.push(`🇺🇿 ${escapeMarkdown(uzbek)}`);
      }
      lines.push('');
    }

    if (lines.length <= 2) {
      return `😔 *${primaryWord}* uchun misol jumlalar topilmadi.`;
    }

  } catch {
    return '❌ Misol jumlalarni yuklashda xatolik yuz berdi.';
  }

  return lines.join('\n');
}

function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/\[/g, '\\[')
    .replace(/`/g, '\\`');
}