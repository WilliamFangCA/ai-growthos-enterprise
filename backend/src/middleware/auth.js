let admin = null;
let adminApp = null;

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
    } else {
      // Dev fallback: verify tokens using project ID only (less strict, requires network)
      adminApp = admin.initializeApp({ projectId });
    }
    return adminApp;
  } catch (err) {
    console.warn('[auth] firebase-admin not available:', err.message);
    return null;
  }
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

module.exports = { requireAuth, optionalAuth };
