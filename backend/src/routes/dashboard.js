const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { get, all } = require('../db');

const autoCompanyRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');

function readAutoCompanyStatus() {
  try {
    const loopStatePath = path.join(autoCompanyRoot, '.auto-loop-state');
    const consensusPath = path.join(autoCompanyRoot, 'memories', 'consensus.md');

    let status = 'unknown';
    let loopCount = 0;
    let lastRun = '';
    let currentPhase = '';

    if (fs.existsSync(loopStatePath)) {
      const raw = fs.readFileSync(loopStatePath, 'utf8').trim();
      try {
        const state = JSON.parse(raw);
        status = state.status || 'unknown';
        loopCount = state.loopCount || 0;
        lastRun = state.lastRun || '';
        currentPhase = state.currentPhase || '';
      } catch {
        status = raw.toLowerCase().includes('run') ? 'running' : 'stopped';
      }
    }

    if (fs.existsSync(consensusPath)) {
      const consensus = fs.readFileSync(consensusPath, 'utf8');
      if (status === 'unknown') status = 'stopped';
      const phaseMatch = consensus.match(/(?:current.?phase|next.?action)[:\s]+([^\n]+)/i);
      if (phaseMatch && !currentPhase) currentPhase = phaseMatch[1].trim().substring(0, 80);
      const loopMatch = consensus.match(/loop.?count[:\s]+(\d+)/i);
      if (loopMatch && !loopCount) loopCount = parseInt(loopMatch[1], 10);
    }

    return { status, loopCount, lastRun, currentPhase };
  } catch (err) {
    console.warn('[dashboard] Could not read Auto Company state:', err.message);
    return { status: 'unknown', loopCount: 0, lastRun: '', currentPhase: '' };
  }
}

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  try {
    const autoCompany = readAutoCompanyStatus();

    // KPI metrics from snapshot table
    const metrics = {};
    all(`SELECT metric_key, metric_value FROM metrics_snapshots`).forEach(r => {
      metrics[r.metric_key] = r.metric_value;
    });

    // Comm health aggregation
    const totalUnread = (get(`SELECT COALESCE(SUM(unread_count), 0) as v FROM conversations`) || {}).v || 0;
    const openConvos = (get(`SELECT COUNT(*) as v FROM conversations WHERE status = 'open'`) || {}).v || 0;
    const humanTakeovers = (get(`SELECT COUNT(*) as v FROM conversations WHERE assigned_to = 'human' AND status = 'open'`) || {}).v || 0;
    const totalMessages = (get(`SELECT COUNT(*) as v FROM messages`) || {}).v || 0;
    const aiMessages = (get(`SELECT COUNT(*) as v FROM messages WHERE sent_by = 'ai'`) || {}).v || 0;
    const aiReplyRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;
    const activeAccounts = (get(`SELECT COUNT(*) as v FROM comm_accounts WHERE status = 'active'`) || {}).v || 0;
    const platformUnread = all(`SELECT platform, COALESCE(SUM(unread_count), 0) as unread FROM conversations WHERE unread_count > 0 GROUP BY platform ORDER BY unread DESC`);

    const commHealth = { totalUnread, openConvos, humanTakeovers, aiReplyRate, activeAccounts, platforms: platformUnread };

    // Order summary aggregation
    const orderTotal = (get(`SELECT COUNT(*) as v FROM orders`) || {}).v || 0;
    const todayGMV = (get(`SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE date(created_at) = date('now')`) || {}).v || 0;
    const totalRevenue = (get(`SELECT COALESCE(SUM(total_amount), 0) as v FROM orders WHERE status NOT IN ('refund_requested','refunded','exchange_requested')`) || {}).v || 0;
    const pending = (get(`SELECT COUNT(*) as v FROM orders WHERE status = 'pending'`) || {}).v || 0;
    const processing = (get(`SELECT COUNT(*) as v FROM orders WHERE status = 'processing'`) || {}).v || 0;
    const shipped = (get(`SELECT COUNT(*) as v FROM orders WHERE status IN ('shipped','in_transit')`) || {}).v || 0;
    const delivered = (get(`SELECT COUNT(*) as v FROM orders WHERE status IN ('delivered','completed')`) || {}).v || 0;
    const paid = (get(`SELECT COUNT(*) as v FROM orders WHERE status = 'paid'`) || {}).v || 0;

    const orderSummary = { total: orderTotal, todayGMV, totalRevenue, pending, processing, shipped, delivered, paid };

    res.json({
      revenue: metrics.revenue || 12500,
      mau: metrics.mau || 3420,
      activeAgents: metrics.active_agents || 14,
      workflowRuns: metrics.workflow_runs || 847,
      aarrr: {
        acquisition: metrics.acquisition || 1000,
        activation: metrics.activation || 420,
        retention: metrics.retention || 280,
        revenue: metrics.revenue_conversions || 156,
        referral: metrics.referral || 43,
      },
      commHealth,
      orderSummary,
      autoCompany,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
