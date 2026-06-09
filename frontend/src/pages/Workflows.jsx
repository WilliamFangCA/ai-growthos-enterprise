import React, { useState, useEffect } from 'react';

const CATEGORY_CONFIG = {
  acquisition: { label: '獲客',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  icon: '🎯' },
  activation:  { label: '激活',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  icon: '⚡' },
  retention:   { label: '留存',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  icon: '💎' },
  revenue:     { label: '收入',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  icon: '💰' },
  referral:    { label: '裂變',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   icon: '🔗' },
  order:       { label: '訂單',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   icon: '📦' },
  comms:       { label: '通訊',  color: '#ec4899', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.3)',  icon: '💬' },
  general:     { label: '一般',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', icon: '⚙️' },
};

const TRIGGER_ICONS = {
  user_signup: '👤', ai_trigger: '🤖', scheduled: '🕐', webhook: '🔗', manual: '▶️',
};

const ACTION_COLORS = {
  send_email:          { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  icon: '📧', color: '#60a5fa' },
  notify_slack:        { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  icon: '💬', color: '#34d399' },
  tag_contact:         { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  icon: '🏷️', color: '#fbbf24' },
  create_task:         { bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)',  icon: '✅', color: '#a78bfa' },
  segment_filter:      { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   icon: '🎯', color: '#f87171' },
  track_conversion:    { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)',   icon: '📊', color: '#22d3ee' },
  send_line_message:   { bg: 'rgba(0,195,0,0.15)',     border: 'rgba(0,195,0,0.35)',     icon: '💚', color: '#4ade80' },
  send_whatsapp:       { bg: 'rgba(37,211,102,0.15)',  border: 'rgba(37,211,102,0.35)',  icon: '📱', color: '#34d399' },
  add_points:          { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.35)',  icon: '⭐', color: '#fbbf24' },
  update_member_level: { bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)',  icon: '🏆', color: '#a78bfa' },
  ai_reply:            { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  icon: '🤖', color: '#60a5fa' },
  send_notification:   { bg: 'rgba(244,63,94,0.15)',   border: 'rgba(244,63,94,0.35)',   icon: '🔔', color: '#fb7185' },
  ai_analyze:          { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)',  icon: '🧠', color: '#818cf8' },
  update_crm:          { bg: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.35)',  icon: '📋', color: '#2dd4bf' },
  condition_check:     { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.35)',  icon: '❓', color: '#c084fc' },
};
const ACTION_DEFAULT = { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.35)', icon: '⚡', color: '#9ca3af' };

const STATUS_CONFIG = {
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', label: 'Active' },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Paused' },
  draft:  { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)', label: 'Draft' },
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✓' : '✕'} {message}</div>;
}

