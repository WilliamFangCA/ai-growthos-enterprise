import React, { useState, useEffect } from 'react';

const TRIGGER_ICONS = {
  user_signup: '👤', ai_trigger: '🤖', scheduled: '🕐', webhook: '🔗', manual: '▶️',
};

const ACTION_COLORS = {
  send_email:       { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  icon: '📧', color: '#60a5fa' },
  notify_slack:     { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  icon: '💬', color: '#34d399' },
  tag_contact:      { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  icon: '🏷️', color: '#fbbf24' },
  create_task:      { bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)',  icon: '✅', color: '#a78bfa' },
  segment_filter:   { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   icon: '🎯', color: '#f87171' },
  track_conversion: { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)',   icon: '📊', color: '#22d3ee' },
};
const ACTION_DEFAULT = { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.35)', icon: '⚡', color: '#9ca3af' };

const STATUS_CONFIG = {
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Paused' },
  draft:  { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Draft' },
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✓' : '✕'} {message}</div>;
}

// Visual DAG node row
function DAGFlow({ trigger_type, actions = [] }) {
  const triggerIcon = TRIGGER_ICONS[trigger_type] || '⚡';
  const nodes = [
    { type: 'trigger', icon: triggerIcon, label: trigger_type.replace(/_/g, ' '), color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' },
    ...actions.map(a => {
      const cfg = ACTION_COLORS[a.type] || ACTION_DEFAULT;
      const detail = a.template || a.channel || a.tag || a.condition || a.assignee || (a.window ? `${a.window}d` : '') || '';
      return { type: 'action', icon: cfg.icon, label: a.type.replace(/_/g, ' '), sub: detail, color: cfg.color, bg: cfg.bg, border: cfg.border };
    }),
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'thin' }}>
      {nodes.map((node, i) => (
        <React.Fragment key={i}>
          <div style={{
            flexShrink: 0, borderRadius: 10, padding: '8px 12px', minWidth: 100, maxWidth: 130,
            background: node.bg, border: `1px solid ${node.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 18 }}>{node.icon}</span>
            <div style={{ fontSize: 10, fontWeight: 600, color: node.color, textAlign: 'center', lineHeight: 1.3 }}>
              {node.label}
            </div>
            {node.sub && (
              <div style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                {node.sub}
              </div>
            )}
          </div>
          {i < nodes.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#374151' }}>
              <div style={{ width: 16, height: 1, background: '#374151' }} />
              <span style={{ fontSize: 10, color: '#4b5563' }}>▶</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Create Workflow Modal with AI suggestion
function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
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
          task: `Design a marketing workflow for: "${prompt}"\nTrigger: ${trigger}\n\nReturn ONLY a JSON array of action objects with keys: type (one of: send_email, notify_slack, tag_contact, create_task, segment_filter, track_conversion), and optional: template, channel, tag, condition, assignee, window, delay.\nExample: [{"type":"send_email","template":"welcome","delay":0},{"type":"tag_contact","tag":"new_user"}]\nReturn ONLY the JSON array, no explanation.`,
          model: 'glm-5-turbo',
        }),
      });
      const data = await res.json();
      const match = data.result?.match(/\[[\s\S]*\]/);
      if (match) setAiActions(JSON.parse(match[0]));
    } catch (err) {
      setAiActions([{ type: 'send_email', template: 'welcome', delay: 0 }, { type: 'tag_contact', tag: 'new_lead' }]);
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
        body: JSON.stringify({ name, trigger_type: trigger, actions: aiActions }),
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

  const TRIGGERS = ['user_signup','ai_trigger','scheduled','webhook','manual'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16, padding: 28, width: '100%', maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>建立 Workflow</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Workflow 名稱</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例：新用戶 7 天激活流程"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#12151f', border: '1px solid #2a2d3e', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
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
                placeholder="描述你的目標，例：7天激活新用戶並追蹤轉化"
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
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch('/api/workflows').then(r => r.json()).then(data => { setWorkflows(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleRun = async (workflow) => {
    if (workflow.status === 'paused') { setToast({ message: 'Cannot run a paused workflow', type: 'error' }); return; }
    setRunning(workflow.id);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, run_count: data.runCount } : w));
      setToast({ message: `"${workflow.name}" executed successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setRunning(null);
    }
  };

  const totalRuns = workflows.reduce((s, w) => s + (w.run_count || 0), 0);
  const activeCount = workflows.filter(w => w.status === 'active').length;

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Workflows</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {activeCount} active · {totalRuns.toLocaleString()} total runs
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Workflows', value: workflows.length, icon: '⚡', color: '#3b82f6' },
          { label: 'Active', value: activeCount, icon: '✅', color: '#10b981' },
          { label: 'Total Runs', value: totalRuns.toLocaleString(), icon: '🔄', color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow list */}
      <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 70px 100px', gap: 12, padding: '10px 20px', borderBottom: '1px solid #2a2d3e', fontSize: 11, color: '#6b7280', letterSpacing: '0.05em' }}>
          <span>WORKFLOW</span><span>TRIGGER</span><span>STATUS</span><span>RUNS</span><span style={{ textAlign: 'right' }}>ACTION</span>
        </div>

        {loading ? (
          <div style={{ padding: 28, color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" /> Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: 40, color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <div>No workflows yet.</div>
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer', fontSize: 13 }}>建立第一個 Workflow</button>
          </div>
        ) : (
          workflows.map((workflow, i) => {
            const statusCfg = STATUS_CONFIG[workflow.status] || STATUS_CONFIG.draft;
            const isExpanded = expandedId === workflow.id;
            return (
              <div key={workflow.id}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 100px 70px 100px', gap: 12, padding: '14px 20px', borderBottom: i < workflows.length - 1 || isExpanded ? '1px solid #1e2035' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0f1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>{workflow.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{(workflow.actions || []).length} action steps</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{TRIGGER_ICONS[workflow.trigger_type] || '⚡'}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{workflow.trigger_type.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: statusCfg.bg, border: `1px solid ${statusCfg.color}40`, color: statusCfg.color, fontWeight: 500 }}>
                    {statusCfg.label}
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{(workflow.run_count || 0).toLocaleString()}</div>
                  <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleRun(workflow)} disabled={running === workflow.id || workflow.status === 'paused'} style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: running === workflow.id || workflow.status === 'paused' ? 'not-allowed' : 'pointer',
                      background: running === workflow.id || workflow.status === 'paused' ? '#2a2d3e' : 'rgba(59,130,246,0.15)',
                      border: `1px solid ${running === workflow.id || workflow.status === 'paused' ? '#2a2d3e' : 'rgba(59,130,246,0.4)'}`,
                      color: running === workflow.id || workflow.status === 'paused' ? '#6b7280' : '#60a5fa',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      {running === workflow.id ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Running</> : '▶ Run'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px 20px 20px', borderBottom: i < workflows.length - 1 ? '1px solid #1e2035' : 'none', background: '#0f1117' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Flow Diagram</div>
                    <DAGFlow trigger_type={workflow.trigger_type} actions={workflow.actions || []} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={w => setWorkflows(prev => [{ ...w, actions: JSON.parse(w.actions_json || '[]') }, ...prev])} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
