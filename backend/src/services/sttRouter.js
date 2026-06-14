// 語音/影片轉錄（STT）Router
// Provider 鏈（仿 aiRouter / ttsRouter）：依序嘗試可用 provider，全失敗則拋出明確錯誤。
//   1. Whisper (OpenAI)   — /v1/audio/transcriptions，model whisper-1；支援多數音訊與 mp4/webm（取音軌），上限 25MB
//   2. Gemini             — generateContent inline 音訊/影片轉錄；上限約 18MB inline
//   3. （可擴充）豆包/Volcano 錄音檔識別、DashScope Paraformer、MiniMax ASR
// 回傳：{ text, provider }

const WHISPER_MAX = 25 * 1024 * 1024;
const GEMINI_INLINE_MAX = 18 * 1024 * 1024;

// ── Provider 1: OpenAI Whisper ────────────────────────────────────────────────
async function whisperOpenAI(buffer, filename, mimeType) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_key_here') return null;
  if (buffer.length > WHISPER_MAX) {
    console.warn('[stt] whisper skipped: file > 25MB');
    return null;
  }
  try {
    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), filename || 'media');
    fd.append('model', 'whisper-1');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { console.warn('[stt] whisper error:', data.error?.message || res.status); return null; }
    const text = (data.text || '').trim();
    return text ? { text, provider: 'whisper-1' } : null;
  } catch (e) {
    console.warn('[stt] whisper failed:', e.message);
    return null;
  }
}

// ── Provider 2: Gemini inline transcription ───────────────────────────────────
async function geminiSTT(buffer, mimeType) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (buffer.length > GEMINI_INLINE_MAX) {
    console.warn('[stt] gemini skipped: file > 18MB inline');
    return null;
  }
  try {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = {
      contents: [{
        role: 'user',
        parts: [
          { text: '請將這段音訊／影片的內容逐字轉錄為文字。只輸出逐字稿本身（保留原語言），不要加任何說明、標題或時間戳。' },
          { inline_data: { mime_type: mimeType || 'audio/mpeg', data: buffer.toString('base64') } },
        ],
      }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0 },
    };
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { console.warn('[stt] gemini error:', data.error?.message || res.status); return null; }
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    return text ? { text, provider: 'gemini-2.0-flash' } : null;
  } catch (e) {
    console.warn('[stt] gemini failed:', e.message);
    return null;
  }
}

// ── 對外 API ─────────────────────────────────────────────────────────────────
async function transcribe(buffer, filename, mimeType) {
  if (!buffer || !buffer.length) throw new Error('空檔案，無法轉錄');
  const result = (await whisperOpenAI(buffer, filename, mimeType)) || (await geminiSTT(buffer, mimeType));
  if (result) return result;
  throw new Error('轉錄服務暫時無法使用（Whisper 上限 25MB / Gemini 上限 18MB，或服務未設定金鑰）');
}

module.exports = { transcribe };
