// 語音通話中台：AI 語音客服
// 支援：MiniMax、OpenAI、CosyVoice、ChatTTS、XTTS（含聲音複製）
// 所有對話逐字稿寫入 conversations(platform='voice') + messages，與通訊中台共用收件匣

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { callAI } = require('../aiRouter');
const { synthesizeSpeech, synthesizeXTTS, VOICES, DEFAULT_VOICE } = require('../services/ttsRouter');
const { run, get, all } = require('../db');
const { readKnowledgeBase, registerCacheInvalidator } = require('./hub-settings');

const VOICES_DIR = path.join(__dirname, '..', '..', 'data', 'voices');

// ── 語音 Hub 設定快取（避免每輪通話都讀取 DB + 磁碟） ─────────────────────────
let _voiceHubCache = null;
let _voiceHubCacheTs = 0;
const CACHE_TTL_MS = 60_000;

async function getVoiceHubConfig() {
  const now = Date.now();
  if (_voiceHubCache && (now - _voiceHubCacheTs) < CACHE_TTL_MS) return _voiceHubCache;
  const hubConfig = get('SELECT * FROM hub_configs WHERE hub_type = ?', ['voice']) || {};
  const knowledgeText = await readKnowledgeBase(hubConfig.knowledge_base_path || '');
  _voiceHubCache = {
    systemPromptBase: hubConfig.system_prompt || '',
    knowledgeText: knowledgeText.slice(0, 2000),
  };
  _voiceHubCacheTs = now;
  return _voiceHubCache;
}

// 當 hub-settings 更新語音設定時，讓快取失效
registerCacheInvalidator((hubType) => {
  if (hubType === 'voice') { _voiceHubCache = null; _voiceHubCacheTs = 0; }
});
if (!fs.existsSync(VOICES_DIR)) fs.mkdirSync(VOICES_DIR, { recursive: true });

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

// GET /api/voice/voices — 可用音色清單（含複製聲音）
router.get('/voices', (req, res) => {
  let clones = [];
  try {
    clones = all('SELECT * FROM voice_clones ORDER BY id DESC').map(r => ({
      id: `clone_${r.id}`,
      provider: 'xtts',
      gender: 'neutral',
      category: 'cloned',
      dbId: r.id,
      name: { 'zh-TW': r.name, 'zh-CN': r.name, en: r.name },
    }));
  } catch (_) {}
  res.json({ voices: [...VOICES, ...clones], default: DEFAULT_VOICE });
});

// POST /api/voice/tts-preview { voice_id, language } — 試聽音色
router.post('/tts-preview', async (req, res) => {
  const { voice_id, language } = req.body;
  try {
    const text = PREVIEW_TEXT[language] || PREVIEW_TEXT['zh-TW'];
    let buffer;
    if (voice_id && voice_id.startsWith('clone_')) {
      const cloneDbId = voice_id.replace('clone_', '');
      const clone = get('SELECT * FROM voice_clones WHERE id = ?', [cloneDbId]);
      buffer = clone ? await synthesizeXTTS(text, {}, clone.sample_path) : null;
    } else {
      buffer = await synthesizeSpeech(text, { voiceId: voice_id });
    }
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

    // 帶最近 6 則對話歷史（3 輪；快取讀取，不每次查 DB）
    const history = all(
      `SELECT direction, content, message_type FROM messages
       WHERE conversation_id = ? AND message_type != 'system'
       ORDER BY sent_at DESC, id DESC LIMIT 6`,
      [conversationId]
    ).reverse();
    const historyText = history
      .map(m => `${m.direction === 'inbound' ? '客戶' : 'AI'}：${m.content}`)
      .join('\n');

    const { systemPromptBase, knowledgeText } = await getVoiceHubConfig();
    const baseRules =
      '回覆規則：1) 像真人講電話一樣自然口語，簡短扼要（最多 80 字）；' +
      '2) 絕對不要使用 markdown、條列符號、emoji 或特殊符號（回覆會被轉成語音唸出來）；' +
      '3) 有同理心、主動解決問題，不確定時禮貌詢問細節。' +
      (LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['zh-TW']);
    const systemPrompt = [
      systemPromptBase || '你是 AI GrowthOS 的語音客服，正在跟客戶進行即時語音通話。',
      knowledgeText ? `\n\n【產品知識庫】\n${knowledgeText}` : '',
      `\n\n${baseRules}`,
    ].join('');

    // 6 秒逾時保護：避免 AI 提供商延遲卡住整個通話
    let result;
    try {
      result = await Promise.race([
        callAI(
          `通話逐字稿：\n${historyText}\n\n請以語音客服身分回覆客戶最後一句話。`,
          systemPrompt,
          { model: 'glm-5-turbo', maxTokens: 120, language }
        ),
        new Promise((_, rej) => setTimeout(() => rej(new Error('ai_timeout')), 6000)),
      ]);
    } catch (_) {
      result = {
        content: language === 'en' ? 'Sorry, one moment please.' : '抱歉，請稍等一下。',
        model: 'fallback', source: 'timeout',
      };
    }

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

    // TTS（複製聲音走 XTTS，其他走 synthesizeSpeech；失敗時 audio = null 前端退回瀏覽器語音）
    let buffer;
    if (voice_id && voice_id.startsWith('clone_')) {
      const cloneDbId = voice_id.replace('clone_', '');
      const clone = get('SELECT * FROM voice_clones WHERE id = ?', [cloneDbId]);
      buffer = clone ? await synthesizeXTTS(replyText, {}, clone.sample_path) : null;
      if (!buffer) buffer = await synthesizeSpeech(replyText, { voiceId: 'openai-nova' });
    } else {
      buffer = await synthesizeSpeech(replyText, { voiceId: voice_id });
    }

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

// ── 聲音複製 CRUD ──────────────────────────────────────────────────────────────

// GET /api/voice/clones — 列出所有複製聲音
router.get('/clones', (req, res) => {
  try {
    const rows = all('SELECT * FROM voice_clones ORDER BY id DESC');
    res.json(rows.map(r => ({
      id: `clone_${r.id}`, dbId: r.id, name: r.name, created_at: r.created_at,
      provider: 'xtts', gender: 'neutral', category: 'cloned',
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voice/clone/upload { name, audio_base64, format } — 上傳聲音樣本
router.post('/clone/upload', (req, res) => {
  const { name, audio_base64, format } = req.body;
  if (!name || !audio_base64) return res.status(400).json({ error: 'name and audio_base64 required' });
  try {
    const buf = Buffer.from(audio_base64, 'base64');
    if (buf.length < 1000) return res.status(400).json({ error: 'audio too short' });
    run('INSERT INTO voice_clones (name, sample_path) VALUES (?, ?)', [name.trim(), '']);
    const row = get('SELECT * FROM voice_clones WHERE id = last_insert_rowid()');
    const filename = `clone_${row.id}.${(format || 'wav').replace(/[^a-z0-9]/gi, '')}`;
    const filepath = path.join(VOICES_DIR, filename);
    fs.writeFileSync(filepath, buf);
    run('UPDATE voice_clones SET sample_path = ? WHERE id = ?', [filepath, row.id]);
    res.json({ id: `clone_${row.id}`, name: row.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/voice/clone/:id — 刪除複製聲音
router.delete('/clone/:id', (req, res) => {
  try {
    const row = get('SELECT * FROM voice_clones WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'not found' });
    try { fs.unlinkSync(row.sample_path); } catch {}
    run('DELETE FROM voice_clones WHERE id = ?', [req.params.id]);
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
