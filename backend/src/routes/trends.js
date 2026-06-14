// 全球趨勢雷達 API（/api/trends）
// 多來源情報系統：聚合全球新聞 / 新產品 / 流行趨勢 / 社群熱話 / 新創 / 投資 /
// 消費者需求 / AI 熱門產品 / 各國時事，跨 9 大維度即時抓取 RSS/Atom 並用 AI 蒸餾洞察。
//
// 設計原則（仿 aiRouter / scrapeRouter）：
//   • 每個維度有一組可靠的 RSS feed（live 抓取）+ 一份完整來源目錄（情報來源展示）
//   • 抓取統一走 fetchFeed（瀏覽器 UA + timeout + try/catch），全失敗回標示清楚的 mock
//   • in-memory cache（TTL 15 分）避免每次切 tab 都打外部站
//   • AI 蒸餾走 aiRouter.callAI；報告存 content_history type=`trend:<dim>`（與工具箱一致）

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { run, all } = require('../db');
const { callAI } = require('../aiRouter');
const { getKBText, addEntry } = require('./knowledge');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const CACHE_TTL_MS = 15 * 60 * 1000;  // 資料快取 15 分鐘（過期走背景刷新，不阻塞）
const BRIEF_TTL_MS = 30 * 60 * 1000;  // AI 簡報快取 30 分鐘
const FEED_TIMEOUT_MS = 9000;
const MAX_ITEMS_PER_DIM = 40;
const SNAPSHOT_FILE = path.join(__dirname, '..', '..', 'data', 'trends-snapshot.json');

// ── 各國/地區 → Google News 參數 + 經緯度（等距矩形投影定位用）+ 洲別分組 ──────────
// 無官方 Google News edition 的地區用 q（改走 gnewsSearch 搜尋該國新聞）。
const REGIONS = {
  global: { label: '全球',     group: '全球', hl: 'en-US',  gl: 'US', ceid: 'US:en',      lat: 20,   lon: 0 },
  // 北美
  us:  { label: '美國',     group: '北美', hl: 'en-US',  gl: 'US', ceid: 'US:en',       lat: 38,   lon: -97 },
  ca:  { label: '加拿大',   group: '北美', hl: 'en-CA',  gl: 'CA', ceid: 'CA:en',       lat: 56,   lon: -106 },
  mx:  { label: '墨西哥',   group: '北美', hl: 'es-419', gl: 'MX', ceid: 'MX:es-419',   lat: 23,   lon: -102 },
  // 南美
  br:  { label: '巴西',     group: '南美', hl: 'pt-BR',  gl: 'BR', ceid: 'BR:pt-419',   lat: -10,  lon: -55 },
  ar:  { label: '阿根廷',   group: '南美', hl: 'es-419', gl: 'AR', ceid: 'AR:es-419',   lat: -34,  lon: -64 },
  // 歐洲
  gb:  { label: '英國',     group: '歐洲', hl: 'en-GB',  gl: 'GB', ceid: 'GB:en',       lat: 54,   lon: -2 },
  de:  { label: '德國',     group: '歐洲', hl: 'de',     gl: 'DE', ceid: 'DE:de',       lat: 51,   lon: 10 },
  fr:  { label: '法國',     group: '歐洲', hl: 'fr',     gl: 'FR', ceid: 'FR:fr',       lat: 46,   lon: 2 },
  it:  { label: '義大利',   group: '歐洲', hl: 'it',     gl: 'IT', ceid: 'IT:it',       lat: 42,   lon: 12 },
  es:  { label: '西班牙',   group: '歐洲', hl: 'es',     gl: 'ES', ceid: 'ES:es',       lat: 40,   lon: -4 },
  nl:  { label: '荷蘭',     group: '歐洲', hl: 'nl',     gl: 'NL', ceid: 'NL:nl',       lat: 52,   lon: 5 },
  se:  { label: '瑞典',     group: '歐洲', hl: 'sv',     gl: 'SE', ceid: 'SE:sv',       lat: 62,   lon: 15 },
  pl:  { label: '波蘭',     group: '歐洲', hl: 'pl',     gl: 'PL', ceid: 'PL:pl',       lat: 52,   lon: 19 },
  ua:  { label: '烏克蘭',   group: '歐洲', hl: 'uk',     gl: 'UA', ceid: 'UA:uk',       lat: 49,   lon: 32 },
  ru:  { label: '俄羅斯',   group: '歐洲', hl: 'ru',     gl: 'RU', ceid: 'RU:ru',       lat: 61,   lon: 100 },
  // 中東
  il:  { label: '以色列',   group: '中東', hl: 'he',     gl: 'IL', ceid: 'IL:he',       lat: 31,   lon: 35 },
  ae:  { label: '阿聯',     group: '中東', hl: 'ar',     gl: 'AE', ceid: 'AE:ar',       lat: 24,   lon: 54 },
  sa:  { label: '沙烏地',   group: '中東', hl: 'ar',     gl: 'SA', ceid: 'SA:ar',       lat: 24,   lon: 45 },
  tr:  { label: '土耳其',   group: '中東', hl: 'tr',     gl: 'TR', ceid: 'TR:tr',       lat: 39,   lon: 35 },
  eg:  { label: '埃及',     group: '中東', hl: 'ar',     gl: 'EG', ceid: 'EG:ar',       lat: 27,   lon: 30 },
  // 非洲
  za:  { label: '南非',     group: '非洲', hl: 'en-ZA',  gl: 'ZA', ceid: 'ZA:en',       lat: -29,  lon: 24 },
  ng:  { label: '奈及利亞', group: '非洲', hl: 'en-NG',  gl: 'NG', ceid: 'NG:en',       lat: 9,    lon: 8 },
  ke:  { label: '肯亞',     group: '非洲', hl: 'en-KE',  gl: 'KE', ceid: 'KE:en',       lat: 0,    lon: 38 },
  // 亞太
  cn:  { label: '中國',     group: '亞太', hl: 'zh-CN',  gl: 'CN', ceid: 'CN:zh-Hans',  lat: 35,   lon: 104 },
  hk:  { label: '香港',     group: '亞太', hl: 'zh-HK',  gl: 'HK', ceid: 'HK:zh-Hant',  lat: 22,   lon: 114 },
  tw:  { label: '台灣',     group: '亞太', hl: 'zh-TW',  gl: 'TW', ceid: 'TW:zh-Hant',  lat: 23.7, lon: 121 },
  jp:  { label: '日本',     group: '亞太', hl: 'ja',     gl: 'JP', ceid: 'JP:ja',       lat: 36,   lon: 138 },
  kr:  { label: '韓國',     group: '亞太', hl: 'ko',     gl: 'KR', ceid: 'KR:ko',       lat: 36.5, lon: 127.8 },
  in:  { label: '印度',     group: '亞太', hl: 'en-IN',  gl: 'IN', ceid: 'IN:en',       lat: 22,   lon: 79 },
  sg:  { label: '新加坡',   group: '亞太', hl: 'en-SG',  gl: 'SG', ceid: 'SG:en',       lat: 1.3,  lon: 103.8 },
  id:  { label: '印尼',     group: '亞太', hl: 'id',     gl: 'ID', ceid: 'ID:id',       lat: -2,   lon: 118 },
  th:  { label: '泰國',     group: '亞太', hl: 'th',     gl: 'TH', ceid: 'TH:th',       lat: 15,   lon: 100 },
  vn:  { label: '越南',     group: '亞太', hl: 'vi',     gl: 'VN', ceid: 'VN:vi',       lat: 16,   lon: 106 },
  ph:  { label: '菲律賓',   group: '亞太', hl: 'en-PH',  gl: 'PH', ceid: 'PH:en',       lat: 13,   lon: 122 },
  my:  { label: '馬來西亞', group: '亞太', hl: 'en-MY',  gl: 'MY', ceid: 'MY:en',       lat: 4,    lon: 102 },
  mn:  { label: '蒙古',     group: '亞太', hl: 'en-US',  gl: 'US', ceid: 'US:en', q: 'Mongolia', lat: 47, lon: 103 },
  // 大洋洲
  au:  { label: '澳洲',     group: '大洋洲', hl: 'en-AU', gl: 'AU', ceid: 'AU:en',      lat: -25,  lon: 133 },
  nz:  { label: '紐西蘭',   group: '大洋洲', hl: 'en-NZ', gl: 'NZ', ceid: 'NZ:en',      lat: -41,  lon: 174 },
};
// 世界地圖熱點追蹤的國家（排除 global）= 其餘全部
const MAP_REGIONS = Object.keys(REGIONS).filter(k => k !== 'global');

