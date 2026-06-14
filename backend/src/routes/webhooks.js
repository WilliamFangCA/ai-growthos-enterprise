// 公開 Webhook 接收端（無需登入；由各平台伺服器直接呼叫）。
// 安全：LINE/Meta 以 HMAC 簽章驗證；Telegram 以 secret token 驗證。
// 收到文字訊息 → processInboundMessage（找/建對話→跑 AI→真實推送回覆）。
// 需要 req.rawBody（index.js 的 express.json verify 已捕捉）做簽章比對。

const express = require('express');
const router = express.Router();
const { get } = require('../db');
const { decrypt } = require('../services/secretBox');
const channelAdapter = require('../services/channelAdapter');
const comms = require('./comms');

function getAccount(id) { return get('SELECT * FROM comm_accounts WHERE id = ?', [id]); }
function rawOf(req) { return req.rawBody || Buffer.from(JSON.stringify(req.body || {})); }

// ── LINE ───────────────────────────────────────────────────────────────────
router.post('/line/:id', async (req, res) => {
  try {
    const acct = getAccount(req.params.id);
    if (!acct || acct.platform !== 'line') return res.status(404).end();
    const secret = decrypt(acct.channel_secret);
    const sig = req.get('x-line-signature');
    if (!channelAdapter.verifyLineSignature(rawOf(req), sig, secret)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    res.status(200).end(); // LINE 要求快速回 200，後續非同步處理
    for (const m of channelAdapter.parseLineWebhook(req.body)) {
      comms.processInboundMessage(acct, m.platformUserId, m.text, m.displayName).catch(e => console.error('[webhook line]', e.message));
    }
  } catch (err) { console.error('[webhook line]', err.message); if (!res.headersSent) res.status(500).end(); }
});

// ── Telegram ─────────────────────────────────────────────────────────────────
router.post('/telegram/:id', async (req, res) => {
  try {
    const acct = getAccount(req.params.id);
    if (!acct || acct.platform !== 'telegram') return res.status(404).end();
    // 若帳號 meta 設了 secret token，驗證 header（setWebhook 時帶 secret_token）
    let metaSecret = '';
    try { metaSecret = JSON.parse(acct.meta_json || '{}').webhook_secret || ''; } catch (_) {}
    if (metaSecret && req.get('x-telegram-bot-api-secret-token') !== metaSecret) {
      return res.status(401).json({ error: 'invalid secret token' });
    }
    res.status(200).end();
    for (const m of channelAdapter.parseTelegramWebhook(req.body)) {
      comms.processInboundMessage(acct, m.platformUserId, m.text, m.displayName).catch(e => console.error('[webhook tg]', e.message));
    }
  } catch (err) { console.error('[webhook telegram]', err.message); if (!res.headersSent) res.status(500).end(); }
});

// ── Meta（Messenger / Instagram / WhatsApp 共用）────────────────────────────
// 驗證挑戰：GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
router.get('/meta/:id', (req, res) => {
  const acct = getAccount(req.params.id);
  let verifyToken = '';
  try { verifyToken = JSON.parse(acct?.meta_json || '{}').verify_token || ''; } catch (_) {}
  const envToken = process.env.META_VERIFY_TOKEN || '';
  const token = req.query['hub.verify_token'];
  if (req.query['hub.mode'] === 'subscribe' && (token === verifyToken || (envToken && token === envToken))) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  return res.status(403).end();
});

router.post('/meta/:id', async (req, res) => {
  try {
    const acct = getAccount(req.params.id);
    if (!acct) return res.status(404).end();
    const appSecret = decrypt(acct.channel_secret) || process.env.META_APP_SECRET || '';
    const sig = req.get('x-hub-signature-256');
    if (appSecret && !channelAdapter.verifyMetaSignature(rawOf(req), sig, appSecret)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    res.status(200).end();
    for (const m of channelAdapter.parseMetaWebhook(req.body)) {
      comms.processInboundMessage(acct, m.platformUserId, m.text, m.displayName).catch(e => console.error('[webhook meta]', e.message));
    }
  } catch (err) { console.error('[webhook meta]', err.message); if (!res.headersSent) res.status(500).end(); }
});

module.exports = router;
