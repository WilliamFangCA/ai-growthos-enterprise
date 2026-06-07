const express = require('express');
const router = express.Router();
const { callAI } = require('../aiRouter');
const { run, all } = require('../db');

const SYSTEM_PROMPTS = {
  article:
    '你是一位專業內容行銷專家，擅長撰寫高品質的行銷文章。遵循 SCQA 結構：情境→衝突→疑問→答案。文章應有清晰的標題、副標題和行動呼籲。',
  social:
    '你是社群媒體專家，擅長撰寫高互動的社群貼文。根據平台特性調整風格。加入 emoji 和 hashtag。保持簡潔有力，第一句話要能抓住眼球。',
  ad: '你是廣告文案專家，擅長撰寫高轉化率的廣告文案。使用 AIDA 結構：注意→興趣→慾望→行動。每個元素都要清晰標記。結尾必須有強力的 CTA。',
  campaign:
    '你是活動運營專家，使用 TIP 模型（工具×場景×包裝）設計完整的活動方案，包含目標、形式、時間線、預算、KPI。請用結構化格式呈現，包含具體數字。',
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
  const { type, prompt, platform } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'type and prompt are required' });
  }

  if (!SYSTEM_PROMPTS[type]) {
    return res.status(400).json({ error: `Unknown type: ${type}. Valid: article, social, ad, campaign` });
  }

  try {
    let systemPrompt = SYSTEM_PROMPTS[type];
    if (platform) systemPrompt += ` 目標平台：${platform}。`;

    const result = await callAI(prompt, systemPrompt, {
      model: 'glm-5-turbo',
      maxTokens: type === 'article' || type === 'campaign' ? 1500 : 600,
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

module.exports = router;
