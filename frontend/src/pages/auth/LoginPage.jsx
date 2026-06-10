import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail } from '../../firebase.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
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
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex' }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
        position: 'relative', overflow: 'hidden',
      }}
        className="auth-left-panel"
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f9fafb' }}>AI GrowthOS</div>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.08em' }}>ENTERPRISE</div>
            </div>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#f9fafb', lineHeight: 1.2, marginBottom: 16 }}>
            驅動成長的<br />
            <span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI 自動化平台</span>
          </h2>
          <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.6, marginBottom: 40 }}>
            整合行銷自動化、多通道通訊、內容工廠，讓 AI 為您的品牌全天候運作。
          </p>
          {[
            { icon: '🎯', text: 'AARRR 漏斗全自動化' },
            { icon: '💬', text: 'LINE / WhatsApp / Telegram 整合' },
            { icon: '✍️', text: 'AI 內容批量生成' },
            { icon: '📊', text: '即時數據儀表板' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ color: '#d1d5db', fontSize: 14 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - auth card */}
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%' }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚀</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f9fafb' }}>AI GrowthOS</div>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>ENTERPRISE</div>
            </div>
          </div>

          <div style={{ background: '#1a1d2e', borderRadius: 16, border: '1px solid #2a2d3e', padding: '36px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', marginBottom: 6 }}>歡迎回來</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>登入您的 AI GrowthOS 帳號</p>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>電子郵件</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>密碼</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={inputStyle}
                />
              </div>
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>忘記密碼？</Link>
              </div>
              <button type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
                {loading ? '登入中…' : '登入'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#2a2d3e' }} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>或</span>
              <div style={{ flex: 1, height: 1, background: '#2a2d3e' }} />
            </div>

            <button onClick={handleGoogle} disabled={loading} style={googleBtnStyle}>
              <GoogleIcon />
              使用 Google 帳號登入
            </button>

            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#6b7280' }}>
              還沒有帳號？{' '}
              <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>免費註冊</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFriendlyError(code) {
  const map = {
    'auth/user-not-found': '找不到此電子郵件的帳號',
    'auth/wrong-password': '密碼錯誤，請重試',
    'auth/invalid-email': '電子郵件格式不正確',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試',
    'auth/invalid-credential': '電子郵件或密碼不正確',
    'auth/network-request-failed': '網路連線失敗，請檢查網路',
  };
  return map[code] || '登入失敗，請重試';
}

const labelStyle = { display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6, fontWeight: 500 };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d3e',
  background: '#0f1117', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const primaryBtnStyle = (loading) => ({
  width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
  background: loading ? '#374151' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
  color: '#fff', fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
});
const googleBtnStyle = {
  width: '100%', padding: '11px', borderRadius: 8, border: '1px solid #2a2d3e', cursor: 'pointer',
  background: '#1a1d2e', color: '#e5e7eb', fontSize: 14, fontWeight: 500,
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
