import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as db from './db.js';
import { callAI, getCircuitStatus } from './aiRouter.js';

const app = new Hono();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// Inject D1 into db module on each request
app.use('*', async (c, next) => {
  db.init(c.env.DB);
  await next();
});

// ── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', async (c) => {
  const totalContacts = (await db.get('SELECT COUNT(*) as v FROM contacts'))?.v || 0;
  const totalOrders   = (await db.get('SELECT COUNT(*) as v FROM orders'))?.v || 0;
  const pendingOrders = (await db.get(`SELECT COUNT(*) as v FROM orders WHERE status='pending'`))?.v || 0;
  const todayGMV      = (await db.get(`SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE date(created_at)=date('now')`))?.v || 0;
  const totalUnread   = (await db.get('SELECT COALESCE(SUM(unread_count),0) as v FROM conversations'))?.v || 0;
  const totalMessages = (await db.get('SELECT COUNT(*) as v FROM messages'))?.v || 0;
  const aiMessages    = (await db.get(`SELECT COUNT(*) as v FROM messages WHERE sent_by='ai'`))?.v || 0;
  const aiReplyRate   = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;
  const platformUnread = await db.all(`SELECT platform, SUM(unread_count) as unread FROM conversations WHERE unread_count>0 GROUP BY platform`);

  return c.json({
    kpis: { totalContacts, totalOrders, todayGMV },
    commHealth: { totalUnread, aiReplyRate, platformBreakdown: platformUnread },
    orderSummary: { total: totalOrders, pending: pendingOrders, todayGMV },
    autoCompany: { status: 'running', currentPhase: 'PRD3 MVP Complete' },
    aarrr: {
      acquisition: 12400, activation: 7440, retention: 4092, revenue: 2087, referral: 626,
      rates: { acquisitionToActivation: 60, activationToRetention: 55, retentionToRevenue: 51, revenueToReferral: 30 },
    },
  });
});

// ── CRM ──────────────────────────────────────────────────────────────────────
app.get('/api/crm/contacts', async (c) => {
  const rows = await db.all('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100');
  return c.json(rows);
});
app.get('/api/crm/members', async (c) => {
  const rows = await db.all(`
    SELECT m.*, (SELECT COUNT(*) FROM orders o WHERE o.contact_id=m.contact_id) as order_count
    FROM members m ORDER BY m.total_spend DESC`);
  return c.json(rows);
});
app.post('/api/crm/contacts', async (c) => {
  const { name, email, phone, tags } = await c.req.json();
  if (!name) return c.json({ error: 'name required' }, 400);
  await db.run('INSERT INTO contacts (name, email, phone, tags) VALUES (?,?,?,?)', [name, email||null, phone||null, tags||null]);
  const created = await db.get('SELECT * FROM contacts ORDER BY id DESC LIMIT 1');
  return c.json(created, 201);
});

// ── Content ───────────────────────────────────────────────────────────────────
const CONTENT_PROMPTS = {
  article: '你是一位專業內容行銷專家，擅長撰寫高品質的行銷文章。遵循 SCQA 結構。',
  social: '你是社群媒體專家，擅長撰寫高互動的社群貼文。加入 emoji 和 hashtag。',
  ad: '你是廣告文案專家，使用 AIDA 結構撰寫高轉化率廣告文案。',
  campaign: '你是活動運營專家，使用 TIP 模型設計完整的活動方案。',
};
app.get('/api/content/history', async (c) => {
  const rows = await db.all('SELECT * FROM content_history ORDER BY created_at DESC LIMIT 20');
  return c.json(rows);
});
app.post('/api/content/generate', async (c) => {
  const { type, prompt, platform } = await c.req.json();
  if (!type || !prompt) return c.json({ error: 'type and prompt required' }, 400);
  if (!CONTENT_PROMPTS[type]) return c.json({ error: 'invalid type' }, 400);
  let sys = CONTENT_PROMPTS[type];
  if (platform) sys += ` 目標平台：${platform}。`;
  const result = await callAI(prompt, sys, { model: 'glm-5-turbo', maxTokens: type === 'article' ? 1500 : 600 }, c.env);
  await db.run('INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)',
    [type, prompt, result.content, result.model, result.tokensUsed]);
  return c.json({ type, prompt, output: result.content, model: result.model, source: result.source });
});

