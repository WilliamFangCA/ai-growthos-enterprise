// File reading utilities for Agent file upload
// Supports: PDF, DOCX, images, plain text — no size limit

export const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  pdf:   ['application/pdf'],
  docx:  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  text: [
    'text/plain', 'text/markdown', 'text/csv', 'application/json',
    'text/html', 'text/css', 'text/javascript',
  ],
};

const TEXT_LIMIT = 50000; // chars sent to AI

export function getFileCategory(file) {
  if (SUPPORTED_TYPES.image.includes(file.type) || (file.type || '').startsWith('image/')) return 'image';
  if (SUPPORTED_TYPES.pdf.includes(file.type) || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (SUPPORTED_TYPES.docx.includes(file.type) || file.name.match(/\.docx?$/i)) return 'docx';
  if ((file.type || '').startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) return 'audio';
  if ((file.type || '').startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i)) return 'video';
  if (SUPPORTED_TYPES.text.includes(file.type) || file.name.match(/\.(md|txt|csv|json|yaml|yml|xml|html|css|js|ts)$/i)) return 'text';
  return 'unknown';
}

// 讀取音／視訊長度（秒），失敗回 0
function readMediaDuration(file, kind) {
  return new Promise((resolve) => {
    try {
      const el = document.createElement(kind === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => { const d = el.duration; URL.revokeObjectURL(el.src); resolve(Number.isFinite(d) ? Math.round(d) : 0); };
      el.onerror = () => resolve(0);
      el.src = URL.createObjectURL(file);
      setTimeout(() => resolve(0), 4000);
    } catch { resolve(0); }
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

function truncate(text, label = '') {
  if (text.length <= TEXT_LIMIT) return text;
  return text.substring(0, TEXT_LIMIT) + `\n\n[...文件較長，已截斷至前 ${TEXT_LIMIT.toLocaleString()} 字元${label}]`;
}

// ── PDF ──────────────────────────────────────────────────────────────────────
async function extractPdfText(file) {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const texts = [];

    // Process all pages (no page cap)
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ').trim();
      if (pageText) texts.push(`[第 ${i}/${numPages} 頁]\n${pageText}`);
    }

    const extracted = texts.join('\n\n') || '[PDF 無可提取的文字內容]';
    return { text: truncate(extracted, `，共 ${numPages} 頁`), pages: numPages };
  } catch (err) {
    console.warn('PDF extraction failed:', err);
    return { text: `[PDF 解析失敗: ${err.message}]`, pages: 0 };
  }
}

// ── DOCX ─────────────────────────────────────────────────────────────────────
async function extractDocxText(file) {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '[DOCX 無可提取的文字內容]';
    if (result.messages?.length) {
      console.info('mammoth warnings:', result.messages);
    }
    return truncate(text);
  } catch (err) {
    console.warn('DOCX extraction failed:', err);
    // Fallback: try reading as text (works for some legacy .doc)
    try {
      const raw = await toText(file);
      const cleaned = raw.replace(/[^\x20-\x7E一-鿿　-〿\n\r\t]/g, ' ').trim();
      return truncate(cleaned);
    } catch {
      return `[DOCX 解析失敗: ${err.message}]`;
    }
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────
export async function processFile(file) {
  const category = getFileCategory(file);

  if (category === 'image') {
    const base64 = await toBase64(file);
    return {
      name: file.name,
      type: 'image',
      mimeType: file.type || 'image/jpeg',
      base64,
      preview: URL.createObjectURL(file),
      size: file.size,
    };
  }

  if (category === 'pdf') {
    const { text, pages } = await extractPdfText(file);
    return { name: file.name, type: 'pdf', text, size: file.size, pages };
  }

  if (category === 'docx') {
    const text = await extractDocxText(file);
    return { name: file.name, type: 'docx', text, size: file.size };
  }

  if (category === 'audio' || category === 'video') {
    const duration = await readMediaDuration(file, category);
    return { name: file.name, type: category, mimeType: file.type || category, size: file.size, duration };
  }

  if (category === 'text') {
    const raw = await toText(file);
    return { name: file.name, type: 'text', text: truncate(raw), size: file.size };
  }

  // Unknown — try as text
  try {
    const raw = await toText(file);
    return { name: file.name, type: 'text', text: truncate(raw), size: file.size };
  } catch {
    throw new Error(`不支援的文件格式：${file.name}`);
  }
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export const FILE_ICON = {
  image:   '🖼️',
  pdf:     '📄',
  docx:    '📝',
  text:    '📃',
  audio:   '🎵',
  video:   '🎬',
  unknown: '📎',
};
