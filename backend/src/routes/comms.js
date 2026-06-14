const express = require('express');
const router = express.Router();
const { run, get, all, getDb } = require('../db');
const db = { transaction: (fn) => getDb().transaction(fn) };
const { callAI } = require('../aiRouter');
const { readKnowledgeBase } = require('./hub-settings');
const { getGlobalKBText } = require('./global-kb');
const { encrypt, decrypt, mask } = require('../services/secretBox');
const channelAdapter = require('../services/channelAdapter');

// 各平台連接所需欄位 + webhook 路徑說明（前端「連接」表單依此渲染）
const PLATFORM_GUIDE = {
  line:      { label: 'LINE 官方帳號', needs: ['access_token', 'channel_secret'], recipient: 'userId', webhook: '/api/webhooks/line/:id', doc: 'LINE Developers → Messaging API → Channel access token + Channel secret' },
  telegram:  { label: 'Telegram Bot', needs: ['access_token'], recipient: 'chatId', webhook: '/api/webhooks/telegram/:id', doc: 'BotFather → /newbot 取得 Bot Token' },
  messenger: { label: 'Facebook Messenger', needs: ['access_token', 'channel_secret'], recipient: 'PSID', webhook: '/api/webhooks/meta/:id', doc: 'Meta for Developers → Page Access Token + App Secret' },
  instagram: { label: 'Instagram DM', needs: ['access_token', 'channel_secret'], recipient: 'IGSID', webhook: '/api/webhooks/meta/:id', doc: 'Meta for Developers → IG Page Access Token + App Secret' },
  whatsapp:  { label: 'WhatsApp Business', needs: ['access_token', 'channel_id'], recipient: '電話號碼', webhook: '/api/webhooks/meta/:id', doc: 'Meta → WhatsApp Cloud API → Phone Number ID (填 channel_id) + Access Token' },
  email:     { label: 'Email', needs: [], recipient: 'email', webhook: null, doc: '尚未支援真實連接' },
};

// 對外安全序列化：永不回傳明文憑證，只給遮罩 + 是否已設定
function publicAccount(a) {
  if (!a) return a;
  const guide = PLATFORM_GUIDE[a.platform] || {};
  return {
    id: a.id, platform: a.platform, account_name: a.account_name, channel_id: a.channel_id,
    webhook_url: a.webhook_url, status: a.status,
    connection_status: a.connection_status || 'demo',
    connection_mode: a.connection_mode || 'demo',
    platform_user_id: a.platform_user_id || null,
    last_verified_at: a.last_verified_at || null,
    last_error: a.last_error || null,
    has_access_token: !!a.access_token,
    has_channel_secret: !!a.channel_secret,
    access_token_masked: a.access_token ? mask(decrypt(a.access_token)) : '',
    guide,
    created_at: a.created_at,
  };
}

