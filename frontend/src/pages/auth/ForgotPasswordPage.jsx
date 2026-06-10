import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordReset } from '../../firebase.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      const map = {
        'auth/user-not-found': '找不到此電子郵件的帳號',
        'auth/invalid-email': '電子郵件格式不正確',
      };
      setError(map[err.code] || '發送失敗，請重試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f9fafb' }}>AI GrowthOS</div>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>ENTERPRISE</div>
          </div>
        </div>

        <div style={{ background: '#1a1d2e', borderRadius: 16, border: '1px solid #2a2d3e', padding: '36px 32px' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f9fafb', marginBottom: 12 }}>重設郵件已發送</h2>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, marginBottom: 28 }}>
                我們已將密碼重設連結傳送至<br />
                <strong style={{ color: '#e5e7eb' }}>{email}</strong><br />
                請查看您的收件匣（包含垃圾郵件）。
              </p>
              <Link to="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                返回登入
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 24 }}>
                ← 返回登入
              </Link>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>忘記密碼？</h1>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 1.6 }}>
                輸入您的電子郵件，我們將發送密碼重設連結。
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 6, fontWeight: 500 }}>電子郵件</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d3e', background: '#0f1117', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#374151' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                }}>
                  {loading ? '發送中…' : '發送重設連結'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
