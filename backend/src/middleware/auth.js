const path = require('path');
const fs = require('fs');

let admin = null;
let adminApp = null;
let hasFullCredential = false; // true 表示有完整 service account（可寫 Firestore），false = 僅 projectId

// 嘗試從 service account JSON 檔載入憑證：
//   1. FIREBASE_SERVICE_ACCOUNT_PATH 指定路徑
//   2. 掃描候選目錄（repo 根 / 專案根 / backend 根）找 *firebase-adminsdk*.json
// 生產（Railway）建議改用 FIREBASE_CLIENT_EMAIL/PRIVATE_KEY 環境變數，不放檔案。
function loadServiceAccountFromFile() {
  try {
    const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (explicit && fs.existsSync(explicit)) return JSON.parse(fs.readFileSync(explicit, 'utf-8'));

    const candidateDirs = [
      path.join(__dirname, '..', '..', '..', '..'), // repo 根 (Auto-Company-main)
      path.join(__dirname, '..', '..', '..'),       // 專案根 (AI GrowthOS Enterprise)
      path.join(__dirname, '..', '..'),             // backend
    ];
    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      const match = fs.readdirSync(dir).find(f => /firebase-adminsdk.*\.json$/i.test(f));
      if (match) return JSON.parse(fs.readFileSync(path.join(dir, match), 'utf-8'));
    }
  } catch (err) {
    console.warn('[auth] service account file load failed:', err.message);
  }
  return null;
}

function getAdminApp() {
  if (adminApp) return adminApp;
  try {
    if (!admin) admin = require('firebase-admin');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'ai-growthos-enterprise';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      hasFullCredential = true;
    } else {
      const serviceAccount = loadServiceAccountFromFile();
      if (serviceAccount) {
        adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        hasFullCredential = true;
        console.log('[auth] firebase-admin initialized with service account (Firestore enabled)');
      } else {
        // Dev fallback: verify tokens using project ID only（可驗 token，但無法寫 Firestore）
        adminApp = admin.initializeApp({ projectId });
        hasFullCredential = false;
      }
    }
    return adminApp;
  } catch (err) {
    console.warn('[auth] firebase-admin not available:', err.message);
    return null;
  }
}

// 供 firestore.js 判斷是否有完整憑證（projectId-only 無法寫 Firestore）
function hasFirestoreCredential() {
  if (!adminApp) getAdminApp();
  return hasFullCredential;
}

function getAdmin() {
  if (!admin) getAdminApp();
  return admin;
}

async function requireAuth(req, res, next) {
  const app = getAdminApp();
  if (!app) return next(); // fail-open if firebase-admin unavailable

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = await admin.auth(app).verifyIdToken(header.slice(7));
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function optionalAuth(req, res, next) {
  const app = getAdminApp();
  if (!app) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const decoded = await admin.auth(app).verifyIdToken(header.slice(7));
    req.user = decoded;
  } catch (_) {}
  next();
}

module.exports = { requireAuth, optionalAuth, getAdminApp, getAdmin, hasFirestoreCredential };
