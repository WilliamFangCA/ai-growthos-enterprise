const express = require('express');
const router = express.Router();
const { run, get, all, getDb } = require('../db');
const db = { transaction: (fn) => getDb().transaction(fn) };
const { callAI } = require('../aiRouter');
const { readKnowledgeBase } = require('./hub-settings');

// GET /api/comms/accounts
router.get('/accounts', (req, res) => {
  try {
    const accounts = all('SELECT * FROM comm_accounts ORDER BY created_at DESC');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comms/accounts
router.post('/accounts', (req, res) => {
  const { platform, account_name, channel_id, webhook_url } = req.body;
  if (!platform || !account_name) return res.status(400).json({ error: 'platform and account_name required' });
  try {
    run('INSERT INTO comm_accounts (platform, account_name, channel_id, webhook_url) VALUES (?,?,?,?)',
      [platform, account_name, channel_id || null, webhook_url || null]);
    const account = get('SELECT * FROM comm_accounts WHERE id = last_insert_rowid()');
    res.json(account);
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
    const systemPrompt = [
      hubConfig.system_prompt || 'You are a professional customer service AI for AI GrowthOS Enterprise. You help customers with inquiries, orders, and product information. Always be helpful, empathetic, and solution-oriented.',
      knowledgeText ? `\n\n【產品知識庫 / Product Knowledge】\n${knowledgeText}` : '',
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
    const systemPrompt = [
      hubCfg.system_prompt || '你是一個專業 AI 客服，代表品牌回覆客戶。回覆要簡短親切，使用與客戶相同的語言。',
      kbText ? `\n\n【產品知識庫】\n${kbText}` : '',
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
