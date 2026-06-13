// Media Router: AI 圖片 / 影片 / 音樂生成
// Provider 鏈（仿 aiRouter）：每種媒體依序嘗試可用 provider，全部失敗時回傳明確標示的 mock 範例。
// 回傳格式統一：{ remoteUrl?, buffer?, ext, provider, model, source }
//   - remoteUrl: provider 給的暫時 URL（數小時過期，呼叫端應下載持久化）
//   - buffer:    部分 API 直接回二進位（hex），由呼叫端寫檔
//   - source:    'glm' | 'minimax' | 'mock'

const { callAI } = require('../aiRouter');

const GLM_PAAS_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const MINIMAX_BASE = 'https://api.minimaxi.chat/v1';

// ── helpers ─────────────────────────────────────────────────────────────────

async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// GLM CogView 支援的尺寸對應
const GLM_IMAGE_SIZES = {
  '1:1':  '1024x1024',
  '16:9': '1344x768',
  '9:16': '768x1344',
  '3:4':  '864x1152',
  '4:3':  '1152x864',
};

// mock 佔位尺寸
const MOCK_IMAGE_SIZES = {
  '1:1':  [1024, 1024],
  '16:9': [1280, 720],
  '9:16': [720, 1280],
  '3:4':  [768, 1024],
  '4:3':  [1024, 768],
};

// ── Image ───────────────────────────────────────────────────────────────────

async function glmImage(prompt, opts) {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) return null;
  try {
    const { ok, data } = await fetchJson(`${GLM_PAAS_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'cogview-4-250304',
        prompt,
        size: GLM_IMAGE_SIZES[opts.aspectRatio] || GLM_IMAGE_SIZES['1:1'],
      }),
    }, 60000);
    const url = data?.data?.[0]?.url;
    if (!ok || !url) {
      console.warn('[mediaRouter] GLM image error:', data?.error?.message || JSON.stringify(data).slice(0, 200));
      return null;
    }
    return { remoteUrl: url, ext: 'png', provider: 'glm', model: 'cogview-4-250304', source: 'glm' };
  } catch (e) {
    console.warn('[mediaRouter] GLM image failed:', e.message);
    return null;
  }
}

async function minimaxImage(prompt, opts) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;
  try {
    const { ok, data } = await fetchJson(`${MINIMAX_BASE}/image_generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'image-01',
        prompt,
        aspect_ratio: opts.aspectRatio || '1:1',
        response_format: 'url',
        n: 1,
      }),
    }, 60000);
    const url = data?.data?.image_urls?.[0];
    if (!ok || data?.base_resp?.status_code !== 0 || !url) {
      console.warn('[mediaRouter] MiniMax image error:', data?.base_resp?.status_msg || JSON.stringify(data).slice(0, 200));
      return null;
    }
    return { remoteUrl: url, ext: 'jpg', provider: 'minimax', model: 'image-01', source: 'minimax' };
  } catch (e) {
    console.warn('[mediaRouter] MiniMax image failed:', e.message);
    return null;
  }
}

async function generateImage(prompt, opts = {}) {
  // MiniMax 優先（目前 GLM key 無圖像額度），GLM 作為備援
  const result = (await minimaxImage(prompt, opts)) || (await glmImage(prompt, opts));
  if (result) return result;

  const [w, h] = MOCK_IMAGE_SIZES[opts.aspectRatio] || MOCK_IMAGE_SIZES['1:1'];
  const seed = encodeURIComponent(prompt.slice(0, 24)) + Date.now() % 1000;
  console.log('[mediaRouter] image: all providers failed, using mock');
  return {
    remoteUrl: `https://picsum.photos/seed/${seed}/${w}/${h}`,
    ext: 'jpg', provider: 'mock', model: 'mock', source: 'mock',
  };
}

// ── Video ───────────────────────────────────────────────────────────────────

const VIDEO_POLL_INTERVAL = 5000;
const VIDEO_POLL_MAX_MS = 300000; // 單一 provider 最多等 5 分鐘

