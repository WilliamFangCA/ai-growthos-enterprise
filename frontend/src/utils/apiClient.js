import { auth } from '../firebase.js';

export async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {}
  return fetch(url, { ...options, headers });
}
