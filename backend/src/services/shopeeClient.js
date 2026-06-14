// Shopee Open API v2 客戶端（台灣最大電商平台，作為真實串接範本）。
// 文件：https://open.shopee.com/documents
// 簽名：HMAC-SHA256(partner_key, base_string)。
//   公開 API base_string = partner_id + path + timestamp
//   店鋪 API base_string = partner_id + path + timestamp + access_token + shop_id
// 缺 SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY 時 isConfigured() 為 false。

const crypto = require('crypto');

function cfg() {
  return {
    partnerId: process.env.SHOPEE_PARTNER_ID || '',
    partnerKey: process.env.SHOPEE_PARTNER_KEY || '',
    env: (process.env.SHOPEE_ENV || 'test').toLowerCase(),
  };
}
function isConfigured() { const c = cfg(); return !!(c.partnerId && c.partnerKey); }
function host() {
  return cfg().env === 'production'
    ? 'https://partner.shopeemobile.com'
    : 'https://partner.test-stable.shopeemobile.com';
}

function sign(baseString) {
  return crypto.createHmac('sha256', cfg().partnerKey).update(baseString).digest('hex');
}

// 產生店鋪授權 URL（賣家點擊後授權，Shopee 會 redirect 到 callback 帶 code + shop_id）
function buildAuthUrl(redirectUrl) {
  if (!isConfigured()) throw new Error('Shopee 未設定（SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY）');
  const c = cfg();
  const path = '/api/v2/shop/auth_partner';
  const ts = Math.floor(Date.now() / 1000);
  const sig = sign(`${c.partnerId}${path}${ts}`);
  const qs = new URLSearchParams({ partner_id: c.partnerId, timestamp: String(ts), sign: sig, redirect: redirectUrl });
  return `${host()}${path}?${qs.toString()}`;
}

// 公開 API 呼叫（不需 access_token）
async function publicCall(path, code, shopId) {
  const c = cfg();
  const ts = Math.floor(Date.now() / 1000);
  const sig = sign(`${c.partnerId}${path}${ts}`);
  const r = await fetch(`${host()}${path}?partner_id=${c.partnerId}&timestamp=${ts}&sign=${sig}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(c.partnerId) }),
  });
  return r.json();
}

// 以授權 code 換取 access_token
async function getAccessToken(code, shopId) {
  return publicCall('/api/v2/auth/token/get', code, shopId);
}

// 重新整理 token
async function refreshAccessToken(refreshToken, shopId) {
  const c = cfg();
  const path = '/api/v2/auth/access_token/get';
  const ts = Math.floor(Date.now() / 1000);
  const sig = sign(`${c.partnerId}${path}${ts}`);
  const r = await fetch(`${host()}${path}?partner_id=${c.partnerId}&timestamp=${ts}&sign=${sig}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, shop_id: Number(shopId), partner_id: Number(c.partnerId) }),
  });
  return r.json();
}

// 店鋪 API 呼叫（需 access_token + shop_id）
async function shopCall(path, accessToken, shopId, query = {}, method = 'GET', bodyObj = null) {
  const c = cfg();
  const ts = Math.floor(Date.now() / 1000);
  const sig = sign(`${c.partnerId}${path}${ts}${accessToken}${shopId}`);
  const qs = new URLSearchParams({
    partner_id: c.partnerId, timestamp: String(ts), sign: sig,
    access_token: accessToken, shop_id: String(shopId), ...query,
  });
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (bodyObj) opts.body = JSON.stringify(bodyObj);
  const r = await fetch(`${host()}${path}?${qs.toString()}`, opts);
  return r.json();
}

function getShopInfo(accessToken, shopId) {
  return shopCall('/api/v2/shop/get_shop_info', accessToken, shopId);
}

// 近 N 天訂單（time_range_field=create_time）
function getOrderList(accessToken, shopId, { days = 7, pageSize = 20 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return shopCall('/api/v2/order/get_order_list', accessToken, shopId, {
    time_range_field: 'create_time',
    time_from: String(now - days * 86400),
    time_to: String(now),
    page_size: String(pageSize),
  });
}

module.exports = { isConfigured, cfg, buildAuthUrl, getAccessToken, refreshAccessToken, getShopInfo, getOrderList };
