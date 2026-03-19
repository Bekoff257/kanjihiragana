const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 30_000;

// userId → { searchCount, firstSeen, lastSeen, nickname, isPremium, premiumUntil }
export const userMap = new Map();

// Hourly search log: [{ ts, userId }]
export const searchLog = [];

export function rateLimiter(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function trackUser(userId, incrementSearch = false, nickname = null) {
  const now = Date.now();
  if (!userMap.has(userId)) {
    userMap.set(userId, {
      searchCount: 0,
      firstSeen: now,
      lastSeen: now,
      nickname: nickname || `User${userId}`,
      isPremium: false,
      premiumUntil: null,
    });
  }
  const user = userMap.get(userId);
  user.lastSeen = now;
  if (nickname) user.nickname = nickname;
  if (incrementSearch) {
    user.searchCount++;
    searchLog.push({ ts: now, userId });
    // keep only last 24h
    const cutoff = now - 24 * 60 * 60 * 1000;
    while (searchLog.length && searchLog[0].ts < cutoff) searchLog.shift();
  }
  return { ...user };
}

export function getTotalUsers() { return userMap.size; }

export function getTotalSearches() {
  let t = 0;
  for (const u of userMap.values()) t += u.searchCount;
  return t;
}

// Users active in last N minutes
export function getActiveUsers(minutes = 5) {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return [...userMap.values()].filter(u => u.lastSeen >= cutoff).length;
}

// Searches per hour for last 24h — returns array of { hour, count }
export function getHourlyStats() {
  const now = Date.now();
  const buckets = {};
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now - i * 3600000);
    const key = `${h.getHours().toString().padStart(2,'0')}:00`;
    buckets[key] = 0;
  }
  for (const { ts } of searchLog) {
    const h = new Date(ts);
    const key = `${h.getHours().toString().padStart(2,'0')}:00`;
    if (key in buckets) buckets[key]++;
  }
  return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
}

// Top 10 most active users
export function getTopUsers(n = 10) {
  return [...userMap.entries()]
    .sort((a, b) => b[1].searchCount - a[1].searchCount)
    .slice(0, n)
    .map(([id, u]) => ({ id, ...u }));
}

export function grantPremium(userId, durationMs) {
  trackUser(userId);
  const user = userMap.get(userId);
  user.isPremium = true;
  user.premiumUntil = Date.now() + durationMs;
}

export function isPremiumUser(userId) {
  const user = userMap.get(userId);
  if (!user || !user.isPremium) return false;
  if (user.premiumUntil && Date.now() > user.premiumUntil) {
    user.isPremium = false;
    return false;
  }
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [uid, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(uid);
  }
}, 5 * 60 * 1000);