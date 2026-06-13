// TTS Router: 多 provider 語音合成
// 支援：MiniMax、OpenAI、CosyVoice（DashScope）、ChatTTS（自架）、XTTS（自架，含聲音複製）

const MINIMAX_BASE = 'https://api.minimaxi.chat/v1';

// ── 完整音色清單 ──────────────────────────────────────────────────────────────
const VOICES = [
  // ── MiniMax 女聲 ──────────────────────────────────────────────────────────
  {
    id: 'female-tianmei',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '甜美女聲', 'zh-CN': '甜美女声', en: 'Sweet Female' },
  },
  {
    id: 'female-shaonv',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '活潑少女', 'zh-CN': '活泼少女', en: 'Lively Girl' },
  },
  {
    id: 'female-yujie',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '知性御姐', 'zh-CN': '知性御姐', en: 'Mature Female' },
  },
  {
    id: 'female-chengshu',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '沉穩女聲', 'zh-CN': '沉稳女声', en: 'Calm Female' },
  },
  {
    id: 'female-sweet',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '溫柔甜美', 'zh-CN': '温柔甜美', en: 'Tender Sweet' },
  },
  {
    id: 'presenter_female',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '女主持人', 'zh-CN': '女主持人', en: 'Female Host' },
  },
  {
    id: 'audiobook_female_1',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '有聲書女聲', 'zh-CN': '有声书女声', en: 'Audiobook Female' },
  },
  {
    id: 'female-shaonv-jingpin',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '少女精品版', 'zh-CN': '少女音色-精品', en: 'Lively Girl HD' },
  },
  {
    id: 'female-yujie-jingpin',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '御姐精品版', 'zh-CN': '御姐音色-精品', en: 'Mature Female HD' },
  },
  {
    id: 'female-tianmei-jingpin',
    provider: 'minimax',
    gender: 'female',
    category: 'zh',
    name: { 'zh-TW': '甜美精品版', 'zh-CN': '甜美女声-精品', en: 'Sweet Female HD' },
  },

  // ── MiniMax 男聲 ──────────────────────────────────────────────────────────
  {
    id: 'male-qn-qingse',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '清新男聲', 'zh-CN': '清新男声', en: 'Fresh Male' },
  },
  {
    id: 'male-qn-jingying',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '精英男聲', 'zh-CN': '精英男声', en: 'Professional Male' },
  },
  {
    id: 'male-qn-badao',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '霸道男聲', 'zh-CN': '霸道男声', en: 'Domineering Male' },
  },
  {
    id: 'male-qn-daxuesheng',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '大學生男聲', 'zh-CN': '青年大学生', en: 'College Male' },
  },
  {
    id: 'presenter_male',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '男主持人', 'zh-CN': '男主持人', en: 'Male Host' },
  },
  {
    id: 'audiobook_male_1',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '有聲書男聲', 'zh-CN': '有声书男声', en: 'Audiobook Male' },
  },
  {
    id: 'male-qn-badao-jingpin',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '霸道精品版', 'zh-CN': '霸道男声-精品', en: 'Domineering Male HD' },
  },
  {
    id: 'male-qn-jingying-jingpin',
    provider: 'minimax',
    gender: 'male',
    category: 'zh',
    name: { 'zh-TW': '精英精品版', 'zh-CN': '精英男声-精品', en: 'Professional Male HD' },
  },

  // ── OpenAI TTS（多語言，英文/中文皆佳）────────────────────────────────────
  {
    id: 'openai-alloy',
    provider: 'openai',
    gender: 'neutral',
    category: 'multilang',
    openaiVoice: 'alloy',
    name: { 'zh-TW': '中性沉穩 Alloy', 'zh-CN': '中性沉稳 Alloy', en: 'Alloy (Neutral)' },
  },
  {
    id: 'openai-echo',
    provider: 'openai',
    gender: 'male',
    category: 'multilang',
    openaiVoice: 'echo',
    name: { 'zh-TW': '沉穩男聲 Echo', 'zh-CN': '沉稳男声 Echo', en: 'Echo (Male)' },
  },
  {
    id: 'openai-fable',
    provider: 'openai',
    gender: 'male',
    category: 'multilang',
    openaiVoice: 'fable',
    name: { 'zh-TW': '英式男聲 Fable', 'zh-CN': '英式男声 Fable', en: 'Fable (British)' },
  },
  {
    id: 'openai-onyx',
    provider: 'openai',
    gender: 'male',
    category: 'multilang',
    openaiVoice: 'onyx',
    name: { 'zh-TW': '低沉男聲 Onyx', 'zh-CN': '低沉男声 Onyx', en: 'Onyx (Deep Male)' },
  },
  {
    id: 'openai-nova',
    provider: 'openai',
    gender: 'female',
    category: 'multilang',
    openaiVoice: 'nova',
    name: { 'zh-TW': '活潑女聲 Nova', 'zh-CN': '活泼女声 Nova', en: 'Nova (Female)' },
  },
  {
    id: 'openai-shimmer',
    provider: 'openai',
    gender: 'female',
    category: 'multilang',
    openaiVoice: 'shimmer',
    name: { 'zh-TW': '柔和女聲 Shimmer', 'zh-CN': '柔和女声 Shimmer', en: 'Shimmer (Soft Female)' },
  },

  // ── CosyVoice（Alibaba DashScope，中文優化）──────────────────────────────
  { id: 'cosyvoice-longxiaochun', provider: 'cosyvoice', gender: 'male',   category: 'cosyvoice',
    cosyvoiceId: 'longxiaochun_v2',
    name: { 'zh-TW': '龍小春（男）', 'zh-CN': '龙小春（男）', en: 'Longxiaochun (Male)' } },
  { id: 'cosyvoice-longwan',      provider: 'cosyvoice', gender: 'female', category: 'cosyvoice',
    cosyvoiceId: 'longwan_v2',
    name: { 'zh-TW': '龍婉（女）', 'zh-CN': '龙婉（女）', en: 'Longwan (Female)' } },
  { id: 'cosyvoice-longshu',      provider: 'cosyvoice', gender: 'female', category: 'cosyvoice',
    cosyvoiceId: 'longshu_v2',
    name: { 'zh-TW': '龍書（播報）', 'zh-CN': '龙书（播报）', en: 'Longshu (Anchor)' } },
  { id: 'cosyvoice-longhua',      provider: 'cosyvoice', gender: 'female', category: 'cosyvoice',
    cosyvoiceId: 'longhua_v2',
    name: { 'zh-TW': '龍華（平和）', 'zh-CN': '龙华（平和）', en: 'Longhua (Calm)' } },
  { id: 'cosyvoice-longcheng',    provider: 'cosyvoice', gender: 'male',   category: 'cosyvoice',
    cosyvoiceId: 'longcheng_v2',
    name: { 'zh-TW': '龍誠（誠懇）', 'zh-CN': '龙诚（诚恳）', en: 'Longcheng (Sincere)' } },

  // ── Volcano Engine ARK TTS（豆包語音，中文優化）─────────────────────────────
  { id: 'volcano-zh-female-sweet', provider: 'volcano', gender: 'female', category: 'volcano',
    volcanoVoice: 'zh_female_tianmei_moon_bigtts',
    name: { 'zh-TW': '豆包甜美女聲', 'zh-CN': '豆包甜美女声', en: 'Doubao Sweet Female' } },
  { id: 'volcano-zh-male-pro',     provider: 'volcano', gender: 'male',   category: 'volcano',
    volcanoVoice: 'zh_male_jingying_moon_bigtts',
    name: { 'zh-TW': '豆包精英男聲', 'zh-CN': '豆包精英男声', en: 'Doubao Pro Male' } },
  { id: 'volcano-zh-female-calm',  provider: 'volcano', gender: 'female', category: 'volcano',
    volcanoVoice: 'zh_female_wanwanwan_moon_bigtts',
    name: { 'zh-TW': '豆包沉穩女聲', 'zh-CN': '豆包沉稳女声', en: 'Doubao Calm Female' } },
  { id: 'volcano-en-female',       provider: 'volcano', gender: 'female', category: 'volcano',
    volcanoVoice: 'en_female_sarah_moon_bigtts',
    name: { 'zh-TW': '豆包英文女聲', 'zh-CN': '豆包英文女声', en: 'Doubao English Female' } },

  // ── ChatTTS（本地自架，對話自然）────────────────────────────────────────
  { id: 'chatts-female', provider: 'chatts', gender: 'female', category: 'chatts',
    chattsSpkId: null,
    name: { 'zh-TW': 'ChatTTS 女聲', 'zh-CN': 'ChatTTS 女声', en: 'ChatTTS Female' } },
  { id: 'chatts-male',   provider: 'chatts', gender: 'male',   category: 'chatts',
    chattsSpkId: 2288,
    name: { 'zh-TW': 'ChatTTS 男聲', 'zh-CN': 'ChatTTS 男声', en: 'ChatTTS Male' } },

  // ── XTTS v2（本地自架，多語言）──────────────────────────────────────────
  { id: 'xtts-en-female', provider: 'xtts', gender: 'female', category: 'xtts',
    xttsSpeaker: 'Claribel Dervla',
    name: { 'zh-TW': 'XTTS 英文女聲', 'zh-CN': 'XTTS 英文女声', en: 'XTTS English Female' } },
  { id: 'xtts-zh-male',   provider: 'xtts', gender: 'male',   category: 'xtts',
    xttsSpeaker: 'Craig Gutsy',
    name: { 'zh-TW': 'XTTS 中文男聲', 'zh-CN': 'XTTS 中文男声', en: 'XTTS Chinese Male' } },
];

