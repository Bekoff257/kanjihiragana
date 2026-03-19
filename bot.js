import TelegramBot from 'node-telegram-bot-api';
import { searchWord } from './jisho.js';
import { translateToUzbek } from './translator.js';
import { detectJapaneseType } from './detectJapaneseType.js';
import { formatResults, formatMoreMeanings, formatExamples } from './formatter.js';
import { rateLimiter, trackUser } from './userTracker.js';
import { getStrokeOrderGif } from './strokeOrder.js';
import { startAdminPanel } from './adminPanel.js';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is missing in .env');

const bot = new TelegramBot(TOKEN, { polling: true });
const callbackCache = new Map();

// Start admin panel alongside the bot
startAdminPanel();

console.log('🤖 Japanese Learning Bot started...');

bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || 'Friend';
  const userId = msg.from.id;
  const nickname = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `User${userId}`;
  trackUser(userId, false, nickname);

  bot.sendMessage(msg.chat.id,
    `👋 Salom, *${name}*!\n\n` +
    `Men yapon tilini o'rganishga yordam beruvchi botman 🇯🇵\n\n` +
    `*Qanday ishlaydi?*\n` +
    `• Kanji yuboring → Hiragana va ma'nosini olasiz\n` +
    `• Hiragana yuboring → Kanji variantlarini olasiz\n` +
    `• Katakana ham qabul qilinadi\n\n` +
    `*Misol:*\n橋 yoki はし yuboring va natijani ko'ring!\n\n` +
    `📊 /stats — statistikangizni ko'ring`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/stats/, (msg) => {
  const userId = msg.from.id;
  const data = trackUser(userId);
  bot.sendMessage(msg.chat.id,
    `📊 *Sizning statistikangiz*\n\n` +
    `🔍 Jami qidiruv: *${data.searchCount}*\n` +
    `📅 Birinchi qidiruv: ${new Date(data.firstSeen).toLocaleDateString('uz-UZ')}\n` +
    `⏱ Oxirgi faollik: ${new Date(data.lastSeen).toLocaleDateString('uz-UZ')}`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();
  if (!text) return;

  // Track nickname on every message so it stays up to date
  const nickname = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || `User${userId}`;

  if (!rateLimiter(userId)) {
    return bot.sendMessage(chatId, '⚠️ Juda tez yuboryapsiz! Iltimos, bir oz kuting (30 soniya).');
  }

  trackUser(userId, true, nickname);

  const inputType = detectJapaneseType(text);
  if (inputType === 'unknown') {
    return bot.sendMessage(chatId,
      '❓ Iltimos, faqat yapon tilidagi matnni yuboring.\n*(Kanji, Hiragana yoki Katakana)*',
      { parse_mode: 'Markdown' }
    );
  }

  const loadingMsg = await bot.sendMessage(chatId, '🔍 Qidirmoqdaman...');

  try {
    const results = await searchWord(text);

    if (!results || results.length === 0) {
      await bot.deleteMessage(chatId, loadingMsg.message_id);
      return bot.sendMessage(chatId,
        `😔 *"${text}"* uchun hech narsa topilmadi.\n\nBoshqa so'z yoki iborani sinab ko'ring.`,
        { parse_mode: 'Markdown' }
      );
    }

    const translatedResults = await Promise.all(
      results.slice(0, 3).map(async (r) => {
        const uzbekMeanings = await Promise.all(r.meanings.slice(0, 2).map(m => translateToUzbek(m)));
        return { ...r, uzbekMeanings };
      })
    );

    const cacheKey = `${userId}_${Date.now()}`;
    callbackCache.set(cacheKey, { text, results: translatedResults, inputType });
    if (callbackCache.size > 50) callbackCache.delete(callbackCache.keys().next().value);

    const formattedText = formatResults(translatedResults, inputType, text);
    await bot.deleteMessage(chatId, loadingMsg.message_id);

    const inlineKeyboard = inputType === 'kanji'
      ? [
          [
            { text: "📖 Ko'proq ma'nolar", callback_data: `more_${cacheKey}` },
            { text: '📝 Misol jumlalar',   callback_data: `examples_${cacheKey}` }
          ],
          [{ text: '✍️ Chizish tartibi (GIF)', callback_data: `stroke_${cacheKey}` }]
        ]
      : [[
          { text: "📖 Ko'proq ma'nolar", callback_data: `more_${cacheKey}` },
          { text: '📝 Misol jumlalar',   callback_data: `examples_${cacheKey}` }
        ]];

    await bot.sendMessage(chatId, formattedText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });

  } catch (err) {
    console.error('Error:', err.message);
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id, { text: 'Yuklanmoqda...' });

  if (data.startsWith('more_')) {
    const cached = callbackCache.get(data.replace('more_', ''));
    if (!cached) return bot.sendMessage(chatId, '⚠️ Ma\'lumot eskirib qoldi.');
    bot.sendMessage(chatId, await formatMoreMeanings(cached.results, translateToUzbek), { parse_mode: 'Markdown' });

  } else if (data.startsWith('examples_')) {
    const cached = callbackCache.get(data.replace('examples_', ''));
    if (!cached) return bot.sendMessage(chatId, '⚠️ Ma\'lumot eskirib qoldi.');
    bot.sendMessage(chatId, await formatExamples(cached.results, translateToUzbek), { parse_mode: 'Markdown' });

  } else if (data.startsWith('stroke_')) {
    const cached = callbackCache.get(data.replace('stroke_', ''));
    if (!cached) return bot.sendMessage(chatId, '⚠️ Ma\'lumot eskirib qoldi.');

    const kanjiMatch = cached.text.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/);
    if (!kanjiMatch) return bot.sendMessage(chatId, '❌ Bu so\'z uchun chizish tartibi topilmadi.');

    const loadingMsg = await bot.sendMessage(chatId, '🎨 Animatsiya tayyorlanmoqda...');
    try {
      const gifBuffer = await getStrokeOrderGif(kanjiMatch[0]);
      await bot.deleteMessage(chatId, loadingMsg.message_id);

      if (!gifBuffer) {
        return bot.sendMessage(chatId,
          `😔 *${kanjiMatch[0]}* uchun chizish tartibi topilmadi.\n\n` +
          `🔗 [Jisho.org da ko'ring](https://jisho.org/search/${encodeURIComponent(kanjiMatch[0])}%20%23kanji)`,
          { parse_mode: 'Markdown' }
        );
      }

      await bot.sendAnimation(chatId, gifBuffer, {
        caption: `✍️ *${kanjiMatch[0]}* — chizish tartibi\n_Qizil chiziq = joriy chizma_`,
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('Stroke error:', err.message);
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      bot.sendMessage(chatId, '❌ Animatsiyani yaratishda xatolik.');
    }
  }
});

process.once('SIGINT',  () => { bot.stopPolling(); process.exit(); });
process.once('SIGTERM', () => { bot.stopPolling(); process.exit(); });