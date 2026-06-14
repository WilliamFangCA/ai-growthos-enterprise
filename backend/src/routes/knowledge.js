// 學習知識庫 API（/api/knowledge）
// 知識庫 = 一個可分類、可選用的累積學習集合（爬蟲蒸餾結果 / 手動內容）。
// scope: 'user'（使用者私有，可建可刪）| 'public'（平台提供，唯讀不可刪）。
// 其他 AI 功能（工具箱 / 內容工廠 / 媒體生成）可透過 getKBText(kbIds) 注入選定庫內容。
//
// 儲存策略：Firestore 優先（跨 redeploy 永久保存、按 owner_uid 區分），
// 無 Firestore 憑證時回退本地 SQLite（確保本地開發仍可運作）。
// id 在 Firestore 為字串 doc id、在 SQLite 為整數 —— 一律以字串對待，前端不可假設為數字。

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const fsdb = require('../services/firestore');

const VALID_CATEGORIES = ['general', 'product_style', 'image_prompt', 'video_prompt', 'music_prompt'];

// 公開示範庫（平台提供給所有使用者的累積經驗）
const PUBLIC_KBS = [
  {
    name: '主流商品風格庫', category: 'product_style',
    description: '從各大電商與社群歸納的熱門商品視覺與文案風格，供文案/選品參考。',
    entries: [
      { title: '極簡北歐風', content: '視覺：大量留白、低飽和莫蘭迪色、原木與棉麻材質。文案調性：簡短、強調生活感與質感，少用驚嘆號。適合：家居、餐廚、文具。' },
      { title: '日系療癒風', content: '視覺：柔焦、暖色調、手寫字體、生活情境照。文案調性：溫柔、第一人稱、訴說日常小確幸。適合：保養、食品、寵物。' },
      { title: '機能潮流風', content: '視覺：高對比、黑白灰加螢光點綴、產品特寫與數據標註。文案調性：強調規格、效能、限量稀缺。適合：3C、運動、戶外。' },
    ],
  },
  {
    name: 'AI 圖片 Prompt 庫', category: 'image_prompt',
    description: '實測有效的 AI 生圖 prompt 模板與關鍵詞，供媒體生成參考優化。',
    entries: [
      { title: '商品情境圖', content: 'product photography of {product}, on a marble countertop, soft natural window light, shallow depth of field, minimal props, 50mm lens, high detail, commercial quality --ar 1:1' },
      { title: '社群貼文主視覺', content: 'flat lay of {theme}, pastel color palette, top-down view, organized composition, soft shadows, lifestyle aesthetic, instagram-ready --ar 4:5' },
    ],
  },
  {
    name: 'AI 影片 / 音樂 Prompt 庫', category: 'video_prompt',
    description: '短影音分鏡與配樂風格 prompt 範例。',
    entries: [
      { title: '產品開箱短片', content: '6s cinematic product reveal of {product}, slow dolly-in, hands unboxing, warm studio lighting, shallow focus, smooth camera motion' },
      { title: '輕快背景音樂', content: 'upbeat acoustic pop, ukulele and claps, 120 bpm, cheerful and clean, suitable for lifestyle brand reels, no vocals' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════
// Firestore 實作
// ══════════════════════════════════════════════════════════════════════════

let _publicSeeded = false;
async function ensurePublicSeeded(db) {
  if (_publicSeeded) return;
  const existing = await db.collection('knowledge_bases').where('scope', '==', 'public').get();
  const names = new Set(existing.docs.map(d => d.get('name')));
  for (const kb of PUBLIC_KBS) {
    if (names.has(kb.name)) continue;
    const charCount = kb.entries.reduce((s, e) => s + e.content.length, 0);
    const ref = await db.collection('knowledge_bases').add({
      name: kb.name, description: kb.description, category: kb.category,
      scope: 'public', owner_uid: null, entry_count: kb.entries.length, char_count: charCount,
      created_at: fsdb.serverTimestamp(), updated_at: fsdb.serverTimestamp(),
    });
    for (const e of kb.entries) {
      await ref.collection('entries').add({
        title: e.title, content: e.content, source_url: '', source_type: 'manual',
        created_at: fsdb.serverTimestamp(),
      });
    }
  }
  _publicSeeded = true;
}

async function fsRecount(db, kbId) {
  const snap = await db.collection('knowledge_bases').doc(kbId).collection('entries').get();
  let chars = 0;
  snap.forEach(d => { chars += (d.get('content') || '').length; });
  await db.collection('knowledge_bases').doc(kbId).update({
    entry_count: snap.size, char_count: chars, updated_at: fsdb.serverTimestamp(),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SQLite recount（回退用）
// ══════════════════════════════════════════════════════════════════════════
function sqliteRecount(kbId) {
  const stat = get(`SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(content)),0) AS chars FROM kb_entries WHERE kb_id = ?`, [kbId]);
  run(`UPDATE knowledge_bases SET entry_count = ?, char_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [stat.n, stat.chars, kbId]);
}

// ── GET / 列出知識庫 ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { scope, category } = req.query;
    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      await ensurePublicSeeded(db);
      const uid = req.user?.uid;
      // 公開 + 自己的；各做單一 equality 查詢避免複合索引需求
      const [pub, mine] = await Promise.all([
        db.collection('knowledge_bases').where('scope', '==', 'public').get(),
        uid ? db.collection('knowledge_bases').where('owner_uid', '==', uid).get() : Promise.resolve({ docs: [] }),
      ]);
      let rows = [...pub.docs, ...mine.docs].map(fsdb.docData);
      if (scope) rows = rows.filter(r => r.scope === scope);
      if (category && category !== 'all') rows = rows.filter(r => r.category === category);
      rows.sort((a, b) => (a.scope === b.scope ? 0 : a.scope === 'public' ? -1 : 1) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
      return res.json(rows);
    }
    // SQLite 回退
    const where = [];
    const params = [];
    if (scope) { where.push('scope = ?'); params.push(scope); }
    if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
    const sql = `SELECT * FROM knowledge_bases ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY scope DESC, updated_at DESC`;
    res.json(all(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / 建立私有庫 ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: '請提供知識庫名稱' });
    const cat = VALID_CATEGORIES.includes(category) ? category : 'general';

    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const uid = req.user?.uid || null;
      // 同 owner 不可同名
      const dup = await db.collection('knowledge_bases').where('owner_uid', '==', uid).where('name', '==', String(name).trim()).limit(1).get();
      if (!dup.empty) return res.status(400).json({ error: '已有同名知識庫' });
      const ref = await db.collection('knowledge_bases').add({
        name: String(name).trim(), description: String(description || '').trim(), category: cat,
        scope: 'user', owner_uid: uid, entry_count: 0, char_count: 0,
        created_at: fsdb.serverTimestamp(), updated_at: fsdb.serverTimestamp(),
      });
      const snap = await ref.get();
      return res.json({ success: true, kb: fsdb.docData(snap) });
    }
    // SQLite 回退
    try {
      const info = run(`INSERT INTO knowledge_bases (name, description, category, scope) VALUES (?,?,?,'user')`,
        [String(name).trim(), String(description || '').trim(), cat]);
      res.json({ success: true, kb: get('SELECT * FROM knowledge_bases WHERE id = ?', [info.lastInsertRowid]) });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(400).json({ error: '已有同名知識庫' });
      throw e;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id 庫詳情 + entries ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const snap = await db.collection('knowledge_bases').doc(req.params.id).get();
      if (!snap.exists) return res.status(404).json({ error: '知識庫不存在' });
      const entriesSnap = await db.collection('knowledge_bases').doc(req.params.id)
        .collection('entries').orderBy('created_at', 'desc').get();
      return res.json({ ...fsdb.docData(snap), entries: entriesSnap.docs.map(fsdb.docData) });
    }
    const kb = get('SELECT * FROM knowledge_bases WHERE id = ?', [req.params.id]);
    if (!kb) return res.status(404).json({ error: '知識庫不存在' });
    const entries = all('SELECT * FROM kb_entries WHERE kb_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...kb, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id 刪除（僅私有庫） ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const ref = db.collection('knowledge_bases').doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: '知識庫不存在' });
      if (snap.get('scope') === 'public') return res.status(403).json({ error: '公開知識庫不可刪除' });
      const entries = await ref.collection('entries').get();
      const batch = db.batch();
      entries.forEach(d => batch.delete(d.ref));
      batch.delete(ref);
      await batch.commit();
      return res.json({ success: true });
    }
    const kb = get('SELECT scope FROM knowledge_bases WHERE id = ?', [req.params.id]);
    if (!kb) return res.status(404).json({ error: '知識庫不存在' });
    if (kb.scope === 'public') return res.status(403).json({ error: '公開知識庫不可刪除' });
    run('DELETE FROM kb_entries WHERE kb_id = ?', [req.params.id]);
    run('DELETE FROM knowledge_bases WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/entries 附加條目 ───────────────────────────────────────────────
router.post('/:id/entries', async (req, res) => {
  try {
    const { title, content, source_url, source_type } = req.body;
    if (!content || !String(content).trim()) return res.status(400).json({ error: '條目內容不可為空' });

    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const ref = db.collection('knowledge_bases').doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: '知識庫不存在' });
      if (snap.get('scope') === 'public') return res.status(403).json({ error: '公開知識庫不可編輯' });
      const eref = await ref.collection('entries').add({
        title: String(title || '').trim().slice(0, 200), content: String(content).trim(),
        source_url: String(source_url || '').trim(), source_type: String(source_type || 'manual'),
        created_at: fsdb.serverTimestamp(),
      });
      await fsRecount(db, req.params.id);
      const esnap = await eref.get();
      return res.json({ success: true, entry: fsdb.docData(esnap) });
    }
    const kb = get('SELECT id, scope FROM knowledge_bases WHERE id = ?', [req.params.id]);
    if (!kb) return res.status(404).json({ error: '知識庫不存在' });
    if (kb.scope === 'public') return res.status(403).json({ error: '公開知識庫不可編輯' });
    const info = run(`INSERT INTO kb_entries (kb_id, title, content, source_url, source_type) VALUES (?,?,?,?,?)`,
      [kb.id, String(title || '').trim().slice(0, 200), String(content).trim(), String(source_url || '').trim(), String(source_type || 'manual')]);
    sqliteRecount(kb.id);
    res.json({ success: true, entry: get('SELECT * FROM kb_entries WHERE id = ?', [info.lastInsertRowid]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id/entries/:eid 刪除條目 ────────────────────────────────────────
router.delete('/:id/entries/:eid', async (req, res) => {
  try {
    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const ref = db.collection('knowledge_bases').doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: '知識庫不存在' });
      if (snap.get('scope') === 'public') return res.status(403).json({ error: '公開知識庫不可編輯' });
      await ref.collection('entries').doc(req.params.eid).delete();
      await fsRecount(db, req.params.id);
      return res.json({ success: true });
    }
    const kb = get('SELECT id, scope FROM knowledge_bases WHERE id = ?', [req.params.id]);
    if (!kb) return res.status(404).json({ error: '知識庫不存在' });
    if (kb.scope === 'public') return res.status(403).json({ error: '公開知識庫不可編輯' });
    run('DELETE FROM kb_entries WHERE id = ? AND kb_id = ?', [req.params.eid, kb.id]);
    sqliteRecount(kb.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 內部 util（供 tools.js 等呼叫；皆為 async）
// ══════════════════════════════════════════════════════════════════════════

// 直接新增條目（爬蟲存入用）；回傳 true/false
async function addEntry(kbId, { title, content, source_url, source_type } = {}) {
  if (!kbId || !content || !String(content).trim()) return false;
  try {
    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      const ref = db.collection('knowledge_bases').doc(String(kbId));
      const snap = await ref.get();
      if (!snap.exists || snap.get('scope') === 'public') return false;
      await ref.collection('entries').add({
        title: String(title || '').trim().slice(0, 200), content: String(content).trim(),
        source_url: String(source_url || '').trim(), source_type: String(source_type || 'tool'),
        created_at: fsdb.serverTimestamp(),
      });
      await fsRecount(db, String(kbId));
      return true;
    }
    const kb = get('SELECT id, scope FROM knowledge_bases WHERE id = ?', [kbId]);
    if (!kb || kb.scope === 'public') return false;
    run(`INSERT INTO kb_entries (kb_id, title, content, source_url, source_type) VALUES (?,?,?,?,?)`,
      [kb.id, String(title || '').trim().slice(0, 200), String(content).trim(), String(source_url || '').trim(), String(source_type || 'tool')]);
    sqliteRecount(kb.id);
    return true;
  } catch (err) {
    console.warn('[knowledge] addEntry failed:', err.message);
    return false;
  }
}

// 聚合選定知識庫的條目文字，供 AI 注入
async function getKBText(kbIds, maxChars = 12000) {
  try {
    if (!kbIds) return '';
    const ids = (Array.isArray(kbIds) ? kbIds : String(kbIds).split(',')).map(x => String(x).trim()).filter(Boolean);
    if (ids.length === 0) return '';

    const parts = [];
    let total = 0;

    if (fsdb.isEnabled()) {
      const db = fsdb.getDb();
      for (const id of ids) {
        if (total >= maxChars) break;
        const snap = await db.collection('knowledge_bases').doc(id).get();
        if (!snap.exists) continue;
        const entries = await db.collection('knowledge_bases').doc(id).collection('entries').orderBy('created_at', 'desc').get();
        if (entries.empty) continue;
        const body = entries.docs.map(d => {
          const t = d.get('title'); const c = d.get('content');
          return t ? `• ${t}：${c}` : `• ${c}`;
        }).join('\n');
        const slice = body.slice(0, maxChars - total);
        parts.push(`【知識庫：${snap.get('name')}】\n${slice}`);
        total += slice.length;
      }
    } else {
      const numIds = ids.map(x => parseInt(x, 10)).filter(Boolean);
      if (numIds.length === 0) return '';
      const placeholders = numIds.map(() => '?').join(',');
      const kbs = all(`SELECT id, name FROM knowledge_bases WHERE id IN (${placeholders})`, numIds);
      for (const kb of kbs) {
        if (total >= maxChars) break;
        const entries = all('SELECT title, content FROM kb_entries WHERE kb_id = ? ORDER BY created_at DESC', [kb.id]);
        if (entries.length === 0) continue;
        const body = entries.map(e => (e.title ? `• ${e.title}：${e.content}` : `• ${e.content}`)).join('\n');
        const slice = body.slice(0, maxChars - total);
        parts.push(`【知識庫：${kb.name}】\n${slice}`);
        total += slice.length;
      }
    }

    if (parts.length === 0) return '';
    return `以下是供你參考的累積學習知識，請充分運用其中的風格、模式與經驗：\n\n${parts.join('\n\n')}`;
  } catch (err) {
    console.warn('[knowledge] getKBText failed:', err.message);
    return '';
  }
}

// 啟動時預先播種公開示範庫（fire-and-forget；無 Firestore 時 no-op，由 SQLite 端 seed 負責）
async function seedPublicKBs() {
  if (!fsdb.isEnabled()) return;
  try { await ensurePublicSeeded(fsdb.getDb()); } catch (err) { console.warn('[knowledge] public seed failed:', err.message); }
}

module.exports = router;
module.exports.getKBText = getKBText;
module.exports.addEntry = addEntry;
module.exports.seedPublicKBs = seedPublicKBs;
