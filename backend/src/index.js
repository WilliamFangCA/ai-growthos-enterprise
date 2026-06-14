// Load .env for local dev; in production (Railway/Cloudflare) env vars are injected directly
const path = require('path');
const fs = require('fs');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
  const parentEnv = path.join(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(parentEnv)) dotenv.config({ path: parentEnv, override: false });
} catch (_) {
  // dotenv not available in production — env vars already injected
}

const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// Railway/Cloudflare 反向代理 → 取得正確客戶端 IP（用於登入稽核）
app.set('trust proxy', true);

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ai-growthos-enterprise-production.up.railway.app',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app')),
  credentials: true,
}));
app.use(express.json());

// Health check (pre-DB, always available)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Initialize DB (synchronous with better-sqlite3)
try {
  initDb();
} catch (err) {
  console.error('[db] Initialization failed:', err);
  process.exit(1);
}

// Routes (loaded after DB is ready)
const { requireAuth, optionalAuth } = require('./middleware/auth');
const dashboardRouter = require('./routes/dashboard');
const agentsRouter = require('./routes/agents');
const contentRouter = require('./routes/content');
const crmRouter = require('./routes/crm');
const workflowsRouter = require('./routes/workflows');
const commsRouter = require('./routes/comms');
const ordersRouter = require('./routes/orders');
const aiRulesRouter = require('./routes/ai-rules');
const marketingRouter = require('./routes/marketing');
const analyticsRouter = require('./routes/analytics');
const membersRouter = require('./routes/members');
const toolsRouter = require('./routes/tools');
const voiceRouter = require('./routes/voice');
const hubSettingsRouter = require('./routes/hub-settings');
const globalKbRouter = require('./routes/global-kb');
const knowledgeRouter = require('./routes/knowledge');
knowledgeRouter.seedPublicKBs?.(); // 啟動時預先播種公開知識庫（Firestore；fire-and-forget）
const usersRouter = require('./routes/users');
const productListingsRouter = require('./routes/product-listings');
const trendsRouter = require('./routes/trends');
const predictionsRouter = require('./routes/predictions');

// Dashboard and analytics are read-only stats — optionalAuth so the sidebar can poll without a token
app.use('/api/dashboard', optionalAuth, dashboardRouter);
app.use('/api/analytics', optionalAuth, analyticsRouter);
// Trends radar is read-only intel — optionalAuth so the Analytics page can fetch without a token
app.use('/api/trends', optionalAuth, trendsRouter);
// AI 預測（多代理模擬）— 與 analytics/trends 一致，optionalAuth 讓 Analytics 頁面可無 token 抓取
app.use('/api/predictions', optionalAuth, predictionsRouter);
// All mutation routes require a valid Firebase token
app.use('/api/agents', requireAuth, agentsRouter);
app.use('/api/content', requireAuth, contentRouter);
app.use('/api/crm', requireAuth, crmRouter);
app.use('/api/workflows', requireAuth, workflowsRouter);
app.use('/api/comms', requireAuth, commsRouter);
app.use('/api/orders', requireAuth, ordersRouter);
app.use('/api/ai-rules', requireAuth, aiRulesRouter);
app.use('/api/marketing', requireAuth, marketingRouter);
app.use('/api/members', requireAuth, membersRouter);
app.use('/api/tools', requireAuth, toolsRouter);
app.use('/api/voice', optionalAuth, voiceRouter);
app.use('/api/hub-settings', requireAuth, hubSettingsRouter);
app.use('/api/global-kb', requireAuth, globalKbRouter);
app.use('/api/knowledge', requireAuth, knowledgeRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/product-listings', requireAuth, productListingsRouter);

// 生成的媒體檔（圖片/影片/音樂）— 由 routes/content.js 寫入 backend/data/media
const mediaDir = path.join(__dirname, '..', 'data', 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
app.use('/media', express.static(mediaDir, { maxAge: '7d' }));

// Serve frontend build if dist exists (works in any NODE_ENV)
const frontendBuild = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendBuild)) {
  // Hashed assets (JS/CSS with content hash in filename) can be cached forever.
  // index.html must NEVER be cached so browsers always fetch the latest bundle references.
  app.use(express.static(frontendBuild, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[server] AI GrowthOS Backend running on http://localhost:${PORT}`);
});

// ── 行銷活動排程器：每 60 秒掃描到期的 scheduled 活動並執行（模擬發送） ──
const { all: dbAll } = require('./db');
const { executeCampaign } = require('./services/campaignEngine');
const schedulerRunning = new Set();
setInterval(async () => {
  let due = [];
  try {
    due = dbAll(`SELECT id, name FROM campaigns
                 WHERE status = 'active' AND trigger_type = 'scheduled'
                   AND next_run_at IS NOT NULL AND next_run_at <= datetime('now')`);
  } catch (_) { return; }
  for (const c of due) {
    if (schedulerRunning.has(c.id)) continue;
    schedulerRunning.add(c.id);
    try {
      const result = await executeCampaign(c.id, 'scheduler');
      console.log(`[scheduler] Campaign "${c.name}" executed: ${result.sent} sent (${result.aiGenerated} AI)`);
    } catch (err) {
      console.error(`[scheduler] Campaign ${c.id} failed:`, err.message);
    } finally {
      schedulerRunning.delete(c.id);
    }
  }
}, 60_000);