// ── Agents ────────────────────────────────────────────────────────────────────
const AGENT_META = {
  'ceo-bezos':        { role: 'Chief Executive Officer', persona: 'Jeff Bezos', layer: 'Strategy' },
  'cto-vogels':       { role: 'Chief Technology Officer', persona: 'Werner Vogels', layer: 'Strategy' },
  'critic-munger':    { role: 'Critical Thinker', persona: 'Charlie Munger', layer: 'Strategy' },
  'product-norman':   { role: 'Product Designer', persona: 'Don Norman', layer: 'Product' },
  'ui-duarte':        { role: 'UI/UX Designer', persona: 'Matias Duarte', layer: 'Product' },
  'fullstack-dhh':    { role: 'Full Stack Developer', persona: 'DHH', layer: 'Engineering' },
  'qa-bach':          { role: 'QA Strategist', persona: 'James Bach', layer: 'Engineering' },
  'devops-hightower': { role: 'DevOps Engineer', persona: 'Kelsey Hightower', layer: 'Engineering' },
  'marketing-godin':  { role: 'Marketing Strategist', persona: 'Seth Godin', layer: 'Business' },
  'operations-pg':    { role: 'Operations Lead', persona: 'Paul Graham', layer: 'Business' },
  'sales-ross':       { role: 'Sales Director', persona: 'Aaron Ross', layer: 'Business' },
  'cfo-campbell':     { role: 'Chief Financial Officer', persona: 'Patrick Campbell', layer: 'Business' },
  'research-thompson':{ role: 'Market Researcher', persona: 'Ben Thompson', layer: 'Intelligence' },
};
app.get('/api/agents', (c) => {
  const agents = Object.entries(AGENT_META).map(([id, m]) => ({ id, ...m, available: true }));
  return c.json(agents);
});
app.post('/api/agents/invoke', async (c) => {
  const { agentName, task, model, temperature } = await c.req.json();
  if (!agentName || !task) return c.json({ error: 'agentName and task required' }, 400);
  const meta = AGENT_META[agentName];
  if (!meta) return c.json({ error: 'Agent not found' }, 404);
  const sys = `You are ${meta.persona}, acting as ${meta.role}. Use your characteristic thinking style.`;
  const result = await callAI(task, sys, { model: model || 'glm-5-turbo', maxTokens: 1500, temperature: temperature ?? 0.7 }, c.env);
  await db.run('INSERT INTO agent_tasks (agent_name, task, result, status, cost_usd) VALUES (?,?,?,?,?)',
    [agentName, task, result.content, 'completed', result.source === 'mock' ? 0 : result.tokensUsed * 0.00001]);
  return c.json({ agent: agentName, persona: meta.persona, task, result: result.content, model: result.model, source: result.source });
});
app.get('/api/agents/circuit-status', (c) => c.json(getCircuitStatus()));

