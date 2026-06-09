import React, { useState } from 'react';
import { useUISettings } from '../contexts/UISettingsContext.jsx';

const STORAGE_KEY = 'growthos_integrations';

const SECTIONS = [
  {
    id: 'ai', icon: '🤖',
    label: { en: 'AI API Keys', 'zh-TW': 'AI API 金鑰', 'zh-CN': 'AI API 密钥' },
    fields: [
      { key: 'openai_key',     label: 'OpenAI API Key',             type: 'password', placeholder: 'sk-...' },
      { key: 'anthropic_key',  label: 'Anthropic (Claude) API Key', type: 'password', placeholder: 'sk-ant-...' },
      { key: 'glm_key',        label: 'GLM / Z.ai API Key',         type: 'password', placeholder: '' },
      { key: 'minimax_key',    label: 'MiniMax API Key',             type: 'password', placeholder: 'sk-cp-...' },
      { key: 'openrouter_key', label: 'OpenRouter API Key',         type: 'password', placeholder: 'sk-or-...' },
      { key: 'gemini_key',     label: 'Gemini API Key',             type: 'password', placeholder: '' },
      { key: 'ollama_url',     label: 'Ollama Base URL',            type: 'text',     placeholder: 'http://localhost:11434' },
    ],
  },
  {
    id: 'messaging', icon: '💬',
    label: { en: 'Messaging', 'zh-TW': '通訊軟體', 'zh-CN': '通讯软件' },
    fields: [],
  },
  {
    id: 'ecommerce', icon: '🛍️',
    label: { en: 'E-Commerce', 'zh-TW': '電商平台', 'zh-CN': '电商平台' },
    fields: [
      { key: 'shopee_id',     label: 'Shopee Partner ID',       type: 'text',     placeholder: '' },
      { key: 'shopee_key',    label: 'Shopee Partner Key',      type: 'password', placeholder: '' },
      { key: 'lazada_key',    label: 'Lazada App Key',          type: 'text',     placeholder: '' },
      { key: 'lazada_secret', label: 'Lazada App Secret',       type: 'password', placeholder: '' },
      { key: 'shopify_url',   label: 'Shopify Store URL',       type: 'text',     placeholder: 'mystore.myshopify.com' },
      { key: 'shopify_token', label: 'Shopify Admin Token',     type: 'password', placeholder: 'shpat_...' },
      { key: 'amazon_key',    label: 'Amazon SP-API Key',       type: 'password', placeholder: '' },
      { key: 'amazon_secret', label: 'Amazon SP-API Secret',    type: 'password', placeholder: '' },
    ],
  },
  {
    id: 'logistics', icon: '📦',
    label: { en: 'Logistics', 'zh-TW': '物流', 'zh-CN': '物流' },
    fields: [
      { key: 'fedex_key',    label: 'FedEx API Key',         type: 'password', placeholder: '' },
      { key: 'fedex_secret', label: 'FedEx API Secret',      type: 'password', placeholder: '' },
      { key: 'dhl_key',      label: 'DHL API Key',           type: 'password', placeholder: '' },
      { key: 'sf_appkey',    label: '順豐速運 App Key',        type: 'text',     placeholder: '' },
      { key: 'sf_secret',    label: '順豐速運 Secret',         type: 'password', placeholder: '' },
      { key: 'blackcat_key', label: '黑貓宅急便 API Key',      type: 'password', placeholder: '' },
      { key: 'post_key',     label: '中華郵政 API Key',        type: 'password', placeholder: '' },
      { key: 'kerry_key',    label: 'Kerry Express API Key', type: 'password', placeholder: '' },
    ],
  },
  {
    id: 'ads', icon: '📢',
    label: { en: 'Ad Platforms', 'zh-TW': '廣告投放', 'zh-CN': '广告投放' },
    fields: [
      { key: 'fb_app_id',      label: 'Facebook App ID',             type: 'text',     placeholder: '' },
      { key: 'fb_token',       label: 'Facebook Access Token',       type: 'password', placeholder: '' },
      { key: 'google_dev_tok', label: 'Google Ads Developer Token',  type: 'password', placeholder: '' },
      { key: 'google_cli_id',  label: 'Google OAuth Client ID',      type: 'text',     placeholder: '' },
      { key: 'google_cli_sec', label: 'Google OAuth Client Secret',  type: 'password', placeholder: '' },
      { key: 'tiktok_token',   label: 'TikTok Access Token',         type: 'password', placeholder: '' },
      { key: 'line_ads_token', label: 'LINE Ads API Token',          type: 'password', placeholder: '' },
      { key: 'twitter_key',    label: 'X (Twitter) API Key',         type: 'password', placeholder: '' },
    ],
  },
  {
    id: 'interface', icon: '🎨',
    label: { en: 'Interface', 'zh-TW': '介面設定', 'zh-CN': '界面设置' },
    fields: [],
  },
];

