const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { callAI } = require('../aiRouter');

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
    const systemPrompt = 'You are a professional customer service AI for AI GrowthOS Enterprise. You help customers with inquiries, orders, and product information. Always be helpful, empathetic, and solution-oriented.';

    const result = await callAI(prompt, systemPrompt, { model: model || 'glm-5-turbo', maxTokens: 500, temperature: temperature || 0.7 });

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
    if (assigned_to !== undefined) run('UPDATE conversations SET assigned_to = ? WHERE id = ?', [assigned_to, req.params.id]);
    if (status !== undefined) run('UPDATE conversations SET status = ? WHERE id = ?', [status, req.params.id]);
    const convo = get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comms/stats
router.get('/stats', (req, res) => {
  try {
    const totalConvos = get('SELECT COUNT(*) as count FROM conversations')?.count || 0;
    const openConvos = get('SELECT COUNT(*) as count FROM conversations WHERE status = "open"')?.count || 0;
    const aiHandled = get('SELECT COUNT(*) as count FROM conversations WHERE assigned_to = "ai"')?.count || 0;
    const totalUnread = get('SELECT SUM(unread_count) as total FROM conversations')?.total || 0;
    const totalMessages = get('SELECT COUNT(*) as count FROM messages')?.count || 0;
    const aiMessages = get('SELECT COUNT(*) as count FROM messages WHERE sent_by = "ai"')?.count || 0;
    const aiReplyRate = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;
    res.json({ totalConvos, openConvos, aiHandled, totalUnread, totalMessages, aiReplyRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