// GET /api/comms/accounts
router.get('/accounts', (req, res) => {
  try {
    const accounts = all('SELECT * FROM comm_accounts ORDER BY created_at DESC');
    res.json(accounts.map(publicAccount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comms/platform-guide — 前端連接表單用
router.get('/platform-guide', (req, res) => res.json(PLATFORM_GUIDE));

// POST /api/comms/accounts — 新增帳號（不含憑證，預設 disconnected）
router.post('/accounts', (req, res) => {
  const { platform, account_name, channel_id, webhook_url } = req.body;
  if (!platform || !account_name) return res.status(400).json({ error: 'platform and account_name required' });
  try {
    run(`INSERT INTO comm_accounts (platform, account_name, channel_id, webhook_url, connection_status, connection_mode) VALUES (?,?,?,?, 'disconnected', 'real')`,
      [platform, account_name, channel_id || null, webhook_url || null]);
    res.json(publicAccount(get('SELECT * FROM comm_accounts WHERE id = last_insert_rowid()')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comms/accounts/:id/connect — 填入真實憑證，線上驗證後標記 connected
router.post('/accounts/:id/connect', async (req, res) => {
  const { access_token, channel_secret, channel_id } = req.body || {};
  try {
    const acct = get('SELECT * FROM comm_accounts WHERE id = ?', [req.params.id]);
    if (!acct) return res.status(404).json({ error: 'account not found' });
    if (!access_token && !acct.access_token) return res.status(400).json({ error: 'access_token required' });

    const creds = {
      access_token: access_token || decrypt(acct.access_token),
      channel_secret: channel_secret || decrypt(acct.channel_secret),
      channel_id: channel_id || acct.channel_id,
    };
    const verified = await channelAdapter.verifyAccount(acct.platform, creds);
    if (!verified.ok) {
      run('UPDATE comm_accounts SET connection_status = ?, last_error = ? WHERE id = ?', ['error', verified.error, acct.id]);
      return res.status(400).json({ error: verified.error, connection_status: 'error' });
    }
    run(`UPDATE comm_accounts SET access_token = ?, channel_secret = ?, channel_id = ?,
         platform_user_id = ?, connection_status = 'connected', connection_mode = 'real',
         last_verified_at = CURRENT_TIMESTAMP, last_error = NULL, status = 'active' WHERE id = ?`,
      [encrypt(creds.access_token), encrypt(creds.channel_secret), creds.channel_id,
       verified.info?.platform_user_id || null, acct.id]);
    res.json({ ok: true, info: verified.info, account: publicAccount(get('SELECT * FROM comm_accounts WHERE id = ?', [acct.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comms/accounts/:id/disconnect — 清除憑證
router.post('/accounts/:id/disconnect', (req, res) => {
  try {
    run(`UPDATE comm_accounts SET access_token = NULL, channel_secret = NULL, refresh_token = NULL,
         connection_status = 'disconnected', last_error = NULL WHERE id = ?`, [req.params.id]);
    res.json({ ok: true, account: publicAccount(get('SELECT * FROM comm_accounts WHERE id = ?', [req.params.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comms/accounts/:id
router.delete('/accounts/:id', (req, res) => {
  try {
    run('DELETE FROM comm_accounts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comms/conversations
router.get('/conversations', (req, res) => {
  const { status, platform, assigned_to } = req.query;
  try {
    let sql = 'SELECT * FROM conversations WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    if (assigned_to) { sql += ' AND assigned_to = ?'; params.push(assigned_to); }
    sql += ' ORDER BY last_message_at DESC';
    const convos = all(sql, params);
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comms/conversations/:id/messages
router.get('/conversations/:id/messages', (req, res) => {
  try {
    const msgs = all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC', [req.params.id]);
    // Mark as read
    run('UPDATE conversations SET unread_count = 0 WHERE id = ?', [req.params.id]);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comms/messages/send — send a message (human reply)
router.post('/messages/send', (req, res) => {
  const { conversation_id, content, sent_by = 'human' } = req.body;
  if (!conversation_id || !content) return res.status(400).json({ error: 'conversation_id and content required' });
  try {
    run('INSERT INTO messages (conversation_id, direction, content, sent_by) VALUES (?,?,?,?)',
      [conversation_id, 'outbound', content, sent_by]);
    run('UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, conversation_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comms/messages/ai-reply — generate AI reply for a conversation
router.post('/messages/ai-reply', async (req, res) => {
  const { conversation_id, model, temperature } = req.body;
  if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });
  try {
    const msgs = all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY sent_at ASC LIMIT 20', [conversation_id]);
    const convo = get('SELECT * FROM conversations WHERE id = ?', [conversation_id]);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const history = msgs.map(m => `${m.direction === 'inbound' ? 'Customer' : 'AI'}: ${m.content}`).join('\n');
    const prompt = `Conversation history:\n${history}\n\nPlease write a helpful, professional reply to the customer's latest message. Be concise and friendly. Respond in the same language as the customer.`;
    const hubConfig = get('SELECT * FROM hub_configs WHERE hub_type = ?', ['comms']) || {};
    const knowledgeText = await readKnowledgeBase(hubConfig.knowledge_base_path || '');
    const globalKB = await getGlobalKBText();
    const systemPrompt = [
      hubConfig.system_prompt || 'You are a professional customer service AI for AI GrowthOS Enterprise. You help customers with inquiries, orders, and product information. Always be helpful, empathetic, and solution-oriented.',
      knowledgeText ? `\n\n【產品知識庫 / Product Knowledge】\n${knowledgeText}` : '',
      globalKB ? `\n\n${globalKB}` : '',
    ].join('');

    const result = await callAI(prompt, systemPrompt, { model: hubConfig.ai_model || model || 'glm-5-turbo', maxTokens: 500, temperature: temperature || 0.7 });

    run('INSERT INTO messages (conversation_id, direction, content, sent_by, ai_node_type, quality_score) VALUES (?,?,?,?,?,?)',
      [conversation_id, 'outbound', result.content, 'ai', 'service', 4.5]);
    run('UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [result.content, conversation_id]);

    res.json({ content: result.content, model: result.model, source: result.source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comms/conversations/:id/assign
router.put('/conversations/:id/assign', (req, res) => {
  const { assigned_to, status } = req.body;
  try {
    if (assigned_to !== undefined) {
      if (assigned_to === 'human') {
        run('UPDATE conversations SET assigned_to = ?, human_takeover_at = CURRENT_TIMESTAMP WHERE id = ?', [assigned_to, req.params.id]);
        run('INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)',
          [req.params.id, 'outbound', '👤 已由人工客服接管', 'text', 'system', 'system']);
      } else if (assigned_to === 'ai') {
        run('UPDATE conversations SET assigned_to = ?, human_takeover_at = NULL WHERE id = ?', [assigned_to, req.params.id]);
        run('INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)',
          [req.params.id, 'outbound', '🤖 已交還 AI 管理', 'text', 'system', 'system']);
      } else {
        run('UPDATE conversations SET assigned_to = ? WHERE id = ?', [assigned_to, req.params.id]);
      }
    }
    if (status !== undefined) run('UPDATE conversations SET status = ? WHERE id = ?', [status, req.params.id]);
    const convo = get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Rules Engine ──────────────────────────────────────────────────────────
async function runAIRulesEngine(conversationId, platform, inboundMessage) {
  try {
    const convo = get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!convo) return { aiReply: null, ruleMatched: null, skipped: 'conversation_not_found' };

    // 若人工接管中，且未超過 6 小時，跳過
    if (convo.assigned_to !== 'ai') {
      if (convo.human_takeover_at) {
        const takeover = new Date(convo.human_takeover_at);
        const sixHoursMs = 6 * 60 * 60 * 1000;
        if (Date.now() - takeover.getTime() < sixHoursMs) {
          return { aiReply: null, ruleMatched: null, skipped: 'human_takeover' };
        }
        // 超過 6 小時，自動交還 AI
        run('UPDATE conversations SET assigned_to = ?, human_takeover_at = NULL WHERE id = ?', ['ai', conversationId]);
        run('INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)',
          [conversationId, 'outbound', '🤖 已交還 AI 管理（超過 6 小時自動恢復）', 'text', 'system', 'system']);
      } else {
        return { aiReply: null, ruleMatched: null, skipped: 'human_takeover' };
      }
    }

    // 台北時間靜默時段判斷 23:00–08:00（用 en-US locale 確保純數字輸出）
    const taipeiDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const taipeiHour = taipeiDate.getHours();
    if (taipeiHour >= 23 || taipeiHour < 8) {
      return { aiReply: null, ruleMatched: null, skipped: 'quiet_hours' };
    }

    // 判斷是否首次訊息（acquisition）
    const msgCount = get('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?', [conversationId]).c;
    const isFirstContact = msgCount <= 1;

    // 取出所有 is_active=1 的規則
    const rules = all('SELECT * FROM ai_reply_rules WHERE is_active = 1 ORDER BY id ASC');

    // 篩選規則：acquisition 優先，service 作 fallback
    let matchedRule = null;
    if (isFirstContact) {
      matchedRule = rules.find(r => r.trigger_type === 'acquisition');
    }
    if (!matchedRule) {
      matchedRule = rules.find(r => r.trigger_type === 'service');
    }

    if (!matchedRule) {
      return { aiReply: null, ruleMatched: null, skipped: 'no_matching_rule' };
    }

    // 填入 template 變數
    const contactName = convo.contact_name || '用戶';
    let prompt = matchedRule.reply_template
      .replace(/\{name\}/g, contactName)
      .replace(/\{brand\}/g, 'AI GrowthOS');

    const hubCfg = get('SELECT * FROM hub_configs WHERE hub_type = ?', ['comms']) || {};
    const kbText = await readKnowledgeBase(hubCfg.knowledge_base_path || '');
    const globalKB2 = await getGlobalKBText();
    const systemPrompt = [
      hubCfg.system_prompt || '你是一個專業 AI 客服，代表品牌回覆客戶。回覆要簡短親切，使用與客戶相同的語言。',
      kbText ? `\n\n【產品知識庫】\n${kbText}` : '',
      globalKB2 ? `\n\n${globalKB2}` : '',
    ].join('');

    const aiResult = await callAI(
      `客戶訊息：${inboundMessage}\n\n請根據以下回覆範本生成最終回覆：${prompt}`,
      systemPrompt,
      { model: hubCfg.ai_model || 'glm-5-turbo', maxTokens: 300 }
    );

    const aiReply = aiResult.content;

    // 插入 outbound message
    run('INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)',
      [conversationId, 'outbound', aiReply, 'text', 'ai', matchedRule.trigger_type]);

    // 更新 conversation.last_message
    run('UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [aiReply, conversationId]);

    // 更新 fire_count
    run('UPDATE ai_reply_rules SET fire_count = fire_count + 1 WHERE id = ?', [matchedRule.id]);

    return {
      aiReply,
      ruleMatched: matchedRule.name,
      ruleType: matchedRule.trigger_type,
      model: aiResult.model,
      source: aiResult.source,
      skipped: null,
    };
  } catch (err) {
    console.error('[runAIRulesEngine] error:', err.message);
    return { aiReply: null, ruleMatched: null, skipped: 'error', error: err.message };
  }
}

// POST /api/comms/webhook/simulate
router.post('/webhook/simulate', async (req, res) => {
  const { platform = 'line', contact_name, message } = req.body;
  if (!contact_name || !message) {
    return res.status(400).json({ error: 'contact_name and message required' });
  }
  try {
    // 找到或建立 conversation（用 SQLite transaction 避免並發競態）
    let convo = db.transaction(() => {
      let existing = get(
        'SELECT * FROM conversations WHERE platform = ? AND contact_name = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
        [platform, contact_name, 'open']
      );
      if (!existing) {
        run(
          'INSERT INTO conversations (platform, contact_name, channel_user_id, last_message, assigned_to, status, unread_count) VALUES (?,?,?,?,?,?,?)',
          [platform, contact_name, `sim_${Date.now()}`, message, 'ai', 'open', 0]
        );
        existing = get('SELECT * FROM conversations WHERE id = last_insert_rowid()');
      }
      return existing;
    })();

    const conversationId = convo.id;

    // 插入 inbound message
    run(
      'INSERT INTO messages (conversation_id, direction, content, message_type, sent_by) VALUES (?,?,?,?,?)',
      [conversationId, 'inbound', message, 'text', 'human']
    );

    // 更新 unread_count + last_message
    run(
      'UPDATE conversations SET unread_count = unread_count + 1, last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [message, conversationId]
    );

    // 觸發 AI Rules Engine
    const engineResult = await runAIRulesEngine(conversationId, platform, message);

    res.json({
      conversation_id: conversationId,
      aiReply: engineResult.aiReply,
      model: engineResult.model || null,
      source: engineResult.source || null,
      ruleMatched: engineResult.ruleMatched || null,
      skipped: engineResult.skipped || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 真實入站訊息處理（webhooks 共用）─────────────────────────────────────
// account = comm_accounts row（真實連接）；找/建對話 → 存入站 → 跑 AI → 真實推送回覆
async function processInboundMessage(account, platformUserId, text, displayName) {
  const platform = account.platform;
  const convo = db.transaction(() => {
    let existing = get(
      'SELECT * FROM conversations WHERE platform = ? AND comm_account_id = ? AND channel_user_id = ? ORDER BY created_at DESC LIMIT 1',
      [platform, account.id, platformUserId]
    );
    if (!existing) {
      run(
        'INSERT INTO conversations (platform, comm_account_id, contact_name, channel_user_id, last_message, assigned_to, status, unread_count) VALUES (?,?,?,?,?,?,?,?)',
        [platform, account.id, displayName || platformUserId, platformUserId, text, 'ai', 'open', 0]
      );
      existing = get('SELECT * FROM conversations WHERE id = last_insert_rowid()');
    }
    return existing;
  })();

  run('INSERT INTO messages (conversation_id, direction, content, message_type, sent_by) VALUES (?,?,?,?,?)',
    [convo.id, 'inbound', text, 'text', 'human']);
  run('UPDATE conversations SET unread_count = unread_count + 1, last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
    [text, convo.id]);

  const engineResult = await runAIRulesEngine(convo.id, platform, text);

  // 真實回覆推送：AI 有產出且帳號為真實連接時，送回平台
  let delivery = null;
  if (engineResult.aiReply) {
    delivery = await channelAdapter.sendViaAccount(account, platformUserId, engineResult.aiReply);
    if (delivery.status === 'error') {
      run('UPDATE comm_accounts SET last_error = ? WHERE id = ?', [delivery.error, account.id]);
    }
  }
  return { conversationId: convo.id, ...engineResult, delivery };
}

// GET /api/comms/stats
router.get('/stats', (req, res) => {
  try {
    const totalConvos = get('SELECT COUNT(*) as count FROM conversations')?.count || 0;
    const openConvos = get("SELECT COUNT(*) as count FROM conversations WHERE status = 'open'")?.count || 0;
    const aiHandled = get("SELECT COUNT(*) as count FROM conversations WHERE assigned_to = 'ai'")?.count || 0;
    const totalUnread = get('SELECT SUM(unread_count) as total FROM conversations')?.total || 0;
    const totalMessages = get('SELECT COUNT(*) as count FROM messages')?.count || 0;
    const aiMessages = get("SELECT COUNT(*) as count FROM messages WHERE sent_by = 'ai'")?.count || 0;
    const aiReplyRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;
    res.json({ totalConvos, openConvos, aiHandled, totalUnread, totalMessages, aiReplyRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.runAIRulesEngine = runAIRulesEngine;
module.exports.processInboundMessage = processInboundMessage;
