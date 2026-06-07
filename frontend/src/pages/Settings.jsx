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
    fields: [
      { key: 'line_token',    label: 'LINE Channel Access Token', type: 'password', placeholder: '' },
      { key: 'line_secret',   label: 'LINE Channel Secret',       type: 'password', placeholder: '' },
      { key: 'wa_token',      label: 'WhatsApp Business Token',   type: 'password', placeholder: '' },
      { key: 'tg_token',      label: 'Telegram Bot Token',        type: 'password', placeholder: '' },
      { key: 'discord_token', label: 'Discord Bot Token',         type: 'password', placeholder: '' },
      { key: 'slack_token',   label: 'Slack Bot Token',           type: 'password', placeholder: 'xoxb-...' },
      { key: 'wechat_appid',  label: 'WeChat AppID',              type: 'text',     placeholder: '' },
      { key: 'wechat_secret', label: 'WeChat AppSecret',          type: 'password', placeholder: '' },
    ],
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
