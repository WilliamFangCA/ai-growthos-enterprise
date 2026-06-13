// 工作流節點註冊表 — 編輯器的唯一節點定義來源
// handles.out: 'single' 單一出口；['true','false'] 條件分支雙出口；null 無出口（終點）

export const NODE_CATEGORIES = [
  { key: 'trigger',  label: '觸發器',   icon: '⚡' },
  { key: 'message',  label: '訊息發送', icon: '💬' },
  { key: 'ai',       label: 'AI 智能',  icon: '🤖' },
  { key: 'logic',    label: '邏輯控制', icon: '🔀' },
  { key: 'crm',      label: 'CRM 動作', icon: '👥' },
  { key: 'integration', label: '整合工具', icon: '🔌' },
];

export const NODE_REGISTRY = {
  // ── 觸發器 ──
  trigger: {
    label: '觸發器', icon: '⚡', color: '#3b82f6', category: 'trigger',
    handles: { in: false, out: 'single' },
    description: '工作流的起點，定義何時啟動',
    configFields: [
      { key: 'trigger_type', label: '觸發類型', fieldType: 'select', options: [
        ['user_signup', '👤 用戶註冊/加好友'], ['webhook', '🔗 Webhook 事件'],
        ['scheduled', '🕐 排程'], ['ai_trigger', '🤖 AI 條件觸發'], ['manual', '▶️ 手動'],
      ]},
      { key: 'note', label: '備註', fieldType: 'text', placeholder: '例：LINE 加好友時' },
    ],
    defaultData: { label: '觸發器', trigger_type: 'manual' },
  },
  // ── 訊息發送 ──
  send_line_message: {
    label: '發送 LINE', icon: '💚', color: '#4ade80', category: 'message',
    handles: { in: true, out: 'single' },
    description: '透過 LINE 官方帳號發送訊息',
    configFields: [
      { key: 'template', label: '訊息內容/模板', fieldType: 'textarea', placeholder: '您好 {name}！…' },
      { key: 'delay', label: '延遲（小時）', fieldType: 'number' },
    ],
    defaultData: { label: '發送 LINE', template: '', delay: 0 },
  },
  send_email: {
    label: '發送 Email', icon: '📧', color: '#60a5fa', category: 'message',
    handles: { in: true, out: 'single' },
    description: '發送電子郵件',
    configFields: [
      { key: 'template', label: '郵件內容/模板', fieldType: 'textarea', placeholder: '主旨與內文…' },
      { key: 'delay', label: '延遲（小時）', fieldType: 'number' },
    ],
    defaultData: { label: '發送 Email', template: '', delay: 0 },
  },
  send_whatsapp: {
    label: '發送 WhatsApp', icon: '📱', color: '#34d399', category: 'message',
    handles: { in: true, out: 'single' },
    description: '透過 WhatsApp Business 發送',
    configFields: [
      { key: 'template', label: '訊息內容', fieldType: 'textarea' },
    ],
    defaultData: { label: '發送 WhatsApp', template: '' },
  },
  send_notification: {
    label: '推播通知', icon: '🔔', color: '#fb7185', category: 'message',
    handles: { in: true, out: 'single' },
    description: '依用戶偏好渠道自動推播',
    configFields: [
      { key: 'channel', label: '渠道', fieldType: 'select', options: [['auto', '自動（用戶偏好）'], ['line', 'LINE'], ['email', 'Email'], ['sms', 'SMS'], ['push', 'App Push']] },
      { key: 'template', label: '通知內容', fieldType: 'textarea' },
    ],
    defaultData: { label: '推播通知', channel: 'auto', template: '' },
  },
  notify_slack: {
    label: 'Slack 通知', icon: '💬', color: '#34d399', category: 'message',
    handles: { in: true, out: 'single' },
    description: '通知內部團隊頻道',
    configFields: [
      { key: 'channel', label: '頻道', fieldType: 'text', placeholder: '#cs-alerts' },
    ],
    defaultData: { label: 'Slack 通知', channel: '#general' },
  },
  // ── AI 智能 ──
  ai_reply: {
    label: 'AI 自動回覆', icon: '🤖', color: '#60a5fa', category: 'ai',
    handles: { in: true, out: 'single' },
    description: 'AI 依節點情境自動回覆客戶',
    configFields: [
      { key: 'node', label: '回覆情境節點', fieldType: 'select', options: [
        ['acquisition', '獲客'], ['activation', '激活'], ['retention', '留存'],
        ['revenue', '收入'], ['service', '客服'], ['order', '訂單'],
      ]},
      { key: 'template', label: '回覆模板', fieldType: 'textarea' },
    ],
    defaultData: { label: 'AI 自動回覆', node: 'service', template: '' },
  },
  ai_analyze: {
    label: 'AI 分析', icon: '🧠', color: '#818cf8', category: 'ai',
    handles: { in: true, out: 'single' },
    description: 'AI 分析任務（意向評分/最佳渠道等）',
    configFields: [
      { key: 'task', label: '分析任務', fieldType: 'text', placeholder: '例：purchase_intent_score' },
    ],
    defaultData: { label: 'AI 分析', task: '' },
  },
  ai_generate: {
    label: 'AI 內容生成', icon: '✨', color: '#a78bfa', category: 'ai',
    handles: { in: true, out: 'single' },
    description: '依 Prompt 即時生成內容',
    configFields: [
      { key: 'prompt', label: 'Prompt', fieldType: 'textarea', placeholder: '為 {name} 生成個性化訊息…' },
      { key: 'model', label: '模型', fieldType: 'select', options: [
        ['glm-5-turbo', 'GLM-5 Turbo'], ['glm-4.5-air', 'GLM-4.5 Air'],
        ['claude-haiku-4-5-20251001', 'Claude Haiku'], ['claude-sonnet-4-6', 'Claude Sonnet'],
      ]},
    ],
    defaultData: { label: 'AI 內容生成', prompt: '', model: 'glm-5-turbo' },
  },
  // ── 邏輯控制 ──
  condition: {
    label: '條件分支', icon: '❓', color: '#c084fc', category: 'logic',
    handles: { in: true, out: ['true', 'false'] },
    description: '依條件走 ✓ 或 ✗ 分支',
    configFields: [
      { key: 'field', label: '欄位（點路徑）', fieldType: 'select', options: [
        ['contact.rfm_score', 'RFM 分數'], ['contact.churn_prob', '流失機率'],
        ['contact.points', '積分'], ['contact.level', '會員等級'],
        ['contact.lifecycle_stage', '生命週期'], ['order.total_amount', '訂單金額'],
      ], allowCustom: true },
      { key: 'operator', label: '運算子', fieldType: 'select', options: [
        ['gt', '大於 >'], ['gte', '大於等於 ≥'], ['lt', '小於 <'], ['lte', '小於等於 ≤'],
        ['eq', '等於 ='], ['neq', '不等於 ≠'], ['contains', '包含'],
      ]},
      { key: 'value', label: '比較值', fieldType: 'text', placeholder: '例：60' },
    ],
    defaultData: { label: '條件分支', field: 'contact.rfm_score', operator: 'gt', value: '60' },
  },
  delay: {
    label: '延遲等待', icon: '⏳', color: '#fbbf24', category: 'logic',
    handles: { in: true, out: 'single' },
    description: '等待指定時間後繼續',
    configFields: [
      { key: 'hours', label: '等待小時數', fieldType: 'number' },
    ],
    defaultData: { label: '延遲等待', hours: 24 },
  },
  segment_filter: {
    label: '受眾篩選', icon: '🎯', color: '#f87171', category: 'logic',
    handles: { in: true, out: 'single' },
    description: '只讓符合條件的用戶繼續',
    configFields: [
      { key: 'condition', label: '篩選條件', fieldType: 'text', placeholder: '例：inactive_14d' },
    ],
    defaultData: { label: '受眾篩選', condition: '' },
  },
  // ── CRM 動作 ──
  tag_contact: {
    label: '貼標籤', icon: '🏷️', color: '#fbbf24', category: 'crm',
    handles: { in: true, out: 'single' },
    description: '為客戶加上標籤',
    configFields: [
      { key: 'tag', label: '標籤', fieldType: 'text', placeholder: '例：high_intent' },
    ],
    defaultData: { label: '貼標籤', tag: '' },
  },
  update_crm: {
    label: '更新 CRM', icon: '📋', color: '#2dd4bf', category: 'crm',
    handles: { in: true, out: 'single' },
    description: '更新客戶欄位',
    configFields: [
      { key: 'field', label: '欄位', fieldType: 'text', placeholder: 'lifecycle_stage' },
      { key: 'value', label: '值', fieldType: 'text', placeholder: 'active' },
    ],
    defaultData: { label: '更新 CRM', field: '', value: '' },
  },
  add_points: {
    label: '發放積分', icon: '⭐', color: '#fbbf24', category: 'crm',
    handles: { in: true, out: 'single' },
    description: '給客戶加積分',
    configFields: [
      { key: 'amount', label: '積分數', fieldType: 'number' },
      { key: 'reason', label: '原因', fieldType: 'text', placeholder: '例：活動獎勵' },
    ],
    defaultData: { label: '發放積分', amount: 100, reason: '' },
  },
  update_member_level: {
    label: '會員升級', icon: '🏆', color: '#a78bfa', category: 'crm',
    handles: { in: true, out: 'single' },
    description: '檢查並更新會員等級',
    configFields: [
      { key: 'target', label: '模式', fieldType: 'select', options: [['auto_upgrade', '自動依消費升級'], ['force_vip', '直接升 VIP']] },
    ],
    defaultData: { label: '會員升級', target: 'auto_upgrade' },
  },
  create_task: {
    label: '建立任務', icon: '✅', color: '#a78bfa', category: 'crm',
    handles: { in: true, out: 'single' },
    description: '為團隊建立待辦任務',
    configFields: [
      { key: 'assignee', label: '指派給', fieldType: 'text', placeholder: 'cs_team' },
      { key: 'priority', label: '優先級', fieldType: 'select', options: [['high', '高'], ['normal', '中'], ['low', '低']] },
    ],
    defaultData: { label: '建立任務', assignee: 'cs_team', priority: 'normal' },
  },
  track_conversion: {
    label: '轉化追蹤', icon: '📊', color: '#22d3ee', category: 'crm',
    handles: { in: true, out: null },
    description: '開啟轉化追蹤視窗（終點節點）',
    configFields: [
      { key: 'window', label: '追蹤天數', fieldType: 'number' },
    ],
    defaultData: { label: '轉化追蹤', window: 7 },
  },
  // ── 整合工具 ──
  tool: {
    label: '工具箱工具', icon: '🧰', color: '#34d399', category: 'integration',
    handles: { in: true, out: 'single' },
    description: '執行 AI 工具箱中的任一工具',
    configFields: [
      { key: 'tool_id', label: '選擇工具', fieldType: 'tool' },
    ],
    defaultData: { label: '工具箱工具', tool_id: '' },
  },
  webhook_call: {
    label: 'Webhook 呼叫', icon: '🔗', color: '#f59e0b', category: 'integration',
    handles: { in: true, out: 'single' },
    description: '呼叫外部 API（Zapier/Make/自訂系統）',
    configFields: [
      { key: 'url', label: 'URL', fieldType: 'text', placeholder: 'https://hooks.example.com/…' },
      { key: 'method', label: 'Method', fieldType: 'select', options: [['POST', 'POST'], ['GET', 'GET'], ['PUT', 'PUT']] },
    ],
    defaultData: { label: 'Webhook 呼叫', url: '', method: 'POST' },
  },
};

export function nodeMeta(type) {
  return NODE_REGISTRY[type] || {
    label: type, icon: '⚡', color: '#9ca3af', category: 'integration',
    handles: { in: true, out: 'single' }, configFields: [], defaultData: { label: type },
  };
}

// v1 線性 actions → v2 圖形（編輯舊工作流時自動轉換）
export function v1ToGraph(workflow) {
  const nodes = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 40, y: 140 },
      data: { label: '觸發器', trigger_type: workflow.trigger_type || 'manual' },
    },
  ];
  const edges = [];
  let prev = 'trigger';
  (workflow.actions || []).forEach((action, i) => {
    const id = `n${i + 1}`;
    const { type, ...data } = action;
    // v1 的 condition_check 是單純動作（帶 condition 字串），對應到受眾篩選節點
    const mappedType = NODE_REGISTRY[type] ? type : type === 'condition_check' ? 'segment_filter' : 'webhook_call';
    const meta = nodeMeta(mappedType);
    nodes.push({
      id,
      type: mappedType,
      position: { x: 40 + (i + 1) * 240, y: 140 },
      data: { ...meta.defaultData, ...data, label: data.label || meta.label },
    });
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  });
  return { format: 'v2', nodes, edges };
}
