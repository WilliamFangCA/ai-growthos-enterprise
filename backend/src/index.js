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

// Middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
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

app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/content', contentRouter);
app.use('/api/crm', crmRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/comms', commsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/ai-rules', aiRulesRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/analytics', analyticsRouter);

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuild = path.join(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(frontendBuild)) {
    app.use(express.static(frontendBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuild, 'index.html'));
    });
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[server] AI GrowthOS Backend running on http://localhost:${PORT}`);
});
