const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { run, get } = require('../db');

const KB_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge-base');
if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true });

// GET /api/hub-settings/:hubType
router.get('/:hubType', (req, res) => {
  try {
    const row = get('SELECT * FROM hub_configs WHERE hub_type = ?', [req.params.hubType]);
    res.json(row || { hub_type: req.params.hubType, system_prompt: '', knowledge_base_name: '', knowledge_base_path: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hub-settings/:hubType — save system prompt
router.post('/:hubType', (req, res) => {
  try {
    const { system_prompt } = req.body;
    run(
      `INSERT INTO hub_configs (hub_type, system_prompt) VALUES (?, ?)
       ON CONFLICT(hub_type) DO UPDATE SET system_prompt = excluded.system_prompt, updated_at = CURRENT_TIMESTAMP`,
      [req.params.hubType, system_prompt || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hub-settings/:hubType/upload — upload knowledge base file
router.post('/:hubType/upload', (req, res) => {
  try {
    const { name, file_base64, format } = req.body;
    if (!name || !file_base64) return res.status(400).json({ error: 'name and file_base64 required' });
    const safeFormat = (format || 'txt').replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const buf = Buffer.from(file_base64, 'base64');
    const filename = `${req.params.hubType}_kb.${safeFormat}`;
    const filepath = path.join(KB_DIR, filename);
    fs.writeFileSync(filepath, buf);
    run(
      `INSERT INTO hub_configs (hub_type, knowledge_base_path, knowledge_base_name) VALUES (?, ?, ?)
       ON CONFLICT(hub_type) DO UPDATE SET knowledge_base_path = excluded.knowledge_base_path,
       knowledge_base_name = excluded.knowledge_base_name, updated_at = CURRENT_TIMESTAMP`,
      [req.params.hubType, filepath, name]
    );
    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hub-settings/:hubType/kb — remove knowledge base
router.delete('/:hubType/kb', (req, res) => {
  try {
    const row = get('SELECT knowledge_base_path FROM hub_configs WHERE hub_type = ?', [req.params.hubType]);
    if (row?.knowledge_base_path) {
      try { fs.unlinkSync(row.knowledge_base_path); } catch {}
    }
    run(
      `UPDATE hub_configs SET knowledge_base_path = '', knowledge_base_name = '', updated_at = CURRENT_TIMESTAMP WHERE hub_type = ?`,
      [req.params.hubType]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function readKnowledgeBase(filepath) {
  if (!filepath || !fs.existsSync(filepath)) return '';
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filepath));
      return data.text.slice(0, 8000);
    } catch { return ''; }
  }
  try {
    return fs.readFileSync(filepath, 'utf-8').slice(0, 8000);
  } catch { return ''; }
}

module.exports = router;
module.exports.readKnowledgeBase = readKnowledgeBase;
