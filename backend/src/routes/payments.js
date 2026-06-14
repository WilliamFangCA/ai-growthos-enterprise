// 金流路由（藍新 NewebPay MPG）。
// 掛載：app.use('/api/payments', optionalAuth, paymentsRouter)
//   - /plans /status /checkout /orders /order/:no 需登入態（從 req.user 取 uid，可選）
//   - /notify /return 為藍新伺服器/瀏覽器回調，必須公開（optionalAuth 不擋）
const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const newebpay = require('../services/newebpay');

// 訂閱方案目錄（與 consensus 定價一致）
const PLANS = {
  starter: { id: 'starter', name: 'Starter 入門', amount: 1999, desc: 'AI GrowthOS Starter 月費方案' },
  pro:     { id: 'pro',     name: 'Pro 專業',     amount: 3999, desc: 'AI GrowthOS Pro 月費方案' },
  enterprise: { id: 'enterprise', name: 'Enterprise 企業', amount: 12999, desc: 'AI GrowthOS Enterprise 月費方案' },
};

function baseUrl(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function genOrderNo() {
  // 藍新限英數，≤30 字元
  return ('GO' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase().slice(0, 30);
}

// GET /api/payments/plans
router.get('/plans', (req, res) => res.json(Object.values(PLANS)));

// GET /api/payments/status — 金流是否已設定
router.get('/status', (req, res) => {
  res.json({ configured: newebpay.isConfigured(), provider: 'newebpay', env: newebpay.cfg().env });
});

// POST /api/payments/checkout { plan, email } → 建立訂單 + 回傳自動送出表單
router.post('/checkout', (req, res) => {
  try {
    const { plan, email } = req.body || {};
    const p = PLANS[plan];
    if (!p) return res.status(400).json({ error: '未知方案' });
    if (!newebpay.isConfigured()) {
      return res.status(503).json({ error: '金流尚未設定，請於 .env 填入 NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV', configured: false });
    }
    const merchantOrderNo = genOrderNo();
    const uid = req.user?.uid || null;
    run(`INSERT INTO payment_orders (tenant_id, user_uid, merchant_order_no, plan, item_desc, amount, currency, status, payer_email)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.tenantId || 'demo', uid, merchantOrderNo, p.id, p.desc, p.amount, 'TWD', 'pending', email || req.user?.email || '']);

    const form = newebpay.buildPaymentForm({
      merchantOrderNo,
      amount: p.amount,
      itemDesc: p.desc,
      email: email || req.user?.email || '',
      notifyUrl: `${baseUrl(req)}/api/payments/notify`,
      returnUrl: `${baseUrl(req)}/api/payments/return`,
      clientBackUrl: `${baseUrl(req)}/app/settings`,
    });
    res.json({ merchantOrderNo, plan: p, ...form });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/notify — 藍新伺服器背景通知（金流真相來源）
router.post('/notify', express.urlencoded({ extended: false }), (req, res) => {
  try {
    const parsed = newebpay.parseNotify(req.body);
    const r = parsed.result || {};
    const orderNo = r.MerchantOrderNo;
    if (!parsed.valid) {
      console.warn('[payments notify] 簽章驗證失敗', orderNo);
      return res.status(400).send('checksum failed');
    }
    if (orderNo) {
      const paid = parsed.status === 'SUCCESS';
      run(`UPDATE payment_orders SET status = ?, pay_method = ?, provider_trade_no = ?, raw_result = ?, paid_at = ?
           WHERE merchant_order_no = ?`,
        [paid ? 'paid' : 'failed', r.PaymentType || null, r.TradeNo || null, JSON.stringify(parsed),
         paid ? new Date().toISOString() : null, orderNo]);
      console.log(`[payments notify] ${orderNo} → ${paid ? 'paid' : 'failed'} (${parsed.status})`);
    }
    res.status(200).send('OK'); // 藍新要求回 200
  } catch (err) {
    console.error('[payments notify]', err.message);
    res.status(200).send('OK');
  }
});

// POST /api/payments/return — 付款完成後使用者瀏覽器導回（顯示用，非真相來源）
router.post('/return', express.urlencoded({ extended: false }), (req, res) => {
  let ok = false, orderNo = '';
  try {
    const parsed = newebpay.parseNotify(req.body);
    ok = parsed.valid && parsed.status === 'SUCCESS';
    orderNo = parsed.result?.MerchantOrderNo || '';
  } catch (_) {}
  res.redirect(`/app/settings?payment=${ok ? 'success' : 'failed'}&order=${encodeURIComponent(orderNo)}`);
});

// GET /api/payments/orders — 近期訂單
router.get('/orders', (req, res) => {
  try {
    const uid = req.user?.uid;
    const rows = uid
      ? all('SELECT * FROM payment_orders WHERE user_uid = ? ORDER BY created_at DESC LIMIT 50', [uid])
      : all('SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT 50');
    res.json(rows.map(o => ({ ...o, raw_result: undefined })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/order/:no — 單筆狀態（前端輪詢）
router.get('/order/:no', (req, res) => {
  const o = get('SELECT * FROM payment_orders WHERE merchant_order_no = ?', [req.params.no]);
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json({ ...o, raw_result: undefined });
});

module.exports = router;
