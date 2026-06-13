// 工作流執行引擎
// v1：線性 actions 陣列（向下相容，逐步模擬執行）
// v2：{format:'v2', nodes, edges} 圖形 — 從觸發節點沿邊走訪，條件節點分支，每步寫入 workflow_step_logs
const crypto = require('crypto');
const { run } = require('../db');
const channelAdapter = require('./channelAdapter');

const MAX_STEPS = 100;   // 單次執行步數上限
const MAX_VISITS = 5;    // 單節點最大重訪次數（循環保護）

function logStep(runId, workflow, nodeId, nodeType, status, detail) {
  run(`INSERT INTO workflow_step_logs (run_id, workflow_id, workflow_name, node_id, node_type, status, detail_json) VALUES (?,?,?,?,?,?,?)`,
    [runId, workflow.id, workflow.name, nodeId, nodeType, status, JSON.stringify(detail || {})]);
}

// 條件評估：data = { field, operator, value }，支援點路徑取值
function evaluateCondition(data = {}, ctx = {}) {
  const { field = '', operator = 'eq', value = '' } = data;
  const actual = field.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  const expected = value;
  const numA = parseFloat(actual);
  const numB = parseFloat(expected);
  switch (operator) {
    case 'eq':       return String(actual) === String(expected);
    case 'neq':      return String(actual) !== String(expected);
    case 'gt':       return !isNaN(numA) && !isNaN(numB) && numA > numB;
    case 'gte':      return !isNaN(numA) && !isNaN(numB) && numA >= numB;
    case 'lt':       return !isNaN(numA) && !isNaN(numB) && numA < numB;
    case 'lte':      return !isNaN(numA) && !isNaN(numB) && numA <= numB;
    case 'contains': return String(actual ?? '').includes(String(expected));
    default:         return false;
  }
}

// 單節點執行（全部模擬；發送類動作走 channelAdapter 統一記錄）
async function executeNode(node, ctx) {
  const d = node.data || {};
  const type = node.type;
  switch (type) {
    case 'trigger':
      return { summary: `觸發：${d.trigger_type || 'manual'}`, config: d };
    case 'send_email':
    case 'send_line_message':
    case 'send_whatsapp':
    case 'send_notification': {
      const channelMap = { send_email: 'email', send_line_message: 'line', send_whatsapp: 'whatsapp', send_notification: 'push' };
      const sent = await channelAdapter.send({
        channel: d.channel || channelMap[type],
        recipient: ctx.contact?.email || ctx.contact?.name || 'demo-user',
        content: d.template || d.message || '(未設定內容)',
        meta: { node_id: node.id },
      });
      return { summary: `模擬發送 ${sent.channel} → ${sent.recipient}`, content: sent.contentPreview, delay_hours: d.delay || 0 };
    }
    case 'ai_reply':
      return { summary: `AI 回覆（節點：${d.node || 'service'}，模板：${d.template || 'default'}）— 模擬` };
    case 'ai_analyze':
      return { summary: `AI 分析任務：${d.task || '(未設定)'} — 模擬` };
    case 'ai_generate':
      return { summary: `AI 生成（模型：${d.model || 'glm-5-turbo'}）— 模擬`, prompt: (d.prompt || '').slice(0, 200) };
    case 'add_points':
      return { summary: `積分 +${d.amount || 0}（${d.reason || '工作流獎勵'}）— 模擬` };
    case 'update_member_level':
      return { summary: `會員等級更新：${d.target || 'auto_upgrade'} — 模擬` };
    case 'update_crm':
      return { summary: `CRM 欄位 ${d.field || '?'} → ${d.value || '?'} — 模擬` };
    case 'create_task':
      return { summary: `建立任務 → ${d.assignee || 'team'}（${d.priority || 'normal'}）— 模擬` };
    case 'notify_slack':
      return { summary: `Slack 通知 → ${d.channel || '#general'} — 模擬` };
    case 'tag_contact':
      return { summary: `貼標籤：${d.tag || '?'} — 模擬` };
    case 'segment_filter':
      return { summary: `受眾篩選：${d.condition || '?'} — 模擬` };
    case 'track_conversion':
      return { summary: `轉化追蹤視窗：${d.window || 7} 天 — 模擬` };
    case 'delay':
      return { summary: `延遲 ${d.hours || 1} 小時（模擬，不實際等待）` };
    case 'tool':
      return { summary: `執行工具箱工具：${d.tool_id || '(未選擇)'} — 模擬` };
    case 'webhook_call':
      return { summary: `Webhook 呼叫 ${d.method || 'POST'} ${d.url || '(未設定)'} — 模擬，未實際請求` };
    case 'condition':
      return { summary: `條件判斷：${d.field || '?'} ${d.operator || 'eq'} ${d.value ?? '?'}` };
    default:
      return { summary: `動作 ${type} — 模擬執行` };
  }
}

