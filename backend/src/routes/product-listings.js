const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/product-listings — list with optional filters
router.get('/', (req, res) => {
  const { status, platform, q, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [`tenant_id = 'demo'`];
  const params = [];

  if (status) { conditions.push(`status = ?`); params.push(status); }
  if (q) { conditions.push(`(title LIKE ? OR sku LIKE ? OR tags LIKE ?)`); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (platform) { conditions.push(`platforms_json LIKE ?`); params.push(`%${platform}%`); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = get(`SELECT COUNT(*) as n FROM product_listings ${where}`, params).n;
  const rows = all(
    `SELECT * FROM product_listings ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  rows.forEach(r => {
    try { r.images = JSON.parse(r.images_json || '[]'); } catch { r.images = []; }
    try { r.platforms = JSON.parse(r.platforms_json || '[]'); } catch { r.platforms = []; }
    try { r.publish_status = JSON.parse(r.publish_status_json || '{}'); } catch { r.publish_status = {}; }
  });

  res.json({ products: rows, total, page: Number(page), limit: Number(limit) });
});

// GET /api/product-listings/:id
router.get('/:id', (req, res) => {
  const row = get(`SELECT * FROM product_listings WHERE id = ? AND tenant_id = 'demo'`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  try { row.images = JSON.parse(row.images_json || '[]'); } catch { row.images = []; }
  try { row.platforms = JSON.parse(row.platforms_json || '[]'); } catch { row.platforms = []; }
  try { row.publish_status = JSON.parse(row.publish_status_json || '{}'); } catch { row.publish_status = {}; }
  res.json(row);
});

// POST /api/product-listings — create
router.post('/', (req, res) => {
  const {
    title, description = '', price = 0, compare_price = 0,
    currency = 'TWD', sku = '', stock = 0, category = '',
    images = [], tags = '', status = 'draft', platforms = [],
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const r = run(
    `INSERT INTO product_listings
      (title, description, price, compare_price, currency, sku, stock, category,
       images_json, tags, status, platforms_json, publish_status_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      title, description, price, compare_price, currency, sku, stock, category,
      JSON.stringify(images), tags, status,
      JSON.stringify(platforms), JSON.stringify({}),
    ]
  );
  const created = get(`SELECT * FROM product_listings WHERE id = ?`, [r.lastInsertRowid]);
  try { created.images = JSON.parse(created.images_json || '[]'); } catch { created.images = []; }
  try { created.platforms = JSON.parse(created.platforms_json || '[]'); } catch { created.platforms = []; }
  try { created.publish_status = JSON.parse(created.publish_status_json || '{}'); } catch { created.publish_status = {}; }
  res.status(201).json(created);
});

// PUT /api/product-listings/:id — update
router.put('/:id', (req, res) => {
  const existing = get(`SELECT * FROM product_listings WHERE id = ? AND tenant_id = 'demo'`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const {
    title, description, price, compare_price, currency, sku, stock,
    category, images, tags, status, platforms,
  } = req.body;

  run(
    `UPDATE product_listings SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      compare_price = COALESCE(?, compare_price),
      currency = COALESCE(?, currency),
      sku = COALESCE(?, sku),
      stock = COALESCE(?, stock),
      category = COALESCE(?, category),
      images_json = COALESCE(?, images_json),
      tags = COALESCE(?, tags),
      status = COALESCE(?, status),
      platforms_json = COALESCE(?, platforms_json),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title ?? null, description ?? null, price ?? null, compare_price ?? null,
      currency ?? null, sku ?? null, stock ?? null, category ?? null,
      images !== undefined ? JSON.stringify(images) : null,
      tags ?? null, status ?? null,
      platforms !== undefined ? JSON.stringify(platforms) : null,
      req.params.id,
    ]
  );

  const updated = get(`SELECT * FROM product_listings WHERE id = ?`, [req.params.id]);
  try { updated.images = JSON.parse(updated.images_json || '[]'); } catch { updated.images = []; }
  try { updated.platforms = JSON.parse(updated.platforms_json || '[]'); } catch { updated.platforms = []; }
  try { updated.publish_status = JSON.parse(updated.publish_status_json || '{}'); } catch { updated.publish_status = {}; }
  res.json(updated);
});

// POST /api/product-listings/:id/publish — publish to selected platforms
router.post('/:id/publish', (req, res) => {
  const row = get(`SELECT * FROM product_listings WHERE id = ? AND tenant_id = 'demo'`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { platforms: targetPlatforms = [] } = req.body;
  let publish_status = {};
  try { publish_status = JSON.parse(row.publish_status_json || '{}'); } catch {}

  const now = new Date().toISOString();
  const results = {};

  targetPlatforms.forEach(platform => {
    // Credentials are stored client-side; here we record the publish attempt.
    // In production each platform connector would be called here.
    publish_status[platform] = { status: 'published', published_at: now };
    results[platform] = { success: true };
  });

  run(
    `UPDATE product_listings SET publish_status_json = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(publish_status), req.params.id]
  );

  res.json({ success: true, results, publish_status });
});

// DELETE /api/product-listings/:id
router.delete('/:id', (req, res) => {
  const existing = get(`SELECT id FROM product_listings WHERE id = ? AND tenant_id = 'demo'`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  run(`DELETE FROM product_listings WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

// ── Platform Messages ─────────────────────────────────────────────────────────

// GET /api/product-listings/messages/list — platform buyer messages
router.get('/messages/list', (req, res) => {
  const { platform, unread, page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [`tenant_id = 'demo'`];
  const params = [];

  if (platform) { conditions.push(`platform = ?`); params.push(platform); }
  if (unread === '1') { conditions.push(`is_read = 0`); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = get(`SELECT COUNT(*) as n FROM platform_messages ${where}`, params).n;
  const rows = all(
    `SELECT * FROM platform_messages ${where} ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  res.json({ messages: rows, total, page: Number(page) });
});

// POST /api/product-listings/messages — ingest inbound message (webhook)
router.post('/messages', (req, res) => {
  const {
    platform, platform_account_id = '', external_conversation_id = '',
    buyer_name = '', buyer_id = '', direction = 'inbound',
    content, message_type = 'text', order_id = '', sent_at,
  } = req.body;

  if (!platform || !content) return res.status(400).json({ error: 'platform and content required' });

  const r = run(
    `INSERT INTO platform_messages
      (platform, platform_account_id, external_conversation_id,
       buyer_name, buyer_id, direction, content, message_type, order_id, sent_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      platform, platform_account_id, external_conversation_id,
      buyer_name, buyer_id, direction, content, message_type,
      order_id, sent_at || new Date().toISOString(),
    ]
  );
  res.status(201).json({ id: r.lastInsertRowid, success: true });
});

// PUT /api/product-listings/messages/:id/read — mark as read
router.put('/messages/:id/read', (req, res) => {
  run(`UPDATE platform_messages SET is_read = 1 WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
