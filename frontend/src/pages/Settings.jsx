import React, { useState } from 'react';
import { useUISettings } from '../contexts/UISettingsContext.jsx';
import PlatformIcon, { ICON_IDS } from '../components/PlatformIcon.jsx';

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
    fields: [],
  },
  {
    id: 'logistics', icon: '📦',
    label: { en: 'Logistics', 'zh-TW': '物流', 'zh-CN': '物流' },
    fields: [],
  },
  {
    id: 'ads', icon: '📢',
    label: { en: 'Ad Platforms', 'zh-TW': '廣告投放', 'zh-CN': '广告投放' },
    fields: [],
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

// ─── Ecommerce Platform Config ───────────────────────────────────────────────

function apiKeysPlatform(id, name, icon, color, keyLabel, secretLabel, keyFieldKey = 'app_key', secretFieldKey = 'app_secret') {
  return {
    id, name, icon, color,
    auth_types: [
      {
        type: 'api_keys', label: `${keyLabel} + ${secretLabel}`,
        fields: [
          { key: keyFieldKey,    label: keyLabel,    type: 'text' },
          { key: secretFieldKey, label: secretLabel, type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  };
}

const ECOMMERCE_PLATFORMS = [
  // ── Americas ────────────────────────────────────────────────────────────────
  {
    id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9900',
    auth_types: [
      {
        type: 'api_keys', label: 'SP-API Key + Secret',
        fields: [
          { key: 'sp_key',    label: 'SP-API Key',    type: 'password' },
          { key: 'sp_secret', label: 'SP-API Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'ebay', name: 'eBay', icon: '🔵', color: '#0064D2',
    auth_types: [
      {
        type: 'api_keys', label: 'App ID + Cert ID',
        fields: [
          { key: 'app_id',  label: 'App ID',  type: 'text' },
          { key: 'cert_id', label: 'Cert ID', type: 'password' },
          { key: 'dev_id',  label: 'Dev ID',  type: 'text' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('walmart',     'Walmart Marketplace', '🔵', '#0071CE', 'Client ID',  'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('etsy',        'Etsy',                '🧡', '#F1641E', 'API Key',    'API Secret'),
  {
    id: 'target', name: 'Target Plus', icon: '🎯', color: '#CC0000',
    auth_types: [
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'newegg', name: 'Newegg', icon: '🔶', color: '#FF8000',
    auth_types: [
      {
        type: 'api_keys', label: 'Seller ID + API Key',
        fields: [
          { key: 'seller_id', label: 'Seller ID', type: 'text' },
          { key: 'api_key',   label: 'API Key',   type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'wayfair', name: 'Wayfair', icon: '🏠', color: '#7B189F',
    auth_types: [
      {
        type: 'api_keys', label: 'Supplier ID + API Key',
        fields: [
          { key: 'supplier_id', label: 'Supplier ID', type: 'text' },
          { key: 'api_key',     label: 'API Key',     type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'bestbuy', name: 'Best Buy Marketplace', icon: '💛', color: '#003591',
    auth_types: [
      {
        type: 'api_keys', label: 'App ID + API Key',
        fields: [
          { key: 'app_id',  label: 'App ID',  type: 'text' },
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('mercado_libre', 'Mercado Libre', '🟡', '#FFE600', 'App ID', 'App Secret', 'app_id', 'app_secret'),

  // ── Southeast Asia ───────────────────────────────────────────────────────────
  {
    id: 'shopee', name: 'Shopee', icon: '🛒', color: '#EE4D2D',
    auth_types: [
      {
        type: 'api_keys', label: 'Partner ID + Key',
        fields: [
          { key: 'partner_id',  label: 'Partner ID',  type: 'text' },
          { key: 'partner_key', label: 'Partner Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('lazada',    'Lazada',    '🟣', '#0F146D', 'App Key', 'App Secret'),
  apiKeysPlatform('tokopedia', 'Tokopedia', '🟢', '#42B549', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  {
    id: 'qoo10', name: 'Qoo10', icon: '🔴', color: '#E31837',
    auth_types: [
      {
        type: 'api_keys', label: 'App ID + Secret Key',
        fields: [
          { key: 'app_id',     label: 'App ID',     type: 'text' },
          { key: 'secret_key', label: 'Secret Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },

  // ── China ────────────────────────────────────────────────────────────────────
  apiKeysPlatform('pinduoduo', 'Pinduoduo 拼多多',    '🛍️', '#E02020', 'App Key', 'App Secret'),
  {
    id: 'tiktok_shop', name: 'Douyin / TikTok Shop', icon: '🎵', color: '#010101',
    auth_types: [
      {
        type: 'api_keys', label: 'App Key + App Secret',
        fields: [
          { key: 'app_key',    label: 'App Key',    type: 'text' },
          { key: 'app_secret', label: 'App Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('taobao',     '淘寶 Taobao',    '🛒', '#FF6600', 'App Key', 'App Secret'),
  apiKeysPlatform('tmall',      '天貓 Tmall',     '🏪', '#FF0000', 'App Key', 'App Secret'),
  apiKeysPlatform('jd',         '京東 JD.com',    '🏬', '#C0000C', 'App Key', 'App Secret'),
  apiKeysPlatform('alibaba',    'Alibaba.com',    '🌐', '#FF6A00', 'App Key', 'App Secret'),
  apiKeysPlatform('temu',       'Temu',           '🧡', '#FF6900', 'App Key', 'App Secret'),
  apiKeysPlatform('aliexpress', 'AliExpress',     '🟠', '#E43226', 'App Key', 'App Secret'),
  {
    id: 'shein', name: 'SHEIN Marketplace', icon: '⚫', color: '#222222',
    auth_types: [
      {
        type: 'api_keys', label: 'App Key + App Secret',
        fields: [
          { key: 'app_key',    label: 'App Key',    type: 'text' },
          { key: 'app_secret', label: 'App Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },

  // ── India ────────────────────────────────────────────────────────────────────
  apiKeysPlatform('flipkart', 'Flipkart',  '💛', '#F7DB15', 'App ID',    'App Secret', 'app_id',    'app_secret'),
  {
    id: 'meesho', name: 'Meesho', icon: '🟣', color: '#9B5CF6',
    auth_types: [
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },

  // ── Japan ────────────────────────────────────────────────────────────────────
  {
    id: 'rakuten', name: 'Rakuten 樂天', icon: '🔴', color: '#BF0000',
    auth_types: [
      {
        type: 'api_keys', label: 'Service Secret + License Key',
        fields: [
          { key: 'service_secret', label: 'Service Secret', type: 'password' },
          { key: 'license_key',    label: 'License Key',    type: 'text' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('yahoo_japan', 'Yahoo Shopping JP', '🔴', '#FF0033', 'App ID', 'Secret Key', 'app_id', 'secret_key'),

  // ── Korea ─────────────────────────────────────────────────────────────────────
  {
    id: 'coupang', name: 'Coupang', icon: '🟠', color: '#EF6B00',
    auth_types: [
      {
        type: 'api_keys', label: 'Access Key + Secret Key',
        fields: [
          { key: 'access_key', label: 'Access Key', type: 'text' },
          { key: 'secret_key', label: 'Secret Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('naver',    'Naver Shopping', '🟢', '#03C75A', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('gmarket',  'Gmarket',        '🟡', '#FFCC00', 'App Key',   'App Secret'),
  apiKeysPlatform('eleventh', '11st',           '🔴', '#E60012', 'App Key',   'App Secret'),

  // ── Europe ───────────────────────────────────────────────────────────────────
  apiKeysPlatform('otto',       'OTTO',                '🟤', '#F25B00', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('otto_market','Otto Market',         '🟤', '#F25B00', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('allegro',    'Allegro',             '🟠', '#FF6B00', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('bol',        'Bol.com',             '🔵', '#0B5CA8', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  apiKeysPlatform('zalando',    'Zalando',             '🟠', '#F27806', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),
  {
    id: 'cdiscount', name: 'Cdiscount', icon: '🔵', color: '#0054A6',
    auth_types: [
      {
        type: 'api_keys', label: 'App Login + Password',
        fields: [
          { key: 'app_login',    label: 'App Login',    type: 'text' },
          { key: 'app_password', label: 'App Password', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  apiKeysPlatform('fnac',      'Fnac Darty',            '🟢', '#008F5D', 'App Key', 'App Secret'),
  apiKeysPlatform('carrefour', 'Carrefour Marketplace', '🔵', '#0067B2', 'Client ID', 'Client Secret', 'client_id', 'client_secret'),

  // ── Russia ───────────────────────────────────────────────────────────────────
  {
    id: 'ozon', name: 'Ozon', icon: '🔵', color: '#005BFF',
    auth_types: [
      {
        type: 'api_keys', label: 'Client ID + API Key',
        fields: [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'api_key',   label: 'API Key',   type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'wildberries', name: 'Wildberries', icon: '🟣', color: '#CB11AB',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },

  // ── Other / Self-hosted ───────────────────────────────────────────────────────
  {
    id: 'shopify', name: 'Shopify', icon: '🏪', color: '#96BF48',
    auth_types: [
      {
        type: 'api_keys', label: 'Store URL + Admin Token',
        fields: [
          { key: 'store_url',   label: 'Store URL',   type: 'text',     placeholder: 'mystore.myshopify.com' },
          { key: 'admin_token', label: 'Admin Token', type: 'password', placeholder: 'shpat_...' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'momo', name: 'Momo 購物', icon: '🔴', color: '#D61F3F',
    auth_types: [
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'pchome', name: 'PChome', icon: '🖥️', color: '#CC0000',
    auth_types: [
      {
        type: 'api_keys', label: 'App Key + Secret',
        fields: [
          { key: 'app_key',    label: 'App Key',    type: 'text' },
          { key: 'app_secret', label: 'App Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
];

// ─── Logistics Platform Config ────────────────────────────────────────────────

const LOGISTICS_PLATFORMS = [
  {
    id: 'fedex', name: 'FedEx', icon: '🟣', color: '#4D148C',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key + Secret',
        fields: [
          { key: 'api_key',    label: 'API Key',    type: 'password' },
          { key: 'api_secret', label: 'API Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'dhl', name: 'DHL', icon: '🟡', color: '#FFCC00',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'sf_express', name: '順豐速運', icon: '🔴', color: '#E31E24',
    auth_types: [
      {
        type: 'api_keys', label: 'App Key + Secret',
        fields: [
          { key: 'app_key',    label: 'App Key',    type: 'text' },
          { key: 'app_secret', label: 'App Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'blackcat', name: '黑貓宅急便', icon: '🐱', color: '#1A1A1A',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'chunghwa_post', name: '中華郵政', icon: '🟢', color: '#007F3B',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'kerry', name: 'Kerry Express', icon: '🔵', color: '#003087',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key',
        fields: [
          { key: 'api_key', label: 'API Key', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'ups', name: 'UPS', icon: '🟤', color: '#351C15',
    auth_types: [
      {
        type: 'api_keys', label: 'Client ID + Secret',
        fields: [
          { key: 'client_id',     label: 'Client ID',     type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
];

// ─── Ads Platform Config ──────────────────────────────────────────────────────

const ADS_PLATFORMS = [
  {
    id: 'facebook_ads', name: 'Facebook Ads', icon: '📘', color: '#1877F2',
    auth_types: [
      {
        type: 'api_keys', label: 'App ID + Access Token',
        fields: [
          { key: 'app_id',       label: 'App ID',         type: 'text' },
          { key: 'access_token', label: 'Access Token',   type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'google_ads', name: 'Google Ads', icon: '🔍', color: '#4285F4',
    auth_types: [
      {
        type: 'api_keys', label: 'Developer Token + OAuth',
        fields: [
          { key: 'dev_token',     label: 'Developer Token',    type: 'password' },
          { key: 'client_id',     label: 'OAuth Client ID',    type: 'text' },
          { key: 'client_secret', label: 'OAuth Client Secret',type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: 'Google 帳號', type: 'text' },
          { key: 'password', label: '密碼',        type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'tiktok_ads', name: 'TikTok Ads', icon: '🎵', color: '#010101',
    auth_types: [
      {
        type: 'api_keys', label: 'Access Token',
        fields: [
          { key: 'access_token', label: 'Access Token', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'line_ads', name: 'LINE Ads', icon: '💚', color: '#06C755',
    auth_types: [
      {
        type: 'api_keys', label: 'API Token',
        fields: [
          { key: 'api_token', label: 'API Token', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: 'LINE 帳號', type: 'text' },
          { key: 'password', label: '密碼',      type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'twitter_ads', name: 'X (Twitter) Ads', icon: '🐦', color: '#000000',
    auth_types: [
      {
        type: 'api_keys', label: 'API Key + Secret',
        fields: [
          { key: 'api_key',    label: 'API Key',    type: 'password' },
          { key: 'api_secret', label: 'API Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
  {
    id: 'yahoo_ads', name: 'Yahoo! Ads', icon: '🟣', color: '#6001D2',
    auth_types: [
      {
        type: 'api_keys', label: 'Client ID + Secret',
        fields: [
          { key: 'client_id',     label: 'Client ID',     type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
        ],
      },
      {
        type: 'credentials', label: '帳號密碼登入',
        fields: [
          { key: 'username', label: '帳號 / Email', type: 'text' },
          { key: 'password', label: '密碼',         type: 'password' },
        ],
      },
    ],
  },
];

// ─── AccountCard ──────────────────────────────────────────────────────────────

function AccountCard({ account, colors, onChange, onDelete, platforms = MESSAGING_PLATFORMS }) {
  const [visible, setVisible] = useState(new Set());
  const [platformOpen, setPlatformOpen] = useState(false);
  const [platformSearch, setPlatformSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef(null);

  // Close dropdown on any scroll or window resize
  React.useEffect(() => {
    if (!platformOpen) return;
    const close = () => { setPlatformOpen(false); setPlatformSearch(''); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [platformOpen]);

  const platform = platforms.find(p => p.id === account.platform);
  const authDef = platform
    ? (platform.auth_types.find(a => a.type === account.auth_type) || platform.auth_types[0])
    : null;

  function update(field, value) {
    onChange({ ...account, [field]: value });
  }

  function handlePlatformSelect(platformId) {
    const newPlatform = platforms.find(p => p.id === platformId);
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
            {ICON_IDS.has(platform.id)
              ? <PlatformIcon id={platform.id} size={18} color={platform.color} />
              : <span style={{ fontSize: 15, lineHeight: 1 }}>{platform.icon}</span>
            }
            <span style={{ fontSize: 12, fontWeight: 700, color: platform.color }}>{platform.name}</span>
          </div>
        ) : (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              ref={btnRef}
              onClick={() => {
                if (!platformOpen && btnRef.current) {
                  const r = btnRef.current.getBoundingClientRect();
                  setDropPos({ top: r.bottom + 4, left: r.left });
                }
                setPlatformOpen(o => !o);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 8,
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.textDim,
                fontSize: 12, cursor: 'pointer', outline: 'none',
              }}
            >
              選擇平台...
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {platformOpen && (
              <div style={{
                position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999,
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                minWidth: 200, width: 220,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Search box */}
                <div style={{ padding: '8px 10px', borderBottom: `1px solid ${colors.border}` }}>
                  <input
                    autoFocus
                    value={platformSearch}
                    onChange={e => setPlatformSearch(e.target.value)}
                    placeholder="搜尋平台..."
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%', padding: '5px 8px', borderRadius: 6,
                      background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                      color: colors.text, fontSize: 12, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {/* Scrollable list */}
                <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                  {platforms
                    .filter(p => !platformSearch || p.name.toLowerCase().includes(platformSearch.toLowerCase()) || p.id.includes(platformSearch.toLowerCase()))
                    .map(p => (
                      <div
                        key={p.id}
                        onClick={() => { handlePlatformSelect(p.id); setPlatformOpen(false); setPlatformSearch(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', cursor: 'pointer',
                          fontSize: 13, color: colors.text,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = colors.inputBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6,
                          background: p.color + '20',
                          flexShrink: 0,
                        }}>
                          {ICON_IDS.has(p.id)
                            ? <PlatformIcon id={p.id} size={15} color={p.color} />
                            : <span style={{ fontSize: 13, lineHeight: 1 }}>{p.icon}</span>
                          }
                        </span>
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                      </div>
                    ))
                  }
                  {platforms.filter(p => !platformSearch || p.name.toLowerCase().includes(platformSearch.toLowerCase()) || p.id.includes(platformSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: colors.textDim, textAlign: 'center' }}>
                      找不到「{platformSearch}」
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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

// ─── EcommerceSection ─────────────────────────────────────────────────────────

function EcommerceSection({ colors }) {
  const [accounts, setAccounts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = JSON.parse(raw || '{}');

      // One-time migration: convert old flat ecommerce keys to card array format
      if (!Array.isArray(data.ecommerce_accounts) && data.ecommerce && typeof data.ecommerce === 'object') {
        const legacy = data.ecommerce;
        const migrated = [];
        if (legacy.shopee_id || legacy.shopee_key) {
          migrated.push({ id: 'shopee_migrated', platform: 'shopee', account_name: 'Shopee (已遷移)', auth_type: 'api_keys', partner_id: legacy.shopee_id || '', partner_key: legacy.shopee_key || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.lazada_key || legacy.lazada_secret) {
          migrated.push({ id: 'lazada_migrated', platform: 'lazada', account_name: 'Lazada (已遷移)', auth_type: 'api_keys', app_key: legacy.lazada_key || '', app_secret: legacy.lazada_secret || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.shopify_url || legacy.shopify_token) {
          migrated.push({ id: 'shopify_migrated', platform: 'shopify', account_name: 'Shopify (已遷移)', auth_type: 'api_keys', store_url: legacy.shopify_url || '', admin_token: legacy.shopify_token || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (legacy.amazon_key || legacy.amazon_secret) {
          migrated.push({ id: 'amazon_migrated', platform: 'amazon', account_name: 'Amazon (已遷移)', auth_type: 'api_keys', sp_key: legacy.amazon_key || '', sp_secret: legacy.amazon_secret || '', enabled: true, created_at: new Date().toISOString() });
        }
        if (migrated.length > 0) {
          data.ecommerce_accounts = migrated;
          delete data.ecommerce;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return migrated;
        }
      }

      return Array.isArray(data.ecommerce_accounts) ? data.ecommerce_accounts : [];
    } catch {
      return [];
    }
  });

  function saveToStorage(newAccounts) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = JSON.parse(raw || '{}');
      data.ecommerce_accounts = newAccounts;
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
    if (!window.confirm('確定要刪除此電商帳號嗎？')) return;
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== accountId);
      saveToStorage(next);
      return next;
    });
  }

  function addNewCard() {
    const blank = {
      id: `ec_${Date.now()}`,
      platform: '',
      account_name: '',
      auth_type: '',
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
          platforms={ECOMMERCE_PLATFORMS}
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
          尚未新增任何電商帳號，點擊下方按鈕開始新增
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
        <span>新增電商帳號</span>
      </button>
    </div>
  );
}

// ─── Generic card-based section factory ──────────────────────────────────────

function makePlatformSection(storageKey, platforms, emptyLabel, addLabel, migrateFromLegacy) {
  return function PlatformSection({ colors }) {
    const [accounts, setAccounts] = useState(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = JSON.parse(raw || '{}');
        if (!Array.isArray(data[storageKey])) {
          const migrated = migrateFromLegacy ? migrateFromLegacy(data) : [];
          if (migrated.length > 0) {
            data[storageKey] = migrated;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return migrated;
          }
        }
        return Array.isArray(data[storageKey]) ? data[storageKey] : [];
      } catch { return []; }
    });

    function save(next) {
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        data[storageKey] = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }

    function handleChange(updated) {
      setAccounts(prev => { const next = prev.map(a => a.id === updated.id ? updated : a); save(next); return next; });
    }
    function handleDelete(id) {
      if (!window.confirm('確定要刪除此帳號嗎？')) return;
      setAccounts(prev => { const next = prev.filter(a => a.id !== id); save(next); return next; });
    }
    function addNew() {
      const blank = { id: `${storageKey}_${Date.now()}`, platform: '', account_name: '', auth_type: '', enabled: true, created_at: new Date().toISOString() };
      setAccounts(prev => { const next = [...prev, blank]; save(next); return next; });
    }

    return (
      <div>
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} colors={colors} onChange={handleChange} onDelete={handleDelete} platforms={platforms} />
        ))}
        {accounts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: colors.textDim, fontSize: 13, background: colors.card, border: `1px dashed ${colors.border}`, borderRadius: 12, marginBottom: 12 }}>
            {emptyLabel}
          </div>
        )}
        <button
          onClick={addNew}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 16px', borderRadius: 10, border: `1.5px dashed ${colors.border}`, background: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: 14, fontWeight: 500, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMuted; e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
          <span>{addLabel}</span>
        </button>
      </div>
    );
  };
}

const LogisticsSection = makePlatformSection(
  'logistics_accounts',
  LOGISTICS_PLATFORMS,
  '尚未新增任何物流帳號，點擊下方按鈕開始新增',
  '新增物流帳號',
  (data) => {
    const leg = data.logistics || {};
    const out = [];
    if (leg.fedex_key || leg.fedex_secret)    out.push({ id: 'fedex_mig',    platform: 'fedex',        account_name: 'FedEx (已遷移)',    auth_type: 'api_keys', api_key: leg.fedex_key || '',    api_secret: leg.fedex_secret || '', enabled: true, created_at: new Date().toISOString() });
    if (leg.dhl_key)                          out.push({ id: 'dhl_mig',      platform: 'dhl',          account_name: 'DHL (已遷移)',      auth_type: 'api_keys', api_key: leg.dhl_key || '',                                     enabled: true, created_at: new Date().toISOString() });
    if (leg.sf_appkey || leg.sf_secret)       out.push({ id: 'sf_mig',       platform: 'sf_express',   account_name: '順豐 (已遷移)',     auth_type: 'api_keys', app_key: leg.sf_appkey || '',    app_secret: leg.sf_secret || '',    enabled: true, created_at: new Date().toISOString() });
    if (leg.blackcat_key)                     out.push({ id: 'blackcat_mig', platform: 'blackcat',     account_name: '黑貓 (已遷移)',     auth_type: 'api_keys', api_key: leg.blackcat_key || '',                                enabled: true, created_at: new Date().toISOString() });
    if (leg.post_key)                         out.push({ id: 'post_mig',     platform: 'chunghwa_post',account_name: '中華郵政 (已遷移)', auth_type: 'api_keys', api_key: leg.post_key || '',                                    enabled: true, created_at: new Date().toISOString() });
    if (leg.kerry_key)                        out.push({ id: 'kerry_mig',    platform: 'kerry',        account_name: 'Kerry (已遷移)',    auth_type: 'api_keys', api_key: leg.kerry_key || '',                                   enabled: true, created_at: new Date().toISOString() });
    if (out.length) delete data.logistics;
    return out;
  }
);

const AdsSection = makePlatformSection(
  'ads_accounts',
  ADS_PLATFORMS,
  '尚未新增任何廣告帳號，點擊下方按鈕開始新增',
  '新增廣告帳號',
  (data) => {
    const leg = data.ads || {};
    const out = [];
    if (leg.fb_app_id || leg.fb_token)        out.push({ id: 'fb_mig',     platform: 'facebook_ads', account_name: 'Facebook (已遷移)', auth_type: 'api_keys', app_id: leg.fb_app_id || '',       access_token: leg.fb_token || '',      enabled: true, created_at: new Date().toISOString() });
    if (leg.google_dev_tok)                   out.push({ id: 'ga_mig',     platform: 'google_ads',   account_name: 'Google Ads (已遷移)',auth_type: 'api_keys', dev_token: leg.google_dev_tok || '', client_id: leg.google_cli_id || '', client_secret: leg.google_cli_sec || '', enabled: true, created_at: new Date().toISOString() });
    if (leg.tiktok_token)                     out.push({ id: 'tt_mig',     platform: 'tiktok_ads',   account_name: 'TikTok Ads (已遷移)',auth_type: 'api_keys', access_token: leg.tiktok_token || '',                             enabled: true, created_at: new Date().toISOString() });
    if (leg.line_ads_token)                   out.push({ id: 'la_mig',     platform: 'line_ads',     account_name: 'LINE Ads (已遷移)', auth_type: 'api_keys', api_token: leg.line_ads_token || '',                              enabled: true, created_at: new Date().toISOString() });
    if (leg.twitter_key)                      out.push({ id: 'tw_mig',     platform: 'twitter_ads',  account_name: 'X/Twitter (已遷移)',auth_type: 'api_keys', api_key: leg.twitter_key || '',                                   enabled: true, created_at: new Date().toISOString() });
    if (out.length) delete data.ads;
    return out;
  }
);

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
          ) : activeSection === 'ecommerce' ? (
            <EcommerceSection colors={colors} />
          ) : activeSection === 'logistics' ? (
            <LogisticsSection colors={colors} />
          ) : activeSection === 'ads' ? (
            <AdsSection colors={colors} />
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
