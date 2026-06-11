import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/apiClient.js';

const STAGE_CONFIG = {
  new:     { label: 'New',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  active:  { label: 'Active',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  lost:    { label: 'Lost',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

const LEVEL_CONFIG = {
  visitor:  { label: 'Visitor',  bg: '#6b7280', text: '#f9fafb', icon: '👤' },
  member:   { label: 'Member',   bg: '#92400e', text: '#fef3c7', icon: '🥉' },
  silver:   { label: 'Silver',   bg: '#94a3b8', text: '#fff',    icon: '🥈' },
  gold:     { label: 'Gold',     bg: '#d97706', text: '#fffbeb', icon: '🥇' },
  platinum: { label: 'Platinum', bg: '#0891b2', text: '#ecfeff', icon: '💎' },
  diamond:  { label: 'Diamond',  bg: '#6366f1', text: '#eef2ff', icon: '✨' },
  vip:      { label: 'VIP',      bg: '#7c3aed', text: '#f5f3ff', icon: '👑' },
  partner:  { label: 'Partner',  bg: '#be185d', text: '#fdf2f8', icon: '🤝' },
};

const LEVEL_ORDER = ['visitor','member','silver','gold','platinum','diamond','vip','partner'];
const LEVEL_POINTS = { visitor:0, member:100, silver:1000, gold:5000, platinum:10000, diamond:20000, vip:50000, partner:100000 };

function StageBadge({ stage }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.new;
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function LevelBadge({ level }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.member;
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 20,
      background: cfg.bg, color: cfg.text, fontWeight: 600, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ChurnBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 60 ? '#ef4444' : pct >= 30 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#2a2d3e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color, width: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === 'success' ? '✓' : '✕'} {message}</div>;
}

function LevelProgressBar({ level, points }) {
  const idx = LEVEL_ORDER.indexOf(level);
  const nextLevel = LEVEL_ORDER[idx + 1];
  const currentMin = LEVEL_POINTS[level] || 0;
  const nextMin = LEVEL_POINTS[nextLevel] || Infinity;
  const pct = nextMin === Infinity ? 100 : Math.min(100, Math.round(((points - currentMin) / (nextMin - currentMin)) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {nextLevel ? `${(nextMin - points).toLocaleString()} pts to ${LEVEL_CONFIG[nextLevel]?.label}` : 'Max level reached'}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{points.toLocaleString()} pts</span>
      </div>
      <div style={{ height: 6, background: '#2a2d3e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${LEVEL_CONFIG[level]?.bg || '#6b7280'}, ${LEVEL_CONFIG[nextLevel]?.bg || '#f9fafb'})`,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

export default function CRM() {
  const [tab, setTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [rfm, setRfm] = useState(null);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', lifecycle_stage: 'new' });
  const [selectedMember, setSelectedMember] = useState(null);

  const fetchContacts = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage) params.set('stage', stage);
    apiFetch(`/api/crm/contacts?${params.toString()}`)
      .then(r => r.json())
      .then(data => { setContacts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, stage]);

  const fetchMembers = useCallback(() => {
    setMembersLoading(true);
    apiFetch('/api/crm/members')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setMembers(arr);
        const m = {};
        arr.forEach(mb => { m[mb.contact_name] = mb; });
        setMemberMap(m);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    apiFetch('/api/crm/rfm').then(r => r.json()).then(setRfm).catch(() => {});
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleAddContact = async () => {
    if (!newContact.name.trim()) return;
    try {
      const res = await apiFetch('/api/crm/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) throw new Error('Failed to add contact');
      setShowAdd(false);
      setNewContact({ name: '', email: '', phone: '', lifecycle_stage: 'new' });
      setToast({ message: 'Contact added successfully', type: 'success' });
      fetchContacts();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const INP = {
    background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7,
    padding: '7px 12px', color: '#f9fafb', fontSize: 13, outline: 'none',
  };

  return (
    <div className="fade-in" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>CRM</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {contacts.length} contacts · {members.length} members · AI-powered churn prediction
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {tab === 'contacts' && (
            <button onClick={() => setShowAdd(true)} style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              + Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
        {[
          { key: 'contacts', label: '聯絡人', icon: '👥' },
          { key: 'members',  label: '會員管理', icon: '🎖️' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            background: tab === t.key ? 'linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.12))' : 'transparent',
            color: tab === t.key ? '#f9fafb' : '#9ca3af',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === CONTACTS TAB === */}
      {tab === 'contacts' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          {/* Left: contacts list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Filters */}
            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
                style={{ ...INP, flex: 1 }} />
              <select value={stage} onChange={e => setStage(e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
                <option value="">All stages</option>
                {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Table */}
            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 80px 70px 80px 110px',
                gap: 10, padding: '10px 16px', borderBottom: '1px solid #2a2d3e',
                fontSize: 11, color: '#6b7280', letterSpacing: '0.05em',
              }}>
                <span>NAME</span><span>EMAIL</span><span>STAGE</span><span>RFM</span><span>LEVEL</span><span>CHURN RISK</span>
              </div>

              {loading ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>Loading...</div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>No contacts found.</div>
              ) : (
                contacts.map((c, i) => {
                  const mb = memberMap[c.name];
                  return (
                    <div key={c.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 2fr 80px 70px 80px 110px',
                      gap: 10, padding: '11px 16px',
                      borderBottom: i < contacts.length - 1 ? '1px solid #1e2035' : 'none',
                      alignItems: 'center', transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0f1117')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#f9fafb' }}>{c.name}</div>
                        {c.tags && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.tags.split(',').slice(0, 2).join(', ')}</div>}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                      <StageBadge stage={c.lifecycle_stage} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{c.rfm_score}</div>
                      <div>{mb ? <LevelBadge level={mb.level} /> : <span style={{ fontSize: 10, color: '#4b5563' }}>—</span>}</div>
                      <ChurnBar value={c.ai_churn_prob} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: RFM + Lifecycle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '20px 20px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 16px' }}>RFM Analysis</h3>
              {rfm ? [
                { label: 'Champions', value: rfm.champions, color: '#10b981', icon: '👑' },
                { label: 'Loyal',     value: rfm.loyal,     color: '#3b82f6', icon: '💎' },
                { label: 'At Risk',   value: rfm.at_risk,   color: '#f59e0b', icon: '⚠️' },
                { label: 'Lost',      value: rfm.lost,      color: '#ef4444', icon: '💔' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: '#0f1117', border: '1px solid #2a2d3e',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{item.icon}</span>
                    <span style={{ fontSize: 13, color: '#e5e7eb' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
              )) : <div style={{ color: '#6b7280', fontSize: 13 }}>Loading...</div>}
            </div>

            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '20px 20px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 16px' }}>Lifecycle Breakdown</h3>
              {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                const count = contacts.filter(c => c.lifecycle_stage === key).length;
                const pct = contacts.length > 0 ? Math.round((count / contacts.length) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 4, background: '#2a2d3e', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === MEMBERS TAB === */}
      {tab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedMember ? '1fr 360px' : '1fr', gap: 16 }}>
          {/* Members list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Level distribution */}
            <div style={{
              background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12,
              padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap',
            }}>
              {LEVEL_ORDER.map(lvl => {
                const count = members.filter(m => m.level === lvl).length;
                if (!count) return null;
                const cfg = LEVEL_CONFIG[lvl];
                return (
                  <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: cfg.bg + '22', border: `1px solid ${cfg.bg}55` }}>
                    <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 12, color: cfg.bg, fontWeight: 600 }}>{cfg.label}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{count}</span>
                  </div>
                );
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Total: </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb', marginLeft: 4 }}>{members.length} members</span>
              </div>
            </div>

            {/* Members table */}
            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 90px 80px 1fr 100px',
                gap: 12, padding: '10px 16px', borderBottom: '1px solid #2a2d3e',
                fontSize: 11, color: '#6b7280', letterSpacing: '0.05em',
              }}>
                <span>NAME</span><span>LEVEL</span><span>POINTS</span><span>PROGRESS</span><span>TOTAL SPEND</span>
              </div>

              {membersLoading ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>Loading...</div>
              ) : members.length === 0 ? (
                <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>No members found.</div>
              ) : (
                members.map((mb, i) => {
                  const isSelected = selectedMember?.id === mb.id;
                  return (
                    <div key={mb.id}
                      onClick={() => setSelectedMember(isSelected ? null : mb)}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 90px 80px 1fr 100px',
                        gap: 12, padding: '12px 16px',
                        borderBottom: i < members.length - 1 ? '1px solid #1e2035' : 'none',
                        alignItems: 'center', cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0f1117'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#f9fafb' }}>{mb.contact_name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          Joined {mb.join_date ? new Date(mb.join_date).toLocaleDateString('zh-TW') : '—'}
                        </div>
                      </div>
                      <LevelBadge level={mb.level} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                        {Number(mb.points || 0).toLocaleString()}
                      </div>
                      <LevelProgressBar level={mb.level} points={mb.points || 0} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                        NT${Number(mb.total_spend || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Member detail panel */}
          {selectedMember && (
            <div style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '20px', height: 'fit-content', position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', margin: 0 }}>{selectedMember.contact_name}</h3>
                <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <LevelBadge level={selectedMember.level} />
              </div>

              <LevelProgressBar level={selectedMember.level} points={selectedMember.points || 0} />

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Total Points', value: `${Number(selectedMember.points || 0).toLocaleString()} pts`, color: '#3b82f6' },
                  { label: 'Total Spend',  value: `NT$${Number(selectedMember.total_spend || 0).toLocaleString()}`, color: '#10b981' },
                  { label: 'Member Since', value: selectedMember.join_date ? new Date(selectedMember.join_date).toLocaleDateString('zh-TW') : '—', color: '#f9fafb' },
                  { label: 'Last Upgrade', value: selectedMember.last_upgrade_date ? new Date(selectedMember.last_upgrade_date).toLocaleDateString('zh-TW') : '—', color: '#f9fafb' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                    background: '#0f1117', borderRadius: 8, border: '1px solid #2a2d3e',
                  }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Level progression track */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>LEVEL PROGRESSION</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {LEVEL_ORDER.map((lvl, i) => {
                    const cfg = LEVEL_CONFIG[lvl];
                    const currentIdx = LEVEL_ORDER.indexOf(selectedMember.level);
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={lvl} style={{
                        padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                        background: isCurrent ? cfg.bg : isPast ? cfg.bg + '55' : '#2a2d3e',
                        color: isCurrent ? cfg.text : isPast ? '#9ca3af' : '#4b5563',
                        border: isCurrent ? `2px solid ${cfg.bg}` : '2px solid transparent',
                      }}>
                        {cfg.icon} {cfg.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add contact modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="fade-in" style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16, padding: 28, width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Add Contact</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            {[
              { key: 'name',  label: 'Name *',  placeholder: 'Full name'           },
              { key: 'email', label: 'Email',    placeholder: 'email@example.com'   },
              { key: 'phone', label: 'Phone',    placeholder: '+1-555-0000'         },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>{field.label}</label>
                <input value={newContact[field.key]} onChange={e => setNewContact(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7, padding: '8px 12px', color: '#f9fafb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 5 }}>Lifecycle Stage</label>
              <select value={newContact.lifecycle_stage} onChange={e => setNewContact(p => ({ ...p, lifecycle_stage: e.target.value }))}
                style={{ width: '100%', background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7, padding: '8px 12px', color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <button onClick={handleAddContact} disabled={!newContact.name.trim()}
              style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: newContact.name.trim() ? 'pointer' : 'not-allowed',
                background: newContact.name.trim() ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : '#2a2d3e',
                color: newContact.name.trim() ? '#fff' : '#6b7280',
              }}>
              Add Contact
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

