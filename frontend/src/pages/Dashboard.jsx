import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard.jsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const PLATFORM_META = {
  line:      { label: 'LINE',      bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  whatsapp:  { label: 'WhatsApp',  bg: '#d1fae5', text: '#065f46', dot: '#059669' },
  telegram:  { label: 'Telegram',  bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  email:     { label: 'Email',     bg: '#ffedd5', text: '#c2410c', dot: '#ea580c' },
  instagram: { label: 'IG',        bg: '#fce7f3', text: '#9d174d', dot: '#db2777' },
  wechat:    { label: 'WeChat',    bg: '#d1fae5', text: '#065f46', dot: '#059669' },
};

const LEVEL_COLORS = {
  visitor:  { bg: '#6b7280', text: '#f9fafb' },
  member:   { bg: '#92400e', text: '#fef3c7' },
  silver:   { bg: '#94a3b8', text: '#fff'    },
  gold:     { bg: '#d97706', text: '#fffbeb' },
  platinum: { bg: '#0891b2', text: '#ecfeff' },
  diamond:  { bg: '#6366f1', text: '#eef2ff' },
  vip:      { bg: '#7c3aed', text: '#f5f3ff' },
  partner:  { bg: '#be185d', text: '#fdf2f8' },
};

const AARRR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const INSIGHTS = [
  { icon: '🔥', color: '#f59e0b', title: 'High Churn Risk Detected', body: '3 contacts show >60% churn probability. Trigger re-engagement workflow immediately.' },
  { icon: '📈', color: '#10b981', title: 'Content Velocity Up 34%', body: 'AI-generated content is outperforming manual posts by 2.3x on engagement rate this week.' },
  { icon: '🎯', color: '#3b82f6', title: 'Activation Bottleneck', body: 'Only 42% of acquisitions activate. Onboarding email sequence needs A/B test on Day 1 touch.' },
];

const CARD = {
  background: '#1a1d2e',
  border: '1px solid #2a2d3e',
  borderRadius: 12,
  padding: '18px 20px',
};

function fmt(n) { return Number(n || 0).toLocaleString(); }
function fmtTWD(n) { return `NT$${fmt(Math.round(n || 0))}`; }

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const aarrr = stats?.aarrr || { acquisition: 1000, activation: 420, retention: 280, revenue: 156, referral: 43 };
  const commHealth = stats?.commHealth || {};
  const orderSummary = stats?.orderSummary || {};
  const ac = stats?.autoCompany || {};

  const funnelData = [
    { name: 'Acquisition', value: aarrr.acquisition },
    { name: 'Activation',  value: aarrr.activation  },
    { name: 'Retention',   value: aarrr.retention   },
    { name: 'Revenue',     value: aarrr.revenue      },
    { name: 'Referral',    value: aarrr.referral     },
  ];

  const acColor = ac.status === 'running' ? '#10b981' : ac.status === 'stopped' ? '#6b7280' : '#f59e0b';

  const orderBars = [
    { label: 'Pending', value: orderSummary.pending || 0, color: '#f59e0b' },
    { label: 'Processing', value: orderSummary.processing || 0, color: '#3b82f6' },
    { label: 'Shipped', value: orderSummary.shipped || 0, color: '#8b5cf6' },
    { label: 'Delivered', value: orderSummary.delivered || 0, color: '#10b981' },
    { label: 'Paid', value: orderSummary.paid || 0, color: '#06b6d4' },
  ];
  const orderMax = Math.max(1, ...orderBars.map(b => b.value));

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Row 1 — KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
        <StatCard label="Monthly Revenue"    value={loading ? '—' : `$${fmt(stats?.revenue)}`}       sub="↑ 18% vs last month" color="#10b981" icon="💰" />
        <StatCard label="Monthly Active Users" value={loading ? '—' : fmt(stats?.mau)}               sub="↑ 9% vs last month"  color="#10b981" icon="👥" />
        <StatCard label="Pending Orders"     value={loading ? '—' : fmt(orderSummary.pending)}        sub={`${fmt(orderSummary.total)} total orders`} color="#f59e0b" icon="📦" />
        <StatCard label="AI Reply Rate"      value={loading ? '—' : `${commHealth.aiReplyRate || 0}%`} sub={`${fmt(commHealth.totalUnread)} unread msgs`} color="#3b82f6" icon="⚡" />
        <StatCard label="Active AI Agents"   value={loading ? '—' : `${stats?.activeAgents || 14}/14`} sub="All systems operational" color="#8b5cf6" icon="🤖" />
      </div>

      {/* Row 2 — Comm Health | Order Summary | AI Advisor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>

        {/* Comm Health */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb', margin: 0 }}>通訊中台健康度</h3>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Comm Health</span>
          </div>

          {/* Platform pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {(commHealth.platforms || []).map(p => {
              const meta = PLATFORM_META[p.platform] || { label: p.platform, bg: '#e5e7eb', text: '#374151', dot: '#6b7280' };
              return (
                <div key={p.platform} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: meta.bg, borderRadius: 20,
                  padding: '3px 10px', fontSize: 12, fontWeight: 500, color: meta.text,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0, display: 'inline-block' }} />
                  {meta.label}
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                    {p.unread}
                  </span>
                </div>
              );
            })}
            {(!commHealth.platforms || commHealth.platforms.length === 0) && (
              <span style={{ fontSize: 12, color: '#6b7280' }}>No unread messages</span>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'AI Reply %', value: `${commHealth.aiReplyRate || 0}%`, color: '#10b981' },
              { label: 'Open Convos', value: commHealth.openConvos || 0, color: '#3b82f6' },
              { label: 'Human Queue', value: commHealth.humanTakeovers || 0, color: commHealth.humanTakeovers > 5 ? '#ef4444' : '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ background: '#0f1117', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb', margin: 0 }}>訂單概覽</h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{fmtTWD(orderSummary.totalRevenue)}</span>
          </div>

          {/* Status bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orderBars.map(bar => (
              <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', width: 68, flexShrink: 0 }}>{bar.label}</span>
                <div style={{ flex: 1, height: 8, background: '#2a2d3e', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(bar.value / orderMax) * 100}%`,
                    height: '100%', background: bar.color, borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: bar.color, width: 20, textAlign: 'right' }}>{bar.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: '8px 12px', background: '#0f1117', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Today GMV</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{fmtTWD(orderSummary.todayGMV)}</span>
          </div>
        </div>

        {/* AI Strategic Advisor */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb', margin: 0 }}>AI 戰略顧問</h3>
            <span style={{ fontSize: 10, color: '#6b7280' }}>{new Date().toLocaleDateString('zh-TW')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {INSIGHTS.map((ins, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 8, background: '#0f1117',
                borderLeft: `3px solid ${ins.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{ins.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f9fafb' }}>{ins.title}</span>
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>{ins.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — AARRR Funnel + Auto Company */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 18 }}>

        {/* AARRR Funnel */}
        <div style={CARD}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: 0 }}>AARRR Funnel</h2>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>
              Acquisition → Activation → Retention → Revenue → Referral
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} width={82} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8, color: '#f9fafb', fontSize: 13 }}
                cursor={{ fill: 'rgba(59,130,246,0.05)' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11 }}>
                {funnelData.map((entry, i) => <Cell key={i} fill={AARRR_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Conversion rates */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Activation Rate', v: aarrr.activation / aarrr.acquisition },
              { label: 'Retention Rate', v: aarrr.retention / aarrr.activation },
              { label: 'Paid Conversion', v: aarrr.revenue / aarrr.retention },
              { label: 'Referral Rate', v: aarrr.referral / aarrr.revenue },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, minWidth: 80 }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.v > 0.5 ? '#10b981' : item.v > 0.2 ? '#f59e0b' : '#ef4444' }}>
                  {isNaN(item.v) ? '—' : `${(item.v * 100).toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auto Company Status */}
        <div style={CARD}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: 0 }}>Auto Company</h2>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>14-agent autonomous AI company</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: acColor, flexShrink: 0,
              boxShadow: ac.status === 'running' ? `0 0 8px ${acColor}` : 'none',
            }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f9fafb', textTransform: 'capitalize' }}>
              {ac.status || 'Unknown'}
            </span>
          </div>

          {[
            { label: 'Current Phase', value: ac.currentPhase || '—' },
            { label: 'Loop Count', value: ac.loopCount != null ? ac.loopCount : '—' },
            { label: 'Last Run', value: ac.lastRun || '—' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', padding: '9px 0',
              borderBottom: '1px solid #2a2d3e', gap: 10,
            }}>
              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: '#e5e7eb', textAlign: 'right', wordBreak: 'break-word', maxWidth: 170 }}>
                {item.value}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>AGENTS ONLINE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>14 / 14</div>
          </div>
        </div>
      </div>
    </div>
  );
}
