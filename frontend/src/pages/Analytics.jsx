import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, Legend, CartesianGrid, LabelList,
} from 'recharts';

const PLATFORM_COLORS = {
  // E-commerce
  amazon: '#ff9900', ebay: '#0064d2', walmart: '#0071ce', etsy: '#f1641e',
  target: '#cc0000', newegg: '#ff8000', wayfair: '#7b189f', bestbuy: '#003591',
  mercado_libre: '#ffe600',
  shopee: '#f96022', lazada: '#0f146d', tokopedia: '#42b549', qoo10: '#e31837',
  pinduoduo: '#e02020', tiktok_shop: '#010101', taobao: '#ff6600', tmall: '#ff0000',
  jd: '#c0000c', alibaba: '#ff6a00', temu: '#ff6900', aliexpress: '#e43226',
  shein: '#444444',
  flipkart: '#f7db15', meesho: '#9b5cf6',
  rakuten: '#bf0000', yahoo_japan: '#ff0033',
  coupang: '#ef6b00', naver: '#03c75a', gmarket: '#ffcc00', eleventh: '#e60012',
  otto: '#f25b00', otto_market: '#f25b00', allegro: '#ff6b00', bol: '#0b5ca8',
  zalando: '#f27806', cdiscount: '#0054a6', fnac: '#008f5d', carrefour: '#0067b2',
  ozon: '#005bff', wildberries: '#cb11ab',
  shopify: '#96bf48', momo: '#d61f3f', pchome: '#cc0000',
  // Messaging
  line: '#00c300', whatsapp: '#25d366', telegram: '#229ed9', email: '#ea4335',
};

const LEVEL_COLORS = {
  visitor:'#6b7280', member:'#92400e', silver:'#94a3b8', gold:'#d97706',
  platinum:'#0891b2', diamond:'#6366f1', vip:'#7c3aed', partner:'#be185d',
};

const AARRR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'];

const TREND_COLORS = { up: '#10b981', down: '#ef4444', neutral: '#6b7280' };

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#f9fafb' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function fmt(n) { return Number(n || 0).toLocaleString(); }
function fmtTWD(n) { return `NT$${fmt(Math.round(n || 0))}`; }
function pct(n) { return `${((n || 0) * 100).toFixed(1)}%`; }

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8, color: '#f9fafb', fontSize: 12 },
  cursor: { fill: 'rgba(59,130,246,0.05)' },
};

const CATEGORY_CONFIG = {
  acquisition: { label: '獲客',  color: '#3b82f6', icon: '🎯' },
  activation:  { label: '激活',  color: '#8b5cf6', icon: '⚡' },
  retention:   { label: '留存',  color: '#10b981', icon: '💎' },
  revenue:     { label: '收入',  color: '#f59e0b', icon: '💰' },
  referral:    { label: '裂變',  color: '#ef4444', icon: '🔗' },
  order:       { label: '訂單',  color: '#06b6d4', icon: '📦' },
  comms:       { label: '通訊',  color: '#ec4899', icon: '💬' },
  general:     { label: '一般',  color: '#6b7280', icon: '⚙️' },
};

const AARRR_STAGE_COLORS = {
  Acquisition: '#3b82f6', Activation: '#8b5cf6', Retention: '#10b981',
  Revenue: '#f59e0b', Referral: '#ef4444',
};