// ── Orders ────────────────────────────────────────────────────────────────────
app.get('/api/orders', async (c) => {
  const { status } = c.req.query();
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status=?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  const rows = await db.all(sql, params);
  return c.json(rows);
});
app.get('/api/orders/stats', async (c) => {
  const total   = (await db.get('SELECT COUNT(*) as v FROM orders'))?.v || 0;
  const pending = (await db.get(`SELECT COUNT(*) as v FROM orders WHERE status='pending'`))?.v || 0;
  const todayGMV= (await db.get(`SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE date(created_at)=date('now')`))?.v || 0;
  const totalGMV= (await db.get('SELECT COALESCE(SUM(total_amount),0) as v FROM orders'))?.v || 0;
  return c.json({ total, pending, todayGMV, totalGMV });
});
app.put('/api/orders/:id/status', async (c) => {
  const { status } = await c.req.json();
  await db.run('UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, c.req.param('id')]);
  const order = await db.get('SELECT * FROM orders WHERE id=?', [c.req.param('id')]);
  return c.json(order);
});

// ── Workflows ─────────────────────────────────────────────────────────────────
app.get('/api/workflows', async (c) => {
  const rows = await db.all('SELECT * FROM workflows ORDER BY created_at DESC');
  return c.json(rows.map(r => ({ ...r, actions: JSON.parse(r.actions_json || '[]') })));
});
app.post('/api/workflows/:id/run', async (c) => {
  const id = c.req.param('id');
  const workflow = await db.get('SELECT * FROM workflows WHERE id=?', [id]);
  if (!workflow) return c.json({ error: 'Not found' }, 404);
  await db.run('UPDATE workflows SET run_count=run_count+1 WHERE id=?', [id]);
  return c.json({ workflowId: id, executed: true, runCount: (workflow.run_count || 0) + 1 });
});

// ── CommHub ───────────────────────────────────────────────────────────────────
app.get('/api/comms/conversations', async (c) => {
  const rows = await db.all('SELECT * FROM conversations ORDER BY last_message_at DESC');
  return c.json(rows);
});
app.get('/api/comms/conversations/:id/messages', async (c) => {
  const msgs = await db.all('SELECT * FROM messages WHERE conversation_id=? ORDER BY sent_at ASC', [c.req.param('id')]);
  await db.run('UPDATE conversations SET unread_count=0 WHERE id=?', [c.req.param('id')]);
  return c.json(msgs);
});
app.post('/api/comms/messages/ai-reply', async (c) => {
  const { conversation_id, model } = await c.req.json();
  if (!conversation_id) return c.json({ error: 'conversation_id required' }, 400);
  const msgs = await db.all('SELECT * FROM messages WHERE conversation_id=? ORDER BY sent_at ASC LIMIT 20', [conversation_id]);
  const history = msgs.map(m => `${m.direction === 'inbound' ? 'Customer' : 'AI'}: ${m.content}`).join('\n');
  const result = await callAI(
    `Conversation:\n${history}\n\nReply in the same language as the customer.`,
    'You are a professional customer service AI. Be helpful and concise.',
    { model: model || 'glm-5-turbo', maxTokens: 500 }, c.env
  );
  await db.run('INSERT INTO messages (conversation_id, direction, content, sent_by, ai_node_type, quality_score) VALUES (?,?,?,?,?,?)',
    [conversation_id, 'outbound', result.content, 'ai', 'service', 4.5]);
  await db.run('UPDATE conversations SET last_message=?, last_message_at=CURRENT_TIMESTAMP WHERE id=?', [result.content, conversation_id]);
  return c.json({ content: result.content, model: result.model, source: result.source });
});

// ── AI Rules ──────────────────────────────────────────────────────────────────
app.get('/api/ai-rules', async (c) => {
  const rules = await db.all('SELECT * FROM ai_reply_rules ORDER BY trigger_type, name');
  return c.json(rules.map(r => ({ ...r, trigger_condition: JSON.parse(r.trigger_condition || '{}'), platforms: JSON.parse(r.platforms || '["all"]') })));
});
app.post('/api/ai-rules/test', async (c) => {
  const { reply_template, context = {}, model } = await c.req.json();
  if (!reply_template) return c.json({ error: 'reply_template required' }, 400);
  let filled = reply_template;
  for (const [k, v] of Object.entries(context)) filled = filled.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  const result = await callAI(
    `Generate a polished version of: "${filled}"\nContext: ${JSON.stringify(context)}\nOutput only the final message.`,
    'You generate polished customer-facing messages.',
    { model: model || 'glm-5-turbo', maxTokens: 300 }, c.env
  );
  return c.json({ preview: result.content, model: result.model, source: result.source, filled_template: filled });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics/overview', async (c) => {
  const totalContacts = (await db.get('SELECT COUNT(*) as v FROM contacts'))?.v || 0;
  const totalOrders   = (await db.get('SELECT COUNT(*) as v FROM orders'))?.v || 0;
  const totalRevenue  = (await db.get('SELECT COALESCE(SUM(total_amount),0) as v FROM orders WHERE status="completed"'))?.v || 0;
  const activeWorkflows = (await db.get(`SELECT COUNT(*) as v FROM workflows WHERE status='active'`))?.v || 0;
  return c.json({ totalContacts, totalOrders, totalRevenue, activeWorkflows });
});
app.get('/api/analytics/aarrr', async (c) => {
  const stages = [
    { stage: 'Acquisition', value: 12400, color: '#3b82f6' },
    { stage: 'Activation',  value: 7440,  color: '#8b5cf6' },
    { stage: 'Retention',   value: 4092,  color: '#10b981' },
    { stage: 'Revenue',     value: 2087,  color: '#f59e0b' },
    { stage: 'Referral',    value: 626,   color: '#ef4444' },
  ];
  return c.json({ stages, rates: { acquisitionToActivation: 60, activationToRetention: 55, retentionToRevenue: 51, revenueToReferral: 30 } });
});

// ── Marketing ─────────────────────────────────────────────────────────────────
app.get('/api/marketing/campaigns', async (c) => {
  const rows = await db.all('SELECT * FROM campaigns ORDER BY created_at DESC');
  return c.json(rows);
});
app.get('/api/marketing/stats', async (c) => {
  const total  = (await db.get('SELECT COUNT(*) as v FROM campaigns'))?.v || 0;
  const active = (await db.get(`SELECT COUNT(*) as v FROM campaigns WHERE status='active'`))?.v || 0;
  return c.json({ total, active, draft: total - active });
});
app.get('/api/marketing/loyalty', async (c) => {
  const txns = await db.all('SELECT * FROM loyalty_transactions ORDER BY created_at DESC LIMIT 50');
  return c.json({ transactions: txns });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0', runtime: 'cloudflare-workers' }));

export default app;
