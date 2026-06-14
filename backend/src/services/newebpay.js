// 藍新金流 NewebPay MPG（幕前支付）服務
// 文件：https://www.newebpay.com → 技術文件 MPG。
// 加密：TradeInfo 以 AES-256-CBC（key=HashKey 32 字元、iv=HashIV 16 字元、PKCS7）加密為 hex；
//       TradeSha = SHA256("HashKey={key}&{cipher}&HashIV={iv}") 大寫。
// 缺金鑰時 isConfigured() 為 false，呼叫端回報「金流未設定」而非崩潰。

const crypto = require('crypto');
const querystring = require('querystring');

function cfg() {
  return {
    merchantId: process.env.NEWEBPAY_MERCHANT_ID || '',
    hashKey: process.env.NEWEBPAY_HASH_KEY || '',
    hashIv: process.env.NEWEBPAY_HASH_IV || '',
    env: (process.env.NEWEBPAY_ENV || 'test').toLowerCase(),
  };
}

function isConfigured() {
  const c = cfg();
  return !!(c.merchantId && c.hashKey && c.hashIv);
}

function gatewayUrl() {
  return cfg().env === 'production'
    ? 'https://core.newebpay.com/MPG/mpg_gateway'
    : 'https://ccore.newebpay.com/MPG/mpg_gateway';
}

// AES-256-CBC 加密 → hex（PKCS7 自動補位）
function aesEncrypt(plain) {
  const { hashKey, hashIv } = cfg();
  const cipher = crypto.createCipheriv('aes-256-cbc', hashKey, hashIv);
  cipher.setAutoPadding(true);
  return cipher.update(plain, 'utf8', 'hex') + cipher.final('hex');
}

// AES-256-CBC 解密（回調 TradeInfo）。藍新有時補位字元殘留，採手動去尾並截到最後一個 '}'。
function aesDecrypt(hexCipher) {
  const { hashKey, hashIv } = cfg();
  const decipher = crypto.createDecipheriv('aes-256-cbc', hashKey, hashIv);
  decipher.setAutoPadding(false);
  let out = decipher.update(hexCipher, 'hex', 'utf8') + decipher.final('utf8');
  // 去除 PKCS7 / 控制字元殘留
  out = out.replace(/[\x00-\x1f]+$/g, '').trim();
  const lastBrace = out.lastIndexOf('}');
  if (lastBrace !== -1) out = out.slice(0, lastBrace + 1);
  return out;
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
}

function tradeSha(cipherHex) {
  const { hashKey, hashIv } = cfg();
  return sha256(`HashKey=${hashKey}&${cipherHex}&HashIV=${hashIv}`);
}

// 建立 MPG 付款表單欄位（前端自動 submit 到 gatewayUrl）
// params: { merchantOrderNo, amount, itemDesc, email, notifyUrl, returnUrl, clientBackUrl, payMethods? }
function buildPaymentForm(params) {
  if (!isConfigured()) throw new Error('NewebPay 未設定（請填 NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV）');
  const c = cfg();
  const trade = {
    MerchantID: c.merchantId,
    RespondType: 'JSON',
    TimeStamp: Math.floor(Date.now() / 1000),
    Version: '2.0',
    MerchantOrderNo: params.merchantOrderNo,
    Amt: params.amount,
    ItemDesc: params.itemDesc,
    Email: params.email || '',
    LoginType: 0,
    NotifyURL: params.notifyUrl,
    ReturnURL: params.returnUrl,
    ClientBackURL: params.clientBackUrl || params.returnUrl,
  };
  // 啟用付款方式（預設信用卡 + ATM + 超商代碼）
  const pm = params.payMethods || { CREDIT: 1, VACC: 1, CVS: 1, WEBATM: 1 };
  Object.assign(trade, pm);

  const tradeInfoPlain = querystring.stringify(trade);
  const tradeInfo = aesEncrypt(tradeInfoPlain);
  const sha = tradeSha(tradeInfo);
  return {
    actionUrl: gatewayUrl(),
    fields: { MerchantID: c.merchantId, TradeInfo: tradeInfo, TradeSha: sha, Version: '2.0' },
  };
}

// 驗證並解密回調，回傳 { valid, status, message, result }
function parseNotify(body) {
  const { TradeInfo, TradeSha } = body || {};
  if (!TradeInfo) return { valid: false, error: 'missing TradeInfo' };
  const expected = tradeSha(TradeInfo);
  const valid = !!TradeSha && expected === String(TradeSha).toUpperCase();
  let parsed = {};
  try { parsed = JSON.parse(aesDecrypt(TradeInfo)); } catch (e) { return { valid, error: 'decrypt failed: ' + e.message }; }
  return {
    valid,
    status: parsed.Status,
    message: parsed.Message,
    result: parsed.Result || {},
  };
}

module.exports = { isConfigured, gatewayUrl, buildPaymentForm, parseNotify, cfg };