function gnewsTop(region) {
  const r = REGIONS[region] || REGIONS.global;
  if (r.q) return gnewsSearch(r.q, region); // 無 edition → 搜尋該國新聞
  return `https://news.google.com/rss?hl=${r.hl}&gl=${r.gl}&ceid=${r.ceid}`;
}
function gnewsSearch(query, region) {
  const r = REGIONS[region] || REGIONS.global;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${r.hl}&gl=${r.gl}&ceid=${r.ceid}`;
}
function gnewsTopic(topic, region) {
  const r = REGIONS[region] || REGIONS.global;
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${r.hl}&gl=${r.gl}&ceid=${r.ceid}`;
}

// ── 9 大維度情報目錄 ──────────────────────────────────────────────────────────
// feeds(region) → 該維度實際抓取的 RSS 清單；sites → 完整來源目錄（前端展示「情報來源」）
const DIMENSIONS = [
  {
    id: 'news', label: '各產業新聞', icon: '📰', color: '#3b82f6',
    desc: '全球即時新聞聚合（Google News / BBC / CNBC / TechCrunch / The Verge）',
    feeds: (region) => [
      { name: 'Google News', url: gnewsTop(region) },
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    ],
    sites: ['Google News', 'Reuters', 'Bloomberg', 'BBC News', 'CNBC', 'Financial Times', 'TechCrunch', 'The Verge', 'Axios', 'Associated Press'],
    subs: [
      { id: 'news.top', label: '總體頭條', feeds: (region) => [{ name: 'Google News', url: gnewsTop(region) }] },
      { id: 'news.tech', label: '科技', query: 'technology' },
      { id: 'news.finance', label: '財經金融', query: 'finance OR economy OR markets' },
      { id: 'news.health', label: '健康醫療', query: 'health OR medicine OR healthcare' },
      { id: 'news.energy', label: '能源環境', query: 'energy OR climate OR environment' },
      { id: 'news.policy', label: '政策法規', query: 'policy OR regulation OR government' },
    ],
  },
  {
    id: 'products', label: '新產品上市', icon: '🚀', color: '#8b5cf6',
    desc: '全球產品發表與科技新品（Product Hunt / The Verge / Engadget）',
    feeds: () => [
      { name: 'Product Hunt', url: 'https://www.producthunt.com/feed' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    ],
    sites: ['Product Hunt', 'Kickstarter', 'Indiegogo', 'CES', 'MWC Barcelona', 'IFA Berlin', 'Computex Taipei', 'GitHub Trending', 'App Store Charts', 'Amazon Launchpad'],
    subs: [
      { id: 'products.electronics', label: '消費電子', query: 'consumer electronics OR gadget launch',
        feeds: () => [{ name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' }, { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' }] },
      { id: 'products.software', label: '軟體·App', query: 'software release OR app launch',
        feeds: () => [{ name: 'Product Hunt', url: 'https://www.producthunt.com/feed' }] },
      { id: 'products.crowdfunding', label: '群眾募資', query: 'Kickstarter OR Indiegogo crowdfunding' },
      { id: 'products.auto', label: '汽車·EV', query: 'electric vehicle OR new car launch' },
      { id: 'products.appstore', label: '應用排行', query: 'top apps OR trending app store' },
    ],
  },
  {
    id: 'trends', label: '流行趨勢', icon: '📈', color: '#10b981',
    desc: '搜尋與消費趨勢（Google Trends / Trend Hunter / Springwise）',
    feeds: (region) => [
      { name: 'Google Trends', url: `https://trends.google.com/trending/rss?geo=${(REGIONS[region]||REGIONS.global).gl}` },
      { name: 'Trend Hunter', url: 'https://www.trendhunter.com/rss' },
      { name: 'Springwise', url: 'https://www.springwise.com/feed/' },
    ],
    sites: ['Google Trends', 'Trend Hunter', 'Exploding Topics', 'TrendWatching', 'Springwise', 'PSFK', 'TrendWitch', 'Rising Trends', 'Pinterest Trends', 'TikTok Creative Center'],
    subs: [
      { id: 'trends.search', label: '搜尋熱搜', feeds: (region) => [{ name: 'Google Trends', url: `https://trends.google.com/trending/rss?geo=${(REGIONS[region]||REGIONS.global).gl}` }] },
      { id: 'trends.innovation', label: '設計創新', feeds: () => [{ name: 'Trend Hunter', url: 'https://www.trendhunter.com/rss' }, { name: 'Springwise', url: 'https://www.springwise.com/feed/' }] },
      { id: 'trends.fashion', label: '時尚生活', query: 'fashion trend OR lifestyle trend' },
      { id: 'trends.food', label: '飲食餐飲', query: 'food trend OR restaurant trend' },
      { id: 'trends.sustainability', label: '永續綠色', query: 'sustainability OR eco friendly OR green trend' },
    ],
  },
  {
    id: 'social', label: '社群熱門話題', icon: '💬', color: '#ec4899',
    desc: '社群即時熱話（Reddit 熱門 / YouTube / 各平台趨勢）',
    feeds: () => [
      { name: 'Reddit Popular', url: 'https://www.reddit.com/r/popular/top/.rss?t=day' },
      { name: 'Reddit Tech', url: 'https://www.reddit.com/r/technology/top/.rss?t=day' },
      { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
    ],
    sites: ['Reddit', 'X (Twitter) Trends', 'TikTok Creative Center', 'YouTube Trending', 'Pinterest Trends', 'Instagram Explore', 'Threads', 'LinkedIn News', 'Discord Discovery', 'Quora'],
    subs: [
      { id: 'social.reddit', label: 'Reddit 熱門', feeds: () => [{ name: 'Reddit Popular', url: 'https://www.reddit.com/r/popular/top/.rss?t=day' }] },
      { id: 'social.tech', label: '科技社群', feeds: () => [{ name: 'Hacker News', url: 'https://hnrss.org/frontpage' }, { name: 'Reddit Tech', url: 'https://www.reddit.com/r/technology/top/.rss?t=day' }] },
      { id: 'social.video', label: '影音娛樂', query: 'viral video OR trending YouTube', feeds: () => [{ name: 'Reddit Videos', url: 'https://www.reddit.com/r/videos/top/.rss?t=day' }] },
      { id: 'social.meme', label: '迷因文化', feeds: () => [{ name: 'Reddit Memes', url: 'https://www.reddit.com/r/memes/top/.rss?t=day' }] },
      { id: 'social.finance', label: '財經社群', feeds: () => [{ name: 'r/wallstreetbets', url: 'https://www.reddit.com/r/wallstreetbets/top/.rss?t=day' }, { name: 'r/stocks', url: 'https://www.reddit.com/r/stocks/top/.rss?t=day' }] },
      { id: 'social.buzz', label: '熱議話題', query: 'trending topic OR going viral OR social media buzz' },
    ],
  },
  {
    id: 'startups', label: '新創公司', icon: '🌱', color: '#f59e0b',
    desc: '新創動態與孵化器（Product Hunt / YC / TechCrunch Startups / EU-Startups）',
    feeds: () => [
      { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/' },
      { name: 'Product Hunt', url: 'https://www.producthunt.com/feed' },
      { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/' },
      { name: 'Y Combinator (HN)', url: 'https://hnrss.org/show' },
    ],
    sites: ['Product Hunt', 'Y Combinator', 'Crunchbase', 'Dealroom', 'AngelList Wellfound', 'TechCrunch Startups', 'EU-Startups', 'StartupBlink', 'Seedtable', 'F6S'],
    subs: [
      { id: 'startups.early', label: '早期新創', feeds: () => [{ name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/' }] },
      { id: 'startups.yc', label: 'YC·加速器', query: 'Y Combinator OR startup accelerator', feeds: () => [{ name: 'YC (HN)', url: 'https://hnrss.org/show' }] },
      { id: 'startups.eu', label: '歐洲新創', feeds: () => [{ name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/' }, { name: 'Sifted', url: 'https://sifted.eu/feed' }] },
      { id: 'startups.asia', label: '亞洲新創', query: 'Asia startup OR Southeast Asia startup OR India startup' },
      { id: 'startups.funding', label: '募資新聞', query: 'startup funding round OR seed round OR series A' },
    ],
  },
  {
    id: 'investment', label: '投資趨勢', icon: '💰', color: '#06b6d4',
    desc: '創投與資本市場（TechCrunch Venture / Sifted / Yahoo Finance / Fortune）',
    feeds: () => [
      { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/' },
      { name: 'Sifted', url: 'https://sifted.eu/feed' },
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
      { name: 'Fortune', url: 'https://fortune.com/feed/' },
    ],
    sites: ['PitchBook', 'Crunchbase', 'CB Insights', 'Dealroom', 'Sifted', 'TechCrunch VC', 'The Information', 'Fortune', 'Bloomberg Markets', 'Yahoo Finance'],
    subs: [
      { id: 'invest.vc', label: '創投 VC', feeds: () => [{ name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/' }, { name: 'Sifted', url: 'https://sifted.eu/feed' }] },
      { id: 'invest.stocks', label: '股市大盤', query: 'stock market OR equities', feeds: () => [{ name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' }] },
      { id: 'invest.crypto', label: '加密貨幣', query: 'crypto OR bitcoin OR ethereum' },
      { id: 'invest.commodities', label: '商品原物料', query: 'commodities OR oil price OR gold price' },
      { id: 'invest.ma', label: '併購·IPO', query: 'merger acquisition OR IPO' },
      { id: 'invest.macro', label: '總體經濟', query: 'inflation OR interest rate OR central bank' },
    ],
  },
  {
    id: 'consumer', label: '消費者需求', icon: '🛒', color: '#a855f7',
    desc: '消費趨勢與電商熱銷信號（TrendWatching / Springwise / 零售新聞）',
    feeds: (region) => [
      { name: 'Springwise', url: 'https://www.springwise.com/feed/' },
      { name: 'Trend Hunter', url: 'https://www.trendhunter.com/rss' },
      { name: '電商趨勢 (Google News)', url: gnewsSearch('consumer trends OR best sellers OR ecommerce', region) },
    ],
    sites: ['Amazon Best Sellers', 'Alibaba', 'AliExpress', 'Temu', 'TikTok Shop', 'eBay Trending', 'Etsy Trends', 'Walmart Marketplace', 'Shopee', 'Lazada'],
    subs: [
      { id: 'consumer.ecommerce', label: '電商熱銷', query: 'ecommerce trend OR best sellers OR online shopping' },
      { id: 'consumer.retail', label: '零售趨勢', query: 'retail trend OR retail sales' },
      { id: 'consumer.behavior', label: '消費行為', query: 'consumer behavior OR spending trend', feeds: () => [{ name: 'Springwise', url: 'https://www.springwise.com/feed/' }] },
      { id: 'consumer.dtc', label: 'DTC 品牌', query: 'DTC brand OR direct to consumer' },
      { id: 'consumer.beauty', label: '美妝個護', query: 'beauty trend OR skincare OR cosmetics' },
    ],
  },
  {
    id: 'ai', label: 'AI 熱門產品', icon: '🤖', color: '#6366f1',
    desc: 'AI 產業前線（OpenAI / Hugging Face / Google DeepMind / NVIDIA / VentureBeat AI）',
    feeds: () => [
      { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
      { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
      { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' },
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
    ],
    sites: ['OpenAI News', 'Hugging Face Blog', 'Anthropic News', 'Google AI Blog', 'NVIDIA Blog', 'VentureBeat AI', 'MIT Technology Review AI', 'Towards AI', 'The Batch (DeepLearning.AI)', 'AI News'],
    subs: [
      { id: 'ai.llm', label: '大模型 LLM', query: 'LLM OR GPT OR large language model', feeds: () => [{ name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' }] },
      { id: 'ai.research', label: 'AI 研究', query: 'AI research breakthrough', feeds: () => [{ name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' }] },
      { id: 'ai.hardware', label: 'AI 晶片', query: 'AI chip OR GPU OR semiconductor AI', feeds: () => [{ name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/' }] },
      { id: 'ai.apps', label: 'AI 應用工具', query: 'AI tool OR AI app OR generative AI product', feeds: () => [{ name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' }] },
      { id: 'ai.business', label: 'AI 商業', query: 'AI startup funding OR enterprise AI' },
      { id: 'ai.policy', label: 'AI 治理', query: 'AI regulation OR AI safety OR AI policy' },
    ],
  },
  {
    id: 'world', label: '各國時事', icon: '🌍', color: '#ef4444',
    desc: '依地區即時頭條（Google News 各國版 + BBC World）',
    feeds: (region) => [
      { name: `Google News（${(REGIONS[region]||REGIONS.global).label}）`, url: gnewsTop(region) },
      { name: '商業（Google News）', url: gnewsTopic('BUSINESS', region) },
      { name: '科技（Google News）', url: gnewsTopic('TECHNOLOGY', region) },
      { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    ],
    sites: ['Google News', 'Reuters', 'BBC News', 'Associated Press', 'Bloomberg', 'CNBC', 'Financial Times', 'Axios'],
    subs: [
      { id: 'world.top', label: '全球頭條', feeds: (region) => [{ name: 'Google News', url: gnewsTop(region) }] },
      { id: 'world.politics', label: '政治外交', query: 'politics OR election OR diplomacy' },
      { id: 'world.economy', label: '經濟', feeds: (region) => [{ name: '商業', url: gnewsTopic('BUSINESS', region) }] },
      { id: 'world.conflict', label: '衝突安全', query: 'war OR conflict OR security' },
      { id: 'world.disaster', label: '災害氣候', query: 'disaster OR earthquake OR flood OR wildfire OR climate' },
      { id: 'world.tech', label: '科技政策', feeds: (region) => [{ name: '科技', url: gnewsTopic('TECHNOLOGY', region) }] },
    ],
  },
];

const DIM_MAP = Object.fromEntries(DIMENSIONS.map(d => [d.id, d]));
// 子維度索引：subId → { sub, dim }
const SUB_MAP = {};
for (const d of DIMENSIONS) for (const s of (d.subs || [])) SUB_MAP[s.id] = { sub: s, dim: d };
const SUB_COUNT = Object.keys(SUB_MAP).length;

// 子維度實際抓取 feeds = Google News 查詢（region 在地化）+ 強來源 RSS
function subFeeds(sub, region) {
  const list = [];
  if (sub.query) list.push({ name: sub.label, url: gnewsSearch(sub.query, region) });
  if (sub.feeds) list.push(...sub.feeds(region));
  return list;
}

// ── XML 工具：解析 RSS / Atom ─────────────────────────────────────────────────
function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
// Atom <link href="..."/>
function pickAtomLink(block) {
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
    || block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
  return alt ? alt[1].trim() : '';
}

function parseFeed(xml, sourceName) {
  const out = [];
  if (!xml) return out;
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const title = stripTags(pick(b, 'title'));
    let link = isAtom ? pickAtomLink(b) : stripTags(pick(b, 'link'));
    if (!link) link = stripTags(pick(b, 'guid'));
    const dateRaw = pick(b, 'pubDate') || pick(b, 'updated') || pick(b, 'published') || pick(b, 'dc:date');
    const summaryRaw = pick(b, 'description') || pick(b, 'summary') || pick(b, 'content');
    let summary = stripTags(summaryRaw).slice(0, 280);
    if (!title) continue;
    const ts = dateRaw ? Date.parse(decodeEntities(dateRaw).trim()) : NaN;
    out.push({
      title, link: decodeEntities(link), summary,
      source: sourceName,
      publishedAt: Number.isNaN(ts) ? null : new Date(ts).toISOString(),
      ts: Number.isNaN(ts) ? 0 : ts,
    });
  }
  return out;
}

async function fetchFeed(url, sourceName) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!res.ok) { console.warn('[trends] feed HTTP', res.status, sourceName); return []; }
    const xml = await res.text();
    return parseFeed(xml, sourceName);
  } catch (e) {
    console.warn('[trends] feed failed:', sourceName, e.message);
    return [];
  }
}

// ── 聚合 + 快取（背景刷新 + 持久快照 + stale-while-revalidate）───────────────────
const CACHE = new Map();       // 資料快取 key `${dim}|${region}` 或 `world-geo|${region}`
const BRIEF_CACHE = new Map(); // AI 簡報快取 key `${dim}|${region}`
const TRANS_CACHE = new Map(); // 翻譯快取 key `${lang}|${原文標題}` → 譯文
const inflight = new Map();    // 防止同 key 並發重抓

// 純快取檔（非 seed 資料）：跨重啟縮短「開啟即有」的空窗
let saveTimer = null;
function scheduleSnapshotSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = {};
      for (const [k, v] of CACHE) if (v.live) data[k] = v;
      const briefs = {};
      for (const [k, v] of BRIEF_CACHE) if (v.source && v.source !== 'mock') briefs[k] = v;
      // 翻譯快取（上限 5000 筆，保留最新）
      const transEntries = [...TRANS_CACHE.entries()].slice(-5000);
      const trans = Object.fromEntries(transEntries);
      fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify({ savedAt: Date.now(), data, briefs, trans }));
    } catch (e) { console.warn('[trends] snapshot save failed:', e.message); }
  }, 4000);
}
function loadSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return;
    const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    for (const [k, v] of Object.entries(snap.data || {})) CACHE.set(k, v);
    for (const [k, v] of Object.entries(snap.briefs || {})) BRIEF_CACHE.set(k, v);
    for (const [k, v] of Object.entries(snap.trans || {})) TRANS_CACHE.set(k, v);
    console.log(`[trends] snapshot loaded: ${CACHE.size} data + ${BRIEF_CACHE.size} briefs + ${TRANS_CACHE.size} trans`);
  } catch (e) { console.warn('[trends] snapshot load failed:', e.message); }
}

// 通用抓取：一組 feeds → 去重排序 → 寫快取 + 排程快照（抓不到沿用舊快取，避免退回示範）
async function fetchByFeeds(cacheKey, feeds, mockLabel) {
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f.url, f.name)));
  let items = [];
  const usedSources = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.length) { items.push(...r.value); usedSources.push(feeds[i].name); }
  });
  const seen = new Set();
  items = items.filter(it => {
    const k = it.title.toLowerCase().slice(0, 80);
    if (seen.has(k)) return false; seen.add(k); return true;
  }).sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS_PER_DIM);

  if (items.length) {
    const payload = { ts: Date.now(), items, live: true, sources: usedSources };
    CACHE.set(cacheKey, payload);
    scheduleSnapshotSave();
    return payload;
  }
  const prev = CACHE.get(cacheKey);
  if (prev && prev.live) return prev; // 沿用上次成功資料
  const mock = { ts: Date.now(), live: false, sources: [], items: [{
    title: `（示範模式）「${mockLabel}」即時來源暫時無法連線`, link: '',
    summary: '外部 RSS 來源可能暫時無法連線或被限流。稍後將自動重試。',
    source: '系統', publishedAt: new Date().toISOString(), ts: Date.now() }] };
  CACHE.set(cacheKey, mock);
  return mock;
}

// ── 大維度 ──
async function fetchDim(dimId, region) {
  const dim = DIM_MAP[dimId];
  const payload = await fetchByFeeds(`${dimId}|${region}`, dim.feeds(region), dim.label);
  payload.dim = dimId;
  return payload;
}
function fetchDimOnce(dimId, region) {
  const k = `dim:${dimId}|${region}`;
  if (inflight.has(k)) return inflight.get(k);
  const p = fetchDim(dimId, region).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
// stale-while-revalidate：有快取就立即回（即使過期），過期時背景刷新；只有完全無快取才阻塞冷抓
async function getDimItems(dimId, region, fresh = false) {
  if (!DIM_MAP[dimId]) throw new Error('未知的趨勢維度：' + dimId);
  const key = `${dimId}|${region}`;
  const cached = CACHE.get(key);
  if (fresh) return fetchDimOnce(dimId, region);
  if (cached) {
    if (Date.now() - cached.ts >= CACHE_TTL_MS) fetchDimOnce(dimId, region).catch(() => {});
    return cached;
  }
  return fetchDimOnce(dimId, region);
}

// ── 子維度（同 SWR 模式）──
async function fetchSub(subId, region) {
  const { sub } = SUB_MAP[subId];
  const payload = await fetchByFeeds(`sub:${subId}|${region}`, subFeeds(sub, region), sub.label);
  payload.sub = subId;
  return payload;
}
function fetchSubOnce(subId, region) {
  const k = `subf:${subId}|${region}`;
  if (inflight.has(k)) return inflight.get(k);
  const p = fetchSub(subId, region).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
async function getSubItems(subId, region, fresh = false) {
  if (!SUB_MAP[subId]) throw new Error('未知的子維度：' + subId);
  const key = `sub:${subId}|${region}`;
  const cached = CACHE.get(key);
  if (fresh) return fetchSubOnce(subId, region);
  if (cached) {
    if (Date.now() - cached.ts >= CACHE_TTL_MS) fetchSubOnce(subId, region).catch(() => {});
    return cached;
  }
  return fetchSubOnce(subId, region);
}

// ── 統一翻譯層（各國語言 → UI 語言；批次 callAI + 快取 + 跳過同語言 + fail-open）──
const TRANS_BATCH = 20;
const TRANS_LANG_LABEL = { 'zh-TW': '繁體中文', 'zh-CN': '简体中文', zh: '繁體中文', en: 'English', 'en-US': 'English' };
function normLang(lang) { return TRANS_LANG_LABEL[lang] ? lang : (String(lang || '').startsWith('zh') ? 'zh-TW' : 'en'); }
function needsTranslation(text, lang) {
  if (!text) return false;
  const hasCJK = /[㐀-鿿豈-﫿]/.test(text);
  if (lang.startsWith('zh')) {
    const kana = /[぀-ヿ]/.test(text);   // 日文假名
    const hangul = /[가-힯]/.test(text); // 韓文諺文
    return !hasCJK || kana || hangul;            // 純中文(漢字且無假名/諺文)才跳過；日/韓/泰/俄/英…一律翻
  }
  if (lang.startsWith('en')) return /[^\x00-\x7f]/.test(text); // 目標英文：含非 ASCII 才翻
  return true;
}
async function translateBatch(texts, lang) {
  const label = TRANS_LANG_LABEL[lang] || 'English';
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const result = await callAI(
    `Translate each numbered news headline into ${label}. Output ONLY the translations with the same numbering, one per line, nothing else.\n\n${numbered}`,
    `You are a professional news translator. Translate headlines naturally and concisely into ${label}. Keep brand/proper nouns. Output only the numbered list.`,
    { model: 'glm-4.5-air', maxTokens: 1500, temperature: 0.2, language: lang }
  );
  if (!result || result.source === 'mock' || !result.content) return null;
  const map = {};
  for (const line of result.content.split('\n')) {
    const m = line.match(/^\s*(\d+)[.)、:]\s*(.+)$/);
    if (m) { const idx = +m[1] - 1; if (texts[idx] != null) map[idx] = m[2].trim(); }
  }
  return map;
}
async function translateItems(items, langRaw) {
  const lang = normLang(langRaw);
  if (!items || !items.length) return items;
  // 收集需翻譯且未快取的唯一標題
  const pending = [];
  for (const it of items) {
    const title = it.title || '';
    if (!needsTranslation(title, lang)) continue;
    if (TRANS_CACHE.has(`${lang}|${title}`)) continue;
    if (!pending.includes(title)) pending.push(title);
  }
  for (let i = 0; i < pending.length; i += TRANS_BATCH) {
    const batch = pending.slice(i, i + TRANS_BATCH);
    let map = null;
    try { map = await translateBatch(batch, lang); } catch { map = null; }
    if (map) batch.forEach((t, j) => { if (map[j]) TRANS_CACHE.set(`${lang}|${t}`, map[j]); });
  }
  if (pending.length) scheduleSnapshotSave();
  // 套用（含先前已快取者）；保留原文於 titleOriginal
  return items.map(it => {
    const title = it.title || '';
    const tr = TRANS_CACHE.get(`${lang}|${title}`);
    return (tr && tr !== title) ? { ...it, title: tr, titleOriginal: title } : it;
  });
}
// 翻譯一份 payload 的 items（回新物件，不動快取內原文）
async function translatePayload(payload, lang) {
  if (!lang || !payload || !payload.items) return payload;
  const items = await translateItems(payload.items, lang);
  return { ...payload, items };
}

// 信號分數：近 6h=3 / 24h=2 / 72h=1 / 更舊=0.5，加總後正規化到 0-100
function scoreItems(items) {
  const now = Date.now();
  let raw = 0;
  for (const it of items) {
    if (!it.ts) { raw += 0.5; continue; }
    const ageH = (now - it.ts) / 3.6e6;
    raw += ageH <= 6 ? 3 : ageH <= 24 ? 2 : ageH <= 72 ? 1 : 0.5;
  }
  return Math.min(100, Math.round(raw * 4));
}

// 世界地圖熱點：每國抓一條輕量 Google News top（單 feed，獨立快取），避免一次連抓 32 個
async function fetchRegionTop(region) {
  const key = `world-geo|${region}`;
  let items = await fetchFeed(gnewsTop(region), 'Google News');
  const seen = new Set();
  items = items.filter(it => {
    const k = it.title.toLowerCase().slice(0, 80);
    if (seen.has(k)) return false; seen.add(k); return true;
  }).sort((a, b) => b.ts - a.ts).slice(0, 20);

  if (items.length) {
    const payload = { ts: Date.now(), items, live: true };
    CACHE.set(key, payload);
    scheduleSnapshotSave();
    return payload;
  }
  const prev = CACHE.get(key);
  if (prev && prev.live) return prev;
  const empty = { ts: Date.now(), items: [], live: false };
  CACHE.set(key, empty);
  return empty;
}
function fetchRegionTopOnce(region) {
  const k = `rt:${region}`;
  if (inflight.has(k)) return inflight.get(k);
  const p = fetchRegionTop(region).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
async function getRegionTop(region, fresh = false) {
  const key = `world-geo|${region}`;
  const cached = CACHE.get(key);
  if (fresh) return fetchRegionTopOnce(region);
  if (cached) {
    if (Date.now() - cached.ts >= CACHE_TTL_MS) fetchRegionTopOnce(region).catch(() => {});
    return cached;
  }
  return fetchRegionTopOnce(region);
}

// ── AI 簡報（快取 + SWR；開啟即顯示、不重複計費）────────────────────────────────
function buildBriefInputs(label, regionLabel, items) {
  const feedText = items.slice(0, 30)
    .map((it, i) => `${i + 1}. [${it.source}] ${it.title}${it.summary ? ` — ${it.summary}` : ''}`).join('\n');
  const system = `你是頂尖的全球市場情報分析師，擅長從海量即時資訊中提煉出可行動的商業洞察。使用繁體中文，輸出結構清晰、具體、避免空話。`;
  const prompt = `以下是「${label}」、地區「${regionLabel}」的最新即時情報（共 ${items.length} 則）：\n\n${feedText}\n\n請產出一份趨勢雷達洞察報告，包含：\n1. 🔥 三大熱門主題（每個一句話 + 為何重要）\n2. 🌱 新興信號（剛冒頭、值得提早佈局的 2-3 個）\n3. 💡 商業機會（針對我們這種 AI 行銷/成長平台，可切入的 2-3 個機會點）\n4. ✅ 本週建議行動（3 條具體可執行）\n\n用條列、精簡有力。`;
  return { system, prompt };
}
// 大維度簡報
async function genBrief(dimId, region) {
  const dim = DIM_MAP[dimId];
  const data = await getDimItems(dimId, region);
  if (!data.live) {
    return { ts: Date.now(), dim: dimId, region, output: `目前「${dim.label}」的即時來源暫時無法連線，稍後將自動重試後再產出分析。`, model: 'mock', source: 'mock', itemCount: 0 };
  }
  const regionLabel = (REGIONS[region] || REGIONS.global).label;
  const { system, prompt } = buildBriefInputs(dim.label, regionLabel, data.items);
  const result = await callAI(prompt, system, { model: 'glm-4.5-air', maxTokens: 1800, language: 'zh-TW' });
  const brief = { ts: Date.now(), dim: dimId, region, regionLabel, output: result.content, model: result.model, source: result.source, itemCount: data.items.length };
  BRIEF_CACHE.set(`${dimId}|${region}`, brief);
  if (result.source !== 'mock') scheduleSnapshotSave();
  return brief;
}
function genBriefOnce(dimId, region) {
  const k = `brief:${dimId}|${region}`;
  if (inflight.has(k)) return inflight.get(k);
  const p = genBrief(dimId, region).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
async function getBrief(dimId, region, fresh = false) {
  if (!DIM_MAP[dimId]) throw new Error('未知的趨勢維度：' + dimId);
  const key = `${dimId}|${region}`;
  const cached = BRIEF_CACHE.get(key);
  if (fresh) return genBriefOnce(dimId, region);
  if (cached) {
    if (Date.now() - cached.ts >= BRIEF_TTL_MS) genBriefOnce(dimId, region).catch(() => {});
    return cached;
  }
  return genBriefOnce(dimId, region);
}
// 子維度簡報（key 前綴 sub:）
async function genSubBrief(subId, region) {
  const { sub, dim } = SUB_MAP[subId];
  const data = await getSubItems(subId, region);
  if (!data.live) {
    return { ts: Date.now(), sub: subId, region, output: `目前「${sub.label}」的即時來源暫時無法連線，稍後將自動重試後再產出分析。`, model: 'mock', source: 'mock', itemCount: 0 };
  }
  const regionLabel = (REGIONS[region] || REGIONS.global).label;
  const { system, prompt } = buildBriefInputs(`${dim.label} › ${sub.label}`, regionLabel, data.items);
  const result = await callAI(prompt, system, { model: 'glm-4.5-air', maxTokens: 1800, language: 'zh-TW' });
  const brief = { ts: Date.now(), sub: subId, region, regionLabel, output: result.content, model: result.model, source: result.source, itemCount: data.items.length };
  BRIEF_CACHE.set(`sub:${subId}|${region}`, brief);
  if (result.source !== 'mock') scheduleSnapshotSave();
  return brief;
}
function genSubBriefOnce(subId, region) {
  const k = `subbrief:${subId}|${region}`;
  if (inflight.has(k)) return inflight.get(k);
  const p = genSubBrief(subId, region).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
async function getSubBrief(subId, region, fresh = false) {
  if (!SUB_MAP[subId]) throw new Error('未知的子維度：' + subId);
  const key = `sub:${subId}|${region}`;
  const cached = BRIEF_CACHE.get(key);
  if (fresh) return genSubBriefOnce(subId, region);
  if (cached) {
    if (Date.now() - cached.ts >= BRIEF_TTL_MS) genSubBriefOnce(subId, region).catch(() => {});
    return cached;
  }
  return genSubBriefOnce(subId, region);
}

// ── 路由 ──────────────────────────────────────────────────────────────────────

// GET /api/trends/sources — 完整情報來源目錄 + 地區清單（含洲別）+ 子維度
router.get('/sources', (req, res) => {
  res.json({
    regions: Object.entries(REGIONS).map(([id, r]) => ({ id, label: r.label, group: r.group })),
    dimensions: DIMENSIONS.map(d => ({
      id: d.id, label: d.label, icon: d.icon, color: d.color, desc: d.desc, sites: d.sites,
      subs: (d.subs || []).map(s => ({ id: s.id, label: s.label })),
    })),
    totalSources: DIMENSIONS.reduce((s, d) => s + d.sites.length, 0),
    subCount: SUB_COUNT,
    regionCount: Object.keys(REGIONS).length,
  });
});

// GET /api/trends/feed?dim=ai|sub=ai.hardware&region=global&limit=30&fresh=1&lang=zh-TW — 即時情報
router.get('/feed', async (req, res) => {
  try {
    const sub = req.query.sub;
    const dim = req.query.dim || 'news';
    const region = req.query.region || 'global';
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const lang = req.query.lang;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, MAX_ITEMS_PER_DIM);
    const data = sub ? await getSubItems(sub, region, fresh) : await getDimItems(dim, region, fresh);
    let items = data.items.slice(0, limit);
    if (lang && data.live) items = await translateItems(items, lang);
    res.json({
      dim: sub ? SUB_MAP[sub]?.dim?.id : dim, sub: sub || null, region,
      live: data.live, sources: data.sources,
      fetchedAt: new Date(data.ts).toISOString(),
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/subradar?dim=ai&region=global&fresh=1&lang= — 某大維度的子維度信號（下鑽）
router.get('/subradar', async (req, res) => {
  try {
    const dimId = req.query.dim || 'news';
    const region = req.query.region || 'global';
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const lang = req.query.lang;
    const dim = DIM_MAP[dimId];
    if (!dim) return res.status(400).json({ error: '未知的趨勢維度' });
    const subs = await Promise.all((dim.subs || []).map(async s => {
      const data = await getSubItems(s.id, region, fresh);
      const realItems = data.live ? data.items : [];
      let top = realItems.slice(0, 4).map(it => ({ title: it.title, link: it.link, source: it.source, publishedAt: it.publishedAt }));
      if (lang && data.live) top = await translateItems(top, lang);
      return {
        id: s.id, label: s.label, live: data.live,
        score: scoreItems(realItems), count: realItems.length, top,
      };
    }));
    const aggScore = subs.length ? Math.round(subs.reduce((a, b) => a + b.score, 0) / subs.length) : 0;
    res.json({ dim: dimId, label: dim.label, icon: dim.icon, color: dim.color, region, aggScore, subs, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/radar?region=global&fresh=1 — 9 維度信號掃描（雷達圖資料）
router.get('/radar', async (req, res) => {
  try {
    const region = req.query.region || 'global';
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const lang = req.query.lang;
    const results = await Promise.all(DIMENSIONS.map(async d => {
      const data = await getDimItems(d.id, region, fresh);
      const realItems = data.live ? data.items : [];
      let top = realItems.slice(0, 4).map(it => ({
        title: it.title, link: it.link, source: it.source, publishedAt: it.publishedAt,
      }));
      if (lang && data.live) top = await translateItems(top, lang);
      return {
        id: d.id, label: d.label, icon: d.icon, color: d.color, desc: d.desc,
        live: data.live,
        score: scoreItems(realItems),
        count: realItems.length,
        sources: data.sources,
        subCount: (d.subs || []).length,
        top,
      };
    }));
    res.json({ region, fetchedAt: new Date().toISOString(), dimensions: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/world?fresh=1 — 世界地圖各國熱點（新聞活躍度）
router.get('/world', async (req, res) => {
  try {
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const lang = req.query.lang;
    const hotspots = await Promise.all(MAP_REGIONS.map(async region => {
      const r = REGIONS[region];
      const data = await getRegionTop(region, fresh);
      const items = data.live ? data.items : [];
      let top = items.slice(0, 3).map(it => ({ title: it.title, link: it.link, publishedAt: it.publishedAt }));
      if (lang && data.live) top = await translateItems(top, lang);
      return {
        region, label: r.label, group: r.group, lat: r.lat, lon: r.lon,
        live: data.live,
        count: items.length,
        score: scoreItems(items),
        top,
      };
    }));
    res.json({ fetchedAt: new Date().toISOString(), hotspots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trends/analyze — AI 蒸餾單一維度的趨勢洞察報告
router.post('/analyze', async (req, res) => {
  try {
    const { dim: dimId = 'news', region = 'global', model, kb_ids, save_to_kb } = req.body || {};
    const dim = DIM_MAP[dimId];
    if (!dim) return res.status(400).json({ error: '未知的趨勢維度' });

    const data = await getDimItems(dimId, region);
    if (!data.live) {
      return res.json({
        dim: dimId,
        output: `目前「${dim.label}」的即時來源暫時無法連線，無法進行 AI 分析。請稍後重試。`,
        model: 'mock', source: 'mock', live: false,
      });
    }

    const regionLabel = (REGIONS[region] || REGIONS.global).label;
    const feedText = data.items.slice(0, 30)
      .map((it, i) => `${i + 1}. [${it.source}] ${it.title}${it.summary ? ` — ${it.summary}` : ''}`)
      .join('\n');

    let system = `你是頂尖的全球市場情報分析師，擅長從海量即時資訊中提煉出可行動的商業洞察。使用繁體中文，輸出結構清晰、具體、避免空話。`;
    const kbText = await getKBText(kb_ids);
    if (kbText) system += `\n\n${kbText}`;

    const prompt = `以下是「${dim.label}」維度、地區「${regionLabel}」的最新即時情報（共 ${data.items.length} 則）：\n\n${feedText}\n\n請產出一份趨勢雷達洞察報告，包含：\n1. 🔥 三大熱門主題（每個一句話 + 為何重要）\n2. 🌱 新興信號（剛冒頭、值得提早佈局的 2-3 個）\n3. 💡 商業機會（針對我們這種 AI 行銷/成長平台，可切入的 2-3 個機會點）\n4. ✅ 本週建議行動（3 條具體可執行）\n\n用條列、精簡有力。`;

    const result = await callAI(prompt, system, {
      model: model || 'glm-4.5-air', // 預設輕量快速模型，適合高頻刷新
      maxTokens: 1800,
      language: 'zh-TW',
    });

    run(`INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)`,
      [`trend:${dimId}`, `${dim.label} / ${regionLabel}`, result.content, result.model, result.tokensUsed]);

    let savedToKb = null;
    const kbId = String(save_to_kb || '').trim();
    if (kbId && result.source !== 'mock') {
      const ok = await addEntry(kbId, {
        title: `趨勢洞察：${dim.label}（${regionLabel}）`,
        content: result.content,
        source_type: 'trend',
      });
      savedToKb = ok ? kbId : null;
    }

    res.json({
      dim: dimId, label: dim.label, region, regionLabel,
      output: result.content, model: result.model, source: result.source,
      sources: data.sources, itemCount: data.items.length,
      saved_to_kb: savedToKb, live: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/brief?dim=|sub=&region=&fresh= — 快取的 AI 簡報（開啟即顯示，不重複計費）
router.get('/brief', async (req, res) => {
  try {
    const sub = req.query.sub;
    const dim = req.query.dim || 'news';
    const region = req.query.region || 'global';
    const fresh = req.query.fresh === '1' || req.query.fresh === 'true';
    const brief = sub ? await getSubBrief(sub, region, fresh) : await getBrief(dim, region, fresh);
    const label = sub ? `${SUB_MAP[sub]?.dim?.label} › ${SUB_MAP[sub]?.sub?.label}` : DIM_MAP[dim]?.label;
    res.json({
      dim: sub ? SUB_MAP[sub]?.dim?.id : dim, sub: sub || null, region, label,
      output: brief.output, model: brief.model, source: brief.source, itemCount: brief.itemCount,
      generatedAt: new Date(brief.ts).toISOString(),
      ageMinutes: Math.round((Date.now() - brief.ts) / 60000),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trends/history — 最近 AI 趨勢報告
router.get('/history', (req, res) => {
  try {
    const rows = all(`SELECT * FROM content_history WHERE type LIKE 'trend:%' ORDER BY created_at DESC LIMIT 20`);
    res.json(rows.map(r => {
      const dimId = r.type.slice(6);
      const d = DIM_MAP[dimId];
      return { ...r, dim_id: dimId, dim_label: d?.label || dimId, dim_icon: d?.icon || '🌐' };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 啟動預熱 + 背景刷新排程（worldmonitor 模式：資料常駐、開啟即有、自動產分析）──
loadSnapshot(); // 載入上次快照，重啟後首次請求即有資料

async function warmup() {
  try {
    await Promise.allSettled([
      ...DIMENSIONS.map(d => getDimItems(d.id, 'global', false)),
      ...MAP_REGIONS.map(r => getRegionTop(r, false)),
    ]);
    // 預熱熱門大維度的子維度（下鑽也快）
    await Promise.allSettled(
      [...(DIM_MAP.ai.subs || []), ...(DIM_MAP.news.subs || [])].map(s => getSubItems(s.id, 'global', false))
    );
    // 預譯預設語言（zh-TW）的 global 9 維 top + world top → 常見情境開啟即已翻譯
    try {
      for (const d of DIMENSIONS) {
        const data = CACHE.get(`${d.id}|global`);
        if (data && data.live) await translateItems(data.items.slice(0, 4), 'zh-TW');
      }
      for (const r of MAP_REGIONS) {
        const data = CACHE.get(`world-geo|${r}`);
        if (data && data.live) await translateItems(data.items.slice(0, 3), 'zh-TW');
      }
    } catch (_) {}
    await Promise.allSettled(['news', 'ai', 'trends'].map(d => getBrief(d, 'global', false)));
    console.log('[trends] warmup complete:', CACHE.size, 'cached,', TRANS_CACHE.size, 'trans');
  } catch (e) { console.warn('[trends] warmup error:', e.message); }
}
setTimeout(() => { warmup(); }, 1500); // 讓 server 先聽 port 再預熱

// 每 10 分鐘背景刷新資料（保鮮）
setInterval(() => {
  DIMENSIONS.forEach(d => fetchDimOnce(d.id, 'global').catch(() => {}));
  MAP_REGIONS.forEach(r => fetchRegionTopOnce(r).catch(() => {}));
}, 10 * 60 * 1000);
// 每 30 分鐘預生成關鍵維度簡報（開啟即有最新分析）
setInterval(() => {
  ['news', 'ai', 'trends', 'investment', 'world'].forEach(d => genBriefOnce(d, 'global').catch(() => {}));
}, 30 * 60 * 1000);

module.exports = router;
