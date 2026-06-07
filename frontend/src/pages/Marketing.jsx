import React, { useState, useEffect, useCallback } from 'react';

const TYPE_META = {
  email_sequence:   { label: 'Email 序列',    icon: '📧', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  push_notification:{ label: 'Push 推播',     icon: '🔔', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  social_post:      { label: '社群貼文',       icon: '📱', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  sms:              { label: 'SMS 簡訊',       icon: '💬', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const STATUS_META = {
  draft:     { label: '草稿',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  scheduled: { label: '排程中', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  active:    { label: '執行中', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  paused:    { label: '暫停',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  completed: { label: '完成',   color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

const TRIGGER_LABELS = {
  manual:       '手動觸發',
  event_based:  '事件觸發',
  scheduled:    '排程觸發',
};

function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.email_sequence;
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {m.icon} {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.color, fontWeight: 600 }}>
      {status === 'active' && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: m.color, marginRight: 4, verticalAlign: 'middle', animation: 'pulse 2s infinite' }} />}
      {m.label}
    </span>
  );
}

function pct(n) { return `${((n || 0) * 100).toFixed(0)}%`; }
function fmt(n) { return Number(n || 0).toLocaleString(); }
function fmtTWD(n) { return `NT$${fmt(Math.round(n || 0))}`; }

export default function Marketing() {
  const [tab, setTab] = useState('campaigns');
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: 'email_sequence', trigger_type: 'manual', audience_segment: 'all' });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/marketing/stats').then(r => r.json()),
      fetch(`/api/marketing/campaigns${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
      fetch('/api/marketing/templates').then(r => r.json()),
      fetch('/api/marketing/loyalty').then(r => r.json()),
    ]).then(([s, c, t, l]) => {
      setStats(s); setCampaigns(Array.isArray(c) ? c : []);
      setTemplates(Array.isArray(t) ? t : []); setLoyalty(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id, status) => {
    await fetch(`/api/marketing/campaigns/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(p => ({ ...p, status }));
    }
  };

  const handleCreate = async () => {
    if (!newCampaign.name.trim()) return;
    await fetch('/api/marketing/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCampaign),
    });
    setShowCreate(false);
    setNewCampaign({ name: '', type: 'email_sequence', trigger_type: 'manual', audience_segment: 'all' });
    fetchData();
  };

  const fetchCampaignDetail = async (id) => {
    const data = await fetch(`/api/marketing/campaigns/${id}`).then(r => r.json());
    setSelectedCampaign(data);
  };

  const CARD = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '18px 20px' };
  const INP = { background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7, padding: '7px 12px', color: '#f9fafb', fontSize: 13, outline: 'none' };

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>行銷自動化</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>AARRR 全旅程自動化 · 多渠道觸達</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          + 建立活動
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '總活動數', value: fmt(stats?.total), icon: '📋' },
          { label: '執行中', value: fmt(stats?.active), icon: '⚡', color: '#10b981' },
          { label: '草稿', value: fmt(stats?.draft), icon: '✏️', color: '#6b7280' },
          { label: '累計觸達', value: fmt(stats?.totalSent), icon: '📨' },
          { label: '平均開信率', value: pct(stats?.avgOpenRate), icon: '📬', color: '#3b82f6' },
          { label: '行銷營收', value: fmtTWD(stats?.totalRevenue), icon: '💰', color: '#10b981' },
        ].map(item => (
          <div key={item.label} style={{ ...CARD, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color || '#f9fafb' }}>{loading ? '—' : item.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, overflow: 'hidden', width: 'fit-content', marginBottom: 16 }}>
        {[
          { key: 'campaigns', label: '活動管理', icon: '📋' },
          { key: 'templates', label: '模板庫', icon: '📌' },
          { key: 'loyalty', label: '會員積分', icon: '🎁' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 20px', border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === t.key ? 600 : 400,
            background: tab === t.key ? 'linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.12))' : 'transparent',
            color: tab === t.key ? '#f9fafb' : '#9ca3af',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === CAMPAIGNS TAB === */}
      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCampaign ? '1fr 380px' : '1fr', gap: 16 }}>
          <div>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['', 'active', 'scheduled', 'paused', 'draft', 'completed'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: statusFilter === s ? '#3b82f6' : '#1a1d2e',
                  color: statusFilter === s ? '#fff' : '#9ca3af',
                  border: `1px solid ${statusFilter === s ? '#3b82f6' : '#2a2d3e'}`,
                }}>
                  {s === '' ? '全部' : STATUS_META[s]?.label}
                </button>
              ))}
            </div>

            {/* Campaign list */}
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '3fr 100px 90px 70px 70px 70px 110px',
                gap: 12, padding: '10px 16px', borderBottom: '1px solid #2a2d3e',
                fontSize: 11, color: '#6b7280', letterSpacing: '0.05em',
              }}>
                <span>活動名稱</span><span>類型</span><span>狀態</span>
                <span>觸達</span><span>開率</span><span>轉換</span><span>操作</span>
              </div>

              {loading ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>Loading...</div>
              ) : campaigns.length === 0 ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>沒有活動，點擊「建立活動」開始。</div>
              ) : campaigns.map((c, i) => (
                <div key={c.id}
                  onClick={() => fetchCampaignDetail(c.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '3fr 100px 90px 70px 70px 70px 110px',
                    gap: 12, padding: '12px 16px',
                    borderBottom: i < campaigns.length - 1 ? '1px solid #1e2035' : 'none',
                    alignItems: 'center', cursor: 'pointer',
                    background: selectedCampaign?.id === c.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                    borderLeft: selectedCampaign?.id === c.id ? '2px solid #3b82f6' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (selectedCampaign?.id !== c.id) e.currentTarget.style.background = '#0f1117'; }}
                  onMouseLeave={e => { if (selectedCampaign?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#f9fafb' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {TRIGGER_LABELS[c.trigger_type] || c.trigger_type} · {c.audience_segment}
                    </div>
                  </div>
                  <TypeBadge type={c.type} />
                  <StatusBadge status={c.status} />
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{fmt(c.sent_count)}</span>
                  <span style={{ fontSize: 13, color: c.open_rate > 0.5 ? '#10b981' : '#f59e0b' }}>{pct(c.open_rate)}</span>
                  <span style={{ fontSize: 13, color: c.conversion_rate > 0.2 ? '#10b981' : '#9ca3af' }}>{pct(c.conversion_rate)}</span>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    {c.status !== 'active' && c.status !== 'completed' && (
                      <button onClick={() => handleStatusChange(c.id, 'active')} style={{
                        padding: '3px 8px', borderRadius: 5, border: '1px solid #10b98140',
                        background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 11, cursor: 'pointer',
                      }}>啟動</button>
                    )}
                    {c.status === 'active' && (
                      <button onClick={() => handleStatusChange(c.id, 'paused')} style={{
                        padding: '3px 8px', borderRadius: 5, border: '1px solid #f59e0b40',
                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 11, cursor: 'pointer',
                      }}>暫停</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign detail panel */}
          {selectedCampaign && (
            <div style={{ ...CARD, height: 'fit-content', position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb', margin: 0, flex: 1, marginRight: 8 }}>{selectedCampaign.name}</h3>
                <button onClick={() => setSelectedCampaign(null)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <TypeBadge type={selectedCampaign.type} />
                <StatusBadge status={selectedCampaign.status} />
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: '目標受眾', value: selectedCampaign.audience_segment, color: '#f9fafb' },
                  { label: '累計觸達', value: fmt(selectedCampaign.sent_count), color: '#3b82f6' },
                  { label: '開信率', value: pct(selectedCampaign.open_rate), color: selectedCampaign.open_rate > 0.5 ? '#10b981' : '#f59e0b' },
                  { label: '轉換率', value: pct(selectedCampaign.conversion_rate), color: '#10b981' },
                  { label: '點擊率', value: pct(selectedCampaign.click_rate), color: '#8b5cf6' },
                  { label: '行銷營收', value: fmtTWD(selectedCampaign.revenue_generated), color: '#10b981' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#0f1117', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Email sequences */}
              {selectedCampaign.sequences?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, letterSpacing: '0.05em' }}>EMAIL 序列</div>
                  {selectedCampaign.sequences.map((seq, i) => (
                    <div key={seq.id} style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px', marginBottom: 6, borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f9fafb' }}>Step {seq.step_number}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>
                          {seq.delay_days === 0 ? '立即發送' : `+${seq.delay_days}天`}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{seq.subject}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                        <span style={{ color: '#6b7280' }}>寄送 {fmt(seq.sent_count)}</span>
                        <span style={{ color: '#10b981' }}>開信 {seq.sent_count > 0 ? Math.round((seq.open_count / seq.sent_count) * 100) : 0}%</span>
                        <span style={{ color: '#3b82f6' }}>點擊 {seq.open_count > 0 ? Math.round((seq.click_count / seq.open_count) * 100) : 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === TEMPLATES TAB === */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {templates.map(tpl => (
            <div key={tpl.id} style={{ ...CARD, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{tpl.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{tpl.name}</div>
                  <TypeBadge type={tpl.type} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px', lineHeight: 1.6 }}>{tpl.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{tpl.steps} 個步驟 · {TRIGGER_LABELS[tpl.trigger] || tpl.trigger}</span>
                <button onClick={() => {
                  setNewCampaign({ name: tpl.name, type: tpl.type, trigger_type: tpl.trigger === 'scheduled' ? 'scheduled' : 'event_based', audience_segment: 'all' });
                  setShowCreate(true);
                }} style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: '#fff', cursor: 'pointer',
                }}>
                  使用模板
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === LOYALTY TAB === */}
      {tab === 'loyalty' && loyalty && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: '會員總數', value: fmt(loyalty.stats?.totalMembers), icon: '👥', color: '#3b82f6' },
              { label: '累計發出積分', value: fmt(loyalty.stats?.totalEarned), icon: '⭐', color: '#f59e0b' },
              { label: '累計兌換積分', value: fmt(loyalty.stats?.totalRedeemed), icon: '🎁', color: '#10b981' },
              { label: '平均持有積分', value: fmt(loyalty.stats?.avgPoints), icon: '📊', color: '#8b5cf6' },
            ].map(item => (
              <div key={item.label} style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Transaction list */}
          <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3e' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: 0 }}>積分交易記錄</h3>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 500 }}>
              {loyalty.transactions?.map((tx, i) => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < loyalty.transactions.length - 1 ? '1px solid #1e2035' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: tx.type === 'earn' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {tx.type === 'earn' ? '⭐' : '🎁'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#f9fafb' }}>{tx.contact_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{tx.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'earn' ? '#10b981' : '#ef4444' }}>
                      {tx.type === 'earn' ? '+' : ''}{fmt(tx.points_delta)}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{fmt(tx.balance_after)} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="fade-in" style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>建立行銷活動</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>活動名稱 *</label>
              <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                placeholder="例：新用戶 7 天激活序列"
                style={{ ...INP, width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>類型</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <button key={key} onClick={() => setNewCampaign(p => ({ ...p, type: key }))} style={{
                    padding: '8px 12px', borderRadius: 8, border: `1px solid ${newCampaign.type === key ? meta.color : '#2a2d3e'}`,
                    background: newCampaign.type === key ? meta.bg : 'transparent',
                    color: newCampaign.type === key ? meta.color : '#9ca3af',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>觸發方式</label>
              <select value={newCampaign.trigger_type} onChange={e => setNewCampaign(p => ({ ...p, trigger_type: e.target.value }))}
                style={{ ...INP, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>目標受眾</label>
              <select value={newCampaign.audience_segment} onChange={e => setNewCampaign(p => ({ ...p, audience_segment: e.target.value }))}
                style={{ ...INP, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                {[['all','全部用戶'],['new_users','新用戶'],['at_risk','高流失風險'],['loyal','忠誠客戶'],['community','社群成員'],['event_attendees','活動參與者']].map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <button onClick={handleCreate} disabled={!newCampaign.name.trim()} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
              background: newCampaign.name.trim() ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : '#2a2d3e',
              color: newCampaign.name.trim() ? '#fff' : '#6b7280',
              cursor: newCampaign.name.trim() ? 'pointer' : 'not-allowed',
            }}>
              建立活動
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
