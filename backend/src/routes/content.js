const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { callAI } = require('../aiRouter');
const { generateImage, generateVideo, generateMusic } = require('../services/mediaRouter');
const { run, get, all } = require('../db');

const SYSTEM_PROMPTS = {
  article:
    '你是一位專業內容行銷專家，擅長撰寫高品質的行銷文章。遵循 SCQA 結構：情境→衝突→疑問→答案。文章應有清晰的標題、副標題和行動呼籲。',
  social:
    '你是社群媒體專家，擅長撰寫高互動的社群貼文。根據平台特性調整風格。加入 emoji 和 hashtag。保持簡潔有力，第一句話要能抓住眼球。',
  ad: '你是廣告文案專家，擅長撰寫高轉化率的廣告文案。使用 AIDA 結構：注意→興趣→慾望→行動。每個元素都要清晰標記。結尾必須有強力的 CTA。',
  campaign:
    '你是活動運營專家，使用 TIP 模型（工具×場景×包裝）設計完整的活動方案，包含目標、形式、時間線、預算、KPI。請用結構化格式呈現，包含具體數字。',
};

// 依 UI 語言強制輸出語言（未帶 language 時預設繁中）
const LANGUAGE_INSTRUCTIONS = {
  'zh-TW': '無論輸入是什麼語言，請一律使用繁體中文（台灣用語）輸出。',
  'zh-CN': '无论输入是什么语言，请一律使用简体中文输出。',
  en: 'Always respond in English regardless of the input language.',
};

// GET /api/content/history
router.get('/history', (req, res) => {
  try {
    const rows = all(`SELECT * FROM content_history ORDER BY created_at DESC LIMIT 20`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/generate
router.post('/generate', async (req, res) => {
  const { type, prompt, platform, language } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  if (!SYSTEM_PROMPTS[type]) {
    return res.status(400).json({ error: `Unknown type: ${type}. Valid: article, social, ad, campaign` });
  }

  try {
    let systemPrompt = SYSTEM_PROMPTS[type];
    if (platform) systemPrompt += ` 目標平台：${platform}。`;
    systemPrompt += ` ${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['zh-TW']}`;

    const result = await callAI(prompt, systemPrompt, {
      model: 'glm-5-turbo',
      maxTokens: type === 'article' || type === 'campaign' ? 1500 : 600,
      language,
    });

    run(
      `INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)`,
      [type, prompt, result.content, result.model, result.tokensUsed]
    );

    res.json({
      type,
      prompt,
      output: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
      source: result.source,
    });
  } catch (err) {
    console.error('[content/generate] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 媒體生成（圖片 / 影片 / 音樂）────────────────────────────────────────────

const MEDIA_KINDS = { image: generateImage, video: generateVideo, music: generateMusic };
const MEDIA_DIR = path.join(__dirname, '..', '..', 'data', 'media');

function touchJob(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  run(`UPDATE media_jobs SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    ...keys.map(k => fields[k]),
    id,
  ]);
}

// 把 provider 的暫時 URL（或二進位 buffer）持久化到本地 /media；失敗時退回存遠端 URL
async function persistMedia(jobId, result) {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const filename = `${jobId}.${result.ext}`;
  const filePath = path.join(MEDIA_DIR, filename);

  if (result.buffer) {
    fs.writeFileSync(filePath, result.buffer);
    return `/media/${filename}`;
  }
  // mock 範例檔是穩定公開 URL，不需下載
  if (result.source === 'mock') return result.remoteUrl;

  try {
    const res = await fetch(result.remoteUrl, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`download status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    return `/media/${filename}`;
  } catch (e) {
    console.warn('[content/media] download failed, keep remote url:', e.message);
    return result.remoteUrl;
  }
}

async function processMediaJob(id, kind, prompt, options) {
  touchJob(id, { status: 'processing' });
  try {
    const result = await MEDIA_KINDS[kind](prompt, options);
    const localUrl = await persistMedia(id, result);
    touchJob(id, {
      status: 'done',
      result_url: localUrl,
      remote_url: result.remoteUrl || null,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    console.error(`[content/media] job ${id} failed:`, err);
    touchJob(id, { status: 'failed', error: err.message });
  }
}

// POST /api/content/media  { kind, prompt, options?, language? }
router.post('/media', (req, res) => {
  const { kind, prompt, options = {}, language } = req.body;

  if (!MEDIA_KINDS[kind]) {
    return res.status(400).json({ error: `Unknown kind: ${kind}. Valid: image, video, music` });
  }
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const opts = { ...options, language };
    const info = run(
      `INSERT INTO media_jobs (kind, prompt, options_json, status) VALUES (?,?,?,?)`,
      [kind, prompt, JSON.stringify(opts), 'pending']
    );
    const id = info.lastInsertRowid;
    // fire-and-forget：背景執行，前端輪詢 GET /media/:id
    processMediaJob(id, kind, prompt, opts);
    res.json({ id, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/media?kind=image  最近 20 筆
router.get('/media', (req, res) => {
  try {
    const { kind } = req.query;
    const rows = kind
      ? all(`SELECT * FROM media_jobs WHERE kind = ? ORDER BY created_at DESC LIMIT 20`, [kind])
      : all(`SELECT * FROM media_jobs ORDER BY created_at DESC LIMIT 20`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/media/:id  輪詢任務狀態
router.get('/media/:id', (req, res) => {
  try {
    const row = get(`SELECT * FROM media_jobs WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'job not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
