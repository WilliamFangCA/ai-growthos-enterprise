// 電商平台連接路由。Shopee 為真實串接範本；其餘平台誠實標示為「待接入」。
// 掛載：app.use('/api/ecommerce', requireAuth, ecommerceRouter)（callback 例外，見 index.js）
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { encrypt, decrypt } = require('../services/secretBox');
const shopee = require('../services/shopeeClient');

// 平台目錄：真實可接 vs 待接入（誠實狀態）
const PLATFORMS = [
  { id: 'shopee', name: 'Shopee 蝦皮', region: 'TW/SEA', integration: 'real' },
  { id: 'momo', name: 'momo 購物網', region: 'TW', integration: 'coming_soon' },
  { id: 'pchome', name: 'PChome', region: 'TW', integration: 'coming_soon' },
  { id: 'rakuten', name: '樂天市場', region: 'TW/JP', integration: 'coming_soon' },
  { id: 'amazon', name: 'Amazon', region: 'Global', integration: 'coming_soon' },
  { id: 'ebay', name: 'eBay', region: 'Global', integration: 'coming_soon' },
  { id: 'shopify', name: 'Shopify', region: 'Global', integration: 'coming_soon' },
  { id: 'lazada', name: 'Lazada', region: 'SEA', integration: 'coming_soon' },
];

function pubConn(c) {
  if (!c) return c;
  return {
    id: c.id, platform: c.platform, shop_id: c.shop_id, shop_name: c.shop_name,
    status: c.status, mode: c.mode, last_sync_at: c.last_sync_at, created_at: c.created_at,
    has_token: !!c.access_token,
  };
}

// GET /api/ecommerce/platforms — 目錄 + 各平台是否「現在就能連」
router.get('/platforms', (req, res) => {
  res.json(PLATFORMS.map(p => ({
    ...p,
    connectable: p.integration === 'real' && (p.id === 'shopee' ? shopee.isConfigured() : false),
    configured: p.id === 'shopee' ? shopee.isConfigured() : false,
  })));
});

// GET /api/ecommerce/connections
router.get('/connections', (req, res) => {
  res.json(all('SELECT * FROM ecommerce_connections ORDER BY created_at DESC').map(pubConn));
});

// GET /api/ecommerce/shopee/auth-url — 取得賣家授權連結
router.get('/shopee/auth-url', (req, res) => {
  try {
    if (!shopee.isConfigured()) return res.status(503).json({ error: 'Shopee 未設定（SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY）', configured: false });
    const base = process.env.APP_BASE_URL || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;
    const redirect = `${base.replace(/\/$/, '')}/api/ecommerce/shopee/callback`;
    res.json({ url: shopee.buildAuthUrl(redirect) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ecommerce/shopee/callback — Shopee 授權後導回（公開，見 index.js 例外掛載）
router.get('/shopee/callback', async (req, res) => {
  try {
    const { code, shop_id } = req.query;
    if (!code || !shop_id) return res.redirect('/app/settings?ecommerce=failed');
    const tok = await shopee.getAccessToken(code, shop_id);
    if (!tok || !tok.access_token) {
      console.warn('[shopee callback] token error', tok);
      return res.redirect('/app/settings?ecommerce=failed');
    }
    let shopName = `Shopee ${shop_id}`;
    try { const info = await shopee.getShopInfo(tok.access_token, shop_id); if (info?.shop_name) shopName = info.shop_name; } catch (_) {}
    const expiresAt = new Date(Date.now() + (tok.expire_in || 14400) * 1000).toISOString();
    const existing = get('SELECT id FROM ecommerce_connections WHERE platform = ? AND shop_id = ?', ['shopee', String(shop_id)]);
    if (existing) {
      run(`UPDATE ecommerce_connections SET access_token = ?, refresh_token = ?, token_expires_at = ?, shop_name = ?, status = 'connected', last_sync_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [encrypt(tok.access_token), encrypt(tok.refresh_token), expiresAt, shopName, existing.id]);
    } else {
      run(`INSERT INTO ecommerce_connections (platform, shop_id, shop_name, access_token, refresh_token, token_expires_at, status, mode) VALUES (?,?,?,?,?,?, 'connected', 'real')`,
        ['shopee', String(shop_id), shopName, encrypt(tok.access_token), encrypt(tok.refresh_token), expiresAt]);
    }
    res.redirect('/app/settings?ecommerce=connected');
  } catch (err) {
    console.error('[shopee callback]', err.message);
    res.redirect('/app/settings?ecommerce=failed');
  }
});

// POST /api/ecommerce/connections/:id/sync — 拉店鋪資訊 + 近期訂單
router.post('/connections/:id/sync', async (req, res) => {
  try {
    const c = get('SELECT * FROM ecommerce_connections WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'connection not found' });
    if (c.platform !== 'shopee') return res.status(400).json({ error: `${c.platform} 同步尚未支援` });
    const token = decrypt(c.access_token);
    const [info, orders] = await Promise.all([
      shopee.getShopInfo(token, c.shop_id).catch(e => ({ error: e.message })),
      shopee.getOrderList(token, c.shop_id, { days: 7 }).catch(e => ({ error: e.message })),
    ]);
    run('UPDATE ecommerce_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?', [c.id]);
    res.json({ ok: true, shop: info, orders: orders?.response || orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ecommerce/connections/:id
router.delete('/connections/:id', (req, res) => {
  run('DELETE FROM ecommerce_connections WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
