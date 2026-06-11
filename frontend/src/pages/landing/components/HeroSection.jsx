import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,185,98,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '12%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,185,98,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,185,98,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,185,98,0.1)', border: '1px solid rgba(0,185,98,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00b962', display: 'inline-block', boxShadow: '0 0 8px #00b962' }} />
          <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 500 }}>專為台灣 LINE 賣家打造 · 已有 300+ 賣家使用</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(36px, 6.5vw, 68px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#f9fafb', letterSpacing: '-0.02em' }}>
          你睡覺，
          <span style={{ background: 'linear-gradient(90deg, #00b962, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LINE 幫你賺錢
          </span>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#9ca3af', lineHeight: 1.75, marginBottom: 16, maxWidth: 640, margin: '0 auto 16px' }}>
          AI 自動回覆買家詢問、處理訂單通知、發送行銷活動。
        </p>
        <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', color: '#6b7280', lineHeight: 1.6, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
          從蝦皮、Shopee 到 LINE 購物，一個平台統一管理多通路。
          <br />設定一次，24 小時 AI 幫你顧攤位。
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <button onClick={() => navigate('/signup')} style={{
            padding: '15px 36px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #00b962, #059669)', color: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: '0 0 28px rgba(0,185,98,0.4)', transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 36px rgba(0,185,98,0.55)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 28px rgba(0,185,98,0.4)'; }}
          >
            免費試用 14 天 →
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={{
            padding: '15px 32px', borderRadius: 10, border: '1px solid #2a2d3e', cursor: 'pointer',
            background: 'rgba(42,45,62,0.5)', color: '#e5e7eb', fontSize: 16, fontWeight: 600,
          }}>
            看 3 分鐘示範
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 36, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
          {[['90%+', 'AI 自動回覆率'], ['3 分鐘', '完成基本設定'], ['24/7', 'LINE 全天候運作'], ['NT$1,999', '起月付方案']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', lineHeight: 1.2 }}>{num}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CommHub mockup */}
        <div style={{
          background: '#1a1d2e', borderRadius: 18, border: '1px solid #2a2d3e', padding: '20px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,185,98,0.08)',
          maxWidth: 780, margin: '0 auto',
        }}>
          {/* Fake browser bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <div style={{ flex: 1, height: 22, borderRadius: 4, background: '#0f1117', marginLeft: 8, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
              <span style={{ fontSize: 10, color: '#4b5563' }}>ai-growthos.app/app/comms</span>
            </div>
          </div>

          {/* Fake CommHub UI */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10, height: 180 }}>
            {/* Left panel: conversation list */}
            <div style={{ background: '#0f1117', borderRadius: 8, padding: 10, overflow: 'hidden' }}>
              <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em' }}>LINE 對話</div>
              {[
                { name: '陳小姐', msg: '請問有貨嗎？', time: '剛剛', unread: true, color: '#00b962' },
                { name: '王先生', msg: '訂單什麼時候出？', time: '2分前', unread: true, color: '#3b82f6' },
                { name: '林太太', msg: '謝謝您！', time: '5分前', unread: false, color: '#8b5cf6' },
              ].map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #1a1d2e' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.color + '30', border: `1px solid ${c.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: c.color, flexShrink: 0 }}>
                    {c.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: '#f9fafb', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 8, color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.msg}</div>
                  </div>
                  {c.unread && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00b962', flexShrink: 0 }} />}
                </div>
              ))}
            </div>

            {/* Right panel: chat + AI badge */}
            <div style={{ background: '#0f1117', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 600 }}>陳小姐 · LINE</div>
              {/* Messages */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#1a1d2e', borderRadius: '8px 8px 8px 2px', padding: '6px 10px', fontSize: 9, color: '#d1d5db', maxWidth: '60%' }}>請問這款還有貨嗎？</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontSize: 7, color: '#00b962', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00b962', display: 'inline-block' }} />
                    AI 回覆
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #00b962, #059669)', borderRadius: '8px 8px 2px 8px', padding: '6px 10px', fontSize: 9, color: '#fff', maxWidth: '65%' }}>
                    您好！這款商品目前有庫存。請問需要幾件呢？我可以馬上幫您確認出貨時間 🛍️
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#1a1d2e', borderRadius: '8px 8px 8px 2px', padding: '6px 10px', fontSize: 9, color: '#d1d5db', maxWidth: '60%' }}>太好了！要3件</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
            {[['🟢', 'AI 自動回覆中'], ['⚡', '0.8秒回覆'], ['🛒', '已導購 3 筆']].map(([icon, label]) => (
              <div key={label} style={{ fontSize: 9, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{icon}</span>{label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
