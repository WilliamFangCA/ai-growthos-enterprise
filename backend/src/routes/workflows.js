const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/workflows
router.get('/', (req, res) => {
  try {
    const rows = all('SELECT * FROM workflows ORDER BY created_at DESC');
    const parsed = rows.map(r => ({
      ...r,
      run_count: Number(r.run_count) || 0,
      actions: JSON.parse(r.actions_json || '[]'),
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows
router.post('/', (req, res) => {
  try {
    const { name, trigger_type, actions } = req.body;
    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'name and trigger_type are required' });
    }

    run(
      `INSERT INTO workflows (name, trigger_type, actions_json, status, run_count) VALUES (?,?,?,?,?)`,
      [name, trigger_type, JSON.stringify(actions || []), 'active', 0]
    );

    const created = get('SELECT * FROM workflows ORDER BY id DESC LIMIT 1');
    res.status(201).json(created);
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

    if (!workflow) {
      return res.status(404).json({ error: `Workflow ${id} not found` });
    }

    if (workflow.status === 'paused') {
      return res.status(400).json({ error: 'Cannot run a paused workflow' });
    }

    run('UPDATE workflows SET run_count = run_count + 1 WHERE id = ?', [id]);

    const actions = JSON.parse(workflow.actions_json || '[]');
    const simulatedResults = actions.map(action => ({
      type: action.type,
      status: 'executed',
      timestamp: new Date().toISOString(),
      details: simulateAction(action),
    }));

    const newRunCount = (Number(workflow.run_count) || 0) + 1;

    res.json({
      workflowId: id,
      name: workflow.name,
      executed: true,
      runCount: newRunCount,
      results: simulatedResults,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function simulateAction(action) {
  switch (action.type) {
    case 'send_email': return `Email '${action.template}' queued for delivery`;
    case 'notify_slack': return `Slack notification sent to ${action.channel}`;
    case 'tag_contact': return `Tag '${action.tag}' applied to matching contacts`;
    case 'create_task': return `Task created and assigned to ${action.assignee}`;
    case 'segment_filter': return `Filter applied: ${action.condition}`;
    case 'track_conversion': return `Conversion tracking window: ${action.window} days`;
    default: return 'Action executed';
  }
}

module.exports = router;
