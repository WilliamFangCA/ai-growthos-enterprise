const express = require('express');
const router = express.Router();
const { run, all } = require('../db');
const { callAI } = require('../aiRouter');
const { scrapeUrl, searchWeb } = require('../services/scrapeRouter');
const { getKBText, addEntry } = require('./knowledge');
const fsdb = require('../services/firestore');

// AI 經驗紀錄（fire-and-forget，寫 Firestore ai_runs；無憑證時 no-op）
function logAiRun(req, { kind, refId, prompt, output, model }) {
  if (!fsdb.isEnabled()) return;
  try {
    fsdb.getDb().collection('ai_runs').add({
      uid: req.user?.uid || null, kind, refId: refId || '',
      prompt: String(prompt || '').slice(0, 4000), output: String(output || '').slice(0, 8000),
      model: model || '', created_at: fsdb.serverTimestamp(),
    }).catch(() => {});
  } catch (_) {}
}

// 爬蟲資料持久化（fire-and-forget，寫 Firestore scrape_records）
function logScrape(req, scraped, distilled) {
  if (!fsdb.isEnabled()) return;
  try {
    fsdb.getDb().collection('scrape_records').add({
      uid: req.user?.uid || null, url: scraped.url || '', title: scraped.title || '',
      content: String(scraped.content || '').slice(0, 20000), distilled: String(distilled || '').slice(0, 8000),
      provider: scraped.provider || '', source: scraped.source || '', created_at: fsdb.serverTimestamp(),
    }).catch(() => {});
  } catch (_) {}
}

