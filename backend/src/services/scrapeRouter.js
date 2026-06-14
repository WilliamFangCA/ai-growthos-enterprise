// Scrape Router: 網頁內容擷取
// Provider 鏈（仿 aiRouter / mediaRouter）：依序嘗試可用 provider，全失敗回明確標示的 mock。
//   1. Jina AI Reader  — 免費、會跑 JS 渲染 + 繞多數反爬蟲，回乾淨 markdown（可選 JINA_API_KEY 提高額度）
//   2. Direct fetch    — 瀏覽器 UA 直抓 HTML，正則萃取標題與內文（適用靜態站）
//   3. mock            — 全失敗時回標示清楚的範例
// 回傳格式統一：{ title, content, url, provider, source, length, truncated }
//   - source: 'jina' | 'direct' | 'mock'

const JINA_READER = 'https://r.jina.ai/';
const JINA_SEARCH = 'https://s.jina.ai/';
const MAX_CONTENT = 12000; // 存入 DB / 回前端的內文上限（字元）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ── helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function clip(text, max = MAX_CONTENT) {
  const t = String(text || '').trim();
  if (t.length <= max) return { content: t, truncated: false };
  return { content: t.slice(0, max), truncated: true };
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

// 搜尋引擎 → SERP 網址
function buildSearchUrl(query, engine) {
  const q = encodeURIComponent(String(query || '').trim());
  switch ((engine || 'google').toLowerCase()) {
    case 'yahoo': return `https://search.yahoo.com/search?p=${q}`;
    case 'bing':  return `https://www.bing.com/search?q=${q}`;
    case 'google':
    default:      return `https://www.google.com/search?q=${q}`;
  }
}

// ── Provider 1: Jina AI Reader ────────────────────────────────────────────────

async function jinaReader(url, timeoutMs = 40000) {
  try {
    const headers = { 'X-Return-Format': 'markdown', 'User-Agent': UA };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const res = await fetch(JINA_READER + url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      console.warn('[scrapeRouter] Jina reader HTTP', res.status, 'for', url);
      return null;
    }
    const text = await res.text();
    if (!text || text.trim().length < 30) return null;
    // Jina markdown 開頭常含 "Title: ..." 與 "URL Source:"；抽出標題
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';
    // 去掉 Jina 的 metadata 前綴區塊（Title/URL Source/Markdown Content:）
    let body = text.replace(/^Title:.*$/m, '').replace(/^URL Source:.*$/m, '')
      .replace(/^Markdown Content:\s*/m, '').trim();
    const { content, truncated } = clip(body);
    return { title, content, url, provider: 'jina-reader', source: 'jina', length: body.length, truncated };
  } catch (e) {
    console.warn('[scrapeRouter] Jina reader failed:', e.message);
    return null;
  }
}

async function jinaSearch(query, timeoutMs = 40000) {
  try {
    const headers = { 'X-Return-Format': 'markdown', 'User-Agent': UA };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const res = await fetch(JINA_SEARCH + encodeURIComponent(query), { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      console.warn('[scrapeRouter] Jina search HTTP', res.status, 'for', query);
      return null;
    }
    const text = await res.text();
    if (!text || text.trim().length < 30) return null;
    const { content, truncated } = clip(text.trim());
    return { title: `搜尋結果：${query}`, content, url: `search:${query}`, provider: 'jina-search', source: 'jina', length: text.length, truncated };
  } catch (e) {
    console.warn('[scrapeRouter] Jina search failed:', e.message);
    return null;
  }
}

// ── Provider 2: Direct fetch + 正則萃取 ───────────────────────────────────────

async function directFetch(url, timeoutMs = 25000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn('[scrapeRouter] Direct fetch HTTP', res.status, 'for', url);
      return null;
    }
    const html = await res.text();
    if (!html) return null;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';

    // 移除 script / style / noscript / 註解，再優先取 <main>/<article>，否則 <body>
    let body = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    const main = body.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
    const region = main ? main[1] : (body.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || body);
    const textOnly = decodeEntities(region.replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n').trim();
    if (textOnly.length < 30) return null;

    const { content, truncated } = clip(textOnly);
    return { title, content, url, provider: 'direct-fetch', source: 'direct', length: textOnly.length, truncated };
  } catch (e) {
    console.warn('[scrapeRouter] Direct fetch failed:', e.message);
    return null;
  }
}

// ── 對外 API ─────────────────────────────────────────────────────────────────

// 擷取單一網址：Jina → Direct → mock
async function scrapeUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error('請提供有效網址');

  const result = (await jinaReader(url)) || (await directFetch(url));
  if (result) return result;

  console.log('[scrapeRouter] url: all providers failed, using mock');
  return {
    title: '（示範模式）擷取失敗',
    content: `無法擷取此網址的內容：${url}\n\n可能原因：\n• 該網站需要登入或有強反爬蟲（如部分社群平台的私人內容）\n• 目標暫時無法連線\n• Jina Reader 額度用盡（可在系統設定填入 JINA_API_KEY 提高額度）\n\n這是範例輸出——一般公開網頁（新聞、部落格、電商、官網等）通常可正常擷取。`,
    url, provider: 'mock', source: 'mock', length: 0, truncated: false,
  };
}

// 搜尋引擎擷取：Jina search → 抓 SERP 頁面 → mock
async function searchWeb(query, engine = 'google') {
  const q = String(query || '').trim();
  if (!q) throw new Error('請提供搜尋關鍵字');

  // Jina search 直接回多筆結果摘要；失敗時退而求其次抓該引擎的搜尋結果頁
  const result = (await jinaSearch(q)) || (await jinaReader(buildSearchUrl(q, engine)));
  if (result) return result;

  console.log('[scrapeRouter] search: all providers failed, using mock');
  return {
    title: `（示範模式）搜尋「${q}」`,
    content: `無法取得搜尋結果。可能是搜尋服務暫時無法連線或額度用盡。\n\n建議：在系統設定填入 JINA_API_KEY 以提高擷取額度。`,
    url: `search:${q}`, provider: 'mock', source: 'mock', length: 0, truncated: false,
  };
}

module.exports = { scrapeUrl, searchWeb, normalizeUrl, MAX_CONTENT };
