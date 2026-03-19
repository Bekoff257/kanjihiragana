import express from 'express';
import {
  getTotalUsers, getTotalSearches,
  getActiveUsers, getHourlyStats, getTopUsers, userMap
} from './userTracker.js';

const ADMIN_PORT   = process.env.ADMIN_PORT   || 4000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

const app = express();

// ── Health check for Railway ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('ok'));

// ── Simple token auth middleware ──────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== ADMIN_SECRET) {
    return res.status(200).send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0d1117">
        <form method="GET" action="/" style="background:#161b22;padding:32px;border-radius:12px;border:1px solid #30363d;display:flex;flex-direction:column;gap:12px;min-width:280px">
          <h2 style="color:#e6edf3;margin:0 0 8px">🔐 Admin Panel</h2>
          <input name="token" type="password" placeholder="Enter admin password"
            style="padding:10px 12px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#e6edf3;font-size:14px;outline:none"/>
          <button type="submit"
            style="padding:10px;border-radius:8px;background:#238636;border:none;color:#fff;font-size:14px;cursor:pointer;font-weight:600">
            Enter
          </button>
        </form>
      </body></html>
    `);
  }
  next();
}

// ── Main dashboard ────────────────────────────────────────────────────────────
app.get('/', auth, (req, res) => {
  const token = req.query.token || req.headers['x-admin-token'];
  const total     = getTotalUsers();
  const searches  = getTotalSearches();
  const active5   = getActiveUsers(5);
  const active60  = getActiveUsers(60);
  const topUsers  = getTopUsers(10);
  const hourly    = getHourlyStats();
  const premium   = [...userMap.values()].filter(u => u.isPremium).length;

  const maxHourly = Math.max(...hourly.map(h => h.count), 1);

  const topRows = topUsers.map((u, i) => `
    <tr>
      <td style="padding:10px 12px;color:#8b949e">${i + 1}</td>
      <td style="padding:10px 12px;color:#e6edf3;font-weight:500">${escHtml(u.nickname)}</td>
      <td style="padding:10px 12px;color:#8b949e;font-size:12px">${u.id}</td>
      <td style="padding:10px 12px">
        <span style="background:#1f6feb22;color:#58a6ff;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600">${u.searchCount}</span>
      </td>
      <td style="padding:10px 12px;color:#8b949e;font-size:12px">${timeAgo(u.lastSeen)}</td>
      <td style="padding:10px 12px">${u.isPremium ? '<span style="background:#1a3a1a;color:#3fb950;padding:3px 10px;border-radius:20px;font-size:12px">✦ Premium</span>' : '<span style="color:#484f58;font-size:12px">Free</span>'}</td>
    </tr>
  `).join('');

  const barChart = hourly.map(h => {
    const pct = Math.round((h.count / maxHourly) * 100);
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0">
        <span style="font-size:10px;color:#58a6ff;font-weight:600;min-height:14px">${h.count || ''}</span>
        <div style="width:100%;background:#161b22;border-radius:3px;height:60px;display:flex;align-items:flex-end">
          <div style="width:100%;height:${Math.max(pct, h.count ? 4 : 0)}%;background:linear-gradient(to top,#1f6feb,#388bfd);border-radius:3px;transition:height .3s"></div>
        </div>
        <span style="font-size:9px;color:#484f58;white-space:nowrap">${h.hour}</span>
      </div>
    `;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Bot Admin Panel</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh}
    .header{background:#161b22;border-bottom:1px solid #30363d;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
    .header h1{font-size:18px;font-weight:600;display:flex;align-items:center;gap:10px}
    .dot{width:8px;height:8px;background:#3fb950;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
    .badge{background:#21262d;border:1px solid #30363d;padding:4px 12px;border-radius:20px;font-size:12px;color:#8b949e}
    .main{padding:28px 32px;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:24px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
    .stat{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:6px}
    .stat-icon{font-size:22px}
    .stat-val{font-size:28px;font-weight:700;color:#e6edf3}
    .stat-label{font-size:12px;color:#8b949e}
    .stat-sub{font-size:11px;color:#484f58;margin-top:2px}
    .card{background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden}
    .card-header{padding:16px 20px;border-bottom:1px solid #21262d;font-size:14px;font-weight:600;color:#e6edf3;display:flex;align-items:center;gap:8px}
    .chart-wrap{padding:20px;display:flex;align-items:flex-end;gap:3px;height:120px}
    table{width:100%;border-collapse:collapse}
    thead th{padding:10px 12px;text-align:left;font-size:12px;color:#8b949e;font-weight:500;border-bottom:1px solid #21262d;text-transform:uppercase;letter-spacing:.05em}
    tbody tr{border-bottom:1px solid #21262d}
    tbody tr:last-child{border-bottom:none}
    tbody tr:hover{background:#1c2128}
    .refresh{background:#21262d;border:1px solid #30363d;color:#8b949e;padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;transition:all .15s}
    .refresh:hover{background:#30363d;color:#e6edf3}
    .footer{text-align:center;padding:20px;font-size:12px;color:#484f58}
  </style>
</head>
<body>
  <div class="header">
    <h1><div class="dot"></div> Japanese Bot — Admin</h1>
    <div style="display:flex;gap:10px;align-items:center">
      <span class="badge">🕒 ${new Date().toLocaleTimeString()}</span>
      <a class="refresh" href="/?token=${token}">↻ Refresh</a>
      <a class="refresh" href="/api/stats?token=${token}" target="_blank">JSON API</a>
    </div>
  </div>

  <div class="main">

    <!-- Stat cards -->
    <div class="stats">
      <div class="stat">
        <div class="stat-icon">👥</div>
        <div class="stat-val">${total}</div>
        <div class="stat-label">Jami foydalanuvchilar</div>
        <div class="stat-sub">Barcha vaqt uchun</div>
      </div>
      <div class="stat" style="border-color:#1f6feb55">
        <div class="stat-icon">🟢</div>
        <div class="stat-val" style="color:#3fb950">${active5}</div>
        <div class="stat-label">Hozir online</div>
        <div class="stat-sub">So'nggi 5 daqiqada</div>
      </div>
      <div class="stat">
        <div class="stat-icon">⏱</div>
        <div class="stat-val">${active60}</div>
        <div class="stat-label">So'nggi 1 soatda</div>
        <div class="stat-sub">Faol foydalanuvchilar</div>
      </div>
      <div class="stat">
        <div class="stat-icon">🔍</div>
        <div class="stat-val">${searches}</div>
        <div class="stat-label">Jami qidiruvlar</div>
        <div class="stat-sub">Bot ishga tushgandan beri</div>
      </div>
      <div class="stat">
        <div class="stat-icon">✦</div>
        <div class="stat-val" style="color:#d29922">${premium}</div>
        <div class="stat-label">Premium users</div>
        <div class="stat-sub">Faol obunalar</div>
      </div>
      <div class="stat">
        <div class="stat-icon">📊</div>
        <div class="stat-val">${total ? (searches / total).toFixed(1) : 0}</div>
        <div class="stat-label">O'rtacha qidiruv</div>
        <div class="stat-sub">Har bir foydalanuvchi uchun</div>
      </div>
    </div>

    <!-- Hourly chart -->
    <div class="card">
      <div class="card-header">📈 So'nggi 24 soat — qidiruvlar</div>
      <div class="chart-wrap">${barChart}</div>
    </div>

    <!-- Top users table -->
    <div class="card">
      <div class="card-header">🏆 Eng faol foydalanuvchilar</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Ism</th><th>User ID</th><th>Qidiruvlar</th><th>Oxirgi faollik</th><th>Tur</th>
          </tr>
        </thead>
        <tbody>${topRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#484f58">Hali foydalanuvchilar yo\'q</td></tr>'}</tbody>
      </table>
    </div>

  </div>
  <div class="footer">Auto-refresh: <a href="/?token=${token}" style="color:#388bfd">Refresh</a> &nbsp;·&nbsp; Japanese Learning Bot v1.0</div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>`);
});

// ── JSON API for external dashboards ─────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  res.json({
    totalUsers:    getTotalUsers(),
    totalSearches: getTotalSearches(),
    activeNow:     getActiveUsers(5),
    activePastHour:getActiveUsers(60),
    premium:       [...userMap.values()].filter(u => u.isPremium).length,
    hourly:        getHourlyStats(),
    topUsers:      getTopUsers(10),
    uptime:        process.uptime(),
    timestamp:     new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
export function startAdminPanel() {
  const server = app.listen(ADMIN_PORT, () => {
    console.log(`🖥  Admin panel → http://localhost:${ADMIN_PORT}/?token=${ADMIN_SECRET}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const next = Number(ADMIN_PORT) + 1;
      console.warn(`⚠️  Port ${ADMIN_PORT} band. ${next} portda urinib ko'rmoqda...`);
      server.close();
      app.listen(next, () => {
        console.log(`🖥  Admin panel → http://localhost:${next}/?token=${ADMIN_SECRET}`);
      });
    } else {
      console.error('Admin panel error:', err.message);
    }
  });
}

// helpers
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s oldin`;
  if (s < 3600) return `${Math.floor(s/60)}m oldin`;
  if (s < 86400) return `${Math.floor(s/3600)}h oldin`;
  return `${Math.floor(s/86400)}k oldin`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
