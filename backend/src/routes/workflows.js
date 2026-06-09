const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/workflows
router.get('/', (req, res) => {
  try {
    const rows = all('SELECT * FROM workflows ORDER BY run_count DESC, created_at DESC');
    const parsed = rows.map(r => ({
      ...r,
      run_count: Number(r.run_count) || 0,
      actions: JSON.parse(r.actions_json || '[]'),
      category: r.category || 'general',
      description: r.description || '',
    }));
    res.json(parsed);
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

// POST /api/workflows
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
    res.status(201).json({ ...created, actions: JSON.parse(created.actions_json || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:id/run
router.post('/:id/run', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid workflow id' });
    const workflow = get('SELECT * FROM workflows WHERE id = ?', [id]);

    if (!workflow) return res.status(404).json({ error: `Workflow ${id} not found` });
    if (workflow.status === 'paused') return res.status(400).json({ error: 'Cannot run a paused workflow' });

    run('UPDATE workflows SET run_count = run_count + 1 WHERE id = ?', [id]);

    // Log to workflow_run_logs for analytics
    run(`INSERT INTO workflow_run_logs (workflow_id, workflow_name, category, status) VALUES (?,?,?,?)`,
      [id, workflow.name, workflow.category || 'general', 'success']);

    const actions = JSON.parse(workflow.actions_json || '[]');
    const simulatedResults = actions.map(action => ({
      type: action.type,
      status: 'executed',
      timestamp: new Date().toISOString(),
      details: simulateAction(action),
    }));

    res.json({
      workflowId: id,
      name: workflow.name,
      category: workflow.category,
      executed: true,
      runCount: (Number(workflow.run_count) || 0) + 1,
      results: simulatedResults,
      executedAt: new Date().toISOString(),
    });
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
