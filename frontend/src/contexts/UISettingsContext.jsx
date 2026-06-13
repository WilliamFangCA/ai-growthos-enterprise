import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'growthos_ui_settings';

const translations = {
  en: {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI Agents', contentFactory: 'Content Factory',
    commHub: 'Comm Hub', aiAutoReply: 'AI Auto Reply', orders: 'Orders',
    crm: 'CRM', workflows: 'Workflows', settings: 'Settings',
    analytics: 'Analytics', marketing: 'Marketing',
    membership: 'Membership', toolbox: 'AI Toolbox',
    settingsTitle: 'Settings',
    aiApiKeys: 'AI API Keys', messaging: 'Messaging', ecommerce: 'E-Commerce',
    logistics: 'Logistics', ads: 'Ad Platforms', interface: 'Interface',
    save: 'Save', saved: '✓ Saved', darkMode: 'Dark Mode', lightMode: 'Light Mode',
    language: 'Language', theme: 'Theme',
    // Content Factory
    cfTitle: 'Content Factory',
    cfSubtitle: 'AI-powered content generation — articles, social posts, ads, campaigns',
    cfContentType: 'CONTENT TYPE',
    cfTypeArticle: 'Article', cfTypeArticleDesc: 'SCQA-structured marketing article',
    cfTypeSocial: 'Social Post', cfTypeSocialDesc: 'High-engagement social media content',
    cfTypeAd: 'Ad Copy', cfTypeAdDesc: 'AIDA-structured ad copy',
    cfTypeCampaign: 'Campaign Plan', cfTypeCampaignDesc: 'TIP model campaign strategy',
    cfGenerateHeading: 'Generate',
    cfPresetsLabel: 'Scenario templates — click to fill, then edit the 【placeholders】',
    cfPlatformLabel: 'Platform (optional)', cfAnyPlatform: 'Any platform',
    cfPromptPlaceholder: 'Describe what you want to create, or pick a scenario template above...',
    cfCtrlEnterHint: 'Ctrl+Enter to generate',
    cfGenerateBtn: 'Generate', cfGenerating: 'Generating...',
    cfOutputTitle: 'Generated Output', cfCopy: 'Copy', cfCopied: 'Copied to clipboard!',
    cfAiWorking: 'AI is generating your content...',
    cfHistoryTitle: 'Generation History', cfLoading: 'Loading...', cfHistoryEmpty: 'No history yet.',
    // Media generation (image / video / music)
    cfTypeImage: 'AI Image', cfTypeImageDesc: 'Text-to-image: product shots, social visuals',
    cfTypeVideo: 'AI Video', cfTypeVideoDesc: 'Text-to-video: short clips and ads',
    cfTypeMusic: 'AI Music', cfTypeMusicDesc: 'Text-to-music: BGM and brand songs',
    cfAspectRatio: 'Aspect ratio', cfDuration: 'Duration', cfResolution: 'Resolution',
    cfMusicStyle: 'Music style', cfLyrics: 'Lyrics (optional)',
    cfLyricsPlaceholder: 'Leave empty and AI will write lyrics from your description...',
    cfStylePop: 'Pop', cfStyleRock: 'Rock', cfStyleElectronic: 'Electronic',
    cfStyleClassical: 'Classical', cfStyleLofi: 'Lo-fi', cfStyleJazz: 'Jazz',
    cfMediaQueued: 'Queued...', cfMediaProcessing: 'Generating', cfMediaFailed: 'Generation failed',
    cfRetry: 'Retry', cfDownload: 'Download', cfCopyLink: 'Copy link', cfLinkCopied: 'Link copied!',
    cfVideoTimeHint: 'Video generation takes about 1–5 minutes',
    cfMusicTimeHint: 'Music generation takes about 1–2 minutes',
    cfMockNotice: 'Sample result — AI media service unavailable, shown for preview only',
    cfElapsed: 'elapsed', cfSecondsUnit: 's',
    cfMediaPromptPlaceholder: 'Describe what you want to generate, or pick a template above...',
    // Voice Hub
    voiceHub: 'Voice Hub',
    vhTitle: 'Voice Call Hub',
    vhSubtitle: 'Talk to AI by voice — transcripts sync to the Comm Hub automatically',
    vhVoiceSelect: 'AI VOICE', vhPreview: 'Preview', vhPreviewing: 'Playing...',
    vhStartCall: 'Start Call', vhEndCall: 'End Call',
    vhStatusIdle: 'Pick a voice and start the call',
    vhListening: 'Listening... speak now', vhThinking: 'AI thinking...', vhSpeaking: 'AI speaking...',
    vhTranscript: 'Live transcript', vhYou: 'You', vhAI: 'AI',
    vhCallDuration: 'Duration',
    vhNoSupport: 'This browser does not support speech recognition. Please use Chrome or Edge.',
    vhMicDenied: 'Microphone access denied. Please allow microphone permission.',
    vhRecentCalls: 'Recent Calls', vhNoCalls: 'No calls yet. Start your first voice call!',
    vhTurns: 'turns', vhViewInComms: 'View in Comm Hub',
    vhBrowserVoiceFallback: 'Cloud TTS unavailable — using browser built-in voice',
    vhYourName: 'Your name (optional)',
    vhMale: 'Male', vhFemale: 'Female',
  },
  'zh-TW': {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI 智能體', contentFactory: '內容工廠',
    commHub: '通訊中台', aiAutoReply: 'AI 自動回覆', orders: '訂單管理',
    crm: 'CRM', workflows: '工作流程', settings: '系統設定',
    analytics: '數據分析', marketing: '行銷自動化',
    membership: '會員運營', toolbox: 'AI 工具箱',
    settingsTitle: '系統設定',
    aiApiKeys: 'AI API 金鑰', messaging: '通訊軟體', ecommerce: '電商平台',
    logistics: '物流', ads: '廣告投放', interface: '介面設定',
    save: '儲存', saved: '✓ 已儲存', darkMode: '深色模式', lightMode: '淺色模式',
    language: '語言', theme: '主題',
    // 內容工廠
    cfTitle: '內容工廠',
    cfSubtitle: 'AI 內容生成 — 文章、社群貼文、廣告文案、活動企劃',
    cfContentType: '內容類型',
    cfTypeArticle: '行銷文章', cfTypeArticleDesc: 'SCQA 結構的行銷長文',
    cfTypeSocial: '社群貼文', cfTypeSocialDesc: '高互動社群媒體內容',
    cfTypeAd: '廣告文案', cfTypeAdDesc: 'AIDA 結構的廣告文案',
    cfTypeCampaign: '活動企劃', cfTypeCampaignDesc: 'TIP 模型活動策劃書',
    cfGenerateHeading: '生成',
    cfPresetsLabel: '情境範例模板 — 點擊填入後，把【】內容換成你的資訊',
    cfPlatformLabel: '目標平台（選填）', cfAnyPlatform: '不限平台',
    cfPromptPlaceholder: '描述你想生成的內容，或點擊上方情境範例模板快速開始…',
    cfCtrlEnterHint: 'Ctrl+Enter 快速生成',
    cfGenerateBtn: '開始生成', cfGenerating: '生成中…',
    cfOutputTitle: '生成結果', cfCopy: '複製', cfCopied: '已複製到剪貼簿！',
    cfAiWorking: 'AI 正在為你生成內容…',
    cfHistoryTitle: '生成紀錄', cfLoading: '載入中…', cfHistoryEmpty: '還沒有生成紀錄，從上方開始你的第一篇內容吧！',
    // 媒體生成（圖片 / 影片 / 音樂）
    cfTypeImage: 'AI 圖片', cfTypeImageDesc: '文生圖：商品圖、社群視覺、Banner',
    cfTypeVideo: 'AI 影片', cfTypeVideoDesc: '文生影片：短片、廣告素材',
    cfTypeMusic: 'AI 音樂', cfTypeMusicDesc: '文生音樂：BGM、品牌主題曲',
    cfAspectRatio: '圖片比例', cfDuration: '影片時長', cfResolution: '解析度',
    cfMusicStyle: '音樂風格', cfLyrics: '歌詞（選填）',
    cfLyricsPlaceholder: '留空由 AI 根據描述自動寫詞…',
    cfStylePop: '流行', cfStyleRock: '搖滾', cfStyleElectronic: '電子',
    cfStyleClassical: '古典', cfStyleLofi: 'Lo-fi', cfStyleJazz: '爵士',
    cfMediaQueued: '排隊中…', cfMediaProcessing: '生成中', cfMediaFailed: '生成失敗',
    cfRetry: '重試', cfDownload: '下載', cfCopyLink: '複製連結', cfLinkCopied: '連結已複製！',
    cfVideoTimeHint: '影片生成約需 1–5 分鐘，可先去做別的事',
    cfMusicTimeHint: '音樂生成約需 1–2 分鐘',
    cfMockNotice: '模擬結果 — AI 媒體服務未連線，僅供版面預覽',
    cfElapsed: '已耗時', cfSecondsUnit: '秒',
    cfMediaPromptPlaceholder: '描述你想生成的內容，或點擊上方情境範例模板快速開始…',
    // 語音中台
    voiceHub: '語音中台',
    vhTitle: '語音通話中台',
    vhSubtitle: '與 AI 即時語音交談 — 通話逐字稿自動同步到通訊中台',
    vhVoiceSelect: 'AI 音色', vhPreview: '試聽', vhPreviewing: '播放中…',
    vhStartCall: '開始通話', vhEndCall: '結束通話',
    vhStatusIdle: '選擇音色後即可開始通話',
    vhListening: '聆聽中…請說話', vhThinking: 'AI 思考中…', vhSpeaking: 'AI 回覆中…',
    vhTranscript: '即時逐字稿', vhYou: '你', vhAI: 'AI',
    vhCallDuration: '通話時間',
    vhNoSupport: '此瀏覽器不支援語音辨識，請改用 Chrome 或 Edge',
    vhMicDenied: '無法取得麥克風權限，請允許麥克風存取後重試',
    vhRecentCalls: '近期通話', vhNoCalls: '還沒有通話紀錄，開始你的第一通語音通話吧！',
    vhTurns: '回合', vhViewInComms: '在通訊中台檢視',
    vhBrowserVoiceFallback: '雲端語音暫不可用，已改用瀏覽器內建語音',
    vhYourName: '你的稱呼（選填）',
    vhMale: '男聲', vhFemale: '女聲',
  },
  'zh-CN': {
    core: 'CORE', growth: 'GROWTH', sales: 'SALES', system: 'SYSTEM',
    dashboard: 'Dashboard', aiAgents: 'AI 智能体', contentFactory: '内容工厂',
    commHub: '通讯中台', aiAutoReply: 'AI 自动回复', orders: '订单管理',
    crm: 'CRM', workflows: '工作流程', settings: '系统设置',
    analytics: '数据分析', marketing: '营销自动化',
    membership: '会员运营', toolbox: 'AI 工具箱',
    settingsTitle: '系统设置',
    aiApiKeys: 'AI API 密钥', messaging: '通讯软件', ecommerce: '电商平台',
    logistics: '物流', ads: '广告投放', interface: '界面设置',
    save: '保存', saved: '✓ 已保存', darkMode: '深色模式', lightMode: '浅色模式',
    language: '语言', theme: '主题',
    // 内容工厂
    cfTitle: '内容工厂',
    cfSubtitle: 'AI 内容生成 — 文章、社群贴文、广告文案、活动企划',
    cfContentType: '内容类型',
    cfTypeArticle: '营销文章', cfTypeArticleDesc: 'SCQA 结构的营销长文',
    cfTypeSocial: '社群贴文', cfTypeSocialDesc: '高互动社交媒体内容',
    cfTypeAd: '广告文案', cfTypeAdDesc: 'AIDA 结构的广告文案',
    cfTypeCampaign: '活动企划', cfTypeCampaignDesc: 'TIP 模型活动策划书',
    cfGenerateHeading: '生成',
    cfPresetsLabel: '情境范例模板 — 点击填入后，把【】内容换成你的信息',
    cfPlatformLabel: '目标平台（选填）', cfAnyPlatform: '不限平台',
    cfPromptPlaceholder: '描述你想生成的内容，或点击上方情境范例模板快速开始…',
    cfCtrlEnterHint: 'Ctrl+Enter 快速生成',
    cfGenerateBtn: '开始生成', cfGenerating: '生成中…',
    cfOutputTitle: '生成结果', cfCopy: '复制', cfCopied: '已复制到剪贴板！',
    cfAiWorking: 'AI 正在为你生成内容…',
    cfHistoryTitle: '生成记录', cfLoading: '加载中…', cfHistoryEmpty: '还没有生成记录，从上方开始你的第一篇内容吧！',
    // 媒体生成（图片 / 视频 / 音乐）
    cfTypeImage: 'AI 图片', cfTypeImageDesc: '文生图：商品图、社群视觉、Banner',
    cfTypeVideo: 'AI 视频', cfTypeVideoDesc: '文生视频：短片、广告素材',
    cfTypeMusic: 'AI 音乐', cfTypeMusicDesc: '文生音乐：BGM、品牌主题曲',
    cfAspectRatio: '图片比例', cfDuration: '视频时长', cfResolution: '分辨率',
    cfMusicStyle: '音乐风格', cfLyrics: '歌词（选填）',
    cfLyricsPlaceholder: '留空由 AI 根据描述自动写词…',
    cfStylePop: '流行', cfStyleRock: '摇滚', cfStyleElectronic: '电子',
    cfStyleClassical: '古典', cfStyleLofi: 'Lo-fi', cfStyleJazz: '爵士',
    cfMediaQueued: '排队中…', cfMediaProcessing: '生成中', cfMediaFailed: '生成失败',
    cfRetry: '重试', cfDownload: '下载', cfCopyLink: '复制链接', cfLinkCopied: '链接已复制！',
    cfVideoTimeHint: '视频生成约需 1–5 分钟，可先去做别的事',
    cfMusicTimeHint: '音乐生成约需 1–2 分钟',
    cfMockNotice: '模拟结果 — AI 媒体服务未连接，仅供版面预览',
    cfElapsed: '已耗时', cfSecondsUnit: '秒',
    cfMediaPromptPlaceholder: '描述你想生成的内容，或点击上方情境范例模板快速开始…',
    // 语音中台
    voiceHub: '语音中台',
    vhTitle: '语音通话中台',
    vhSubtitle: '与 AI 实时语音交谈 — 通话逐字稿自动同步到通讯中台',
    vhVoiceSelect: 'AI 音色', vhPreview: '试听', vhPreviewing: '播放中…',
    vhStartCall: '开始通话', vhEndCall: '结束通话',
    vhStatusIdle: '选择音色后即可开始通话',
    vhListening: '聆听中…请说话', vhThinking: 'AI 思考中…', vhSpeaking: 'AI 回复中…',
    vhTranscript: '实时逐字稿', vhYou: '你', vhAI: 'AI',
    vhCallDuration: '通话时间',
    vhNoSupport: '此浏览器不支持语音识别，请改用 Chrome 或 Edge',
    vhMicDenied: '无法获取麦克风权限，请允许麦克风访问后重试',
    vhRecentCalls: '近期通话', vhNoCalls: '还没有通话记录，开始你的第一通语音通话吧！',
    vhTurns: '回合', vhViewInComms: '在通讯中台查看',
    vhBrowserVoiceFallback: '云端语音暂不可用，已改用浏览器内置语音',
    vhYourName: '你的称呼（选填）',
    vhMale: '男声', vhFemale: '女声',
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
