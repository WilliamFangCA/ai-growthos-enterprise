import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 6px #3b82f6' }} />
          <span style={{ fontSize: 13, color: '#93c5fd', fontWeight: 500 }}>全新 AI 驅動的成長平台</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#f9fafb' }}>
          讓 AI 為您的品牌
          <br />
          <span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            全天候自動成長
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', color: '#9ca3af', lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          整合行銷自動化、多通道通訊、AI 內容工廠與智能工作流，<br />
          從獲客到留存，一個平台搞定 AARRR 全漏斗。
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <button onClick={() => navigate('/signup')} style={{
            padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: '0 0 24px rgba(99,102,241,0.35)', transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 24px rgba(99,102,241,0.35)'; }}
          >
            免費開始試用 →
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{
            padding: '14px 32px', borderRadius: 10, border: '1px solid #2a2d3e', cursor: 'pointer',
            background: 'rgba(42,45,62,0.5)', color: '#e5e7eb', fontSize: 16, fontWeight: 600,
          }}>
            了解功能
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          {[['14+', 'AI 自動化工作流'], ['6', '通訊平台整合'], ['AARRR', '全漏斗覆蓋'], ['24/7', 'AI 自動運作']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb', lineHeight: 1.2 }}>{num}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div style={{
          background: '#1a1d2e', borderRadius: 16, border: '1px solid #2a2d3e', padding: '20px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
          maxWidth: 760, margin: '0 auto',
        }}>
          {/* Fake browser bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <div style={{ flex: 1, height: 22, borderRadius: 4, background: '#0f1117', marginLeft: 8, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
              <span style={{ fontSize: 10, color: '#4b5563' }}>ai-growthos-enterprise.app/dashboard</span>
            </div>
          </div>
          {/* Fake KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            {[['💰', 'NT$284,500', '月收入', '#10b981'], ['👥', '12,847', '活躍用戶', '#3b82f6'], ['📦', '247', '待出貨', '#f59e0b'], ['🤖', '94.2%', 'AI 回覆率', '#8b5cf6']].map(([icon, val, label, color]) => (
              <div key={label} style={{ background: '#0f1117', borderRadius: 8, padding: '12px 10px', borderLeft: `2px solid ${color}` }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb', lineHeight: 1.2 }}>{val}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Fake chart area */}
          <div style={{ background: '#0f1117', borderRadius: 8, height: 80, display: 'flex', alignItems: 'flex-end', padding: '10px 12px', gap: 4 }}>
            {[40, 55, 45, 70, 60, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: `linear-gradient(180deg, rgba(59,130,246,${0.4 + i * 0.05}), rgba(99,102,241,0.2))` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