function DAGFlow({ trigger_type, actions = [] }) {
  const triggerIcon = TRIGGER_ICONS[trigger_type] || '⚡';
  const nodes = [
    { icon: triggerIcon, label: trigger_type.replace(/_/g, ' '), color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' },
    ...actions.map(a => {
      const cfg = ACTION_COLORS[a.type] || ACTION_DEFAULT;
      const detail = a.template || a.channel || a.tag || a.condition || a.task || a.reason || (a.window ? `${a.window}d` : '') || (a.delay ? `+${a.delay}h` : '') || '';
      return { icon: cfg.icon, label: a.type.replace(/_/g, ' '), sub: detail.slice(0, 20), color: cfg.color, bg: cfg.bg, border: cfg.border };
    }),
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'thin' }}>
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          <div style={{ flexShrink: 0, borderRadius: 10, padding: '8px 12px', minWidth: 90, maxWidth: 120, background: node.bg, border: `1px solid ${node.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 16 }}>{node.icon}</span>
            <div style={{ fontSize: 9, fontWeight: 600, color: node.color, textAlign: 'center', lineHeight: 1.3 }}>{node.label}</div>
            {node.sub && <div style={{ fontSize: 8, color: '#6b7280', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{node.sub}</div>}
          </div>
          {i < nodes.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#374151' }}>
              <div style={{ width: 12, height: 1, background: '#374151' }} />
              <span style={{ fontSize: 9, color: '#4b5563' }}>▶</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('acquisition');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('user_signup');
  const [triggerConfig, setTriggerConfig] = useState({ condition: 'churn_risk', threshold: 60, frequency: 'daily', time: '09:00', event: 'order_status_change' });
  const [prompt, setPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActions, setAiActions] = useState([]);
  const [saving, setSaving] = useState(false);

  const TRIGGER_META = {
    user_signup: {
      icon: '👤', label: 'User Signup', color: '#3b82f6',
      desc: '新用戶完成註冊、或加 LINE / WhatsApp 好友的瞬間自動觸發。',
      example: '用戶加入你的 LINE 官方帳號 → 立即發送歡迎訊息 + 建立 CRM 記錄',
      configType: 'delay',
    },
    ai_trigger: {
      icon: '🤖', label: 'AI Trigger', color: '#8b5cf6',
      desc: 'AI 持續監測所有用戶行為與指標，當符合設定條件時自動觸發。',
      example: 'AI 偵測到某用戶 30 天未互動且流失機率 > 70% → 自動啟動喚回序列',
      configType: 'ai_condition',
    },
    scheduled: {
      icon: '🕐', label: 'Scheduled', color: '#10b981',
      desc: '按照固定時間表定期執行，適合每日 / 每週的常規維護任務。',
      example: '每天早上 9:00 → 檢查今日生日會員 → 發送生日祝賀與積分禮品',
      configType: 'schedule',
    },
    webhook: {
      icon: '🔗', label: 'Webhook', color: '#f59e0b',
      desc: '接收外部平台（LINE / 訂單系統 / 支付平台）的即時事件通知後觸發。',
      example: 'Shopify 訂單狀態更新 → Webhook 到此 → AI 自動發送物流通知給客戶',
      configType: 'webhook_event',
    },
    manual: {
      icon: '▶️', label: 'Manual', color: '#6b7280',
      desc: '需要時手動在 Workflow 列表點擊「▶ Run」按鈕執行，適合一次性操作或測試。',
      example: '大促前手動批量發送優惠訊息 / 測試新 Workflow 的執行效果',
      configType: null,
    },
  };

  async function handleAISuggest() {
    if (!prompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/agents/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'operations-pg',
          task: `設計一個 ${CATEGORY_CONFIG[category]?.label || category} 類別的行銷 Workflow：「${prompt}」\n觸發器：${trigger}\n\n只返回 JSON 動作陣列，動作類型可以是：send_email, send_line_message, notify_slack, tag_contact, create_task, segment_filter, track_conversion, add_points, update_member_level, ai_reply, send_notification, ai_analyze, update_crm, condition_check\n每個動作含 type 和可選的 template/channel/tag/condition/task/reason/amount/window/delay 欄位。\n只返回 JSON 陣列，不要其他說明。`,
          model: 'glm-5-turbo',
        }),
      });
      const data = await res.json();
      const match = data.result?.match(/\[[\s\S]*\]/);
      if (match) setAiActions(JSON.parse(match[0]));
    } catch {
      setAiActions([{ type: 'send_line_message', template: 'welcome' }, { type: 'tag_contact', tag: 'new_lead' }, { type: 'track_conversion', window: 7 }]);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, trigger_type: trigger, actions: aiActions }),
      });
      const data = await res.json();
      onCreate(data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const TRIGGERS = Object.keys(TRIGGER_META);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16, padding: 28, width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>建立 Workflow</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>名稱</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="例：新用戶 7 天激活流程"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#12151f', border: '1px solid #2a2d3e', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>類別</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'general').map(([k, cfg]) => (
                  <button key={k} onClick={() => setCategory(k)} style={{
                    padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: category === k ? 700 : 400,
                    background: category === k ? cfg.bg : '#12151f',
                    border: `1px solid ${category === k ? cfg.color : '#2a2d3e'}`,
                    color: category === k ? cfg.color : '#6b7280',
                  }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>描述</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="簡述這個 Workflow 的目標和適用場景"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#12151f', border: '1px solid #2a2d3e', color: '#f9fafb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>觸發器 — 何時執行此 Workflow？</label>

            {/* Trigger selector pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {TRIGGERS.map(t => {
                const meta = TRIGGER_META[t];
                const isActive = trigger === t;
                return (
                  <button key={t} onClick={() => setTrigger(t)} style={{
                    padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    background: isActive ? `rgba(${meta.color === '#3b82f6' ? '59,130,246' : meta.color === '#8b5cf6' ? '139,92,246' : meta.color === '#10b981' ? '16,185,129' : meta.color === '#f59e0b' ? '245,158,11' : '107,114,128'},0.18)` : '#12151f',
                    border: `1.5px solid ${isActive ? meta.color : '#2a2d3e'}`,
                    color: isActive ? meta.color : '#9ca3af',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}>
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected trigger: description card + config */}
            {(() => {
              const meta = TRIGGER_META[trigger];
              if (!meta) return null;
              return (
                <div style={{ background: '#0f1117', border: `1px solid ${meta.color}30`, borderLeft: `3px solid ${meta.color}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Description */}
                  <div>
                    <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500, marginBottom: 4 }}>{meta.desc}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                      <span style={{ color: meta.color, flexShrink: 0 }}>💡</span>
                      <span>{meta.example}</span>
                    </div>
                  </div>

                  {/* AI Trigger config */}
                  {meta.configType === 'ai_condition' && (
                    <div style={{ borderTop: '1px solid #1e2035', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>AI 觸發條件</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={triggerConfig.condition || 'churn_risk'} onChange={e => setTriggerConfig(p => ({ ...p, condition: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#e5e7eb', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                          <option value="churn_risk">流失機率 ＞</option>
                          <option value="inactive_days">未互動天數 ＞</option>
                          <option value="total_spend">累計消費達到</option>
                          <option value="points_reached">積分達到</option>
                          <option value="purchase_intent">購買意向分數 ＞</option>
                        </select>
                        <input type="number" value={triggerConfig.threshold ?? 60} onChange={e => setTriggerConfig(p => ({ ...p, threshold: Number(e.target.value) }))} min={1} max={100}
                          style={{ width: 70, padding: '7px 10px', borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#e5e7eb', fontSize: 12, outline: 'none' }} />
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {{ churn_risk: '%', inactive_days: '天', total_spend: 'NT$', points_reached: '點', purchase_intent: '分' }[triggerConfig.condition || 'churn_risk']}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 6 }}>
                        AI 每小時掃描一次所有聯絡人，符合條件即觸發此 Workflow
                      </div>
                    </div>
                  )}

                  {/* Scheduled config */}
                  {meta.configType === 'schedule' && (
                    <div style={{ borderTop: '1px solid #1e2035', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>排程設定</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={triggerConfig.frequency || 'daily'} onChange={e => setTriggerConfig(p => ({ ...p, frequency: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#e5e7eb', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                          <option value="daily">每天</option>
                          <option value="weekly_mon">每週一</option>
                          <option value="weekly_fri">每週五</option>
                          <option value="monthly_1">每月 1 日</option>
                          <option value="monthly_15">每月 15 日</option>
                        </select>
                        <input type="time" value={triggerConfig.time || '09:00'} onChange={e => setTriggerConfig(p => ({ ...p, time: e.target.value }))}
                          style={{ padding: '7px 10px', borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#e5e7eb', fontSize: 12, outline: 'none' }} />
                        <span style={{ fontSize: 11, color: '#6b7280' }}>台灣時間 (UTC+8)</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 6 }}>
                        系統將在設定時間自動執行，適合生日禮遇、週報、沉默用戶掃描等任務
                      </div>
                    </div>
                  )}

                  {/* Webhook event config */}
                  {meta.configType === 'webhook_event' && (
                    <div style={{ borderTop: '1px solid #1e2035', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Webhook 事件來源</div>
                      <select value={triggerConfig.event || 'order_status_change'} onChange={e => setTriggerConfig(p => ({ ...p, event: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', color: '#e5e7eb', fontSize: 12, cursor: 'pointer', outline: 'none', marginBottom: 8 }}>
                        <option value="order_status_change">📦 訂單狀態變更（Shopify / 蝦皮 / TikTok Shop）</option>
                        <option value="message_received">💬 收到新訊息（LINE / WhatsApp / Telegram）</option>
                        <option value="user_follow">👤 用戶加好友 / 訂閱（LINE / Instagram）</option>
                        <option value="payment_complete">💳 付款完成（綠界 / 藍新 / Stripe）</option>
                        <option value="cart_abandoned">🛒 購物車放棄（Shopify）</option>
                        <option value="form_submit">📝 表單提交 / 活動報名</option>
                        <option value="custom">⚙️ 自訂事件</option>
                      </select>
                      <div style={{ background: '#1a1d2e', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>Webhook URL</span>
                        <code style={{ fontSize: 10, color: '#22d3ee', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          https://ai-growthos-enterprise-production.up.railway.app/api/comms/webhook/{triggerConfig.event || 'order_status_change'}
                        </code>
                      </div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 6 }}>
                        複製上方 URL 貼到對應平台的 Webhook 設定中，即可接收即時事件
                      </div>
                    </div>
                  )}

                  {/* User signup delay */}
                  {meta.configType === 'delay' && (
                    <div style={{ borderTop: '1px solid #1e2035', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>觸發延遲</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[['0', '立即執行'], ['5', '5 分鐘後'], ['30', '30 分鐘後'], ['60', '1 小時後']].map(([val, label]) => (
                          <button key={val} onClick={() => setTriggerConfig(p => ({ ...p, delay_minutes: val }))} style={{
                            padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                            background: (triggerConfig.delay_minutes || '0') === val ? 'rgba(59,130,246,0.2)' : '#1a1d2e',
                            border: `1px solid ${(triggerConfig.delay_minutes || '0') === val ? '#3b82f6' : '#2a2d3e'}`,
                            color: (triggerConfig.delay_minutes || '0') === val ? '#60a5fa' : '#6b7280',
                          }}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 10, padding: 16 }}>
            <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>AI 自動生成動作流程</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="描述你的目標，例：7天內讓新用戶完成首次購買"
                onKeyDown={e => e.key === 'Enter' && handleAISuggest()}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, background: '#12151f', border: '1px solid #2a2d3e', color: '#f9fafb', fontSize: 13, outline: 'none' }} />
              <button onClick={handleAISuggest} disabled={aiLoading || !prompt.trim()} style={{
                padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: aiLoading ? '#2a2d3e' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                color: aiLoading ? '#6b7280' : '#fff',
              }}>
                {aiLoading ? '...' : '✨ 生成'}
              </button>
            </div>
            {aiActions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <DAGFlow trigger_type={trigger} actions={aiActions} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #2a2d3e', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>取消</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} style={{
              padding: '9px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: saving || !name.trim() ? '#2a2d3e' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
              color: saving || !name.trim() ? '#6b7280' : '#fff',
            }}>
              {saving ? '建立中...' : '建立 Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/workflows').then(r => r.json()),
      fetch('/api/workflows/stats').then(r => r.json()),
    ]).then(([wf, st]) => {
      setWorkflows(Array.isArray(wf) ? wf : []);
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRun = async (workflow) => {
    if (workflow.status === 'paused') { setToast({ message: 'Cannot run a paused workflow', type: 'error' }); return; }
    setRunning(workflow.id);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, run_count: data.runCount } : w));
      setStats(prev => prev ? { ...prev, todayRuns: (prev.todayRuns || 0) + 1 } : prev);
      setToast({ message: `"${workflow.name}" 執行成功`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setRunning(null);
    }
  };

  const filtered = activeCategory === 'all' ? workflows : workflows.filter(w => w.category === activeCategory);
  const totalRuns = workflows.reduce((s, w) => s + (w.run_count || 0), 0);
  const activeCount = workflows.filter(w => w.status === 'active').length;

  const CATEGORIES = ['all', 'acquisition', 'activation', 'retention', 'revenue', 'referral', 'order', 'comms'];

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Workflows</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {activeCount} active · {totalRuns.toLocaleString()} total runs {stats?.todayRuns ? `· 今日 +${stats.todayRuns}` : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          + 建立 Workflow
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Workflows', value: workflows.length, icon: '⚡', color: '#3b82f6' },
          { label: 'Active', value: activeCount, icon: '✅', color: '#10b981' },
          { label: 'Total Runs', value: totalRuns.toLocaleString(), icon: '🔄', color: '#8b5cf6' },
          { label: '今日執行', value: stats?.todayRuns ?? '—', icon: '📅', color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const cfg = cat === 'all' ? { label: '全部', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', icon: '🗂️' } : CATEGORY_CONFIG[cat];
          const isActive = activeCategory === cat;
          const count = cat === 'all' ? workflows.length : workflows.filter(w => w.category === cat).length;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 400,
              background: isActive ? cfg.bg : 'transparent',
              border: `1px solid ${isActive ? cfg.color : '#2a2d3e'}`,
              color: isActive ? cfg.color : '#6b7280',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Workflow list */}
      <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 1fr 80px 80px 100px', gap: 12, padding: '10px 20px', borderBottom: '1px solid #2a2d3e', fontSize: 11, color: '#6b7280', letterSpacing: '0.05em' }}>
          <span>WORKFLOW</span><span>類別</span><span>TRIGGER</span><span>STATUS</span><span>RUNS</span><span style={{ textAlign: 'right' }}>ACTION</span>
        </div>

        {loading ? (
          <div style={{ padding: 28, color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" /> Loading workflows...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <div>此類別尚無 Workflow。</div>
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer', fontSize: 13 }}>
              建立第一個 Workflow
            </button>
          </div>
        ) : (
          filtered.map((workflow, i) => {
            const statusCfg = STATUS_CONFIG[workflow.status] || STATUS_CONFIG.draft;
            const catCfg = CATEGORY_CONFIG[workflow.category] || CATEGORY_CONFIG.general;
            const isExpanded = expandedId === workflow.id;
            return (
              <div key={workflow.id}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '2fr 100px 1fr 80px 80px 100px', gap: 12, padding: '13px 20px', borderBottom: i < filtered.length - 1 || isExpanded ? '1px solid #1e2035' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0f1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{workflow.name}</div>
                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{(workflow.actions || []).length} 步驟</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: catCfg.bg, border: `1px solid ${catCfg.border}`, color: catCfg.color, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {catCfg.icon} {catCfg.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13 }}>{TRIGGER_ICONS[workflow.trigger_type] || '⚡'}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{workflow.trigger_type.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color, fontWeight: 500 }}>
                    {statusCfg.label}
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>{(workflow.run_count || 0).toLocaleString()}</div>
                  <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleRun(workflow)} disabled={running === workflow.id || workflow.status === 'paused'} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                      cursor: running === workflow.id || workflow.status === 'paused' ? 'not-allowed' : 'pointer',
                      background: running === workflow.id || workflow.status === 'paused' ? '#2a2d3e' : 'rgba(59,130,246,0.15)',
                      border: `1px solid ${running === workflow.id || workflow.status === 'paused' ? '#2a2d3e' : 'rgba(59,130,246,0.4)'}`,
                      color: running === workflow.id || workflow.status === 'paused' ? '#6b7280' : '#60a5fa',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {running === workflow.id ? <><div className="spinner" style={{ width: 10, height: 10 }} /> ...</> : '▶ Run'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '14px 20px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #1e2035' : 'none', background: '#0f1117' }}>
                    {workflow.description && (
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12, padding: '8px 12px', background: '#1a1d2e', borderRadius: 8, borderLeft: `3px solid ${catCfg.color}` }}>
                        {workflow.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Flow Diagram</div>
                    <DAGFlow trigger_type={workflow.trigger_type} actions={workflow.actions || []} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={w => setWorkflows(prev => [{ ...w, actions: w.actions || JSON.parse(w.actions_json || '[]') }, ...prev])} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