function isV2(parsed) {
  return parsed && !Array.isArray(parsed) && parsed.format === 'v2' && Array.isArray(parsed.nodes);
}

// v2 圖形執行
async function runGraph(workflow, graph, context = {}) {
  const runId = crypto.randomUUID();
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const outEdges = new Map();
  for (const e of edges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source).push(e);
  }

  // 起點：trigger 節點，否則無入邊節點
  const hasIncoming = new Set(edges.map(e => e.target));
  const start = nodes.find(n => n.type === 'trigger') || nodes.find(n => !hasIncoming.has(n.id));
  const results = [];

  if (!start) {
    logStep(runId, workflow, null, 'system', 'error', { summary: '找不到起始節點（需要一個觸發節點）' });
    return { runId, results: [{ nodeId: null, status: 'error', detail: { summary: '找不到起始節點' } }] };
  }

  const ctx = {
    contact: { name: 'Alice Chen', email: 'alice@techcorp.com', lifecycle_stage: 'active', rfm_score: 85, churn_prob: 0.08, points: 8500, level: 'gold' },
    ...context,
  };

  const queue = [start];
  const visits = {};
  let steps = 0;
  let aborted = false;

  while (queue.length && !aborted) {
    if (++steps > MAX_STEPS) {
      logStep(runId, workflow, 'system', 'system', 'max_steps_aborted', { summary: `超過最大步數 ${MAX_STEPS}，中止執行` });
      results.push({ nodeId: 'system', nodeType: 'system', status: 'max_steps_aborted', detail: { summary: `超過最大步數 ${MAX_STEPS}` } });
      break;
    }
    const node = queue.shift();
    visits[node.id] = (visits[node.id] || 0) + 1;
    if (visits[node.id] > MAX_VISITS) {
      logStep(runId, workflow, node.id, node.type, 'cycle_aborted', { summary: `節點重訪超過 ${MAX_VISITS} 次（疑似循環），中止` });
      results.push({ nodeId: node.id, nodeType: node.type, status: 'cycle_aborted', detail: { summary: '偵測到循環，已中止' } });
      aborted = true;
      break;
    }

    let detail;
    let status = 'executed';
    try {
      detail = await executeNode(node, ctx);
    } catch (err) {
      detail = { summary: `執行錯誤：${err.message}` };
      status = 'error';
    }

    let nextEdges = outEdges.get(node.id) || [];
    if (node.type === 'condition' && status !== 'error') {
      const pass = evaluateCondition(node.data, ctx);
      status = pass ? 'branch_true' : 'branch_false';
      detail.branch = pass ? 'true' : 'false';
      nextEdges = nextEdges.filter(e => (e.sourceHandle || 'true') === String(pass));
    }

    logStep(runId, workflow, node.id, node.type, status, detail);
    results.push({ nodeId: node.id, nodeType: node.type, label: node.data?.label, status, detail });

    for (const e of nextEdges) {
      const target = byId.get(e.target);
      if (target) queue.push(target);
    }
  }

  return { runId, steps: results.length, results };
}

// v1 線性陣列執行（沿用原 simulateAction 語意 + 步驟日誌）
async function runLinear(workflow, actions, simulateAction) {
  const runId = crypto.randomUUID();
  const results = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const detail = { summary: simulateAction(action) };
    logStep(runId, workflow, `a${i}`, action.type, 'executed', detail);
    results.push({ nodeId: `a${i}`, nodeType: action.type, status: 'executed', detail });
  }
  return { runId, steps: results.length, results };
}

module.exports = { isV2, runGraph, runLinear, evaluateCondition, MAX_STEPS, MAX_VISITS };