// ─── Messaging Platform Config ───────────────────────────────────────────────

const MESSAGING_PLATFORMS = [
  {
    id: 'line', name: 'LINE', icon: '💚', color: '#06C755',
    auth_types: [
      {
        type: 'token_secret', label: 'Channel Token + Secret',
        fields: [
          { key: 'token',  label: 'Channel Access Token', type: 'password' },
          { key: 'secret', label: 'Channel Secret',       type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: 'LINE 帳號（手機 / Email）', type: 'text' },
          { key: 'password', label: '密碼',                      type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25D366',
    auth_types: [
      {
        type: 'token', label: 'Business API Token',
        fields: [
          { key: 'token', label: 'Business Token', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '手機號碼 / Email', type: 'text' },
          { key: 'password', label: '密碼',             type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088CC',
    auth_types: [
      {
        type: 'token', label: 'Bot Token',
        fields: [
          { key: 'token', label: 'Bot Token', type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2',
    auth_types: [
      {
        type: 'token', label: 'Bot Token',
        fields: [
          { key: 'token', label: 'Bot Token', type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'slack', name: 'Slack', icon: '🔷', color: '#4A154B',
    auth_types: [
      {
        type: 'token', label: 'Bot Token',
        fields: [
          { key: 'token', label: 'Bot Token (xoxb-)', type: 'password', placeholder: 'xoxb-...' },
        ],
      },
    ],
  },
  {
    id: 'wechat', name: 'WeChat', icon: '💚', color: '#07C160',
    auth_types: [
      {
        type: 'appid_secret', label: 'AppID + AppSecret',
        fields: [
          { key: 'appid',  label: 'AppID',     type: 'text' },
          { key: 'secret', label: 'AppSecret', type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'messenger', name: 'Messenger', icon: '💙', color: '#0084FF',
    auth_types: [
      {
        type: 'token', label: 'Page Access Token',
        fields: [
          { key: 'token', label: 'Page Access Token', type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C',
    auth_types: [
      {
        type: 'token', label: 'Access Token',
        fields: [
          { key: 'token', label: 'Access Token', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '用戶名', type: 'text' },
          { key: 'password', label: '密碼',   type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'email', name: 'Email', icon: '📧', color: '#6366F1',
    auth_types: [
      {
        type: 'credentials', label: 'SMTP 帳號密碼',
        fields: [
          { key: 'username',  label: 'Email 地址', type: 'text' },
          { key: 'password',  label: '密碼',        type: 'password' },
          { key: 'smtp_host', label: 'SMTP Host',   type: 'text',     placeholder: 'smtp.gmail.com' },
          { key: 'smtp_port', label: 'SMTP Port',   type: 'text',     placeholder: '587' },
        ],
      },
    ],
  },
];

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ account, colors, onChange, onDelete }) {
  const [visible, setVisible] = useState(new Set());

  const platform = MESSAGING_PLATFORMS.find(p => p.id === account.platform);
  const authDef = platform
    ? (platform.auth_types.find(a => a.type === account.auth_type) || platform.auth_types[0])
    : null;

  function update(field, value) {
    onChange({ ...account, [field]: value });
  }

  function handlePlatformSelect(platformId) {
    const newPlatform = MESSAGING_PLATFORMS.find(p => p.id === platformId);
    onChange({
      ...account,
      platform: platformId,
      auth_type: newPlatform?.auth_types[0]?.type || '',
    });
  }

  function toggleFieldVisible(key) {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* ── Card header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {/* Platform badge or selector */}
        {platform ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            flexShrink: 0,
            background: platform.color + '18',
            border: `1px solid ${platform.color}40`,
            borderRadius: 8, padding: '5px 10px',
          }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{platform.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: platform.color }}>{platform.name}</span>
          </div>
        ) : (
          <select
            value=""
            onChange={e => handlePlatformSelect(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 8, flexShrink: 0,
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              color: colors.textDim,
              fontSize: 12, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="" disabled>選擇平台...</option>
            {MESSAGING_PLATFORMS.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
        )}

        {/* Vertical divider */}
        <div style={{ width: 1, height: 20, background: colors.border, flexShrink: 0 }} />

        {/* Account name annotation */}
        <span style={{ fontSize: 11, color: colors.textDim, flexShrink: 0 }}>帳號名稱</span>
        <input
          type="text"
          value={account.account_name}
          onChange={e => update('account_name', e.target.value)}
          placeholder="例如：主要商店、個人帳號..."
          style={{
            flex: 1, minWidth: 0, padding: '5px 8px',
            borderRadius: 6, border: '1px solid transparent',
            background: 'transparent', color: colors.text,
            fontSize: 13, fontWeight: 500, outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onFocus={e => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.background = colors.inputBg;
          }}
          onBlur={e => {
            e.target.style.borderColor = 'transparent';
            e.target.style.background = 'transparent';
          }}
        />

        {/* Enabled toggle */}
        <button
          onClick={() => update('enabled', !account.enabled)}
          title={account.enabled ? '停用' : '啟用'}
          style={{
            width: 38, height: 20, borderRadius: 10, border: 'none',
            cursor: 'pointer', flexShrink: 0, position: 'relative',
            background: account.enabled ? '#10b981' : colors.border,
            transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute',
            top: 2, left: account.enabled ? 19 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
          }} />
        </button>

        {/* Delete button */}
        <button
          onClick={() => onDelete(account.id)}
          title="刪除"
          style={{
            background: 'none', border: `1px solid ${colors.border}`,
            borderRadius: 6, cursor: 'pointer', flexShrink: 0,
            color: colors.textDim, fontSize: 15, lineHeight: 1,
            padding: '3px 8px', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#ef4444';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.color = colors.textDim;
          }}
        >
          ×
        </button>
      </div>

      {/* ── Auth type radio pills (only when platform has multiple options) ── */}
      {platform && platform.auth_types.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.inputBg,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: colors.textDim,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4,
          }}>
            驗證方式
          </span>
          {platform.auth_types.map(at => (
            <label
              key={at.type}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${account.auth_type === at.type ? '#3b82f6' : colors.border}`,
                background: account.auth_type === at.type ? 'rgba(59,130,246,0.1)' : 'transparent',
                fontSize: 12,
                fontWeight: account.auth_type === at.type ? 600 : 400,
                color: account.auth_type === at.type ? '#3b82f6' : colors.textMuted,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name={`auth_${account.id}`}
                value={at.type}
                checked={account.auth_type === at.type}
                onChange={() => onChange({ ...account, auth_type: at.type })}
                style={{ accentColor: '#3b82f6', width: 11, height: 11 }}
              />
              {at.label}
            </label>
          ))}
        </div>
      )}

      {/* ── Credential fields ── */}
      {platform && authDef ? (
        <div style={{ padding: '4px 16px 16px' }}>
          {authDef.fields.map((field, idx) => (
            <div key={field.key} style={{
              paddingTop: 14,
              borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
            }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 600,
                color: colors.textDim, marginBottom: 5,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {field.label}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={field.type === 'password' && !visible.has(field.key) ? 'password' : 'text'}
                  value={account[field.key] || ''}
                  onChange={e => update(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: field.type === 'password' ? '8px 42px 8px 12px' : '8px 12px',
                    borderRadius: 8,
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.text,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    transition: 'border-color 0.15s',
                    opacity: account.enabled ? 1 : 0.5,
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={e => { e.target.style.borderColor = colors.inputBorder; }}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => toggleFieldVisible(field.key)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: colors.textDim, fontSize: 15, lineHeight: 1, padding: 2,
                    }}
                  >
                    {visible.has(field.key) ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !platform ? (
        <div style={{
          padding: '16px',
          fontSize: 12, color: colors.textDim, textAlign: 'center',
        }}>
          選擇平台後顯示憑證欄位
        </div>
      ) : null}
    </div>
  );
}

// ─── MessagingSection ─────────────────────────────────────────────────────────

function MessagingSection({ colors }) {
  const [accounts, setAccounts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = JSON.parse(raw || '{}');

      // One-time migration: convert old flat messaging keys to new array format
      if (!Array.isArray(data.messaging_accounts) && data.messaging && typeof data.messaging === 'object') {
        const legacy = data.messaging;
        const migrated = [];
        if (legacy.line_token || legacy.line_secret) {
          migrated.push({ id: 'line_migrated', platform: 'line', account_name: 'LINE (已遷移)', auth_type: 'token_secret', token: legacy.line_token || '', secret: legacy.line_secret || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.wa_token) {
          migrated.push({ id: 'whatsapp_migrated', platform: 'whatsapp', account_name: 'WhatsApp (已遷移)', auth_type: 'token', token: legacy.wa_token, enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.tg_token) {
          migrated.push({ id: 'telegram_migrated', platform: 'telegram', account_name: 'Telegram (已遷移)', auth_type: 'token', token: legacy.tg_token, enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.discord_token) {
          migrated.push({ id: 'discord_migrated', platform: 'discord', account_name: 'Discord (已遷移)', auth_type: 'token', token: legacy.discord_token, enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.slack_token) {
          migrated.push({ id: 'slack_migrated', platform: 'slack', account_name: 'Slack (已遷移)', auth_type: 'token', token: legacy.slack_token, enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.wechat_appid || legacy.wechat_secret) {
          migrated.push({ id: 'wechat_migrated', platform: 'wechat', account_name: 'WeChat (已遷移)', auth_type: 'appid_secret', appid: legacy.wechat_appid || '', secret: legacy.wechat_secret || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (migrated.length > 0) {
          data.messaging_accounts = migrated;
          delete data.messaging;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return migrated;
        }
      }

      return Array.isArray(data.messaging_accounts) ? data.messaging_accounts : [];
    } catch {
      return [];
    }
  });

  function saveToStorage(newAccounts) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = JSON.parse(raw || '{}');
      data.messaging_accounts = newAccounts;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  function handleChange(updatedAccount) {
    setAccounts(prev => {
      const next = prev.map(a => a.id === updatedAccount.id ? updatedAccount : a);
      saveToStorage(next);
      return next;
    });
  }

  function handleDelete(accountId) {
    if (!window.confirm('確定要刪除此帳號嗎？')) return;
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== accountId);
      saveToStorage(next);
      return next;
    });
  }

  function addNewCard() {
    const blank = {
      id: `new_${Date.now()}`,
      platform: '',
      account_name: '',
      auth_type: '',
      token: '', secret: '', appid: '',
      username: '', password: '',
      smtp_host: '', smtp_port: '',
      enabled: true,
      created_at: new Date().toISOString(),
    };
    setAccounts(prev => {
      const next = [...prev, blank];
      saveToStorage(next);
      return next;
    });
  }

  return (
    <div>
      {accounts.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          colors={colors}
          onChange={handleChange}
          onDelete={handleDelete}
        />
      ))}

      {accounts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '36px 20px',
          color: colors.textDim, fontSize: 13,
          background: colors.card,
          border: `1px dashed ${colors.border}`,
          borderRadius: 12, marginBottom: 12,
        }}>
          尚未新增任何通訊帳號，點擊下方按鈕開始新增
        </div>
      )}

      <button
        onClick={addNewCard}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, width: '100%', padding: '11px 16px',
          borderRadius: 10,
          border: `1.5px dashed ${colors.border}`,
          background: 'transparent', cursor: 'pointer',
          color: colors.textMuted, fontSize: 14, fontWeight: 500,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.color = '#3b82f6';
          e.currentTarget.style.background = 'rgba(59,130,246,0.05)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.color = colors.textMuted;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
        <span>新增帳號</span>
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function getColors(theme) {
  if (theme === 'dark') return {
    bg: '#0a0d14', sidebar: '#12151f', border: '#2a2d3e',
    card: '#181b27', text: '#e5e7eb', textMuted: '#9ca3af', textDim: '#6b7280',
    inputBg: '#12151f', inputBorder: '#2a2d3e',
    activeBg: 'linear-gradient(90deg,rgba(59,130,246,0.15),rgba(139,92,246,0.08))',
    activeBorder: '#3b82f6', activeText: '#f9fafb',
  };
  return {
    bg: '#f3f4f6', sidebar: '#ffffff', border: '#e5e7eb',
    card: '#ffffff', text: '#111827', textMuted: '#374151', textDim: '#9ca3af',
    inputBg: '#f9fafb', inputBorder: '#d1d5db',
    activeBg: 'linear-gradient(90deg,rgba(59,130,246,0.12),rgba(139,92,246,0.06))',
    activeBorder: '#3b82f6', activeText: '#1d4ed8',
  };
}

// ─── Settings (main component) ────────────────────────────────────────────────

export default function Settings() {
  const { theme, toggleTheme, language, setLanguage, t } = useUISettings();
  const [activeSection, setActiveSection] = useState('ai');
  const [data, setData] = useState(loadData);
  const [visible, setVisible] = useState(new Set());
  const [saved, setSaved] = useState(false);

  const colors = getColors(theme);
  const section = SECTIONS.find(s => s.id === activeSection);

  function update(key, value) {
    setData(prev => ({ ...prev, [activeSection]: { ...prev[activeSection], [key]: value } }));
  }

  function getValue(key) {
    return data[activeSection]?.[key] || '';
  }

  function toggleVisible(key) {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh', background: colors.bg, color: colors.text }}>

      {/* Left category nav */}
      <div style={{
        width: 220, flexShrink: 0, background: colors.sidebar,
        borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{t('settingsTitle')}</div>
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 3 }}>Integrations & Preferences</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {SECTIONS.map(s => {
            const isActive = s.id === activeSection;
            const label = s.label[language] || s.label.en;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  border: `2px solid ${isActive ? colors.activeBorder : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? colors.activeText : colors.textMuted,
                  background: isActive ? colors.activeBg : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: '0 0 6px' }}>
            {section?.icon} {section?.label[language] || section?.label.en}
          </h1>
          <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 28 }}>
            {activeSection === 'interface'
              ? (language === 'en' ? 'Appearance & language preferences' : language === 'zh-TW' ? '外觀與語言偏好設定' : '外观与语言偏好设置')
              : (language === 'en' ? 'Credentials are stored locally in your browser.' : language === 'zh-TW' ? '帳號密碼僅儲存於本地瀏覽器，不會上傳至伺服器。' : '账号密码仅存储于本地浏览器，不会上传至服务器。')
            }
          </div>

          {activeSection === 'interface' ? (
            <InterfaceSection colors={colors} theme={theme} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} t={t} />
          ) : activeSection === 'messaging' ? (
            <MessagingSection colors={colors} />
          ) : (
            <>
              <div style={{
                background: colors.card, border: `1px solid ${colors.border}`,
                borderRadius: 12, padding: '8px 24px 24px', marginBottom: 20,
              }}>
                {section?.fields.map((field, idx) => (
                  <div key={field.key} style={{
                    paddingTop: 20,
                    borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      color: colors.textDim, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {field.label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={field.type === 'password' && !visible.has(field.key) ? 'password' : 'text'}
                        value={getValue(field.key)}
                        onChange={e => update(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        style={{
                          width: '100%', padding: field.type === 'password' ? '9px 44px 9px 12px' : '9px 12px',
                          borderRadius: 8, background: colors.inputBg,
                          border: `1px solid ${colors.inputBorder}`, color: colors.text,
                          fontSize: 13, outline: 'none', boxSizing: 'border-box',
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
                        onBlur={e => { e.target.style.borderColor = colors.inputBorder; }}
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleVisible(field.key)}
                          style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textDim, fontSize: 16, lineHeight: 1, padding: 2,
                          }}
                        >
                          {visible.has(field.key) ? '🙈' : '👁️'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: saved ? '#10b981' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                  color: '#fff', fontSize: 14, fontWeight: 600, transition: 'background 0.3s',
                  letterSpacing: '0.02em',
                }}
              >
                {saved ? t('saved') : t('save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── InterfaceSection ─────────────────────────────────────────────────────────

function InterfaceSection({ colors, theme, toggleTheme, language, setLanguage, t }) {
  const LANGUAGES = [
    { code: 'en',    label: 'English'  },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
  ];

  return (
    <div>
      {/* Theme */}
      <div style={{
        background: colors.card, border: `1px solid ${colors.border}`,
        borderRadius: 12, padding: 24, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.textDim, marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('theme')}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { val: 'dark',  icon: '🌙', label: t('darkMode')  },
            { val: 'light', icon: '☀️', label: t('lightMode') },
          ].map(opt => {
            const isActive = theme === opt.val;
            return (
              <button
                key={opt.val}
                onClick={toggleTheme}
                style={{
                  flex: 1, padding: '20px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${isActive ? '#3b82f6' : colors.border}`,
                  background: isActive ? 'rgba(59,130,246,0.1)' : colors.inputBg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 32 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#3b82f6' : colors.textMuted }}>
                  {opt.label}
                </span>
                {isActive && <span style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 4 }}>✓ Active</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div style={{
        background: colors.card, border: `1px solid ${colors.border}`,
        borderRadius: 12, padding: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.textDim, marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('language')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {LANGUAGES.map(lang => {
            const isActive = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                style={{
                  flex: 1, padding: '14px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${isActive ? '#3b82f6' : colors.border}`,
                  background: isActive ? 'rgba(59,130,246,0.1)' : colors.inputBg,
                  fontSize: 13, fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#3b82f6' : colors.textMuted,
                  transition: 'all 0.2s',
                }}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
