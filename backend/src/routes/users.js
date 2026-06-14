// 用戶資料與登入稽核（/api/users，requireAuth）
// 前端登入後呼叫 POST /sync：upsert users/{uid} + 寫一筆登入事件（IP / 時間 / UA）。
// 無 Firestore 憑證時優雅降級（回 { enabled:false }，不影響登入流程）。

const express = require('express');
const router = express.Router();
const { getDb, isEnabled, serverTimestamp, increment, docData } = require('../services/firestore');

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

// POST /api/users/sync — 登入後同步個人檔 + 記錄登入事件
router.post('/sync', async (req, res) => {
  if (!isEnabled()) return res.json({ enabled: false });
  const u = req.user;
  if (!u?.uid) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(u.uid);
    const provider = u.firebase?.sign_in_provider || 'unknown';

    const snap = await userRef.get();
    const profile = {
      uid: u.uid,
      email: u.email || '',
      displayName: u.name || u.displayName || (u.email ? u.email.split('@')[0] : ''),
      photoURL: u.picture || '',
      provider,
      lastLoginAt: serverTimestamp(),
      loginCount: increment(1),
    };
    if (!snap.exists) profile.createdAt = serverTimestamp();
    await userRef.set(profile, { merge: true });

    // 登入稽核（子集合）
    await userRef.collection('logins').add({
      at: serverTimestamp(),
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || '',
      provider,
    });

    res.json({ enabled: true, uid: u.uid });
  } catch (err) {
    console.warn('[users/sync] failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me — 個人檔
router.get('/me', async (req, res) => {
  if (!isEnabled()) return res.json({ enabled: false });
  try {
    const snap = await getDb().collection('users').doc(req.user.uid).get();
    res.json(docData(snap) || { uid: req.user.uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me/logins?limit=20 — 最近登入紀錄
router.get('/me/logins', async (req, res) => {
  if (!isEnabled()) return res.json([]);
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const qs = await getDb().collection('users').doc(req.user.uid)
      .collection('logins').orderBy('at', 'desc').limit(limit).get();
    res.json(qs.docs.map(docData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
