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
  const [prompt, setPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActions, setAiActions] = useState([]);
  const [saving, setSaving] = useState(false);

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

  const TRIGGERS = ['user_signup', 'ai_trigger', 'scheduled', 'webhook', 'manual'];

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
            <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>觸發器</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TRIGGERS.map(t => (
                <button key={t} onClick={() => setTrigger(t)} style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: trigger === t ? 600 : 400,
                  background: trigger === t ? 'rgba(59,130,246,0.2)' : '#12151f',
                  border: `1px solid ${trigger === t ? '#3b82f6' : '#2a2d3e'}`,
                  color: trigger === t ? '#60a5fa' : '#9ca3af',
                }}>
                  {TRIGGER_ICONS[t]} {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
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
