import React from 'react';
import { useNavigate } from 'react-router-dom';

const LINKS = {
  '產品': [
    { label: '功能特色', href: '#features' },
    { label: '定價方案', href: '#pricing' },
    { label: '更新日誌', href: '#' },
    { label: '路線圖', href: '#' },
  ],
  '公司': [
    { label: '關於我們', href: '#' },
    { label: '部落格', href: '#' },
    { label: '合作夥伴', href: '#' },
    { label: '聯繫我們', href: '#' },
  ],
  '法律': [
    { label: '隱私政策', href: '#' },
    { label: '服務條款', href: '#' },
    { label: '安全說明', href: '#' },
    { label: 'Cookie 政策', href: '#' },
  ],
};

export default function LandingFooter() {
  const navigate = useNavigate();

  function scrollTo(href) {
    if (href.startsWith('#') && href.length > 1) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <footer style={{ background: '#0a0d14', borderTop: '1px solid #1a1d2e', padding: '60px 24px 32px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(3, 1fr)', gap: 40, marginBottom: 48 }} className="footer-grid">
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00b962, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚀</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb' }}>AI GrowthOS</div>
                <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em' }}>LINE 賣家專用</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, maxWidth: 240, marginBottom: 20 }}>
              你睡覺，LINE 幫你賺錢。台灣 LINE 賣家專用 AI 銷售自動化平台。
            </p>
            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {['𝕏', 'in', 'f'].map(s => (
                <div key={s} style={{ width: 32, height: 32, borderRadius: 8, background: '#1a1d2e', border: '1px solid #2a2d3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([col, links]) => (
            <div key={col}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 16 }}>{col}</h4>
              {links.map(link => (
                <div key={link.label} style={{ marginBottom: 10 }}>
                  <a
                    href={link.href}
                    onClick={e => { if (link.href.startsWith('#')) { e.preventDefault(); scrollTo(link.href); } }}
                    style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#e5e7eb'}
                    onMouseLeave={e => e.target.style.color = '#6b7280'}
                  >
                    {link.label}
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #1a1d2e', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#4b5563' }}>
            © 2026 AI GrowthOS. 專為台灣 LINE 賣家打造. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => navigate('/signup')} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              免費開始試用 →
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
