const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { callAI, getCircuitStatus } = require('../aiRouter');
const { run, all } = require('../db');

// Path to .claude/agents/ directory (relative from backend/src/routes -> ../../../../.claude/agents)
const agentsDir = path.resolve(__dirname, '..', '..', '..', '..', '.claude', 'agents');

// Agent metadata map
const AGENT_META = {
  'ceo-bezos': { role: 'Chief Executive Officer', persona: 'Jeff Bezos', layer: 'Strategy' },
  'cto-vogels': { role: 'Chief Technology Officer', persona: 'Werner Vogels', layer: 'Strategy' },
  'critic-munger': { role: 'Critical Thinker', persona: 'Charlie Munger', layer: 'Strategy' },
  'product-norman': { role: 'Product Designer', persona: 'Don Norman', layer: 'Product' },
  'ui-duarte': { role: 'UI/UX Designer', persona: 'Matias Duarte', layer: 'Product' },
  'interaction-cooper': { role: 'Interaction Designer', persona: 'Alan Cooper', layer: 'Product' },
  'fullstack-dhh': { role: 'Full Stack Developer', persona: 'DHH', layer: 'Engineering' },
  'qa-bach': { role: 'QA Strategist', persona: 'James Bach', layer: 'Engineering' },
  'devops-hightower': { role: 'DevOps Engineer', persona: 'Kelsey Hightower', layer: 'Engineering' },
  'marketing-godin': { role: 'Marketing Strategist', persona: 'Seth Godin', layer: 'Business' },
  'operations-pg': { role: 'Operations Lead', persona: 'Paul Graham', layer: 'Business' },
  'sales-ross': { role: 'Sales Director', persona: 'Aaron Ross', layer: 'Business' },
  'cfo-campbell': { role: 'Chief Financial Officer', persona: 'Patrick Campbell', layer: 'Business' },
  'research-thompson': { role: 'Market Researcher', persona: 'Ben Thompson', layer: 'Intelligence' },
};

function loadAgentDefinition(agentName) {
  const filePath = path.join(agentsDir, `${agentName}.md`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  const titleLine = lines.find(l => l.startsWith('#'));
  const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : agentName;

  const textLines = lines.filter(l => !l.startsWith('#')).join(' ');
  const description = textLines.substring(0, 200).trim();

  return { title, description, fullContent: content };
}

// GET /api/agents
router.get('/', (req, res) => {
  try {
    const builtIn = Object.keys(AGENT_META).map(name => {
      const def = loadAgentDefinition(name);
      const meta = AGENT_META[name];
      return {
        id: name,
        name: def ? def.title : name,
        role: meta.role,
        persona: meta.persona,
        layer: meta.layer,
        description: def ? def.description : `${meta.role} modeled on ${meta.persona}`,
        available: !!def,
        isCustom: false,
      };
    });

    // Load custom agents from agent_tasks table
    const customRows = all(`SELECT agent_name, task FROM agent_tasks WHERE status='custom' ORDER BY rowid ASC`);
    const custom = customRows.map(row => {
      try {
        const data = JSON.parse(row.task);
        const id = row.agent_name.replace('__custom__', '');
        return { id, name: data.role, role: data.role, persona: data.persona,
          layer: data.layer || 'Strategy', description: data.description || '',
          systemPrompt: data.systemPrompt || '', available: true, isCustom: true };
      } catch { return null; }
    }).filter(Boolean);

    res.json([...builtIn, ...custom]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/invoke
router.post('/invoke', async (req, res) => {
  const { agentName, task, model, systemPrompt: userSystemPrompt, temperature } = req.body;
  if (!agentName || !task) {
    return res.status(400).json({ error: 'agentName and task are required' });
  }

  // Check custom agent first
  const customRow = agentName.startsWith('custom-')
    ? all(`SELECT task FROM agent_tasks WHERE agent_name=? AND status='custom' LIMIT 1`, [`__custom__${agentName}`])[0]
    : null;

  const meta = AGENT_META[agentName] || (customRow ? JSON.parse(customRow.task) : null);
  if (!meta) {
    return res.status(404).json({ error: `Agent '${agentName}' not found` });
  }

  try {
    const def = !customRow ? loadAgentDefinition(agentName) : null;

    // Build system prompt
    let agentPersonaPrompt;
    if (customRow) {
      const data = JSON.parse(customRow.task);
      agentPersonaPrompt = data.systemPrompt ||
        `你是一位 ${data.role}，思維框架來自 ${data.persona}。請用你的專業知識和獨特視角回答問題。`;
    } else {
      agentPersonaPrompt = `You are ${meta.persona}, acting as ${meta.role} for an AI company called Auto Company. Use your characteristic thinking style and expertise.`;
      if (def && def.fullContent) agentPersonaPrompt = def.fullContent.substring(0, 600);
    }

    const finalSystemPrompt = userSystemPrompt
      ? `${userSystemPrompt}\n\n---\n${agentPersonaPrompt}`
      : agentPersonaPrompt;

    const result = await callAI(task, finalSystemPrompt, {
      model: model || 'glm-5-turbo',
      maxTokens: 1500,
      temperature: temperature !== undefined ? temperature : 0.7,
      images: req.body.images || [],
    });

    const costUsd = result.source === 'mock' ? 0 : (result.tokensUsed * 0.00001);
    run(
      `INSERT INTO agent_tasks (agent_name, task, result, status, cost_usd) VALUES (?,?,?,?,?)`,
      [agentName, task, result.content, 'completed', costUsd]
    );

    res.json({
      agent: agentName,
      persona: meta.persona,
      task,
      result: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
      source: result.source,
    });
  } catch (err) {
    console.error('[agents/invoke] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/circuit-status — real-time circuit breaker health
router.get('/circuit-status', (req, res) => {
  try {
    const status = getCircuitStatus ? getCircuitStatus() : {};
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agents/custom — save a user-created custom agent
router.post('/custom', (req, res) => {
  const { role, persona, layer, description, systemPrompt } = req.body;
  if (!role || !persona) return res.status(400).json({ error: 'role and persona required' });
  try {
    const id = `custom-${role.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    run(
      `INSERT INTO agent_tasks (agent_name, task, result, status, cost_usd) VALUES (?,?,?,?,?)`,
      [
        `__custom__${id}`,
        JSON.stringify({ role, persona, layer: layer || 'Strategy', description, systemPrompt }),
        'created',
        'custom',
        0,
      ]
    );
    res.json({ id, role, persona, layer, description, systemPrompt, isCustom: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
