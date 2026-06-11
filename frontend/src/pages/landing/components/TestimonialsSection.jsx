import React from 'react';

const TESTIMONIALS = [
  {
    name: '陳雅婷',
    title: 'LINE 賣家',
    company: '手作飾品工作室・台北',
    avatar: '陳',
    color: '#00b962',
    stars: 5,
    quote: '以前每天要花 3 小時回 LINE 訊息，現在 AI 自動處理 90% 的問題。我可以把時間用在備貨和新品開發，上個月業績成長了 40%。設定超簡單，不懂技術也能用。',
    metric: '業績 +40%',
  },
  {
    name: '王志明',
    title: '電商賣家',
    company: '台灣農特產代購・台中',
    avatar: '王',
    color: '#3b82f6',
    stars: 5,
    quote: '同時管理蝦皮和 LINE 訂單讓我很崩潰，常常漏單。用了 AI GrowthOS 之後，所有訂單統一管理，物流通知自動發送。最重要的是 — 不再凌晨還要爬起來回客人訊息了。',
    metric: '0 漏單',
  },
  {
    name: '林美惠',
    title: '小資創業者',
    company: '韓國美妝代購・高雄',
    avatar: '林',
    color: '#8b5cf6',
    stars: 5,
    quote: '我一個人顧三個平台，以前根本忙不過來。AI 會自動回答常見問題、幫我推薦商品。連文案都幫我寫，現在 IG 和 LINE 廣播都用 AI 生成，省了很多時間。',
    metric: '1 人頂 3 人',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" style={{ padding: '100px 24px', background: '#0f1117' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,185,98,0.1)', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, letterSpacing: '0.06em' }}>真實賣家回饋</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            台灣賣家都在用
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280' }}>300+ 台灣 LINE 賣家正在使用 AI GrowthOS 自動化銷售</p>
        </div>

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
              <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                {Array(t.stars).fill(0).map((_, i) => (
                  <span key={i} style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
                ))}
              </div>

              <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.75, marginBottom: 20 }}>
                "{t.quote}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{t.title} · {t.company}</div>
                  </div>
                </div>
                <div style={{ background: `${t.color}18`, border: `1px solid ${t.color}30`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: t.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t.metric}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, marginTop: 56, background: 'linear-gradient(135deg, #1a1d2e, #0d1f17)', borderRadius: 14, border: '1px solid rgba(0,185,98,0.15)', padding: '32px' }}>
          {[['300+', '台灣 LINE 賣家'], ['90%+', 'AI 自動回覆率'], ['40h', '每月平均省時'], ['2.3x', '平均業績提升']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#f9fafb', background: 'linear-gradient(90deg, #00b962, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{num}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* CTA section */}
        <div id="contact" style={{ marginTop: 56, textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,185,98,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 20, padding: '48px 32px' }}>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>準備好讓 AI 幫你賣東西了嗎？</h3>
          <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 28 }}>14 天免費試用，設定 3 分鐘，今晚就讓 AI 幫你值班</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{
              display: 'inline-block', padding: '14px 36px', borderRadius: 10, textDecoration: 'none',
              background: 'linear-gradient(90deg, #00b962, #059669)', color: '#fff', fontSize: 16, fontWeight: 700,
              boxShadow: '0 0 28px rgba(0,185,98,0.35)',
            }}>
              免費開始使用 →
            </a>
            <a href="https://line.me/ti/p/~@aigrowthos" style={{
              display: 'inline-block', padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
              border: '1px solid rgba(0,185,98,0.3)', color: '#4ade80', fontSize: 16, fontWeight: 600,
              background: 'rgba(0,185,98,0.05)',
            }}>
              LINE 諮詢我們
            </a>
          </div>
          <p style={{ fontSize: 12, color: '#4b5563', marginTop: 16 }}>企業方案可聯繫我們：williamfangca@gmail.com</p>
        </div>
      </div>
    </section>
  );
}
