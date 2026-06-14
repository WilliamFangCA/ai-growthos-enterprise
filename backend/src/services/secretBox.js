// 憑證加密服務（at-rest encryption for platform credentials）
// 所有第三方平台的 access_token / secret 在寫入 DB 前都先經此加密。
// 金鑰來源：APP_SECRET（建議在 .env 設定 32+ 字元隨機字串）。
// 未設定 APP_SECRET 時退回由固定字串派生的金鑰（僅供本機開發，會印警告）。

const crypto = require('crypto');

let warned = false;
function getKey() {
  const secret = process.env.APP_SECRET || process.env.NEWEBPAY_HASH_KEY || '';
  if (!secret) {
    if (!warned) {
      console.warn('[secretBox] APP_SECRET 未設定 — 使用開發用派生金鑰，請勿用於正式環境的真實憑證。');
      warned = true;
    }
    return crypto.createHash('sha256').update('growthos-dev-insecure-key').digest();
  }
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

// 加密：回傳 "v1:ivHex:tagHex:cipherHex"，輸入 null/'' 原樣回傳
function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

// 解密：非 v1 格式（或 null）原樣回傳，方便相容舊明文資料
function decrypt(stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('v1:')) return stored || null;
  try {
    const [, ivHex, tagHex, dataHex] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch (err) {
    console.error('[secretBox] decrypt failed:', err.message);
    return null;
  }
}

// 遮罩顯示（給前端看尾 4 碼，不外洩完整憑證）
function mask(plain) {
  if (!plain) return '';
  const s = String(plain);
  if (s.length <= 4) return '••••';
  return '••••' + s.slice(-4);
}

module.exports = { encrypt, decrypt, mask };
