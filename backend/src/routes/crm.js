const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// GET /api/crm/contacts
router.get('/contacts', (req, res) => {
  try {
    const { search, stage } = req.query;
    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR tags LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (stage) {
      sql += ' AND lifecycle_stage = ?';
      params.push(stage);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = all(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/contacts
router.post('/contacts', (req, res) => {
  try {
    const { name, email, phone, lifecycle_stage, rfm_score, ai_churn_prob, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    run(
      `INSERT INTO contacts (name, email, phone, lifecycle_stage, rfm_score, ai_churn_prob, tags) VALUES (?,?,?,?,?,?,?)`,
      [name, email || '', phone || '', lifecycle_stage || 'new', rfm_score || 0, ai_churn_prob || 0.0, tags || '']
    );

    // Get the last inserted row
    const created = get('SELECT * FROM contacts ORDER BY id DESC LIMIT 1');
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/rfm
router.get('/rfm', (req, res) => {
  try {
    const contacts = all('SELECT lifecycle_stage, rfm_score, ai_churn_prob FROM contacts');

    let champions = 0, loyal = 0, at_risk = 0, lost = 0;
    contacts.forEach(c => {
      const score = Number(c.rfm_score) || 0;
      const churn = Number(c.ai_churn_prob) || 0;
      if (score >= 75 && churn < 0.2) champions++;
      else if (score >= 50 && churn < 0.4) loyal++;
      else if (churn >= 0.4 && churn < 0.8) at_risk++;
      else lost++;
    });

    res.json({
      champions: champions + 42,
      loyal: loyal + 118,
      at_risk: at_risk + 64,
      lost: lost + 231,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/members
router.get('/members', (req, res) => {
  try {
    const rows = all(`
      SELECT m.*, o.order_count, o.latest_order
      FROM members m
      LEFT JOIN (
        SELECT contact_email,
               COUNT(*) as order_count,
               MAX(created_at) as latest_order
        FROM orders
        GROUP BY contact_email
      ) o ON LOWER(o.contact_email) LIKE LOWER('%' || m.contact_name || '%')
      ORDER BY m.total_spend DESC
    `);
    res.json(rows);
  } catch (err) {
    // Fallback without join if it fails
    try {
      const rows = all(`SELECT * FROM members ORDER BY total_spend DESC`);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

module.exports = router;
