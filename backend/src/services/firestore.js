// Firestore 持久化層（後端代理 / admin SDK）
// 存放需要跨重啟、跨 redeploy、按使用者區分的資料：
//   users / users/{uid}/logins / knowledge_bases(/entries) / scrape_records / ai_runs
// 設計原則（比照 aiRouter）：無完整憑證時 isEnabled()=false，呼叫端優雅回退 SQLite。
// admin SDK 繞過安全規則；fire-and-forget 寫入一律 try/catch 吞錯，不阻塞請求。

const { getAdminApp, getAdmin, hasFirestoreCredential } = require('../middleware/auth');

let _db = null;

function getDb() {
  if (_db) return _db;
  if (!hasFirestoreCredential()) return null;
  try {
    const app = getAdminApp();
    const admin = getAdmin();
    if (!app || !admin) return null;
    _db = admin.firestore(app);
    // 讓 undefined 欄位被忽略而非報錯
    try { _db.settings({ ignoreUndefinedProperties: true }); } catch (_) {}
    return _db;
  } catch (err) {
    console.warn('[firestore] init failed:', err.message);
    return null;
  }
}

function isEnabled() {
  return !!getDb();
}

function serverTimestamp() {
  const admin = getAdmin();
  return admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
}

function increment(n = 1) {
  const admin = getAdmin();
  return admin ? admin.firestore.FieldValue.increment(n) : n;
}

// 將 Firestore doc 轉成普通物件（Timestamp → ISO 字串，方便前端顯示）
function docData(snap) {
  if (!snap || !snap.exists) return null;
  const raw = snap.data() || {};
  const out = { id: snap.id };
  for (const [k, v] of Object.entries(raw)) {
    out[k] = (v && typeof v.toDate === 'function') ? v.toDate().toISOString() : v;
  }
  return out;
}

module.exports = { getDb, isEnabled, serverTimestamp, increment, docData };