export default function Analytics() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [members, setMembers] = useState(null);
  const [comms, setComms] = useState(null);
  const [aarrr, setAarrr] = useState(null);
  const [wfAnalytics, setWfAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/overview').then(r => r.json()),
      fetch('/api/analytics/revenue').then(r => r.json()),
      fetch('/api/analytics/members').then(r => r.json()),
      fetch('/api/analytics/comms').then(r => r.json()),
      fetch('/api/analytics/aarrr').then(r => r.json()),
      fetch('/api/analytics/workflows').then(r => r.json()),
    ]).then(([ov, rv, mb, cm, aa, wf]) => {
      setOverview(ov); setRevenue(rv); setMembers(mb); setComms(cm); setAarrr(aa); setWfAnalytics(wf);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const CARD = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '18px 20px' };

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Analytics & BI</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>跨模組數據洞察 · AI 智能分析</p>
      </div>

      {/* Overview KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="總營收" value={loading ? '—' : fmtTWD(overview?.revenue?.total)} sub={`${fmt(overview?.revenue?.totalOrders)} 筆訂單`} color="#10b981" icon="💰" />
        <StatCard label="平均客單價" value={loading ? '—' : fmtTWD(overview?.revenue?.avgOrderValue)} sub="All platforms" color="#f9fafb" icon="🛒" />
        <StatCard label="聯絡人" value={loading ? '—' : fmt(overview?.contacts?.total)} sub={`${fmt(overview?.contacts?.highChurnCount)} 高流失風險`} color="#3b82f6" icon="👥" />
        <StatCard label="會員數" value={loading ? '—' : fmt(overview?.members?.total)} sub={fmtTWD(members?.totalSpend)} color="#8b5cf6" icon="🎖️" />
        <StatCard label="AI 自動化率" value={loading ? '—' : pct(overview?.comms?.aiRate)} sub={`${fmt(overview?.comms?.totalMessages)} 則訊息`} color="#10b981" icon="⚡" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, overflow: 'hidden', width: 'fit-content', marginBottom: 20 }}>
        {[
          { key: 'overview',   label: 'AARRR 漏斗' },
          { key: 'revenue',    label: '營收分析'   },
          { key: 'members',    label: '會員分析'   },
          { key: 'comms',      label: '通訊分析'   },
          { key: 'workflows',  label: 'Workflow BI' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 22px', border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === t.key ? 600 : 400,
            background: tab === t.key ? 'linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.12))' : 'transparent',
            color: tab === t.key ? '#f9fafb' : '#9ca3af',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === AARRR TAB === */}
      {tab === 'overview' && aarrr && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* Funnel chart */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 16px' }}>AARRR 增長漏斗</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aarrr.funnel} layout="vertical" margin={{ left: 20, right: 50, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#9ca3af', fontSize: 13 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 12 }}>
                  {aarrr.funnel.map((_, i) => <Cell key={i} fill={AARRR_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion insights */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 16px' }}>轉化率分析</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aarrr.insights.map((ins, i) => (
                <div key={i} style={{ background: '#0f1117', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{ins.stage}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: ins.trend === 'up' ? '#10b981' : ins.trend === 'down' ? '#ef4444' : '#6b7280' }}>
                      {ins.rate}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#2a2d3e', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: `${Math.min(100, Number(ins.rate))}%`, height: '100%', background: ins.trend === 'up' ? '#10b981' : ins.trend === 'down' ? '#ef4444' : '#6b7280', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: TREND_COLORS[ins.trend] }}>{ins.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === REVENUE TAB === */}
      {tab === 'revenue' && revenue && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Daily GMV trend */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 16px' }}>30 天 GMV 趨勢</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenue.dailyTrend} margin={{ left: 0, right: 20, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`NT$${fmt(v)}`, 'GMV']} labelFormatter={l => l} />
                <Line type="monotone" dataKey="gmv" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Revenue by platform */}
            <div style={CARD}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>平台營收</h2>
              {revenue.byPlatform.map((p, i) => (
                <div key={p.platform} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#e5e7eb', textTransform: 'capitalize' }}>{p.platform}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{p.orders} 筆</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmtTWD(p.revenue)}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#2a2d3e', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(p.revenue / revenue.byPlatform[0].revenue) * 100}%`, height: '100%',
                      background: PLATFORM_COLORS[p.platform] || '#3b82f6', borderRadius: 3,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Order status distribution */}
            <div style={CARD}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>訂單狀態分佈</h2>
              {revenue.byStatus.map(s => (
                <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0f1117', borderRadius: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }}>{s.status}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{s.count} 筆</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f9fafb' }}>{fmtTWD(s.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top orders */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>高價值訂單 Top 5</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {revenue.topOrders.map((o, i) => (
                <div key={o.platform_order_id} style={{ background: '#0f1117', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{o.platform_order_id}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmtTWD(o.total_amount)}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{o.contact_name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' }}>{o.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === MEMBERS TAB === */}
      {tab === 'members' && members && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Level distribution */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>會員等級分佈</h2>
            {members.byLevel.map(l => (
              <div key={l.level} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#e5e7eb', textTransform: 'capitalize' }}>{l.level}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{l.count} 人</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmtTWD(l.total_spend)}</span>
                  </div>
                </div>
                <div style={{ height: 8, background: '#2a2d3e', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(l.total_spend / members.byLevel[0].total_spend) * 100}%`, height: '100%',
                    background: LEVEL_COLORS[l.level] || '#6b7280', borderRadius: 4,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top members LTV */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>會員 LTV Top 10</h2>
            {members.topMembers.map((m, i) => (
              <div key={m.contact_name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < members.topMembers.length - 1 ? '1px solid #1e2035' : 'none' }}>
                <span style={{ fontSize: 12, color: '#6b7280', width: 18, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f9fafb' }}>{m.contact_name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>{m.level} · {fmt(m.points)} pts</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmtTWD(m.total_spend)}</span>
              </div>
            ))}
          </div>

          {/* Lifecycle distribution */}
          <div style={{ ...CARD, gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>用戶生命週期分佈</h2>
            <div style={{ display: 'flex', gap: 14 }}>
              {members.lifecycle.map(l => {
                const colors = { new: '#3b82f6', active: '#10b981', at_risk: '#f59e0b', lost: '#ef4444' };
                return (
                  <div key={l.lifecycle_stage} style={{ flex: 1, background: '#0f1117', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colors[l.lifecycle_stage] || '#9ca3af' }}>{l.count}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' }}>{l.lifecycle_stage?.replace('_', ' ')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === WORKFLOW BI TAB === */}
      {tab === 'workflows' && wfAnalytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Workflow 總數', value: wfAnalytics.summary.totalWorkflows, icon: '⚡', color: '#3b82f6' },
              { label: '活躍中', value: wfAnalytics.summary.activeWorkflows, icon: '✅', color: '#10b981' },
              { label: '累計執行', value: fmt(wfAnalytics.summary.totalRuns), icon: '🔄', color: '#8b5cf6' },
              { label: '日均執行', value: fmt(wfAnalytics.summary.avgDailyRuns), icon: '📊', color: '#f59e0b' },
            ].map(s => (
              <StatCard key={s.label} label={s.label} value={loading ? '—' : s.value} icon={s.icon} color={s.color} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 7-day trend */}
              <div style={CARD}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>7 天執行趨勢</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={wfAnalytics.trend7d} margin={{ left: 0, right: 20, top: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmt(v), 'Runs']} />
                    <Line type="monotone" dataKey="runs" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Category breakdown bar chart */}
              <div style={CARD}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>各類別執行數</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={wfAnalytics.byCategory.map(c => ({
                      ...c,
                      label: CATEGORY_CONFIG[c.category]?.label || c.category,
                      fill: CATEGORY_CONFIG[c.category]?.color || '#6b7280',
                    }))}
                    margin={{ left: 0, right: 40, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                    <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [fmt(v), '執行次數']} />
                    <Bar dataKey="total_runs" radius={[4, 4, 0, 0]}>
                      {wfAnalytics.byCategory.map((c, i) => (
                        <Cell key={i} fill={CATEGORY_CONFIG[c.category]?.color || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Top workflows */}
              <div style={CARD}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>Top Workflows</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {wfAnalytics.topWorkflows.map((wf, i) => {
                    const cfg = CATEGORY_CONFIG[wf.category] || CATEGORY_CONFIG.general;
                    const maxRuns = wfAnalytics.topWorkflows[0]?.run_count || 1;
                    return (
                      <div key={wf.id} style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 11, color: '#4b5563', width: 16, flexShrink: 0 }}>#{i+1}</span>
                            <span style={{ fontSize: 10, color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb', flexShrink: 0, marginLeft: 8 }}>{fmt(wf.run_count)}</span>
                        </div>
                        <div style={{ height: 3, background: '#2a2d3e', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(wf.run_count / maxRuns) * 100}%`, height: '100%', background: cfg.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AARRR attribution */}
              <div style={CARD}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>AARRR 歸因分佈</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {wfAnalytics.aarrrAttribution.map((a, i) => {
                    const total = wfAnalytics.aarrrAttribution.reduce((s, x) => s + x.runs, 0) || 1;
                    const pctVal = Math.round((a.runs / total) * 100);
                    const color = AARRR_STAGE_COLORS[a.stage] || '#6b7280';
                    return (
                      <div key={a.stage} style={{ background: '#0f1117', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>{a.stage}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{pctVal}%</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color }}>{fmt(a.runs)}</span>
                          </div>
                        </div>
                        <div style={{ height: 4, background: '#2a2d3e', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pctVal}%`, height: '100%', background: color, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === COMMS TAB === */}
      {tab === 'comms' && comms && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* AI vs Human message split */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>AI vs 人工 回覆分佈</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {comms.messageTypes.map(mt => {
                const total = comms.messageTypes.reduce((s, x) => s + x.count, 0);
                const pctVal = total > 0 ? Math.round((mt.count / total) * 100) : 0;
                const colors = { ai: '#3b82f6', human: '#f59e0b', system: '#6b7280' };
                return (
                  <div key={mt.sent_by} style={{ flex: 1, background: '#0f1117', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors[mt.sent_by] || '#9ca3af' }}>{pctVal}%</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: '4px 0' }}>{fmt(mt.count)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{mt.sent_by}</div>
                  </div>
                );
              })}
            </div>

            {/* Conv status */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Open', value: comms.openConvos, color: '#3b82f6' },
                { label: 'Resolved', value: comms.resolvedConvos, color: '#10b981' },
                { label: 'Human Queue', value: comms.humanTakeovers, color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, background: '#0f1117', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform breakdown */}
          <div style={CARD}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>平台對話分佈</h2>
            {comms.byPlatform.map(p => (
              <div key={p.platform} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#e5e7eb', textTransform: 'capitalize' }}>{p.platform}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{p.conversations} 對話</span>
                    {p.unread > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>{p.unread} 未讀</span>}
                  </div>
                </div>
                <div style={{ height: 6, background: '#2a2d3e', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(p.conversations / comms.byPlatform[0].conversations) * 100}%`, height: '100%',
                    background: PLATFORM_COLORS[p.platform] || '#3b82f6', borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI node type performance */}
          <div style={{ ...CARD, gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>AI 自動回覆節點效能</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {comms.aiNodeTypes.map(nt => (
                <div key={nt.ai_node_type} style={{ background: '#0f1117', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'capitalize' }}>{nt.ai_node_type}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f9fafb', marginBottom: 4 }}>{fmt(nt.count)}</div>
                  <div style={{ fontSize: 12, color: nt.avg_quality >= 4.5 ? '#10b981' : nt.avg_quality >= 4 ? '#f59e0b' : '#ef4444' }}>
                    ★ {nt.avg_quality ? nt.avg_quality.toFixed(1) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
