// 渠道適配器：所有「發送」與「接收驗證」的唯一出口。
// 設計原則：帳號若有真實憑證（connection_mode='real' 且 token 存在）→ 走真實平台 API；
//          否則回退為模擬（status:'simulated'），UI 會誠實標示為 Demo，絕不假裝送達。
// 切換真實發送不需改呼叫端，只要使用者在「帳號連接」填入憑證即可。

const crypto = require('crypto');
const { decrypt } = require('./secretBox');

const SIMULATED_CHANNELS = ['line', 'whatsapp', 'telegram', 'email', 'sms', 'push', 'messenger', 'instagram', 'webhook'];

// ── 低階：真實平台推送（皆回傳 { ok, providerId?, error? }）─────────────────
async function pushLine(accessToken, to, text) {
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: String(text).slice(0, 5000) }] }),
  });
  if (r.ok) return { ok: true };
  const body = await r.text().catch(() => '');
  return { ok: false, error: `LINE ${r.status}: ${body.slice(0, 300)}` };
}

async function pushTelegram(botToken, chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4096) }),
  });
  const j = await r.json().catch(() => ({}));
  if (j && j.ok) return { ok: true, providerId: String(j.result?.message_id || '') };
  return { ok: false, error: `Telegram: ${j?.description || r.status}` };
}

// Meta Messenger（pageAccessToken）/ Instagram 共用 Graph send API
async function pushMeta(pageAccessToken, recipientId, text, { instagram = false } = {}) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: String(text).slice(0, 2000) }, messaging_type: 'RESPONSE' }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j && j.message_id) return { ok: true, providerId: j.message_id };
  return { ok: false, error: `Meta${instagram ? '(IG)' : ''}: ${j?.error?.message || r.status}` };
}

// WhatsApp Cloud API：channel_id 存 phoneNumberId
async function pushWhatsApp(accessToken, phoneNumberId, to, text) {
  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: String(text).slice(0, 4000) } }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j?.messages?.length) return { ok: true, providerId: j.messages[0].id };
  return { ok: false, error: `WhatsApp: ${j?.error?.message || r.status}` };
}

// ── 高階：依帳號（DB row，含加密憑證）發送 ──────────────────────────────────
// recipient = 平台用戶 ID（LINE userId / Telegram chatId / Meta PSID / WA 電話）
async function sendViaAccount(account, recipient, content, meta = {}) {
  if (!account) return { status: 'simulated', reason: 'no_account', contentPreview: String(content).slice(0, 500) };

  const isReal = account.connection_mode === 'real' && account.access_token;
  if (!isReal) {
    return { status: 'simulated', channel: account.platform, recipient, contentPreview: String(content).slice(0, 500), meta, simulatedAt: new Date().toISOString() };
  }

  const token = decrypt(account.access_token);
  try {
    let result;
    switch (account.platform) {
      case 'line':      result = await pushLine(token, recipient, content); break;
      case 'telegram':  result = await pushTelegram(token, recipient, content); break;
      case 'messenger': result = await pushMeta(token, recipient, content); break;
      case 'instagram': result = await pushMeta(token, recipient, content, { instagram: true }); break;
      case 'whatsapp':  result = await pushWhatsApp(token, account.channel_id, recipient, content); break;
      default:          return { status: 'simulated', channel: account.platform, recipient, contentPreview: String(content).slice(0, 500) };
    }
    if (result.ok) return { status: 'sent', channel: account.platform, recipient, providerId: result.providerId || null, sentAt: new Date().toISOString() };
    return { status: 'error', channel: account.platform, recipient, error: result.error };
  } catch (err) {
    return { status: 'error', channel: account.platform, recipient, error: err.message };
  }
}

// ── 連接驗證：用憑證打平台 API 確認 token 有效，回傳 { ok, info?, error? } ──
async function verifyAccount(platform, creds = {}) {
  try {
    if (platform === 'line') {
      const r = await fetch('https://api.line.me/v2/bot/info', { headers: { Authorization: `Bearer ${creds.access_token}` } });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return { ok: true, info: { name: j.displayName, platform_user_id: j.userId || j.basicId, picture: j.pictureUrl } };
      return { ok: false, error: `LINE ${r.status}: ${j.message || ''}` };
    }
    if (platform === 'telegram') {
      const r = await fetch(`https://api.telegram.org/bot${creds.access_token}/getMe`);
      const j = await r.json().catch(() => ({}));
      if (j && j.ok) return { ok: true, info: { name: j.result.first_name, platform_user_id: String(j.result.id), username: j.result.username } };
      return { ok: false, error: `Telegram: ${j?.description || r.status}` };
    }
    if (platform === 'messenger' || platform === 'instagram') {
      const r = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(creds.access_token)}`);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) return { ok: true, info: { name: j.name, platform_user_id: j.id } };
      return { ok: false, error: `Meta: ${j?.error?.message || r.status}` };
    }
    if (platform === 'whatsapp') {
      const r = await fetch(`https://graph.facebook.com/v19.0/${creds.channel_id}?access_token=${encodeURIComponent(creds.access_token)}`);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) return { ok: true, info: { name: j.display_phone_number || j.verified_name, platform_user_id: j.id } };
      return { ok: false, error: `WhatsApp: ${j?.error?.message || r.status}` };
    }
    // email/sms/push 等暫無線上驗證
    return { ok: false, error: `平台 ${platform} 尚未支援真實連接驗證` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Webhook 簽章驗證 ───────────────────────────────────────────────────────
function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!channelSecret || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); } catch { return false; }
}

function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader || !rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader)); } catch { return false; }
}

// ── Webhook 解析 → 正規化為 [{ platformUserId, text, displayName, replyToken? }] ──
function parseLineWebhook(body) {
  const out = [];
  for (const ev of (body.events || [])) {
    if (ev.type === 'message' && ev.message?.type === 'text') {
      out.push({ platformUserId: ev.source?.userId || ev.source?.groupId || 'unknown', text: ev.message.text, replyToken: ev.replyToken });
    }
  }
  return out;
}

function parseTelegramWebhook(body) {
  const m = body.message || body.edited_message;
  if (m && m.text) {
    const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || m.from?.username || 'Telegram 用戶';
    return [{ platformUserId: String(m.chat.id), text: m.text, displayName: name }];
  }
  return [];
}

function parseMetaWebhook(body) {
  const out = [];
  for (const entry of (body.entry || [])) {
    for (const ev of (entry.messaging || [])) {
      if (ev.message && ev.message.text && !ev.message.is_echo) {
        out.push({ platformUserId: ev.sender.id, text: ev.message.text });
      }
    }
  }
  return out;
}

// ── 舊版相容：純模擬發送 ───────────────────────────────────────────────────
async function send({ channel, recipient, content, meta = {} }) {
  const ch = SIMULATED_CHANNELS.includes(channel) ? channel : 'line';
  return {
    status: 'simulated', channel: ch, recipient: recipient || 'unknown',
    contentPreview: String(content || '').slice(0, 500), meta, simulatedAt: new Date().toISOString(),
  };
}

function campaignTypeToChannel(type) {
  switch (type) {
    case 'email_sequence':     return 'email';
    case 'sms':                return 'sms';
    case 'push_notification':  return 'push';
    case 'line_message':       return 'line';
    case 'social_post':        return 'push';
    default:                   return 'line';
  }
}

module.exports = {
  send, sendViaAccount, verifyAccount, campaignTypeToChannel,
  verifyLineSignature, verifyMetaSignature,
  parseLineWebhook, parseTelegramWebhook, parseMetaWebhook,
};
