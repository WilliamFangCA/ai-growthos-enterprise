const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const workflowEngine = require('../services/workflowEngine');

// 解析 actions_json：v1 陣列回傳 actions；v2 圖形另附 graph
function parseWorkflowRow(r) {
  let parsed;
  try { parsed = JSON.parse(r.actions_json || '[]'); } catch { parsed = []; }
  const v2 = workflowEngine.isV2(parsed);
  return {
    ...r,
    run_count: Number(r.run_count) || 0,
    format: v2 ? 'v2' : 'v1',
    actions: v2
      ? (parsed.nodes || []).filter(n => n.type !== 'trigger').map(n => ({ type: n.type, ...(n.data || {}) }))
      : parsed,
    graph: v2 ? parsed : null,
    category: r.category || 'general',
    description: r.description || '',
  };
}

// GET /api/workflows
router.get('/', (req, res) => {
  try {
    res.json(all('SELECT * FROM workflows ORDER BY run_count DESC, created_at DESC').map(parseWorkflowRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/stats
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayRuns = (get(`SELECT COUNT(*) as v FROM workflow_run_logs WHERE DATE(executed_at) = ?`, [today]) || {}).v || 0;
    const byCategory = all(`
      SELECT category, COUNT(*) as count, SUM(run_count) as total_runs,
             SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active_count
      FROM workflows
      GROUP BY category
      ORDER BY total_runs DESC
    `);
    const totalRuns = (get(`SELECT COALESCE(SUM(run_count),0) as v FROM workflows`) || {}).v || 0;
    const activeCount = (get(`SELECT COUNT(*) as v FROM workflows WHERE status='active'`) || {}).v || 0;
    res.json({ todayRuns, byCategory, totalRuns, activeCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 工作流模板庫（PRD 4.25/4.4）：補齊社群/活動/客服/內容節點，一鍵安裝
const WORKFLOW_TEMPLATES = [
  {
    id: 'wft_community_warmup', name: '社群每日暖場機器人', category: 'comms', icon: '🔥',
    description: '社群 24 小時無互動時，AI 自動發送話題暖場貼文 + 積分互動任務，保持社群活躍',
    trigger_type: 'scheduled',
    actions: [
      { type: 'condition_check', condition: 'community_silent_24h' },
      { type: 'ai_analyze', task: 'generate_warmup_topic' },
      { type: 'send_line_message', template: 'community_warmup_post' },
      { type: 'add_points', amount: 50, reason: '社群互動獎勵' },
    ],
  },
  {
    id: 'wft_event_lifecycle', name: '線下活動全流程通知', category: 'retention', icon: '🎟️',
    description: '報名確認→前3天提醒→前1天提醒→簽到歡迎→活動後感謝+回放，6 個節點全自動',
    trigger_type: 'webhook',
    actions: [
      { type: 'send_email', template: 'event_signup_confirm', delay: 0 },
      { type: 'send_line_message', template: 'event_reminder_3d', delay: 72 },
      { type: 'send_line_message', template: 'event_reminder_1d', delay: 24 },
      { type: 'send_line_message', template: 'event_thankyou_replay', delay: 24 },
      { type: 'update_crm', field: 'event_participation', value: 'attended' },
    ],
  },
  {
    id: 'wft_nps_survey', name: '訂單完成滿意度調查', category: 'order', icon: '⭐',
    description: '訂單到貨 3 天後自動發送 NPS 調查，高分引導曬單裂變、低分建立客服工單',
    trigger_type: 'webhook',
    actions: [
      { type: 'send_line_message', template: 'nps_survey', delay: 72 },
      { type: 'condition_check', condition: 'nps_score_branch' },
      { type: 'send_line_message', template: 'ugc_invite_high_nps' },
      { type: 'create_task', assignee: 'cs_team', priority: 'high' },
    ],
  },
  {
    id: 'wft_refund_flow', name: '退款申請 AI 預審流程', category: 'order', icon: '↩️',
    description: 'AI 引導客戶填寫退款原因並自動預審（7天鑑賞期/商品狀態），符合規則自動放行',
    trigger_type: 'webhook',
    actions: [
      { type: 'ai_reply', template: 'refund_guide', node: 'order' },
      { type: 'ai_analyze', task: 'refund_precheck' },
      { type: 'condition_check', condition: 'auto_approve_eligible' },
      { type: 'send_notification', channel: 'auto', template: 'refund_status_update' },
    ],
  },
  {
    id: 'wft_content_distribution', name: '內容多渠道自動分發', category: 'acquisition', icon: '📡',
    description: '新文章發布後，AI 自動改寫為各平台格式（LINE/FB/IG/Email）並排程發送',
    trigger_type: 'content_event',
    actions: [
      { type: 'ai_analyze', task: 'rewrite_for_platforms' },
      { type: 'send_line_message', template: 'content_broadcast' },
      { type: 'send_email', template: 'newsletter_digest', delay: 2 },
      { type: 'track_conversion', window: 7 },
    ],
  },
  {
    id: 'wft_member_anniversary', name: '會員週年感謝禮', category: 'retention', icon: '🎂',
    description: '入會滿週年自動發送感謝訊息 + 週年積分禮，強化會員情感連結',
    trigger_type: 'scheduled',
    actions: [
      { type: 'segment_filter', condition: 'anniversary_today' },
      { type: 'add_points', amount: 365, reason: '週年慶積分禮' },
      { type: 'send_line_message', template: 'anniversary_thanks' },
    ],
  },
  {
    id: 'wft_partner_commission', name: '合伙人分潤自動結算', category: 'referral', icon: '🤝',
    description: '推薦訂單完成後自動計算分潤、更新合伙人收益，每月 1 號發送結算報告',
    trigger_type: 'webhook',
    actions: [
      { type: 'ai_analyze', task: 'calc_commission' },
      { type: 'update_crm', field: 'partner_earnings', value: 'auto_calculated' },
      { type: 'send_email', template: 'commission_statement' },
      { type: 'notify_slack', channel: '#partner-ops' },
    ],
  },
  {
    id: 'wft_stock_alert', name: '庫存不足自動預警', category: 'order', icon: '📉',
    description: '商品庫存低於安全水位時通知採購，並自動暫停該商品的進行中廣告',
    trigger_type: 'scheduled',
    actions: [
      { type: 'condition_check', condition: 'stock_below_threshold' },
      { type: 'create_task', assignee: 'procurement', priority: 'high' },
      { type: 'notify_slack', channel: '#inventory-alerts' },
    ],
  },
];

// GET /api/workflows/templates — 模板庫（標注是否已安裝）
router.get('/templates', (req, res) => {
  try {
    const existing = new Set(all(`SELECT name FROM workflows`).map(w => w.name));
    res.json(WORKFLOW_TEMPLATES.map(t => ({ ...t, installed: existing.has(t.name) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/templates/:id/install — 一鍵安裝模板
router.post('/templates/:id/install', (req, res) => {
  try {
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    const dup = get(`SELECT id FROM workflows WHERE name = ?`, [tpl.name]);
    if (dup) return res.status(409).json({ error: `「${tpl.name}」已安裝過了` });
    run(`INSERT INTO workflows (name, category, description, trigger_type, actions_json, status, run_count) VALUES (?,?,?,?,?,?,0)`,
      [tpl.name, tpl.category, tpl.description, tpl.trigger_type, JSON.stringify(tpl.actions), 'active']);
    const created = get(`SELECT * FROM workflows ORDER BY id DESC LIMIT 1`);
    res.status(201).json({ ...created, actions: JSON.parse(created.actions_json || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows（actions 可為 v1 陣列或 v2 圖形物件）
router.post('/', (req, res) => {
  try {
    const { name, trigger_type, actions, category, description } = req.body;
    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'name and trigger_type are required' });
    }
    run(
      `INSERT INTO workflows (name, category, description, trigger_type, actions_json, status, run_count) VALUES (?,?,?,?,?,?,?)`,
      [name, category || 'general', description || '', trigger_type, JSON.stringify(actions || []), 'active', 0]
    );
    const created = get('SELECT * FROM workflows ORDER BY id DESC LIMIT 1');
    res.status(201).json(parseWorkflowRow(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id — 視覺化編輯器儲存
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workflow id' });
    const workflow = get('SELECT * FROM workflows WHERE id = ?', [id]);
    if (!workflow) return res.status(404).json({ error: `Workflow ${id} not found` });

    const { name, category, description, trigger_type, actions } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (trigger_type !== undefined) { updates.push('trigger_type = ?'); params.push(trigger_type); }
    if (actions !== undefined) { updates.push('actions_json = ?'); params.push(JSON.stringify(actions)); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(id);
    run(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json(parseWorkflowRow(get('SELECT * FROM workflows WHERE id = ?', [id])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:id/run — v1 線性 / v2 圖形皆支援，逐步寫入 workflow_step_logs
router.post('/:id/run', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workflow id' });
    const workflow = get('SELECT * FROM workflows WHERE id = ?', [id]);

    if (!workflow) return res.status(404).json({ error: `Workflow ${id} not found` });
    if (workflow.status === 'paused') return res.status(400).json({ error: 'Cannot run a paused workflow' });

    run('UPDATE workflows SET run_count = run_count + 1 WHERE id = ?', [id]);
    run(`INSERT INTO workflow_run_logs (workflow_id, workflow_name, category, status) VALUES (?,?,?,?)`,
      [id, workflow.name, workflow.category || 'general', 'success']);

    let parsed;
    try { parsed = JSON.parse(workflow.actions_json || '[]'); } catch { parsed = []; }

    const outcome = workflowEngine.isV2(parsed)
      ? await workflowEngine.runGraph(workflow, parsed, req.body?.context || {})
      : await workflowEngine.runLinear(workflow, parsed, simulateAction);

    res.json({
      workflowId: id,
      name: workflow.name,
      category: workflow.category,
      format: workflowEngine.isV2(parsed) ? 'v2' : 'v1',
      executed: true,
      runCount: (Number(workflow.run_count) || 0) + 1,
      runId: outcome.runId,
      results: outcome.results,
      executedAt: new Date().toISOString(),
      mode: 'simulated',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:id/runs/:runId/steps — 單次執行的逐步日誌
router.get('/:id/runs/:runId/steps', (req, res) => {
  try {
    const steps = all(`SELECT * FROM workflow_step_logs WHERE workflow_id = ? AND run_id = ? ORDER BY id`,
      [req.params.id, req.params.runId]);
    res.json(steps.map(s => ({ ...s, detail: JSON.parse(s.detail_json || '{}') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id/status — 暫停/恢復（人工隨時可接管自動化）
router.put('/:id/status', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workflow id' });
    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) return res.status(400).json({ error: 'status must be active or paused' });
    const workflow = get('SELECT * FROM workflows WHERE id = ?', [id]);
    if (!workflow) return res.status(404).json({ error: `Workflow ${id} not found` });
    run('UPDATE workflows SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, name: workflow.name, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id — 刪除工作流（保留歷史執行記錄供分析）
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workflow id' });
    const workflow = get('SELECT * FROM workflows WHERE id = ?', [id]);
    if (!workflow) return res.status(404).json({ error: `Workflow ${id} not found` });
    run('DELETE FROM workflows WHERE id = ?', [id]);
    res.json({ success: true, id, name: workflow.name, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function simulateAction(action) {
  switch (action.type) {
    case 'send_email':         return `Email '${action.template}' queued (delay: ${action.delay || 0}h)`;
    case 'notify_slack':       return `Slack notification sent to ${action.channel}`;
    case 'tag_contact':        return `Tag '${action.tag}' applied to matching contacts`;
    case 'create_task':        return `Task created → ${action.assignee} (priority: ${action.priority || 'normal'})`;
    case 'segment_filter':     return `Segment filter applied: ${action.condition}`;
    case 'track_conversion':   return `Conversion tracking window: ${action.window}d`;
    case 'send_line_message':  return `LINE message '${action.template}' queued (delay: ${action.delay || 0}h)`;
    case 'send_whatsapp':      return `WhatsApp message '${action.template}' sent`;
    case 'add_points':         return `${action.amount} points added — reason: ${action.reason}`;
    case 'update_member_level': return `Member level updated: ${action.target}`;
    case 'ai_reply':           return `AI reply sent via '${action.node || 'default'}' node`;
    case 'send_notification':  return `Push notification via ${action.channel} channel: '${action.template}'`;
    case 'ai_analyze':         return `AI analysis task: '${action.task}'`;
    case 'update_crm':         return `CRM field '${action.field}' → '${action.value}'`;
    case 'condition_check':    return `Condition evaluated: '${action.condition}'`;
    default:                   return `Action '${action.type}' executed`;
  }
}

module.exports = router;