// AI 工具目錄（PRD 4.26 Tool Marketplace；技能取材自運營技能地圖）
// 每個工具 = 輸入欄位 + Prompt 模板，執行時經 AI Router 產出結果
const TOOLS = [
  // ── 爬蟲擷取（type:'scrape'，不走 AI prompt，改走 scrapeRouter；analyze 為選填 AI 蒸餾） ──
  {
    id: 'web-scrape', category: 'scrape', icon: '🌐', name: '萬能網頁擷取',
    type: 'scrape', scrape: { mode: 'url' },
    description: '貼上任意網址（新聞、部落格、電商、官網等前 100 名網站），取回乾淨內文。可選 AI 蒸餾重點並存入知識庫。',
    inputs: [
      { key: 'url', label: '網址', placeholder: '例：https://www.example.com/article', required: true },
      { key: 'analyze', label: 'AI 分析指令（選填）', placeholder: '例：摘要重點 / 抽取所有價格 / 翻成英文 / 歸納文案風格' },
    ],
  },
  {
    id: 'search-scrape', category: 'scrape', icon: '🔍', name: '搜尋引擎擷取',
    type: 'scrape', scrape: { mode: 'search' },
    description: '輸入關鍵字，從 Google / Yahoo / Bing 取回前幾筆搜尋結果摘要。可選 AI 蒸餾並存入知識庫。',
    inputs: [
      { key: 'keyword', label: '搜尋關鍵字', placeholder: '例：2026 AI 行銷趨勢', required: true },
      { key: 'engine', label: '搜尋引擎', type: 'select', options: [
        { value: 'google', label: 'Google' }, { value: 'yahoo', label: 'Yahoo' }, { value: 'bing', label: 'Bing' },
      ] },
      { key: 'analyze', label: 'AI 分析指令（選填）', placeholder: '例：整理出 5 個共同重點 / 歸納主流觀點' },
    ],
  },
  {
    id: 'social-scrape', category: 'scrape', icon: '💬', name: '社群貼文擷取',
    type: 'scrape', scrape: { mode: 'url' },
    description: '貼上 Threads / Facebook / Instagram 的「公開」貼文網址，擷取貼文文字。登入牆/私人內容無法取得（平台限制）。',
    inputs: [
      { key: 'url', label: '公開貼文網址', placeholder: '例：https://www.threads.net/@user/post/...', required: true },
      { key: 'analyze', label: 'AI 分析指令（選填）', placeholder: '例：歸納貼文風格與鉤子 / 抽取 hashtag' },
    ],
  },
  // ── 內容創作 ──
  {
    id: 'product-copy', category: 'content', icon: '🛍️', name: '商品賣點文案',
    description: '輸入商品與目標客群，生成 FAB 法則賣點文案 + 3 組標題',
    inputs: [
      { key: 'product', label: '商品名稱與特色', placeholder: '例：無線降噪耳機，續航 40 小時', required: true },
      { key: 'audience', label: '目標客群', placeholder: '例：通勤上班族' },
    ],
    system: '你是電商文案專家，擅長 FAB（特性-優勢-利益）法則。使用繁體中文。',
    prompt: '為以下商品撰寫銷售文案：\n商品：{product}\n目標客群：{audience}\n\n請輸出：1) 3 組吸睛標題 2) FAB 賣點文案（150字內）3) 一句行動呼籲',
  },
  {
    id: 'email-sequence', category: 'content', icon: '📧', name: '郵件序列生成器',
    description: '依目標自動生成 5 封漸進式郵件序列（主旨 + 內文 + 發送時機）',
    inputs: [
      { key: 'goal', label: '序列目標', placeholder: '例：新用戶 7 天激活', required: true },
      { key: 'product', label: '產品/服務', placeholder: '例：SaaS 行銷工具' },
    ],
    system: '你是 Email 行銷專家，擅長生命週期郵件序列設計。使用繁體中文。',
    prompt: '設計一組郵件序列：\n目標：{goal}\n產品：{product}\n\n輸出 5 封郵件，每封含：發送時機（D0/D1...）、主旨（含 emoji）、內文摘要（100字）、CTA',
  },
  {
    id: 'social-calendar', category: 'content', icon: '📅', name: '社群貼文週曆',
    description: '一鍵生成一週 7 天的社群貼文主題與文案框架',
    inputs: [
      { key: 'brand', label: '品牌/產品', placeholder: '例：手作甜點品牌', required: true },
      { key: 'platform', label: '主要平台', placeholder: '例：Instagram + LINE' },
    ],
    system: '你是社群內容策略師。使用繁體中文。',
    prompt: '為「{brand}」規劃一週社群貼文（平台：{platform}）。\n輸出表格：星期 | 內容類型（教學/互動/促購/幕後/UGC） | 貼文主題 | 開頭金句 | 建議 hashtag',
  },
  // ── SEO ──
  {
    id: 'seo-keywords', category: 'seo', icon: '🔍', name: 'SEO 關鍵字分析師',
    description: '輸入主題，產出關鍵字群集、搜尋意圖分類與優先級建議',
    inputs: [
      { key: 'topic', label: '網站主題/產品', placeholder: '例：寵物保健食品', required: true },
      { key: 'region', label: '目標市場', placeholder: '例：台灣' },
    ],
    system: '你是 SEO 專家，精通關鍵字研究與搜尋意圖分析。使用繁體中文。',
    prompt: '為「{topic}」（市場：{region}）做關鍵字研究：\n1) 10 個核心關鍵字（標注搜尋意圖：資訊型/商業型/交易型）\n2) 5 個長尾關鍵字機會\n3) 優先攻略順序與理由',
  },
  {
    id: 'seo-cluster', category: 'seo', icon: '🗂️', name: '內容群集規劃師',
    description: '生成支柱文章 + 衛星文章的 Content Cluster 架構與 FAQ',
    inputs: [
      { key: 'keyword', label: '核心關鍵字', placeholder: '例：居家健身', required: true },
    ],
    system: '你是內容 SEO 策略師，擅長 Pillar-Cluster 模型。使用繁體中文。',
    prompt: '以「{keyword}」為核心設計內容群集：\n1) 1 篇支柱文章（標題 + 大綱）\n2) 6 篇衛星文章（標題 + 切角）\n3) 5 個 FAQ（適合 Featured Snippet）\n4) 內部連結策略',
  },
  // ── 廣告投放 ──
  {
    id: 'ad-copy', category: 'ads', icon: '📣', name: '廣告文案生成器',
    description: '依平台特性生成 3 版 AIDA 廣告文案（含標題與 CTA）',
    inputs: [
      { key: 'product', label: '推廣產品', placeholder: '例：線上英語課程', required: true },
      { key: 'platform', label: '投放平台', placeholder: '例：Meta / Google / TikTok' },
      { key: 'offer', label: '優惠內容', placeholder: '例：首月 5 折' },
    ],
    system: '你是績效廣告文案專家，熟悉各平台廣告規範與 AIDA 框架。使用繁體中文。',
    prompt: '為「{product}」撰寫 {platform} 廣告文案（優惠：{offer}）：\n輸出 3 個版本（理性訴求/感性訴求/急迫感），每版含：主標題（30字內）、內文（90字內）、CTA 按鈕文字',
  },
  {
    id: 'ad-audience', category: 'ads', icon: '🎯', name: '受眾定向分析師',
    description: '生成廣告受眾畫像、興趣標籤與分層測試計劃',
    inputs: [
      { key: 'product', label: '產品/服務', placeholder: '例：高蛋白健身餐盒', required: true },
      { key: 'budget', label: '月預算', placeholder: '例：NT$30,000' },
    ],
    system: '你是 Media Buyer，擅長受眾策略與 A/B 測試設計。使用繁體中文。',
    prompt: '為「{product}」設計廣告受眾策略（月預算 {budget}）：\n1) 3 組核心受眾畫像（年齡/興趣/行為標籤）\n2) 受眾分層測試計劃（預算分配比例）\n3) 排除受眾建議\n4) 預期 CPA 區間與優化指標',
  },
  // ── 用戶運營 ──
  {
    id: 'rfm-strategy', category: 'crm', icon: '📊', name: 'RFM 分層運營策略',
    description: '依 RFM 模型輸出 8 大客群的差異化運營動作',
    inputs: [
      { key: 'business', label: '業務型態', placeholder: '例：美妝電商，客單價 NT$1,200', required: true },
    ],
    system: '你是 CRM 運營專家，精通 RFM 模型與用戶生命週期管理。使用繁體中文。',
    prompt: '為「{business}」設計 RFM 分層運營方案：\n針對 8 大客群（重要價值/重要保持/重要發展/重要挽留/一般價值/一般保持/一般發展/流失），每群輸出：特徵、運營目標、具體動作（渠道+訊息+優惠）、KPI',
  },
  {
    id: 'winback-message', category: 'crm', icon: '💌', name: '流失喚回訊息生成器',
    description: '依流失天數與用戶價值生成個性化喚回訊息（3 波段）',
    inputs: [
      { key: 'scenario', label: '流失情境', placeholder: '例：高價值客戶 60 天未回購', required: true },
      { key: 'channel', label: '發送渠道', placeholder: '例：LINE + Email' },
    ],
    system: '你是用戶留存專家，擅長喚回序列設計。語氣親切不騷擾。使用繁體中文。',
    prompt: '設計流失喚回序列：\n情境：{scenario}\n渠道：{channel}\n\n輸出 3 波段訊息（關心試探→提供誘因→最後機會），每波含：發送時機、訊息全文（含 emoji）、預期回流率',
  },
  {
    id: 'persona', category: 'crm', icon: '🧑‍🤝‍🧑', name: '用戶畫像生成器',
    description: '生成 3 組目標用戶 Persona（動機、痛點、購買旅程）',
    inputs: [
      { key: 'product', label: '產品描述', placeholder: '例：親子露營裝備租賃平台', required: true },
    ],
    system: '你是用戶研究專家，擅長 Persona 建構。使用繁體中文。',
    prompt: '為「{product}」建立 3 組用戶畫像，每組含：姓名/年齡/職業、生活情境、核心動機、3 大痛點、購買決策旅程（認知→考慮→決策）、最有效的觸達渠道與訊息',
  },
  // ── 活動與社群 ──
  {
    id: 'tip-campaign', category: 'community', icon: '🎪', name: 'TIP 活動策劃師',
    description: '工具×場景×包裝模型，一鍵生成完整活動策劃書',
    inputs: [
      { key: 'goal', label: '活動目標', placeholder: '例：雙11 拉新 1000 名會員', required: true },
      { key: 'budget', label: '預算', placeholder: '例：NT$50,000' },
    ],
    system: '你是活動運營專家，使用 TIP 模型（Tool 工具 × Implementation 場景 × Packaging 包裝）。使用繁體中文。',
    prompt: '用 TIP 模型策劃活動：\n目標：{goal}\n預算：{budget}\n\n輸出策劃書：1) 活動主題與包裝 2) 工具選擇（優惠券/拼團/抽獎...）3) 場景設計（觸達→參與→轉化→分享）4) 時程表 5) 預算分配 6) KPI 與效果預測',
  },
  {
    id: 'community-warmup', category: 'community', icon: '🔥', name: '社群暖場話題庫',
    description: '生成 10 個社群互動話題 + 積分任務設計，激活沉默成員',
    inputs: [
      { key: 'community', label: '社群屬性', placeholder: '例：母嬰用品 LINE 群，500 人', required: true },
    ],
    system: '你是社群運營專家，擅長提升社群活躍度。使用繁體中文。',
    prompt: '為「{community}」設計暖場方案：\n1) 10 個互動話題（標注類型：話題討論/投票/接龍/曬照/問答）\n2) 3 個積分任務設計（任務+獎勵+頻率）\n3) 一週暖場排程建議',
  },
  {
    id: 'event-plan', category: 'community', icon: '🎟️', name: '線下活動全流程規劃',
    description: '報名→提醒→簽到→感謝→回放，全流程通知文案一次生成',
    inputs: [
      { key: 'event', label: '活動資訊', placeholder: '例：會員品酒會，50 人，6/30 晚上', required: true },
    ],
    system: '你是活動管理專家。使用繁體中文。',
    prompt: '為「{event}」設計全流程自動化通知：\n輸出 6 則訊息（報名確認/前3天提醒/前1天提醒/簽到歡迎/活動後感謝/回放通知），每則含發送時機與完整文案（含 emoji），最後附簽到動線與物料清單',
  },
  // ── 客服與數據 ──
  {
    id: 'faq-builder', category: 'service', icon: '📚', name: '客服 FAQ 知識庫生成',
    description: '依產品生成 15 條常見問答，可直接匯入 AI 客服知識庫',
    inputs: [
      { key: 'product', label: '產品/服務', placeholder: '例：訂閱制鮮花配送', required: true },
    ],
    system: '你是客服知識庫專家。回答需精確、友善、可直接使用。使用繁體中文。',
    prompt: '為「{product}」建立客服 FAQ：\n涵蓋：訂購流程/付款/配送/退換貨/帳號/會員權益 6 大類，共 15 條問答。每條格式：Q: ... / A: ...（A 需 80 字內，語氣親切）',
  },
  {
    id: 'pricing-advisor', category: 'data', icon: '💰', name: '定價策略診斷',
    description: '輸入產品與成本結構，獲得三層定價方案與心理定價技巧',
    inputs: [
      { key: 'product', label: '產品與成本', placeholder: '例：線上課程，製作成本 10 萬，目標毛利 70%', required: true },
      { key: 'competitors', label: '競品價格', placeholder: '例：競品 A NT$2,990、競品 B NT$4,500' },
    ],
    system: '你是定價策略顧問，精通價值定價與心理定價。使用繁體中文。',
    prompt: '為以下產品設計定價：\n{product}\n競品：{competitors}\n\n輸出：1) 三層定價方案（入門/主推/旗艦，含錨定設計）2) 心理定價技巧應用 3) 促銷折扣底線 4) 預期轉化分布',
  },
  {
    id: 'funnel-audit', category: 'data', icon: '🔻', name: 'AARRR 漏斗診斷',
    description: '輸入各層數據，AI 找出最大瓶頸並給出優化動作',
    inputs: [
      { key: 'metrics', label: '漏斗數據', placeholder: '例：訪客 10000 → 註冊 800 → 首購 120 → 復購 30 → 推薦 5', required: true },
    ],
    system: '你是增長分析師，精通 AARRR 海盜指標。使用繁體中文。',
    prompt: '診斷以下 AARRR 漏斗：\n{metrics}\n\n輸出：1) 各層轉化率計算與行業基準對比 2) 最大瓶頸定位 3) 3 個優先優化實驗（假設/做法/預期提升）4) 北極星指標建議',
  },
  // ── 行銷增長 ──
  {
    id: 'kol-outreach', category: 'marketing', icon: '🌟', name: 'KOL 合作邀約信',
    description: '生成個性化網紅合作邀約信（含合作方案與報價框架）',
    inputs: [
      { key: 'brand', label: '品牌與產品', placeholder: '例：天然護膚品牌，主打敏感肌精華液', required: true },
      { key: 'kol', label: 'KOL 類型/名稱', placeholder: '例：美妝類 5-10 萬粉微網紅' },
      { key: 'budget', label: '合作預算', placeholder: '例：單篇 NT$15,000 或互惠' },
    ],
    system: '你是 KOL 行銷專家，擅長撰寫高回覆率的合作邀約。語氣真誠不油膩。使用繁體中文。',
    prompt: '撰寫 KOL 合作邀約信：\n品牌：{brand}\n對象：{kol}\n預算：{budget}\n\n輸出：1) 邀約信全文（為什麼選他/她、合作內容、雙方獲益）2) 3 種合作方案（業配文/開箱影片/長期大使）3) 跟進訊息（3 天未回覆時）',
  },
  {
    id: 'retargeting-copy', category: 'marketing', icon: '🎯', name: '再行銷文案組合',
    description: '針對瀏覽未購買/棄購人群，生成多波段再行銷文案',
    inputs: [
      { key: 'product', label: '產品', placeholder: '例：人體工學椅 NT$8,990', required: true },
      { key: 'objection', label: '主要猶豫原因', placeholder: '例：價格偏高、怕不合身' },
    ],
    system: '你是轉化率優化專家，精通再行銷心理學（損失規避/社會證明/急迫感）。使用繁體中文。',
    prompt: '為「{product}」設計再行銷文案（猶豫原因：{objection}）：\n輸出 3 波段：第 1 波（24h 內，喚起記憶+解除疑慮）、第 2 波（3 天，社會證明+評價）、第 3 波（7 天，限時優惠最後機會）。每波含廣告標題、內文、CTA。',
  },
  {
    id: 'ab-headline', category: 'marketing', icon: '🆎', name: 'A/B 標題測試器',
    description: '一個主題生成 5 組對照標題（不同心理觸發點）+ 勝出預測',
    inputs: [
      { key: 'topic', label: '內容主題', placeholder: '例：新課程上線：30 天學會 AI 行銷', required: true },
      { key: 'channel', label: '使用場景', placeholder: '例：Email 主旨 / FB 廣告標題 / Landing Page' },
    ],
    system: '你是文案測試專家，精通標題心理學（好奇缺口/數字/恐懼/利益/社會證明）。使用繁體中文。',
    prompt: '為「{topic}」生成 A/B 測試標題（場景：{channel}）：\n輸出 5 組標題，每組標注：心理觸發點類型、適合受眾、預測 CTR 排名與理由。最後給出建議的測試順序與樣本量。',
  },
  {
    id: 'affiliate-recruit', category: 'marketing', icon: '🤝', name: '聯盟夥伴招募信',
    description: '生成聯盟行銷/分銷夥伴招募文案（含分潤說明）',
    inputs: [
      { key: 'program', label: '聯盟計劃內容', placeholder: '例：分潤 20%，cookie 30 天，月結', required: true },
      { key: 'target', label: '招募對象', placeholder: '例：部落客、團媽、社群版主' },
    ],
    system: '你是聯盟行銷專家。文案需清楚呈現賺錢邏輯與信任感。使用繁體中文。',
    prompt: '撰寫聯盟夥伴招募文案：\n計劃：{program}\n對象：{target}\n\n輸出：1) 招募頁文案（痛點開場→收益試算範例→加入步驟）2) 私訊邀約短版 3) 常見疑慮 FAQ 5 條',
  },
  {
    id: 'promo-calendar', category: 'marketing', icon: '🗓️', name: '促銷檔期年度規劃',
    description: '依產業生成 12 個月促銷檔期地圖（節慶+自創檔期）',
    inputs: [
      { key: 'business', label: '業務型態', placeholder: '例：母嬰用品電商', required: true },
    ],
    system: '你是電商促銷規劃專家，熟悉台灣節慶與電商大檔。使用繁體中文。',
    prompt: '為「{business}」規劃年度促銷檔期：\n輸出 12 個月檔期表：月份 | 檔期名稱（節慶或自創）| 主題包裝 | 主推策略 | 預期業績占比。標注 3 個最重要大檔的提前準備清單（前 4 週開始）。',
  },
  {
    id: 'unboxing-ugc', category: 'marketing', icon: '📦', name: '開箱 UGC 腳本',
    description: '生成顧客開箱短影音腳本模板，方便 UGC 徵集活動使用',
    inputs: [
      { key: 'product', label: '產品', placeholder: '例：手沖咖啡禮盒', required: true },
    ],
    system: '你是短影音內容專家，擅長 15-60 秒開箱腳本。使用繁體中文。',
    prompt: '為「{product}」設計開箱 UGC 腳本：\n輸出 3 個版本（15秒快剪版/30秒體驗版/60秒深度版），每版含：分鏡（秒數+畫面+台詞）、開頭 3 秒鉤子、結尾 CTA。附「給素人顧客的拍攝小抄」5 點。',
  },
  {
    id: 'referral-program', category: 'marketing', icon: '🔗', name: '轉介紹活動設計',
    description: '設計老帶新雙向獎勵機制（含防刷與推廣節奏）',
    inputs: [
      { key: 'business', label: '業務與客單價', placeholder: '例：健身房月費 NT$1,500', required: true },
      { key: 'goal', label: '目標', placeholder: '例：3 個月新增 200 名會員' },
    ],
    system: '你是增長黑客，精通 Referral 機制設計與 K 因子優化。使用繁體中文。',
    prompt: '為「{business}」設計轉介紹活動（目標：{goal}）：\n輸出：1) 雙向獎勵機制（推薦人/被推薦人各得什麼，成本試算）2) 推薦流程設計（3 步內完成）3) 防刷規則 4) 3 波推廣節奏與文案 5) 預估 K 因子與 ROI',
  },
  {
    id: 'livestream-script', category: 'marketing', icon: '📺', name: '直播帶貨腳本',
    description: '生成完整直播腳本：開場暖場→產品講解→逼單→抽獎留人',
    inputs: [
      { key: 'products', label: '直播商品', placeholder: '例：3 款保養品，主推精華液 NT$1,280', required: true },
      { key: 'duration', label: '直播時長', placeholder: '例：60 分鐘' },
    ],
    system: '你是直播電商操盤手，精通直播話術與節奏控場。使用繁體中文。',
    prompt: '設計直播帶貨腳本：\n商品：{products}\n時長：{duration}\n\n輸出分段腳本：開場暖場（互動拉人）→ 每款產品講解（痛點+演示+見證+價格錨定）→ 逼單話術（限量/限時/贈品）→ 中場抽獎留人 → 結尾預告。每段含時間分配與關鍵台詞。',
  },
];