async function glmVideo(prompt, opts) {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) return null;
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const { ok, data } = await fetchJson(`${GLM_PAAS_BASE}/videos/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'cogvideox-3',
        prompt,
        quality: opts.resolution === '1080p' ? 'quality' : 'speed',
        with_audio: true,
        size: opts.resolution === '1080p' ? '1920x1080' : '1280x720',
      }),
    });
    const taskId = data?.id;
    if (!ok || !taskId) {
      console.warn('[mediaRouter] GLM video submit error:', data?.error?.message || JSON.stringify(data).slice(0, 200));
      return null;
    }
    const deadline = Date.now() + VIDEO_POLL_MAX_MS;
    while (Date.now() < deadline) {
      await sleep(VIDEO_POLL_INTERVAL);
      const poll = await fetchJson(`${GLM_PAAS_BASE}/async-result/${taskId}`, { headers });
      const status = poll.data?.task_status;
      if (status === 'SUCCESS') {
        const url = poll.data?.video_result?.[0]?.url;
        if (!url) return null;
        return { remoteUrl: url, ext: 'mp4', provider: 'glm', model: 'cogvideox-3', source: 'glm' };
      }
      if (status === 'FAIL') {
        console.warn('[mediaRouter] GLM video task failed');
        return null;
      }
    }
    console.warn('[mediaRouter] GLM video poll timeout');
    return null;
  } catch (e) {
    console.warn('[mediaRouter] GLM video failed:', e.message);
    return null;
  }
}

async function minimaxVideo(prompt, opts) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const { ok, data } = await fetchJson(`${MINIMAX_BASE}/video_generation`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'MiniMax-Hailuo-02',
        prompt,
        duration: opts.duration === 10 ? 10 : 6,
        resolution: opts.resolution === '1080p' ? '1080P' : '768P',
      }),
    });
    const taskId = data?.task_id;
    if (!ok || !taskId || (data?.base_resp && data.base_resp.status_code !== 0)) {
      console.warn('[mediaRouter] MiniMax video submit error:', data?.base_resp?.status_msg || JSON.stringify(data).slice(0, 200));
      return null;
    }
    const deadline = Date.now() + VIDEO_POLL_MAX_MS;
    while (Date.now() < deadline) {
      await sleep(VIDEO_POLL_INTERVAL);
      const poll = await fetchJson(`${MINIMAX_BASE}/query/video_generation?task_id=${taskId}`, { headers });
      const status = poll.data?.status;
      if (status === 'Success') {
        const fileId = poll.data?.file_id;
        if (!fileId) return null;
        const file = await fetchJson(`${MINIMAX_BASE}/files/retrieve?file_id=${fileId}`, { headers });
        const url = file.data?.file?.download_url;
        if (!url) return null;
        return { remoteUrl: url, ext: 'mp4', provider: 'minimax', model: 'MiniMax-Hailuo-02', source: 'minimax' };
      }
      if (status === 'Fail') {
        console.warn('[mediaRouter] MiniMax video task failed');
        return null;
      }
    }
    console.warn('[mediaRouter] MiniMax video poll timeout');
    return null;
  } catch (e) {
    console.warn('[mediaRouter] MiniMax video failed:', e.message);
    return null;
  }
}

async function generateVideo(prompt, opts = {}) {
  // MiniMax 優先（目前 GLM key 無影片額度），GLM 作為備援
  const result = (await minimaxVideo(prompt, opts)) || (await glmVideo(prompt, opts));
  if (result) return result;

  console.log('[mediaRouter] video: all providers failed, using mock');
  return {
    remoteUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    ext: 'mp4', provider: 'mock', model: 'mock', source: 'mock',
  };
}

// ── Music ───────────────────────────────────────────────────────────────────

// MiniMax music API 要求 lyrics（10-600 字）；使用者沒填時先用文字模型自動寫詞
async function ensureLyrics(prompt, lyrics, language) {
  if (lyrics && lyrics.trim().length >= 10) return lyrics.trim().slice(0, 600);
  const langInstruction = language === 'en'
    ? 'Write the lyrics in English.'
    : language === 'zh-CN' ? '请用简体中文写歌词。' : '請用繁體中文寫歌詞。';
  const result = await callAI(
    `根據以下音樂主題寫一首簡短歌詞（含 [Verse] 與 [Chorus] 段落標記，總長 100-300 字，不要任何說明文字，只輸出歌詞本身）：${prompt}。${langInstruction}`,
    '你是專業作詞人。',
    { maxTokens: 500, language }
  );
  const text = (result?.content || '').trim();
  if (text.length >= 10) return text.slice(0, 600);
  return `[Verse]\n${prompt}\n在這個旋律裡慢慢展開\n[Chorus]\n讓音樂帶我們去更遠的地方`;
}

async function minimaxMusic(prompt, opts) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;
  try {
    const lyrics = await ensureLyrics(prompt, opts.lyrics, opts.language);
    // prompt（風格描述）需 10-300 字
    let stylePrompt = [opts.style, prompt].filter(Boolean).join('，');
    if (stylePrompt.length < 10) stylePrompt = `${stylePrompt}，旋律流暢、編曲完整、情感真摯`;
    stylePrompt = stylePrompt.slice(0, 300);

    const { ok, data } = await fetchJson(`${MINIMAX_BASE}/music_generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'music-1.5',
        prompt: stylePrompt,
        lyrics,
        audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
      }),
    }, 120000);
    if (!ok || (data?.base_resp && data.base_resp.status_code !== 0)) {
      console.warn('[mediaRouter] MiniMax music error:', data?.base_resp?.status_msg || JSON.stringify(data).slice(0, 200));
      return null;
    }
    const audio = data?.data?.audio;
    if (!audio) return null;
    // audio 可能是 URL 或 hex 編碼二進位
    if (/^https?:\/\//.test(audio)) {
      return { remoteUrl: audio, ext: 'mp3', provider: 'minimax', model: 'music-1.5', source: 'minimax', lyrics };
    }
    const buffer = Buffer.from(audio, 'hex');
    if (buffer.length < 1000) return null;
    return { buffer, ext: 'mp3', provider: 'minimax', model: 'music-1.5', source: 'minimax', lyrics };
  } catch (e) {
    console.warn('[mediaRouter] MiniMax music failed:', e.message);
    return null;
  }
}

async function generateMusic(prompt, opts = {}) {
  const result = await minimaxMusic(prompt, opts);
  if (result) return result;

  console.log('[mediaRouter] music: all providers failed, using mock');
  return {
    remoteUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    ext: 'mp3', provider: 'mock', model: 'mock', source: 'mock',
  };
}

module.exports = { generateImage, generateVideo, generateMusic };
