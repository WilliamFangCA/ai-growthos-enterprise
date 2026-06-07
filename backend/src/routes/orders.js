const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { callAI } = require('../aiRouter');

const ORDER_STATUSES = ['pending','paid','processing','shipped','in_transit','delivered','completed','refund_requested','refunded','exchange_requested','exchanged'];

// GET /api/orders
router.get('/', (req, res) => {
  const { status, platform, page = 1, limit = 20 } = req.query;
  try {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const orders = all(sql, params).map(o => ({
      ...o,
      items: JSON.parse(o.items_json || '[]'),
    }));

    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];
    if (status) { countSql += ' AND status = ?'; countParams.push(status); }
    if (platform) { countSql += ' AND platform = ?'; countParams.push(platform); }
    const total = get(countSql, countParams)?.total || 0;

    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/stats
router.get('/stats', (req, res) => {
  try {
    const total = get('SELECT COUNT(*) as count FROM orders')?.count || 0;
    const todayGMV = get(`SELECT SUM(total_amount) as gmv FROM orders WHERE date(created_at) = date('now')`)?.gmv || 0;
    const pending = get('SELECT COUNT(*) as count FROM orders WHERE status = "pending"')?.count || 0;
    const processing = get('SELECT COUNT(*) as count FROM orders WHERE status IN ("paid","processing")')?.count || 0;
    const shipped = get('SELECT COUNT(*) as count FROM orders WHERE status IN ("shipped","in_transit")')?.count || 0;
    const delivered = get('SELECT COUNT(*) as count FROM orders WHERE status = "delivered" OR status = "completed"')?.count || 0;
    const refunds = get('SELECT COUNT(*) as count FROM orders WHERE status LIKE "refund%"')?.count || 0;
    const totalRevenue = get('SELECT SUM(total_amount) as rev FROM orders WHERE status NOT IN ("refund_requested","refunded")')?.rev || 0;
    res.json({ total, todayGMV, pending, processing, shipped, delivered, refunds, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  try {
    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = JSON.parse(order.items_json || '[]');
    const notifications = all('SELECT * FROM order_notifications WHERE order_id = ? ORDER BY sent_at DESC', [req.params.id]);
    res.json({ ...order, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status — update status + trigger AI notification
router.put('/:id/status', async (req, res) => {
  const { status, tracking_number, logistics_provider, estimated_delivery } = req.body;
  if (!status || !ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  try {
    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];
    if (tracking_number) { updates.push('tracking_number = ?'); params.push(tracking_number); }
    if (logistics_provider) { updates.push('logistics_provider = ?'); params.push(logistics_provider); }
    if (estimated_delivery) { updates.push('estimated_delivery = ?'); params.push(estimated_delivery); }
    params.push(req.params.id);
    run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);

    // Generate AI notification
    const notifPrompt = `Generate a short, friendly customer notification message (max 2 sentences) for order #${order.platform_order_id || order.id} status change to "${status}". Customer name: ${order.contact_name}. ${tracking_number ? `Tracking: ${tracking_number}.` : ''} ${estimated_delivery ? `Estimated delivery: ${estimated_delivery}.` : ''} Reply in Traditional Chinese.`;
    const notifResult = await callAI(notifPrompt, 'You are a customer notification AI. Write concise, warm order status notifications.', { model: 'glm-5-turbo', maxTokens: 200, temperature: 0.5 });

    run('INSERT INTO order_notifications (order_id, notification_type, channel, content, status) VALUES (?,?,?,?,?)',
      [req.params.id, status, order.contact_email ? 'email' : 'line', notifResult.content, 'sent']);

    res.json({ success: true, status, notification: notifResult.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — create order
router.post('/', (req, res) => {
  const { platform, platform_order_id, contact_name, contact_email, items, subtotal, shipping_fee = 0, discount = 0, currency = 'TWD', shipping_address } = req.body;
  if (!platform || !contact_name) return res.status(400).json({ error: 'platform and contact_name required' });
  try {
    const total = (subtotal || 0) + shipping_fee - discount;
    run(`INSERT INTO orders (platform, platform_order_id, contact_name, contact_email, items_json, subtotal, shipping_fee, discount, total_amount, currency, shipping_address) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [platform, platform_order_id || null, contact_name, contact_email || null, JSON.stringify(items || []), subtotal || 0, shipping_fee, discount, total, currency, shipping_address || null]);
    const order = get('SELECT * FROM orders WHERE id = last_insert_rowid()');
    res.json({ ...order, items: JSON.parse(order.items_json) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id/notifications
router.get('/:id/notifications', (req, res) => {
  try {
    const notifications = all('SELECT * FROM order_notifications WHERE order_id = ? ORDER BY sent_at DESC', [req.params.id]);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
