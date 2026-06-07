const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/marketing/stats
router.get('/stats', (req, res) => {
  try {
    const total = (get(`SELECT COUNT(*) as v FROM campaigns`) || {}).v || 0;
    const active = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'active'`) || {}).v || 0;
    const draft = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'draft'`) || {}).v || 0;
    const completed = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'completed'`) || {}).v || 0;
    const totalSent = (get(`SELECT COALESCE(SUM(sent_count), 0) as v FROM campaigns`) || {}).v || 0;
    const totalRevenue = (get(`SELECT COALESCE(SUM(revenue_generated), 0) as v FROM campaigns`) || {}).v || 0;
    const avgOpenRate = (get(`SELECT AVG(open_rate) as v FROM campaigns WHERE sent_count > 0`) || {}).v || 0;
    const avgConvRate = (get(`SELECT AVG(conversion_rate) as v FROM campaigns WHERE sent_count > 0`) || {}).v || 0;

    res.json({ total, active, draft, completed, totalSent, totalRevenue, avgOpenRate, avgConvRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/campaigns
router.get('/campaigns', (req, res) => {
  try {
    const { status, type } = req.query;
    let sql = 'SELECT * FROM campaigns WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    res.json(all(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/campaigns/:id
router.get('/campaigns/:id', (req, res) => {
  try {
    const campaign = get(`SELECT * FROM campaigns WHERE id = ?`, [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const sequences = all(`SELECT * FROM email_sequences WHERE campaign_id = ? ORDER BY step_number`, [req.params.id]);
    res.json({ ...campaign, sequences });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/campaigns
router.post('/campaigns', (req, res) => {
  try {
    const { name, type, trigger_type, trigger_config, audience_segment } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    run(`INSERT INTO campaigns (name, type, trigger_type, trigger_config, audience_segment) VALUES (?,?,?,?,?)`,
      [name, type, trigger_type || 'manual', trigger_config || '{}', audience_segment || 'all']);
    const created = get(`SELECT * FROM campaigns ORDER BY id DESC LIMIT 1`);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/marketing/campaigns/:id/status
router.put('/campaigns/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'scheduled', 'active', 'paused', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    run(`UPDATE campaigns SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ success: true, id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/templates
router.get('/templates', (req, res) => {
  try {
    res.json([
      { id: 'tpl_1', name: '新用戶 7 天激活序列', type: 'email_sequence', trigger: 'user_signup', steps: 4, icon: '🚀', description: '從歡迎→引導→分析→升級，完整激活新用戶' },
      { id: 'tpl_2', name: '流失用戶喚回序列', type: 'email_sequence', trigger: 'inactive_30d', steps: 2, icon: '💌', description: '30天未活躍用戶的個性化喚回流程' },
      { id: 'tpl_3', name: 'VIP 升級恭賀', type: 'push_notification', trigger: 'tier_upgrade', steps: 1, icon: '👑', description: '自動發送 VIP 升級恭賀 + 專屬福利說明' },
      { id: 'tpl_4', name: '訂單狀態更新', type: 'push_notification', trigger: 'order_status', steps: 6, icon: '📦', description: '覆蓋訂單全生命週期的 AI 自動通知' },
      { id: 'tpl_5', name: '活動報名確認序列', type: 'email_sequence', trigger: 'event_signup', steps: 2, icon: '📅', description: '報名確認→提醒→感謝一條龍自動化' },
      { id: 'tpl_6', name: '社群每週暖場', type: 'social_post', trigger: 'scheduled', steps: 1, icon: '💬', description: '自動發送每週社群暖場貼文，保持社群活躍' },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/loyalty
router.get('/loyalty', (req, res) => {
  try {
    const transactions = all(`SELECT * FROM loyalty_transactions ORDER BY created_at DESC LIMIT 50`);
    const totalEarned = (get(`SELECT COALESCE(SUM(points_delta), 0) as v FROM loyalty_transactions WHERE type = 'earn'`) || {}).v || 0;
    const totalRedeemed = Math.abs((get(`SELECT COALESCE(SUM(points_delta), 0) as v FROM loyalty_transactions WHERE type = 'redeem'`) || {}).v || 0);
    const totalMembers = (get(`SELECT COUNT(*) as v FROM members`) || {}).v || 0;
    const avgPoints = (get(`SELECT AVG(points) as v FROM members`) || {}).v || 0;
    res.json({ transactions, stats: { totalEarned, totalRedeemed, totalMembers, avgPoints: Math.round(avgPoints) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
