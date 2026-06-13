import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOutUser } from '../firebase.js';
import { useAuth } from '../main.jsx';
import { useUISettings } from '../contexts/UISettingsContext.jsx';
import ModelSettingsPanel from './ModelSettingsPanel.jsx';

const NAV_SECTIONS = [
  {
    labelKey: 'core',
    items: [
      { to: '/app/dashboard',  labelKey: 'dashboard',      icon: '📊' },
      { to: '/app/agents',     labelKey: 'aiAgents',       icon: '🤖' },
      { to: '/app/analytics',  labelKey: 'analytics',      icon: '📈' },
    ],
  },
  {
    labelKey: 'growth',
    items: [
      { to: '/app/content',    labelKey: 'contentFactory', icon: '✍️' },
      { to: '/app/toolbox',    labelKey: 'toolbox',        icon: '🧰' },
      { to: '/app/marketing',  labelKey: 'marketing',      icon: '🎯' },
      { to: '/app/comms',      labelKey: 'commHub',        icon: '💬', badgeKey: 'unread' },
      { to: '/app/voice',      labelKey: 'voiceHub',       icon: '📞' },
      { to: '/app/ai-rules',   labelKey: 'aiAutoReply',    icon: '⚡' },
    ],
  },
  {
    labelKey: 'sales',
    items: [
      { to: '/app/orders',     labelKey: 'orders',     icon: '📦', badgeKey: 'pendingOrders' },
      { to: '/app/crm',        labelKey: 'crm',        icon: '👥' },
      { to: '/app/membership', labelKey: 'membership', icon: '👑' },
      { to: '/app/workflows',  labelKey: 'workflows',  icon: '🔄' },
    ],
  },
  {
    labelKey: 'system',
    items: [
      { to: '/app/settings',   labelKey: 'settings',   icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth() || {};
  const { t } = useUISettings();
  const navigate = useNavigate();
  const [autoStatus, setAutoStatus] = useState({ status: 'unknown', currentPhase: '' });
  const [badges, setBadges] = useState({ unread: 0, pendingOrders: 0 });

  useEffect(() => {
    const refresh = () => {
      fetch('/api/dashboard/stats')
        .then(r => r.json())
        .then(data => {
          if (data.autoCompany) setAutoStatus(data.autoCompany);
          setBadges({
            unread: data.commHealth?.totalUnread || 0,
            pendingOrders: data.orderSummary?.pending || 0,
          });
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor =
    autoStatus.status === 'running'
      ? '#10b981'
      : autoStatus.status === 'stopped'
      ? '#6b7280'
      : '#f59e0b';

  const statusLabel =
    autoStatus.status === 'running'
      ? 'Running'
      : autoStatus.status === 'stopped'
      ? 'Stopped'
      : 'Unknown';

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: '#12151f',
        borderRight: '1px solid #2a2d3e',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #2a2d3e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            🚀
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb', lineHeight: 1.2 }}>
              AI GrowthOS
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.05em' }}>
              ENTERPRISE
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.labelKey}>
            <div style={{ fontSize: 10, color: '#6b7280', padding: '10px 8px 5px', letterSpacing: '0.08em' }}>
              {t(section.labelKey)}
            </div>
            {section.items.map(item => {
              const badgeCount = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    marginBottom: 2,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f9fafb' : '#9ca3af',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(139,92,246,0.08))'
                      : 'transparent',
                    borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                  {badgeCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
                      borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                    }}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Auto Company Status */}
      <div
        style={{
          padding: '16px 16px',
          borderTop: '1px solid #2a2d3e',
          background: '#0f1117',
        }}
      >
        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em' }}>
          AUTO COMPANY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusColor,
              flexShrink: 0,
              boxShadow: autoStatus.status === 'running' ? `0 0 6px ${statusColor}` : 'none',
            }}
          />
          <span style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>{statusLabel}</span>
        </div>
        {autoStatus.currentPhase && (
          <div
            style={{
              fontSize: 11,
              color: '#6b7280',
              marginTop: 4,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={autoStatus.currentPhase}
          >
            {autoStatus.currentPhase}
          </div>
        )}
      </div>

      {/* AI Model Settings Panel */}
      <ModelSettingsPanel />

      {/* User / Auth Section */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2d3e' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.photoURL && (
              <img src={user.photoURL} alt="avatar"
                style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || user.email}
              </div>
              <button
                onClick={() => signOutUser()}
                style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              color: '#e5e7eb', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6
            }}
          >
            🔐 登入帳號
          </button>
        )}
      </div>
    </aside>
  );
}
