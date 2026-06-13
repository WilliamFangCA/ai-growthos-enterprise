import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/apiClient.js';
import CampaignWizard from '../components/marketing/CampaignWizard.jsx';

const TYPE_META = {
  email_sequence:   { label: 'Email 序列',    icon: '📧', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  push_notification:{ label: 'Push 推播',     icon: '🔔', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  social_post:      { label: '社群貼文',       icon: '📱', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  sms:              { label: 'SMS 簡訊',       icon: '💬', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  line_message:     { label: 'LINE 訊息',      icon: '💚', color: '#06b06a', bg: 'rgba(6,176,106,0.12)' },
};

const AARRR_META = {
  acquisition: { label: '獲客', icon: '🎯', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  activation:  { label: '激活', icon: '🚀', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  retention:   { label: '留存', icon: '⭐', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  revenue:     { label: '收入', icon: '💰', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  referral:    { label: '裂變', icon: '🔗', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
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
  const [tplAarrr, setTplAarrr] = useState('all');
  const [tplType, setTplType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [wizardInitial, setWizardInitial] = useState({});
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/marketing/stats').then(r => r.json()),
      apiFetch(`/api/marketing/campaigns${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
      apiFetch('/api/marketing/templates').then(r => r.json()),
      apiFetch('/api/marketing/loyalty').then(r => r.json()),
    ]).then(([s, c, t, l]) => {
      setStats(s); setCampaigns(Array.isArray(c) ? c : []);
      setTemplates(Array.isArray(t) ? t : []); setLoyalty(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id, status) => {
    await apiFetch(`/api/marketing/campaigns/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
    if (selectedCampaign?.id === id) {
      setSelectedCampaign(p => ({ ...p, status }));
    }
  };

  const fetchCampaignDetail = async (id) => {
    const data = await apiFetch(`/api/marketing/campaigns/${id}`).then(r => r.json());
    setSelectedCampaign(data);
    setExecResult(null);
  };

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleExecute = async (id) => {
    setExecuting(true);
    setExecResult(null);
    try {
      const r = await apiFetch(`/api/marketing/campaigns/${id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await r.json();
      if (!r.ok) { showToastMsg(`⚠️ ${data.error || '執行失敗'}`); return; }
      setExecResult(data);
      showToastMsg(`✅ 已模擬發送 ${data.sent} 人（AI 個性化 ${data.aiGenerated} 則）`);
      fetchData();
      fetchCampaignDetailKeepResult(id, data);
    } catch {
      showToastMsg('⚠️ 網路錯誤');
    } finally {
      setExecuting(false);
    }
  };

  const fetchCampaignDetailKeepResult = async (id, result) => {
    const data = await apiFetch(`/api/marketing/campaigns/${id}`).then(r => r.json());
    setSelectedCampaign(data);
    setExecResult(result);
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
        <button onClick={() => { setWizardInitial({}); setShowCreate(true); }} style={{
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

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <TypeBadge type={selectedCampaign.type} />
                <StatusBadge status={selectedCampaign.status} />
              </div>

              {/* 觸發與受眾摘要 */}
              <div style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
                <div style={{ color: '#6b7280', fontSize: 10, marginBottom: 3 }}>觸發方式</div>
                <div style={{ color: '#e5e7eb' }}>
                  {(() => {
                    const tc = selectedCampaign.trigger_config_parsed || {};
                    if (selectedCampaign.trigger_type === 'scheduled') {
                      const rec = { once: '單次', daily: '每天', weekly: '每週', monthly: '每月' }[tc.recurrence] || '';
                      return `🕐 ${tc.date || ''} ${tc.time || ''} ${rec}執行${selectedCampaign.next_run_at ? ` · 下次：${new Date(selectedCampaign.next_run_at).toLocaleString('zh-TW')}` : ''}`;
                    }
                    if (selectedCampaign.trigger_type === 'event_based') {
                      const evLabels = { user_signup: '用戶註冊', first_purchase: '首次購買', cart_abandoned: '購物車放棄', inactive_n_days: `${tc.n || ''} 天未活躍`, birthday: '會員生日', points_threshold: `積分達 ${tc.n || ''}`, order_status_change: '訂單狀態變更', member_upgrade: '會員升級' };
                      return `⚡ ${evLabels[tc.event] || tc.event || '事件'} 時自動觸發`;
                    }
                    return '▶️ 手動觸發';
                  })()}
                </div>
              </div>

              {/* AI 自動執行狀態 + 關聯規則 */}
              {(selectedCampaign.ai_config_parsed?.auto_execute || selectedCampaign.linked_rule) && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
                  {selectedCampaign.ai_config_parsed?.auto_execute && (
                    <div style={{ color: '#34d399', marginBottom: selectedCampaign.linked_rule ? 6 : 0 }}>
                      🤖 AI 自動執行已開啟（{selectedCampaign.ai_config_parsed.model}）
                    </div>
                  )}
                  {selectedCampaign.linked_rule && (
                    <div style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⚡ 關聯 AI 回覆規則：<span style={{ color: '#e5e7eb' }}>{selectedCampaign.linked_rule.name}</span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: selectedCampaign.linked_rule.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: selectedCampaign.linked_rule.is_active ? '#34d399' : '#9ca3af' }}>
                        {selectedCampaign.linked_rule.is_active ? '啟用中' : '已停用'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 立即執行 */}
              <button onClick={() => handleExecute(selectedCampaign.id)} disabled={executing} style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, marginBottom: 12,
                background: executing ? '#2a2d3e' : 'linear-gradient(90deg,#10b981,#3b82f6)',
                color: executing ? '#6b7280' : '#fff', cursor: executing ? 'wait' : 'pointer',
              }}>
                {executing ? '⏳ AI 生成與模擬發送中…' : '⚡ 立即執行（模擬發送）'}
              </button>

              {/* 執行結果摘要 */}
              {execResult && (
                <div style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px', marginBottom: 12, borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 6 }}>
                    ✅ 執行完成 — 觸達 {execResult.sent} 人（AI 個性化 {execResult.aiGenerated}、模板 {execResult.templated}）
                  </div>
                  {execResult.sampleMessages?.map((m, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#9ca3af', padding: '5px 0', borderTop: i > 0 ? '1px solid #1e2035' : 'none' }}>
                      <span style={{ color: '#e5e7eb' }}>{m.contact}</span>
                      <span style={{ fontSize: 9, marginLeft: 5, padding: '1px 5px', borderRadius: 8, background: m.personalization === 'ai' ? 'rgba(139,92,246,0.15)' : 'rgba(107,114,128,0.15)', color: m.personalization === 'ai' ? '#a78bfa' : '#9ca3af' }}>
                        {m.personalization === 'ai' ? 'AI' : '模板'}
                      </span>
                      <div style={{ marginTop: 2, lineHeight: 1.5 }}>{m.message}</div>
                    </div>
                  ))}
                </div>
              )}

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

              {/* 執行日誌 */}
              {selectedCampaign.executions?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, letterSpacing: '0.05em' }}>執行日誌（最近 {selectedCampaign.executions.length} 筆）</div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {selectedCampaign.executions.map(ex => (
                      <div key={ex.id} style={{ background: '#0f1117', borderRadius: 6, padding: '7px 10px', marginBottom: 4, fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                          <span style={{ color: '#e5e7eb' }}>{ex.contact_name} · {ex.channel}</span>
                          <span style={{ fontSize: 10 }}>{new Date(ex.executed_at).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ex.message_content}>
                          {ex.personalization === 'ai' ? '🤖' : '📄'} {ex.message_content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
        <div>
          {/* Filter row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* AARRR stage filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 2 }}>漏斗</span>
              {[
                { key: 'all', label: '全部', icon: '◉' },
                ...Object.entries(AARRR_META).map(([k, m]) => ({ key: k, label: m.label, icon: m.icon })),
              ].map(({ key, label, icon }) => {
                const meta = AARRR_META[key];
                const active = tplAarrr === key;
                return (
                  <button key={key} onClick={() => setTplAarrr(key)} style={{
                    padding: '4px 12px', borderRadius: 20, border: `1px solid ${active && meta ? meta.color : '#2a2d3e'}`,
                    background: active && meta ? meta.bg : 'transparent',
                    color: active && meta ? meta.color : (active ? '#f9fafb' : '#9ca3af'),
                    fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
            {/* Type filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 2 }}>類型</span>
              {[
                { key: 'all', label: '全部' },
                ...Object.entries(TYPE_META).map(([k, m]) => ({ key: k, label: m.label })),
              ].map(({ key, label }) => {
                const meta = TYPE_META[key];
                const active = tplType === key;
                return (
                  <button key={key} onClick={() => setTplType(key)} style={{
                    padding: '4px 10px', borderRadius: 20, border: `1px solid ${active && meta ? meta.color : '#2a2d3e'}`,
                    background: active && meta ? meta.bg : (active ? 'rgba(249,250,251,0.08)' : 'transparent'),
                    color: active && meta ? meta.color : (active ? '#f9fafb' : '#9ca3af'),
                    fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  }}>
                    {meta?.icon && `${meta.icon} `}{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template count */}
          {(() => {
            const filtered = templates.filter(t =>
              (tplAarrr === 'all' || t.aarrr === tplAarrr) &&
              (tplType === 'all' || t.type === tplType)
            );
            return (
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                  顯示 {filtered.length} 個模板{tplAarrr !== 'all' || tplType !== 'all' ? `（已篩選，共 ${templates.length} 個）` : ''}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {filtered.map(tpl => {
                    const aarrrM = AARRR_META[tpl.aarrr] || {};
                    const typeM = TYPE_META[tpl.type] || TYPE_META.email_sequence;
                    return (
                      <div key={tpl.id} style={{ ...CARD, cursor: 'default', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = aarrrM.color || '#3b82f6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
                      >
                        {/* Header: icon + name + AARRR badge */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                          <span style={{
                            fontSize: 26, flexShrink: 0, width: 44, height: 44, borderRadius: 10,
                            background: aarrrM.bg || 'rgba(59,130,246,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{tpl.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb', marginBottom: 5, lineHeight: 1.3 }}>{tpl.name}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {aarrrM.label && (
                                <span style={{
                                  fontSize: 10, padding: '2px 7px', borderRadius: 20,
                                  background: aarrrM.bg, color: aarrrM.color, fontWeight: 700, letterSpacing: '0.03em',
                                }}>
                                  {aarrrM.icon} {aarrrM.label}
                                </span>
                              )}
                              <span style={{
                                fontSize: 10, padding: '2px 7px', borderRadius: 20,
                                background: typeM.bg, color: typeM.color, fontWeight: 600,
                              }}>
                                {typeM.icon} {typeM.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px', lineHeight: 1.6, flex: 1 }}>{tpl.description}</p>

                        {/* Preview message */}
                        {tpl.preview && (
                          <div style={{
                            background: '#0f1117', borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                            borderLeft: `3px solid ${aarrrM.color || '#3b82f6'}`,
                            fontSize: 11, color: '#d1d5db', lineHeight: 1.5, fontStyle: 'italic',
                          }}>
                            {tpl.preview}
                          </div>
                        )}

                        {/* Tags */}
                        {tpl.tags?.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                            {tpl.tags.map(tag => (
                              <span key={tag} style={{
                                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid #2a2d3e',
                              }}>{tag}</span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e2035', paddingTop: 10, marginTop: 'auto' }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            {tpl.steps} 個步驟 · {TRIGGER_LABELS[tpl.trigger] || tpl.trigger}
                          </span>
                          <button onClick={() => {
                            setWizardInitial({
                              name: tpl.name,
                              type: TYPE_META[tpl.type] ? tpl.type : 'line_message',
                              trigger_type: tpl.trigger === 'scheduled' ? 'scheduled' : tpl.trigger === 'manual' ? 'manual' : 'event_based',
                              message_template: tpl.preview || undefined,
                            });
                            setTab('campaigns');
                            setShowCreate(true);
                          }} style={{
                            padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                            background: `linear-gradient(90deg, ${aarrrM.color || '#3b82f6'}, ${typeM.color || '#8b5cf6'})`,
                            color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}>
                            使用模板
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280', fontSize: 14 }}>
                    此篩選條件下沒有模板
                  </div>
                )}
              </div>
            );
          })()}
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

      {/* Create Campaign Wizard */}
      {showCreate && (
        <CampaignWizard
          initial={wizardInitial}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            fetchData();
            showToastMsg(created.linked_rule
              ? `✅ 活動「${created.name}」已建立，並同步建立 AI 回覆規則「${created.linked_rule.name}」`
              : `✅ 活動「${created.name}」已建立（預估受眾 ${created.target_count ?? 0} 人）`);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1100, maxWidth: 420,
          background: '#1a1d2e', border: '1px solid #3b82f6', borderRadius: 10,
          padding: '12px 16px', fontSize: 13, color: '#e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

