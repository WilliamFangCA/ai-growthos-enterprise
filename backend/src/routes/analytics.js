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

module.exports = router;
