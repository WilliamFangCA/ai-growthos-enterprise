const express = require('express');
const router = express.Router();
const { get, all } = require('../db');

// GET /api/analytics/overview
router.get('/overview', (req, res) => {
  try {
    const totalRevenue = (get(`SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE status NOT IN ('refund_requested','refunded')`) || {}).v || 0;
    const totalOrders = (get(`SELECT COUNT(*) as v FROM orders`) || {}).v || 0;
    const totalContacts = (get(`SELECT COUNT(*) as v FROM contacts`) || {}).v || 0;
    const totalMembers = (get(`SELECT COUNT(*) as v FROM members`) || {}).v || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalMessages = (get(`SELECT COUNT(*) as v FROM messages`) || {}).v || 0;
    const aiMessages = (get(`SELECT COUNT(*) as v FROM messages WHERE sent_by = 'ai'`) || {}).v || 0;
    const totalWorkflowRuns = (get(`SELECT COALESCE(SUM(run_count),0) as v FROM workflows`) || {}).v || 0;
    const totalContentPieces = (get(`SELECT COUNT(*) as v FROM content_history`) || {}).v || 0;
    const avgChurnRisk = (get(`SELECT AVG(ai_churn_prob) as v FROM contacts`) || {}).v || 0;
    const highChurnCount = (get(`SELECT COUNT(*) as v FROM contacts WHERE ai_churn_prob >= 0.6`) || {}).v || 0;

    res.json({
      revenue: { total: totalRevenue, avgOrderValue, totalOrders },
      contacts: { total: totalContacts, highChurnCount, avgChurnRisk },
      members: { total: totalMembers },
      comms: { totalMessages, aiMessages, aiRate: totalMessages > 0 ? aiMessages / totalMessages : 0 },
      automation: { workflowRuns: totalWorkflowRuns, contentPieces: totalContentPieces },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/revenue
router.get('/revenue', (req, res) => {
  try {
    const byPlatform = all(`SELECT platform, COUNT(*) as orders, COALESCE(SUM(total_amount),0) as revenue FROM orders GROUP BY platform ORDER BY revenue DESC`);
    const byStatus = all(`SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount),0) as amount FROM orders GROUP BY status ORDER BY amount DESC`);
    const topOrders = all(`SELECT platform_order_id, contact_name, total_amount, status, created_at FROM orders ORDER BY total_amount DESC LIMIT 5`);

    // Generate 30-day synthetic daily GMV trend (based on total revenue distributed over 30 days)
    const totalRevenue = (get(`SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE status NOT IN ('refund_requested','refunded')`) || {}).v || 0;
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const variation = 0.5 + Math.random() * 1.5;
      const base = totalRevenue / 30;
      return {
        date: date.toISOString().split('T')[0],
        gmv: Math.round(base * variation),
        orders: Math.round(Math.random() * 8) + 2,
      };
    });

    res.json({ byPlatform, byStatus, topOrders, dailyTrend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/members
router.get('/members', (req, res) => {
  try {
    const byLevel = all(`SELECT level, COUNT(*) as count, COALESCE(SUM(total_spend),0) as total_spend, AVG(points) as avg_points FROM members GROUP BY level ORDER BY total_spend DESC`);
    const topMembers = all(`SELECT contact_name, level, points, total_spend FROM members ORDER BY total_spend DESC LIMIT 10`);
    const totalPoints = (get(`SELECT COALESCE(SUM(points),0) as v FROM members`) || {}).v || 0;
    const totalSpend = (get(`SELECT COALESCE(SUM(total_spend),0) as v FROM members`) || {}).v || 0;

    // Lifecycle stage distribution
    const lifecycle = all(`SELECT lifecycle_stage, COUNT(*) as count FROM contacts GROUP BY lifecycle_stage`);

    res.json({ byLevel, topMembers, totalPoints, totalSpend, lifecycle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/comms
router.get('/comms', (req, res) => {
  try {
    const byPlatform = all(`SELECT platform, COUNT(*) as conversations, COALESCE(SUM(unread_count),0) as unread FROM conversations GROUP BY platform ORDER BY conversations DESC`);
    const byStatus = all(`SELECT status, COUNT(*) as count FROM conversations GROUP BY status`);
    const messageTypes = all(`SELECT sent_by, COUNT(*) as count FROM messages GROUP BY sent_by`);
    const aiNodeTypes = all(`SELECT ai_node_type, COUNT(*) as count, AVG(quality_score) as avg_quality FROM messages WHERE ai_node_type IS NOT NULL AND ai_node_type != '' GROUP BY ai_node_type ORDER BY count DESC`);
    const openConvos = (get(`SELECT COUNT(*) as v FROM conversations WHERE status = 'open'`) || {}).v || 0;
    const resolvedConvos = (get(`SELECT COUNT(*) as v FROM conversations WHERE status = 'resolved'`) || {}).v || 0;
    const humanTakeovers = (get(`SELECT COUNT(*) as v FROM conversations WHERE assigned_to = 'human'`) || {}).v || 0;

    res.json({ byPlatform, byStatus, messageTypes, aiNodeTypes, openConvos, resolvedConvos, humanTakeovers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/aarrr
router.get('/aarrr', (req, res) => {
  try {
    const metrics = {};
    all(`SELECT metric_key, metric_value FROM metrics_snapshots`).forEach(r => {
      metrics[r.metric_key] = r.metric_value;
    });

    const acquisition = metrics.acquisition || 1000;
    const activation = metrics.activation || 420;
    const retention = metrics.retention || 280;
    const revenue = metrics.revenue_conversions || 156;
    const referral = metrics.referral || 43;

    res.json({
      funnel: [
        { stage: 'Acquisition', value: acquisition, convRate: 1 },
        { stage: 'Activation',  value: activation,  convRate: activation / acquisition },
        { stage: 'Retention',   value: retention,   convRate: retention / activation },
        { stage: 'Revenue',     value: revenue,     convRate: revenue / retention },
        { stage: 'Referral',    value: referral,    convRate: referral / revenue },
      ],
      insights: [
        { stage: 'Acquisition → Activation', rate: ((activation / acquisition) * 100).toFixed(1), trend: 'up', note: '↑ 3.2% vs last month' },
        { stage: 'Activation → Retention',   rate: ((retention / activation) * 100).toFixed(1),   trend: 'down', note: '↓ 1.8% — onboarding needs fix' },
        { stage: 'Retention → Revenue',      rate: ((revenue / retention) * 100).toFixed(1),      trend: 'up', note: '↑ 5.6% — VIP upgrade flow working' },
        { stage: 'Revenue → Referral',       rate: ((referral / revenue) * 100).toFixed(1),       trend: 'neutral', note: 'Flat — referral loop needs activation' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/workflows
router.get('/workflows', (req, res) => {
  try {
    // Per-category breakdown
    const byCategory = all(`
      SELECT category, COUNT(*) as count,
             SUM(run_count) as total_runs,
             SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active_count
      FROM workflows
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY total_runs DESC
    `);

    const CATEGORY_LABELS = {
      acquisition: '獲客', activation: '激活', retention: '留存',
      revenue: '收入', referral: '裂變', order: '訂單', comms: '通訊', general: '一般',
    };
    const categorized = byCategory.map(c => ({
      ...c,
      label: CATEGORY_LABELS[c.category] || c.category,
    }));

    // Top 8 workflows by run_count
    const topWorkflows = all(`
      SELECT id, name, category, run_count, status, description
      FROM workflows
      ORDER BY run_count DESC
      LIMIT 8
    `);

    // 7-day daily run trend from workflow_run_logs
    const rawTrend = all(`
      SELECT DATE(executed_at) as date, COUNT(*) as runs
      FROM workflow_run_logs
      WHERE executed_at >= DATE('now', '-7 days')
      GROUP BY DATE(executed_at)
      ORDER BY date ASC
    `);
    const trendMap = {};
    rawTrend.forEach(d => { trendMap[d.date] = d.runs; });
    const trend7d = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trend7d.push({ date: key, runs: trendMap[key] || 0 });
    }

    // AARRR attribution — map categories to funnel stages
    const AARRR_MAP = {
      acquisition: 'Acquisition', activation: 'Activation',
      retention: 'Retention', revenue: 'Revenue', referral: 'Referral',
      order: 'Revenue', comms: 'Retention', general: 'Retention',
    };
    const aarrrAcc = {};
    byCategory.forEach(c => {
      const stage = AARRR_MAP[c.category] || 'Retention';
      aarrrAcc[stage] = (aarrrAcc[stage] || 0) + Number(c.total_runs || 0);
    });
    const AARRR_ORDER = ['Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral'];
    const aarrrAttribution = AARRR_ORDER
      .filter(s => aarrrAcc[s])
      .map(s => ({ stage: s, runs: aarrrAcc[s] }));

    // Summary
    const totalRuns = (get(`SELECT COALESCE(SUM(run_count),0) as v FROM workflows`) || {}).v || 0;
    const activeWorkflows = (get(`SELECT COUNT(*) as v FROM workflows WHERE status='active'`) || {}).v || 0;
    const totalWorkflows = (get(`SELECT COUNT(*) as v FROM workflows`) || {}).v || 0;
    const todayRuns = (get(`SELECT COUNT(*) as v FROM workflow_run_logs WHERE DATE(executed_at) = DATE('now')`) || {}).v || 0;
    const avgDailyRuns = trend7d.length > 0
      ? Math.round(trend7d.reduce((s, d) => s + d.runs, 0) / trend7d.length)
      : 0;

    res.json({
      byCategory: categorized,
      topWorkflows,
      trend7d,
      aarrrAttribution,
      summary: { totalRuns, activeWorkflows, totalWorkflows, todayRuns, avgDailyRuns },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