const CATEGORIES = [
  { key: 'scrape',    name: '爬蟲擷取', icon: '🕷️' },
  { key: 'marketing', name: '行銷增長', icon: '📈' },
  { key: 'content',   name: '內容創作', icon: '✍️' },
  { key: 'seo',       name: 'SEO',     icon: '🔍' },
  { key: 'ads',       name: '廣告投放', icon: '📣' },
  { key: 'crm',       name: '用戶運營', icon: '👥' },
  { key: 'community', name: '社群活動', icon: '🎪' },
  { key: 'service',   name: '客服',     icon: '🎧' },
  { key: 'data',      name: '數據策略', icon: '📊' },
];

// GET /api/tools — 工具目錄
router.get('/', (req, res) => {
  const { category } = req.query;
  // 剝除內部欄位（system/prompt/scrape）；保留 type 讓前端辨識爬蟲工具
  let tools = TOOLS.map(({ system, prompt, scrape, ...meta }) => meta);
  if (category && category !== 'all') tools = tools.filter(t => t.category === category);
  res.json({ tools, categories: CATEGORIES });
});

// GET /api/tools/history — 最近執行記錄
router.get('/history', (req, res) => {
  try {
    const rows = all(`SELECT * FROM content_history WHERE type LIKE 'tool:%' ORDER BY created_at DESC LIMIT 20`);
    res.json(rows.map(r => {
      const toolId = r.type.slice(5);
      const tool = TOOLS.find(t => t.id === toolId);
      return { ...r, tool_id: toolId, tool_name: tool?.name || toolId, tool_icon: tool?.icon || '🧰' };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tools/:id/run — 執行工具（爬蟲走 scrapeRouter，其餘走 AI Router；結果存入 content_history）
router.post('/:id/run', async (req, res) => {
  try {
    const tool = TOOLS.find(t => t.id === req.params.id);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    const inputs = req.body.inputs || {};
    const missing = tool.inputs.filter(f => f.required && !String(inputs[f.key] || '').trim());
    if (missing.length) {
      return res.status(400).json({ error: `請填寫：${missing.map(f => f.label).join('、')}` });
    }

    if (tool.type === 'scrape') return runScrapeTool(tool, inputs, req, res);

    // 引用知識庫（選定庫內容前置注入 system）
    let system = tool.system;
    const kbText = await getKBText(req.body.kb_ids);
    if (kbText) system += `\n\n${kbText}`;

    let prompt = tool.prompt;
    for (const field of tool.inputs) {
      prompt = prompt.replaceAll(`{${field.key}}`, String(inputs[field.key] || '未指定').trim());
    }

    const result = await callAI(prompt, system, {
      model: req.body.model || 'glm-5-turbo',
      maxTokens: 2000,
    });

    run(`INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)`,
      [`tool:${tool.id}`, prompt, result.content, result.model, result.tokensUsed]);
    logAiRun(req, { kind: 'tool', refId: tool.id, prompt, output: result.content, model: result.model });

    res.json({
      tool_id: tool.id,
      tool_name: tool.name,
      output: result.content,
      model: result.model,
      source: result.source,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 爬蟲工具執行：擷取 → 選填 AI 蒸餾 → 選填存入知識庫 → 寫 content_history
async function runScrapeTool(tool, inputs, req, res) {
  // 1) 擷取
  let scraped;
  if (tool.scrape.mode === 'search') {
    scraped = await searchWeb(inputs.keyword, inputs.engine || 'google');
  } else {
    scraped = await scrapeUrl(inputs.url);
  }

  const header = `🔗 來源：${scraped.url}\n📄 標題：${scraped.title || '（無標題）'}\n🛠️ 擷取方式：${scraped.provider}${scraped.truncated ? '（內容已截斷）' : ''}`;
  const rawBody = scraped.content || '（無內容）';

  // 2) 選填 AI 蒸餾
  const analyze = String(inputs.analyze || '').trim();
  let distilled = '';
  let model = scraped.provider;
  let source = scraped.source;
  if (analyze && scraped.source !== 'mock') {
    const aiResult = await callAI(
      `以下是從網頁擷取的內容，請依指令處理：\n\n【指令】${analyze}\n\n【網頁內容】\n${rawBody.slice(0, 6000)}`,
      '你是資料分析與知識萃取專家，擅長從原始網頁內容歸納可複用的重點、風格與模式。使用繁體中文，輸出條理清晰。',
      { model: req.body.model || 'glm-5-turbo', maxTokens: 1500 }
    );
    distilled = aiResult.content;
    model = `${scraped.provider} + ${aiResult.model}`;
    source = aiResult.source === 'mock' ? scraped.source : aiResult.source;
  }

  const output = distilled
    ? `${header}\n\n━━━ AI 分析結果 ━━━\n${distilled}\n\n━━━ 原始內容 ━━━\n${rawBody}`
    : `${header}\n\n${rawBody}`;

  // 3) 選填存入知識庫（以蒸餾結果優先，否則原文）；id 為字串（Firestore）或數字（SQLite），不可 parseInt
  let savedToKb = null;
  const kbId = String(inputs.save_to_kb || '').trim();
  if (kbId) {
    const ok = await addEntry(kbId, {
      title: scraped.title || scraped.url,
      content: distilled || rawBody,
      source_url: scraped.url,
      source_type: 'scrape',
    });
    savedToKb = ok ? kbId : null;
  }

  // 持久化爬蟲資料 + AI 經驗（Firestore，fire-and-forget）
  logScrape(req, scraped, distilled);
  logAiRun(req, { kind: 'tool', refId: tool.id, prompt: scraped.url, output, model });

  run(`INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)`,
    [`tool:${tool.id}`, scraped.url, output, model, 0]);

  res.json({
    tool_id: tool.id,
    tool_name: tool.name,
    output,
    model,
    source,
    saved_to_kb: savedToKb,
  });
}

module.exports = router;
