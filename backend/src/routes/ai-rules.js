const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { callAI } = require('../aiRouter');

const TRIGGER_TYPES = ['acquisition','activation','retention','revenue','referral','order_status','service','event','vip','community','content_event'];

// GET /api/ai-rules（含來源活動名稱；活動可能因重啟重灌而不存在，需 null 安全）
router.get('/', (req, res) => {
  try {
    const rules = all(`
      SELECT r.*, c.name AS campaign_name
      FROM ai_reply_rules r LEFT JOIN campaigns c ON c.id = r.campaign_id
      ORDER BY r.trigger_type, r.name`);
    res.json(rules.map(r => ({ ...r, trigger_condition: JSON.parse(r.trigger_condition || '{}'), platforms: JSON.parse(r.platforms || '["all"]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-rules/stats
router.get('/stats', (req, res) => {
  try {
    const total = get('SELECT COUNT(*) as count FROM ai_reply_rules')?.count || 0;
    const active = get('SELECT COUNT(*) as count FROM ai_reply_rules WHERE is_active = 1')?.count || 0;
    const totalFires = get('SELECT SUM(fire_count) as total FROM ai_reply_rules')?.total || 0;
    const byType = all('SELECT trigger_type, COUNT(*) as count, SUM(fire_count) as fires FROM ai_reply_rules GROUP BY trigger_type');
    res.json({ total, active, totalFires, byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-rules
router.post('/', (req, res) => {
  const { name, trigger_type, trigger_condition = {}, reply_template, model = 'glm-5-turbo', language = 'auto', platforms = ['all'] } = req.body;
  if (!name || !trigger_type || !reply_template) return res.status(400).json({ error: 'name, trigger_type, reply_template required' });
  if (!TRIGGER_TYPES.includes(trigger_type)) return res.status(400).json({ error: `Invalid trigger_type. Must be: ${TRIGGER_TYPES.join(', ')}` });
  try {
    run(`INSERT INTO ai_reply_rules (name, trigger_type, trigger_condition, reply_template, model, language, platforms) VALUES (?,?,?,?,?,?,?)`,
      [name, trigger_type, JSON.stringify(trigger_condition), reply_template, model, language, JSON.stringify(platforms)]);
    const rule = get('SELECT * FROM ai_reply_rules WHERE id = last_insert_rowid()');
    res.json({ ...rule, trigger_condition: JSON.parse(rule.trigger_condition), platforms: JSON.parse(rule.platforms) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ai-rules/:id
router.put('/:id', (req, res) => {
  const { name, trigger_condition, reply_template, model, language, platforms, is_active } = req.body;
  try {
    const existing = get('SELECT * FROM ai_reply_rules WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Rule not found' });

    const updates = ['updated_at = CURRENT_TIMESTAMP', 'version = version + 1'];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (trigger_condition !== undefined) { updates.push('trigger_condition = ?'); params.push(JSON.stringify(trigger_condition)); }
    if (reply_template !== undefined) { updates.push('reply_template = ?'); params.push(reply_template); }
    if (model !== undefined) { updates.push('model = ?'); params.push(model); }
    if (language !== undefined) { updates.push('language = ?'); params.push(language); }
    if (platforms !== undefined) { updates.push('platforms = ?'); params.push(JSON.stringify(platforms)); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    params.push(req.params.id);
    run(`UPDATE ai_reply_rules SET ${updates.join(', ')} WHERE id = ?`, params);

    const rule = get('SELECT * FROM ai_reply_rules WHERE id = ?', [req.params.id]);
    res.json({ ...rule, trigger_condition: JSON.parse(rule.trigger_condition), platforms: JSON.parse(rule.platforms) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ai-rules/:id
router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM ai_reply_rules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-rules/test — preview generated reply without saving
router.post('/test', async (req, res) => {
  const { rule_id, context = {}, model } = req.body;
  try {
    let template = req.body.reply_template;
    if (rule_id) {
      const rule = get('SELECT * FROM ai_reply_rules WHERE id = ?', [rule_id]);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      template = rule.reply_template;
    }
    if (!template) return res.status(400).json({ error: 'reply_template or rule_id required' });

    // Fill template variables with context
    let filledTemplate = template;
    for (const [k, v] of Object.entries(context)) {
      filledTemplate = filledTemplate.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }

    const prompt = `You are an AI auto-reply system. Generate a final, personalized version of this message template:\n\n"${filledTemplate}"\n\nContext: ${JSON.stringify(context)}\n\nOutput only the final message, no extra explanation.`;
    const result = await callAI(prompt, 'You generate polished customer-facing messages from templates.', { model: model || 'glm-5-turbo', maxTokens: 300, temperature: 0.6 });

    if (rule_id) run('UPDATE ai_reply_rules SET fire_count = fire_count + 1 WHERE id = ?', [rule_id]);

    res.json({ preview: result.content, model: result.model, source: result.source, filled_template: filledTemplate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-rules/performance
router.get('/performance', (req, res) => {
  try {
    const rules = all('SELECT id, name, trigger_type, fire_count, is_active, version FROM ai_reply_rules ORDER BY fire_count DESC');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
