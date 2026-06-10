import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(15,17,23,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(42,45,62,0.8)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f9fafb', lineHeight: 1.1 }}>AI GrowthOS</div>
            <div style={{ fontSize: 9, color: '#6b7280', letterSpacing: '0.08em' }}>ENTERPRISE</div>
          </div>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }} className="desktop-nav">
          {[['features', '功能特色'], ['pricing', '定價方案'], ['testimonials', '客戶評價']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px',
              borderRadius: 6, color: '#9ca3af', fontSize: 14, fontWeight: 500,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.target.style.color = '#f9fafb'}
              onMouseLeave={e => e.target.style.color = '#9ca3af'}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }} className="desktop-nav">
          <button onClick={() => navigate('/login')} style={{
            padding: '7px 18px', borderRadius: 8, border: '1px solid #2a2d3e',
            background: 'transparent', color: '#e5e7eb', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            登入
          </button>
          <button onClick={() => navigate('/signup')} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(90deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            免費開始
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="mobile-menu-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 22, marginLeft: 'auto', display: 'none' }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#1a1d2e', borderTop: '1px solid #2a2d3e', padding: '16px 24px 20px' }}>
          {[['features', '功能特色'], ['pricing', '定價方案'], ['testimonials', '客戶評價']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', color: '#e5e7eb', fontSize: 15, borderBottom: '1px solid #2a2d3e' }}>
              {label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3e', background: 'transparent', color: '#e5e7eb', fontSize: 14, cursor: 'pointer' }}>登入</button>
            <button onClick={() => navigate('/signup')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>免費開始</button>
          </div>
        </div>
      )}
    </nav>
  );
}
