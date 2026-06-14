// AI 預測 API（/api/predictions）
// MiroFish 核心原生重寫：建立預測 → 背景跑多代理模擬（predictionEngine）→ 檢視報告。
// 比照 analytics/trends 註冊為 optionalAuth（Analytics 頁面可無 token 抓取）。
// 比照 media_jobs 非同步模式：POST 立即回 { id, status:'pending' }，前端輪詢狀態。

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const { runPrediction, setPredictionInputs } = require('../services/predictionEngine');
const { transcribe } = require('../services/sttRouter');

function parseResult(row) {
  if (!row) return row;
  let result = null;
  try { result = row.result_json ? JSON.parse(row.result_json) : null; } catch (_) {}
  let config = {};
  try { config = row.config_json ? JSON.parse(row.config_json) : {}; } catch (_) {}
  const { result_json, config_json, ...rest } = row;
  return { ...rest, config, result };
}

// GET /api/predictions — 清單（新→舊）
router.get('/', (req, res) => {
  try {
    const rows = all(
      `SELECT id, topic, status, stage, headline, confidence, model_used, created_at, updated_at
       FROM predictions ORDER BY created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/predictions/:id — 單筆 + 解析後 result（前端輪詢用）
router.get('/:id', (req, res) => {
  try {
    const row = get(`SELECT * FROM predictions WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Prediction not found' });
    res.json(parseResult(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/predictions — 建立預測並背景觸發模擬
router.post('/', (req, res) => {
  try {
    const { topic, materials, agentCount, rounds, variables, model, language, images, attachments } = req.body || {};
    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // 多模態附件：圖片走視覺判讀（最多 4 張）；文件/影音僅存清單供顯示與背景參考
    const cleanImages = (Array.isArray(images) ? images : [])
      .filter(im => im && im.base64 && im.mimeType)
      .slice(0, 4)
      .map(im => ({ base64: im.base64, mimeType: im.mimeType }));
    const cleanAttachments = (Array.isArray(attachments) ? attachments : [])
      .filter(a => a && a.name)
      .slice(0, 20)
      .map(a => ({ name: String(a.name).slice(0, 120), kind: a.kind || 'file', note: a.note ? String(a.note).slice(0, 120) : '' }));

    const config = {
      agentCount: agentCount || 8,
      rounds: rounds || 2,
      variables: Array.isArray(variables) ? variables.filter(v => v && String(v).trim()) : [],
      model: model || 'glm-5-turbo',
      language: language || 'zh-TW',
      attachments: cleanAttachments,
      imageCount: cleanImages.length,
    };

    const info = run(
      `INSERT INTO predictions (topic, materials, config_json, status, stage)
       VALUES (?,?,?,'pending','queued')`,
      [String(topic).trim(), String(materials || '').trim(), JSON.stringify(config)]
    );
    const id = info.lastInsertRowid;

    // 圖片/附件暫存記憶體供引擎取用（不入 DB 避免膨脹）
    setPredictionInputs(id, { images: cleanImages, attachments: cleanAttachments });

    // 背景執行，不阻塞回應（比照 media_jobs）。錯誤已在引擎內捕捉並寫回 DB。
    runPrediction(id).catch(err => console.error('[predictions] runPrediction error:', err));

    res.status(201).json({ id, status: 'pending', stage: 'queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/predictions/transcribe?filename=xxx — 音訊/影片轉錄（Whisper → Gemini）
// 以 raw binary 上傳（避免 base64 膨脹）；content-type 帶原始 mime；回 { text, provider, chars }
router.post('/transcribe', express.raw({ type: () => true, limit: '60mb' }), async (req, res) => {
  try {
    const buf = req.body;
    if (!buf || !buf.length) return res.status(400).json({ error: '未收到檔案內容' });
    const filename = String(req.query.filename || 'media').slice(0, 200);
    const mimeType = req.headers['content-type'] || 'application/octet-stream';
    const r = await transcribe(buf, filename, mimeType);
    res.json({ text: r.text, provider: r.provider, chars: r.text.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/predictions/:id — 刪除（清單管理）
router.delete('/:id', (req, res) => {
  try {
    const info = run(`DELETE FROM predictions WHERE id = ?`, [req.params.id]);
    if (info.changes === 0) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
