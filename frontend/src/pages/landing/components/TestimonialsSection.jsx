import React from 'react';

const TESTIMONIALS = [
  {
    name: 'Alice Chen',
    title: '創辦人',
    company: 'TechMart Taiwan',
    avatar: 'A',
    color: '#3b82f6',
    stars: 5,
    quote: 'AI GrowthOS 讓我們的 LINE 客服從需要 3 個專員，降到只需要 1 個。AI 自動處理 90% 的常見問題，而且回覆品質比人工還一致。導入後首月 ROAS 提升了 2.3 倍。',
  },
  {
    name: 'Kevin Lin',
    title: '行銷總監',
    company: 'StyleBox 時尚訂閱',
    avatar: 'K',
    color: '#8b5cf6',
    stars: 5,
    quote: '之前我們用 5 個不同工具管理行銷，現在全部整合進 AI GrowthOS。工作流程建構器非常直觀，不需要工程師就能設定複雜的自動化邏輯。每個月省下至少 40 小時的手動作業。',
  },
  {
    name: 'Sarah Wu',
    title: '電商負責人',
    company: 'GreenLife 有機生活',
    avatar: 'S',
    color: '#10b981',
    stars: 5,
    quote: '內容工廠幫我們解決了最頭痛的問題 — 每週需要大量社群貼文。現在 AI 幫我們生成初稿，編輯只需要微調即可。內容產量提升 5 倍，互動率卻沒有下降。',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" style={{ padding: '100px 24px', background: '#0f1117' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600, letterSpacing: '0.06em' }}>TESTIMONIALS</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            品牌主的真實回饋
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280' }}>超過 500+ 品牌正在使用 AI GrowthOS 驅動成長</p>
        </div>

        {/* Testimonials grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              style={{
                background: '#1a1d2e', borderRadius: 14, border: '1px solid #2a2d3e',
                padding: '28px', transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = t.color + '40'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a2d3e'; }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array(t.stars).fill(0).map((_, i) => (
                  <span key={i} style={{ color: '#f59e0b', fontSize: 14 }}>★</span>
                ))}
              </div>

              {/* Quote */}
              <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.75, marginBottom: 20 }}>
                "{t.quote}"
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#fff',
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{t.title} · {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, marginTop: 56, background: '#1a1d2e', borderRadius: 14, border: '1px solid #2a2d3e', padding: '32px' }}>
          {[['500+', '活躍品牌'], ['94.2%', '客戶滿意度'], ['40h', '每月平均節省時間'], ['2.8x', '平均 ROAS 提升']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#f9fafb', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{num}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
