import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithGoogle, registerWithEmail } from '../../firebase.js';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', '弱', '普通', '強', '非常強'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'][strength];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('兩次輸入的密碼不一致'); return; }
    if (form.password.length < 6) { setError('密碼至少需要 6 個字元'); return; }
    if (!agreed) { setError('請同意服務條款與隱私政策'); return; }
    setLoading(true);
    try {
      await registerWithEmail(form.email, form.password, form.name);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f9fafb' }}>AI GrowthOS</div>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>ENTERPRISE</div>
          </div>
        </div>

        <div style={{ background: '#1a1d2e', borderRadius: 16, border: '1px solid #2a2d3e', padding: '36px 32px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', marginBottom: 6 }}>建立帳號</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>免費開始使用 AI GrowthOS Enterprise</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading} style={googleBtnStyle}>
            <GoogleIcon />
            使用 Google 帳號快速註冊
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#2a2d3e' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>或使用電子郵件</span>
            <div style={{ flex: 1, height: 1, background: '#2a2d3e' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>姓名</label>
              <input type="text" value={form.name} onChange={set('name')} placeholder="您的姓名" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>電子郵件</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>密碼</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="至少 6 個字元" required style={inputStyle} />
            </div>
            {form.password && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 4, borderRadius: 2, background: '#2a2d3e', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(strength / 4) * 100}%`, background: strengthColor, transition: 'width 0.3s, background 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: strengthColor, marginTop: 4 }}>密碼強度：{strengthLabel}</div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>確認密碼</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="再次輸入密碼" required style={inputStyle} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                我同意{' '}
                <a href="#" style={{ color: '#3b82f6' }}>服務條款</a>
                {' '}與{' '}
                <a href="#" style={{ color: '#3b82f6' }}>隱私政策</a>
              </span>
            </label>

            <button type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
              {loading ? '建立中…' : '建立帳號'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#6b7280' }}>
            已有帳號？{' '}
            <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>立即登入</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function getFriendlyError(code) {
  const map = {
    'auth/email-already-in-use': '此電子郵件已被使用',
    'auth/invalid-email': '電子郵件格式不正確',
    'auth/weak-password': '密碼強度不足，至少需要 6 個字元',
    'auth/network-request-failed': '網路連線失敗，請檢查網路',
  };
  return map[code] || '註冊失敗，請重試';
}

const labelStyle = { display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6, fontWeight: 500 };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d3e',
  background: '#0f1117', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const primaryBtnStyle = (loading) => ({
  width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
  background: loading ? '#374151' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
  color: '#fff', fontSize: 14, fontWeight: 600,
});
const googleBtnStyle = {
  width: '100%', padding: '11px', borderRadius: 8, border: '1px solid #2a2d3e', cursor: 'pointer',
  background: '#0f1117', color: '#e5e7eb', fontSize: 14, fontWeight: 500,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
