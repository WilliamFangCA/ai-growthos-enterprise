import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'growthos_ui_settings';

const translations = {
  en: {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI Agents', contentFactory: 'Content Factory',
    commHub: 'Comm Hub', aiAutoReply: 'AI Auto Reply', orders: 'Orders',
    crm: 'CRM', workflows: 'Workflows', settings: 'Settings',
    analytics: 'Analytics', marketing: 'Marketing',
    settingsTitle: 'Settings',
    aiApiKeys: 'AI API Keys', messaging: 'Messaging', ecommerce: 'E-Commerce',
    logistics: 'Logistics', ads: 'Ad Platforms', interface: 'Interface',
    save: 'Save', saved: '✓ Saved', darkMode: 'Dark Mode', lightMode: 'Light Mode',
    language: 'Language', theme: 'Theme',
  },
  'zh-TW': {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI 智能體', contentFactory: '內容工廠',
    commHub: '通訊中台', aiAutoReply: 'AI 自動回覆', orders: '訂單管理',
    crm: 'CRM', workflows: '工作流程', settings: '系統設定',
    analytics: '數據分析', marketing: '行銷自動化',
    settingsTitle: '系統設定',
    aiApiKeys: 'AI API 金鑰', messaging: '通訊軟體', ecommerce: '電商平台',
    logistics: '物流', ads: '廣告投放', interface: '介面設定',
    save: '儲存', saved: '✓ 已儲存', darkMode: '深色模式', lightMode: '淺色模式',
    language: '語言', theme: '主題',
  },
  'zh-CN': {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI 智能体', contentFactory: '内容工厂',
    commHub: '通讯中台', aiAutoReply: 'AI 自动回复', orders: '订单管理',
    crm: 'CRM', workflows: '工作流程', settings: '系统设置',
    analytics: '数据分析', marketing: '营销自动化',
    settingsTitle: '系统设置',
    aiApiKeys: 'AI API 密钥', messaging: '通讯软件', ecommerce: '电商平台',
    logistics: '物流', ads: '广告投放', interface: '界面设置',
    save: '保存', saved: '✓ 已保存', darkMode: '深色模式', lightMode: '浅色模式',
    language: '语言', theme: '主题',
  },
};

const UISettingsContext = createContext(null);

export function UISettingsProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('zh-TW');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.theme) setTheme(saved.theme);
      if (saved.language) setLanguage(saved.language);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, language }));
  }, [theme, language]);

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  function t(key) {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  }

  return (
    <UISettingsContext.Provider value={{ theme, toggleTheme, language, setLanguage, t }}>
      {children}
    </UISettingsContext.Provider>
  );
}

export function useUISettings() {
  return useContext(UISettingsContext);
}
