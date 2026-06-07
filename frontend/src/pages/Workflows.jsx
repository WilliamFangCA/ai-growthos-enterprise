import React, { useState, useEffect } from 'react';

const TRIGGER_ICONS = {
  user_signup: '👤',
  ai_trigger: '🤖',
  scheduled: '🕐',
  webhook: '🔗',
  manual: '▶️',
};

const STATUS_CONFIG = {
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Paused' },
  draft: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Draft' },
};

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✓' : '✕'} {message}</div>;
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => {
        setWorkflows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRun = async (workflow) => {
    if (workflow.status === 'paused') {
      setToast({ message: 'Cannot run a paused workflow', type: 'error' });
      return;
    }
    setRunning(workflow.id);

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update run count locally
      setWorkflows(prev =>
        prev.map(w =>
          w.id === workflow.id ? { ...w, run_count: data.runCount } : w
        )
      );
      setToast({ message: `Workflow "${workflow.name}" executed successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setRunning(null);
    }
  };

  const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);
  const activeCount = workflows.filter(w => w.status === 'active').length;

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Workflows</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {activeCount} active workflows · {totalRuns.toLocaleString()} total runs
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Workflows', value: workflows.length, icon: '⚡', color: '#3b82f6' },
          { label: 'Active', value: activeCount, icon: '✅', color: '#10b981' },
          { label: 'Total Runs', value: totalRuns.toLocaleString(), icon: '🔄', color: '#8b5cf6' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#1a1d2e',
              border: '1px solid #2a2d3e',
              borderRadius: 10,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 22 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow list */}
      <div
        style={{
          background: '#1a1d2e',
          border: '1px solid #2a2d3e',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.2fr 100px 80px 100px',
            gap: 12,
            padding: '10px 20px',
            borderBottom: '1px solid #2a2d3e',
            fontSize: 11,
            color: '#6b7280',
            letterSpacing: '0.05em',
          }}
        >
          <span>WORKFLOW</span>
          <span>TRIGGER</span>
          <span>STATUS</span>
          <span>RUNS</span>
          <span style={{ textAlign: 'right' }}>ACTION</span>
        </div>

        {loading ? (
          <div style={{ padding: 28, color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" />
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: 28, color: '#6b7280', fontSize: 13 }}>No workflows found.</div>
        ) : (
          workflows.map((workflow, i) => {
            const statusCfg = STATUS_CONFIG[workflow.status] || STATUS_CONFIG.draft;
            const triggerIcon = TRIGGER_ICONS[workflow.trigger_type] || '⚡';
            const isExpanded = expandedId === workflow.id;

            return (
              <div key={workflow.id}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1.2fr 100px 80px 100px',
                    gap: 12,
                    padding: '16px 20px',
                    borderBottom: i < workflows.length - 1 || isExpanded ? '1px solid #1e2035' : 'none',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0f1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                >
                  {/* Name */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>
                      {workflow.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {(workflow.actions || []).length} action{(workflow.actions || []).length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{triggerIcon}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      {workflow.trigger_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Status */}
                  <span
                    style={{
                      fontSize: 11,
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: statusCfg.bg,
                      border: `1px solid ${statusCfg.color}40`,
                      color: statusCfg.color,
                      fontWeight: 500,
                    }}
                  >
                    {statusCfg.label}
                  </span>

                  {/* Run count */}
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                    {(workflow.run_count || 0).toLocaleString()}
                  </div>

                  {/* Run button */}
                  <div
                    style={{ textAlign: 'right' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleRun(workflow)}
                      disabled={running === workflow.id || workflow.status === 'paused'}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        background:
                          running === workflow.id || workflow.status === 'paused'
                            ? '#2a2d3e'
                            : 'rgba(59,130,246,0.15)',
                        border: `1px solid ${running === workflow.id || workflow.status === 'paused' ? '#2a2d3e' : 'rgba(59,130,246,0.4)'}`,
                        color:
                          running === workflow.id || workflow.status === 'paused'
                            ? '#6b7280'
                            : '#60a5fa',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor:
                          running === workflow.id || workflow.status === 'paused'
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {running === workflow.id ? (
                        <>
                          <div className="spinner" style={{ width: 12, height: 12, borderColor: '#4b5563', borderTopColor: '#9ca3af' }} />
                          Running
                        </>
                      ) : (
                        '▶ Run'
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded: action steps */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '12px 20px 16px 52px',
                      borderBottom: i < workflows.length - 1 ? '1px solid #1e2035' : 'none',
                      background: '#0f1117',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>
                      ACTION STEPS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(workflow.actions || []).map((action, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: 'rgba(59,130,246,0.15)',
                              border: '1px solid rgba(59,130,246,0.3)',
                              color: '#60a5fa',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            <span style={{ color: '#e5e7eb', fontWeight: 500 }}>
                              {action.type.replace(/_/g, ' ')}
                            </span>
                            {action.template && ` — template: ${action.template}`}
                            {action.channel && ` — ${action.channel}`}
                            {action.tag && ` — tag: ${action.tag}`}
                            {action.delay != null && ` — delay: ${action.delay}d`}
                            {action.condition && ` — ${action.condition}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
