const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { run, get, all } = require('../db');

const GLOBAL_KB_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base', 'global');
if (!fs.existsSync(GLOBAL_KB_DIR)) fs.mkdirSync(GLOBAL_KB_DIR, { recursive: true });

const MAX_CHARS = 8000;

async function readFileText(filepath) {
  if (!filepath || !fs.existsSync(filepath)) return '';
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filepath));
      return data.text.slice(0, MAX_CHARS);
    } catch { return ''; }
  }
  try {
    return fs.readFileSync(filepath, 'utf-8').slice(0, MAX_CHARS);
  } catch { return ''; }
}

// GET /api/global-kb — list all docs
router.get('/', (req, res) => {
  try {
    const rows = all('SELECT id, name, char_count, created_at FROM global_kb ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/global-kb/upload — upload a knowledge doc
router.post('/upload', async (req, res) => {
  try {
    const { name, file_base64, format } = req.body;
    if (!name || !file_base64) return res.status(400).json({ error: 'name and file_base64 required' });

    const count = get('SELECT COUNT(*) as n FROM global_kb');
    if (count && count.n >= 5) return res.status(400).json({ error: '已達上限 5 份文件' });

    const safeFormat = (format || 'txt').replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const safeBase = name.replace(/[^a-z0-9_\-一-鿿]/gi, '_').slice(0, 40);
    const filename = `${Date.now()}_${safeBase}.${safeFormat}`;
    const filepath = path.join(GLOBAL_KB_DIR, filename);

    const buf = Buffer.from(file_base64, 'base64');
    fs.writeFileSync(filepath, buf);

    const text = await readFileText(filepath);
    const charCount = text.length;

    run(
      'INSERT INTO global_kb (name, filepath, char_count) VALUES (?, ?, ?)',
      [name, filepath, charCount]
    );

    const row = get('SELECT id, name, char_count, created_at FROM global_kb WHERE filepath = ?', [filepath]);
    res.json({ success: true, doc: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/global-kb/:id — delete a doc
router.delete('/:id', (req, res) => {
  try {
    const row = get('SELECT filepath FROM global_kb WHERE id = ?', [req.params.id]);
    if (row?.filepath) {
      try { fs.unlinkSync(row.filepath); } catch {}
    }
    run('DELETE FROM global_kb WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exported utility: aggregate all global KB text for injection into AI prompts
async function getGlobalKBText() {
  try {
    const rows = all('SELECT filepath, name FROM global_kb ORDER BY created_at ASC');
    if (!rows || rows.length === 0) return '';

    const parts = [];
    let total = 0;
    const limit = 12000;

    for (const row of rows) {
      if (total >= limit) break;
      const text = await readFileText(row.filepath);
      if (!text) continue;
      const slice = text.slice(0, limit - total);
      parts.push(`--- ${row.name} ---\n${slice}`);
      total += slice.length;
    }

    if (parts.length === 0) return '';
    return `【全局知識庫】\n${parts.join('\n\n')}`;
  } catch {
    return '';
  }
}

module.exports = router;
module.exports.getGlobalKBText = getGlobalKBText;
