# 🇯🇵 Japanese Learning Telegram Bot

A production-ready Telegram bot that converts Japanese text (Kanji ↔ Hiragana)
and shows meanings in Uzbek. Built with Node.js, Jisho API, and MyMemory Translator.

---

## 📁 Project Structure

```
japanese-bot/
├── src/
│   ├── bot.js                        # Entry point — Telegram bot setup & handlers
│   ├── services/
│   │   ├── jisho.js                  # Jisho API integration
│   │   └── translator.js             # MyMemory EN→UZ translation
│   └── utils/
│       ├── detectJapaneseType.js     # Kanji/Hiragana/Katakana detector
│       ├── formatter.js              # Telegram message formatter
│       └── userTracker.js            # Rate limiter + user activity tracker
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Setup

### 1. Create a Telegram Bot

1. Open Telegram → search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy your **bot token**

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_token_from_botfather
```

### 4. Run the bot

```bash
# Production
npm start

# Development (auto-restarts on file change, Node 18+)
npm run dev
```

---

## 🚀 Features

| Feature | Status |
|---|---|
| Kanji → Hiragana reading | ✅ |
| Hiragana → Kanji options | ✅ |
| Katakana support | ✅ |
| Uzbek translations | ✅ |
| Top 3 results | ✅ |
| Inline buttons (more meanings, examples) | ✅ |
| Rate limiting (10 req / 30s) | ✅ |
| User activity tracking | ✅ |
| Premium system hooks | ✅ (stub) |
| JLPT level badges | ✅ |
| Common word indicator | ✅ |

---

## 📡 APIs Used

- **Jisho API** — `https://jisho.org/api/v1/search/words` (free, no key needed)
- **MyMemory Translator** — `https://api.mymemory.translated.net` (free, 5000 req/day)

---

## 🔧 Extending

### Add a new role
All game logic is in `src/services/jisho.js`. The `parseJishoEntry` function
controls what data is extracted from each API response.

### Add a real database
Replace the in-memory Maps in `userTracker.js` with Redis calls.
The function signatures stay the same — just swap the storage layer.

### Enable premium payments
`userTracker.js` already has `grantPremium()` and `isPremiumUser()` stubs.
Wire these up to Telegram Stars or a payment gateway webhook.

---

## 💡 Example Output

```
🇯🇵 Natijalar: 橋

━━━━━━━━━━━━━━━
1. natija
📘 So'z: 橋
🔤 O'qish: はし
💡 Ma'no: ko'prik
🏷 Tur: Noun
✅ Keng tarqalgan  📊 JLPT-N3
━━━━━━━━━━━━━━━
```

---

## 🛡️ Rate Limits

- 10 requests per 30 seconds per user
- MyMemory: 5,000 words/day on free tier (upgrade with API key)
- Jisho: no documented rate limit, but be respectful

---

## 📦 Deploy to Production

### Option A: Railway / Render (free tier)
1. Push to GitHub
2. Connect repo to Railway or Render
3. Set `TELEGRAM_BOT_TOKEN` as environment variable
4. Deploy — runs 24/7

### Option B: VPS (DigitalOcean, Hetzner)
```bash
# Install PM2 for process management
npm install -g pm2
pm2 start src/bot.js --name japanese-bot
pm2 save
pm2 startup
```