const DEFAULT_VOICE = 'female-tianmei';

function isValidVoice(voiceId) {
  return VOICES.some(v => v.id === voiceId);
}

function getVoice(voiceId) {
  return VOICES.find(v => v.id === voiceId) || VOICES[0];
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────
async function synthesizeOpenAI(text, voice) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice: voice.openaiVoice || 'alloy',
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[ttsRouter] OpenAI TTS error:', err.error?.message || res.status);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.length > 100 ? buffer : null;
  } catch (e) {
    console.warn('[ttsRouter] OpenAI TTS failed:', e.message);
    return null;
  }
}

// ── MiniMax TTS ───────────────────────────────────────────────────────────────
async function synthesizeMiniMax(text, voiceId, speed) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const res = await fetch(`${MINIMAX_BASE}/t2a_v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'speech-02-turbo',
        text: text.slice(0, 2000),
        voice_setting: {
          voice_id: voiceId,
          speed: speed || 1.0,
        },
        audio_setting: { format: 'mp3', sample_rate: 32000 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json().catch(() => ({}));
    const audio = data?.data?.audio;
    if (!res.ok || data?.base_resp?.status_code !== 0 || !audio) {
      console.warn('[ttsRouter] MiniMax TTS error:', data?.base_resp?.status_msg || res.status);
      return null;
    }
    const buffer = Buffer.from(audio, 'hex');
    return buffer.length > 100 ? buffer : null;
  } catch (e) {
    console.warn('[ttsRouter] MiniMax TTS failed:', e.message);
    return null;
  }
}

// ── Volcano Engine ARK TTS ────────────────────────────────────────────────────
async function synthesizeVolcano(text, voice) {
  const apiKey = process.env.VOLCANO_API_KEY;
  if (!apiKey || !text) return null;

  try {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-tts',
        input: text.slice(0, 4096),
        voice: voice.volcanoVoice || 'zh_female_tianmei_moon_bigtts',
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[ttsRouter] Volcano TTS error:', err.error?.message || res.status);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch (e) {
    console.warn('[ttsRouter] Volcano TTS failed:', e.message);
    return null;
  }
}

// ── CosyVoice TTS（Alibaba DashScope）────────────────────────────────────────
async function synthesizeCosyVoice(text, voice) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey || !text) return null;

  // 支援自定義工作區端點（DASHSCOPE_BASE_URL），預設用公有雲
  const dsBase = (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1')
    .replace(/\/$/, '');

  try {
    const res = await fetch(`${dsBase}/services/aigc/text2audio/speech-synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'cosyvoice-v2',
        input: { text: text.slice(0, 2000), voice: voice.cosyvoiceId },
        parameters: { format: 'mp3', sample_rate: 24000 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn('[ttsRouter] CosyVoice error:', res.status, errBody.slice(0, 200));
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch (e) {
    console.warn('[ttsRouter] CosyVoice failed:', e.message);
    return null;
  }
}

// ── ChatTTS（自架 HTTP API）───────────────────────────────────────────────────
async function synthesizeChatTTS(text) {
  const url = process.env.CHATTS_API_URL;
  if (!url || !text) return null;

  try {
    const res = await fetch(`${url}/generate_voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 2000) }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (!data.audio) return null;
    const buf = Buffer.from(data.audio, 'base64');
    return buf.length > 100 ? buf : null;
  } catch (e) {
    console.warn('[ttsRouter] ChatTTS failed:', e.message);
    return null;
  }
}

// ── XTTS v2（自架 HTTP API，含聲音複製）─────────────────────────────────────
// xttsSamplePath: 絕對路徑到 WAV 參考音檔（聲音複製），null 表示用預設 speaker
async function synthesizeXTTS(text, voice, xttsSamplePath = null) {
  const url = process.env.XTTS_API_URL;
  if (!url || !text) return null;

  try {
    if (!xttsSamplePath) {
      // 使用預設 speaker
      const params = new URLSearchParams({
        text: text.slice(0, 2000),
        speaker_id: voice.xttsSpeaker || 'Claribel Dervla',
        language: 'zh-cn',
      });
      const res = await fetch(`${url}/api/tts?${params}`, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 100 ? buf : null;
    }

    // 聲音複製：multipart/form-data 送 speaker_wav
    const fs = require('fs');
    const wavContent = fs.readFileSync(xttsSamplePath);
    const boundary = `----XTTSBoundary${Date.now()}`;
    const crlf = '\r\n';
    const parts = [
      `--${boundary}${crlf}Content-Disposition: form-data; name="text"${crlf}${crlf}${text.slice(0, 2000)}`,
      `--${boundary}${crlf}Content-Disposition: form-data; name="language"${crlf}${crlf}zh-cn`,
      `--${boundary}${crlf}Content-Disposition: form-data; name="speaker_wav"; filename="speaker.wav"${crlf}Content-Type: audio/wav${crlf}${crlf}`,
    ];
    const header = Buffer.from(parts.join(crlf) + crlf);
    const footer = Buffer.from(`${crlf}--${boundary}--${crlf}`);
    const body = Buffer.concat([header, wavContent, footer]);

    const res = await fetch(`${url}/tts_to_audio/`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch (e) {
    console.warn('[ttsRouter] XTTS failed:', e.message);
    return null;
  }
}

// ── 統一入口 ──────────────────────────────────────────────────────────────────
async function synthesizeSpeech(text, { voiceId, speed } = {}) {
  if (!text || !text.trim()) return null;

  const resolvedId = isValidVoice(voiceId) ? voiceId : DEFAULT_VOICE;
  const voice = getVoice(resolvedId);

  if (voice.provider === 'openai')     return synthesizeOpenAI(text, voice);
  if (voice.provider === 'volcano')    return synthesizeVolcano(text, voice);
  if (voice.provider === 'cosyvoice')  return synthesizeCosyVoice(text, voice);
  if (voice.provider === 'chatts')     return synthesizeChatTTS(text);
  if (voice.provider === 'xtts')       return synthesizeXTTS(text, voice);

  // minimax（含 fallback：若 minimax 失敗但 openai key 存在，嘗試 nova 兜底）
  const buf = await synthesizeMiniMax(text, resolvedId, speed);
  if (buf) return buf;

  if (process.env.OPENAI_API_KEY) {
    console.log('[ttsRouter] MiniMax failed, falling back to OpenAI TTS nova');
    return synthesizeOpenAI(text, { openaiVoice: 'nova' });
  }

  return null;
}

module.exports = { synthesizeSpeech, synthesizeXTTS, VOICES, DEFAULT_VOICE };
