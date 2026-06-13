// 語音通話中台：AI 語音客服
// 流程：前端瀏覽器辨識語音 → /call/:id/turn 送文字 → AI 生成回覆 → MiniMax TTS 合成 → 回傳 mp3 base64
// 所有對話逐字稿寫入 conversations(platform='voice') + messages，與通訊中台共用收件匣

const express = require('express');
const router = express.Router();
const { callAI } = require('../aiRouter');
const { synthesizeSpeech, VOICES, DEFAULT_VOICE } = require('../services/ttsRouter');
const { run, get, all } = require('../db');

const LANGUAGE_INSTRUCTIONS = {
  'zh-TW': '請一律使用繁體中文（台灣用語）回覆。',
  'zh-CN': '请一律使用简体中文回复。',
  en: 'Always respond in English.',
};

const PREVIEW_TEXT = {
  'zh-TW': '您好，我是您的 AI 語音助理，很高興為您服務！',
  'zh-CN': '您好，我是您的 AI 语音助理，很高兴为您服务！',
  en: 'Hello! I am your AI voice assistant, happy to help you today!',
};

// GET /api/voice/voices — 可用音色清單
router.get('/voices', (req, res) => {
  res.json({ voices: VOICES, default: DEFAULT_VOICE });
});

// POST /api/voice/tts-preview { voice_id, language } — 試聽音色
router.post('/tts-preview', async (req, res) => {
  const { voice_id, language } = req.body;
  try {
    const text = PREVIEW_TEXT[language] || PREVIEW_TEXT['zh-TW'];
    const buffer = await synthesizeSpeech(text, { voiceId: voice_id });
    if (!buffer) return res.status(502).json({ error: 'tts_unavailable' });
    res.json({ audio: buffer.toString('base64'), format: 'mp3' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/call/start { contact_name } — 開始通話，建立 voice conversation
router.post('/call/start', (req, res) => {
  const contactName = (req.body.contact_name || '').trim() || '語音用戶';
  try {
    run(
      `INSERT INTO conversations (platform, contact_name, channel_user_id, last_message, assigned_to, status, unread_count)
       VALUES (?,?,?,?,?,?,?)`,
      ['voice', contactName, `voice_${Date.now()}`, '📞 語音通話開始', 'ai', 'open', 0]
    );
    const convo = get('SELECT * FROM conversations WHERE id = last_insert_rowid()');
    run(
      `INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)`,
      [convo.id, 'inbound', '📞 語音通話開始', 'system', 'system', 'voice']
    );
    res.json({ conversation_id: convo.id, contact_name: contactName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/call/:id/turn { text, voice_id, language } — 一輪語音對話
router.post('/call/:id/turn', async (req, res) => {
  const conversationId = req.params.id;
  const { text, voice_id, language } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

  try {
    const convo = get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!convo || convo.platform !== 'voice') {
      return res.status(404).json({ error: 'voice conversation not found' });
    }

    // 寫入用戶語音逐字稿
    run(
      `INSERT INTO messages (conversation_id, direction, content, message_type, sent_by) VALUES (?,?,?,?,?)`,
      [conversationId, 'inbound', text.trim(), 'voice_transcript', 'human']
    );

    // 帶最近 12 則對話歷史
    const history = all(
      `SELECT direction, content, message_type FROM messages
       WHERE conversation_id = ? AND message_type != 'system'
       ORDER BY sent_at DESC, id DESC LIMIT 12`,
      [conversationId]
    ).reverse();
    const historyText = history
      .map(m => `${m.direction === 'inbound' ? '客戶' : 'AI'}：${m.content}`)
      .join('\n');

    const systemPrompt =
      '你是 AI GrowthOS 的語音客服，正在跟客戶進行即時語音通話。回覆規則：' +
      '1) 像真人講電話一樣自然口語，簡短扼要（最多 80 字）；' +
      '2) 絕對不要使用 markdown、條列符號、emoji 或特殊符號（回覆會被轉成語音唸出來）；' +
      '3) 有同理心、主動解決問題，不確定時禮貌詢問細節。' +
      (LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['zh-TW']);

    const result = await callAI(
      `通話逐字稿：\n${historyText}\n\n請以語音客服身分回覆客戶最後一句話。`,
      systemPrompt,
      { model: 'glm-5-turbo', maxTokens: 250, language }
    );

    // 清掉可能殘留的 markdown 符號，避免 TTS 唸出怪聲
    const replyText = result.content.replace(/[*#`>\-]{2,}|[*#`]/g, '').trim();

    run(
      `INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)`,
      [conversationId, 'outbound', replyText, 'voice_transcript', 'ai', 'voice']
    );
    run(
      `UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [replyText, conversationId]
    );

    // TTS（失敗時 audio 為 null，前端退回瀏覽器內建語音）
    const buffer = await synthesizeSpeech(replyText, { voiceId: voice_id });

    res.json({
      reply: replyText,
      audio: buffer ? buffer.toString('base64') : null,
      format: 'mp3',
      model: result.model,
      source: result.source,
    });
  } catch (err) {
    console.error('[voice/turn] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/call/:id/end { duration_seconds } — 結束通話
router.post('/call/:id/end', (req, res) => {
  const conversationId = req.params.id;
  const duration = Math.max(0, Number(req.body.duration_seconds) || 0);
  try {
    const convo = get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!convo) return res.status(404).json({ error: 'conversation not found' });

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationText = mins > 0 ? `${mins} 分 ${secs} 秒` : `${secs} 秒`;
    const endMsg = `📞 語音通話結束（時長 ${durationText}）`;

    run(
      `INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type) VALUES (?,?,?,?,?,?)`,
      [conversationId, 'inbound', endMsg, 'system', 'system', 'voice']
    );
    run(
      `UPDATE conversations SET status = 'resolved', last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [endMsg, conversationId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voice/calls — 最近通話紀錄（voice conversations）
router.get('/calls', (req, res) => {
  try {
    const rows = all(
      `SELECT c.*,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.message_type = 'voice_transcript') AS turn_count
       FROM conversations c WHERE c.platform = 'voice' ORDER BY c.created_at DESC LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
