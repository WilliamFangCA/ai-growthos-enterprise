import React from 'react';

const FEATURES = [
  {
    icon: '💬',
    color: '#00b962',
    title: 'LINE AI 自動回覆',
    desc: '買家傳訊息，AI 秒回。詢問庫存、價格、出貨時間，全自動處理。你睡覺的時候也不漏單。',
    tags: ['LINE 官方帳號', 'AI 秒回', '不漏單'],
    highlight: true,
  },
  {
    icon: '📦',
    color: '#3b82f6',
    title: '多平台訂單統一管理',
    desc: 'Shopee、蝦皮、TikTok Shop、LINE 購物同時管理。訂單自動通知，物流狀態即時同步給買家。',
    tags: ['蝦皮整合', 'TikTok Shop', '物流通知'],
  },
  {
    icon: '🎯',
    color: '#8b5cf6',
    title: '行銷活動自動化',
    desc: '設定一次促銷活動，AI 自動向舊客發送個人化訊息。提醒、限時優惠、棄單召回，全自動執行。',
    tags: ['舊客召回', '限時優惠', '棄單追蹤'],
  },
  {
    icon: '✍️',
    color: '#f59e0b',
    title: 'AI 商品文案生成',
    desc: '一鍵生成吸引人的商品描述、社群貼文、LINE 廣播文案。不用苦想文字，AI 幫你寫好。',
    tags: ['商品描述', 'LINE 廣播', '社群貼文'],
  },
  {
    icon: '👥',
    color: '#ec4899',
    title: '買家 CRM 管理',
    desc: '每個買家的購買記錄、偏好、對話歷史一目了然。標記 VIP 客戶，設定自動回購提醒。',
    tags: ['購買記錄', 'VIP 標記', '回購提醒'],
  },
  {
    icon: '📊',
    color: '#06b6d4',
    title: '銷售數據儀表板',
    desc: '今日訂單、本週收入、熱銷商品即時統計。追蹤哪個通路帶來最多收入，優化投放策略。',
    tags: ['即時統計', '通路分析', '收入追蹤'],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '100px 24px', background: '#0f1117' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: 'rgba(0,185,98,0.1)', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, letterSpacing: '0.06em' }}>功能特色</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 16 }}>
            一個工具，取代你現在用的五個
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            LINE 回覆、訂單管理、行銷活動、文案生成、客戶管理，全部整合在一起。
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: f.highlight ? 'linear-gradient(160deg, #0d1f17, #1a1d2e)' : '#1a1d2e',
                borderRadius: 14, border: f.highlight ? `1px solid rgba(0,185,98,0.35)` : '1px solid #2a2d3e',
                padding: '28px 28px 24px', borderTop: `3px solid ${f.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
                boxShadow: f.highlight ? '0 0 32px rgba(0,185,98,0.08)' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = f.highlight ? '0 0 32px rgba(0,185,98,0.08)' : 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', marginBottom: 0 }}>{f.title}</h3>
                  {f.highlight && <span style={{ fontSize: 10, color: '#00b962', fontWeight: 600, background: 'rgba(0,185,98,0.12)', borderRadius: 4, padding: '1px 6px' }}>核心功能</span>}
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.65, marginBottom: 16 }}>{f.desc}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 11, color: f.color, background: `${f.color}18`, borderRadius: 4, padding: '3px 8px', fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* LINE comparison callout */}
        <div style={{ marginTop: 56, background: 'linear-gradient(135deg, rgba(0,185,98,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 16, padding: '32px 40px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em' }}>為什麼不用 LINE 官方的 AI？</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f9fafb', marginBottom: 8 }}>LINE 原生 AI 只能回覆，我們幫你賣東西</h3>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>LINE 官方的聊天機器人功能有限，且無法跨平台整合訂單、CRM、行銷自動化。AI GrowthOS 是完整的銷售自動化系統。</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minWidth: 300 }}>
            {[
              ['LINE 官方 AI', '只能簡單問答', '#ef4444'],
              ['AI GrowthOS', '完整銷售自動化', '#00b962'],
              ['LINE 官方 AI', '無法整合訂單', '#ef4444'],
              ['AI GrowthOS', '多平台訂單統一', '#00b962'],
              ['LINE 官方 AI', '無行銷自動化', '#ef4444'],
              ['AI GrowthOS', '舊客召回 + 促銷', '#00b962'],
            ].map(([label, desc, color]) => (
              <div key={`${label}-${desc}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{color === '#ef4444' ? '✗' : '✓'}</span>
                <div>
                  <div style={{ fontSize: 10, color: color === '#ef4444' ? '#6b7280' : '#4ade80', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
