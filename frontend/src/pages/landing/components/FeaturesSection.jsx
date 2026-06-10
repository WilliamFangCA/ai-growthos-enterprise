import React from 'react';

const FEATURES = [
  {
    icon: '🎯',
    color: '#3b82f6',
    title: '行銷自動化',
    desc: 'AARRR 漏斗全覆蓋。獲客、激活、留存、收入、裂變，14 個預建工作流，自動執行成長飛輪。',
    tags: ['獲客廣告追蹤', '留存召回', '分裂獎勵'],
  },
  {
    icon: '💬',
    color: '#8b5cf6',
    title: '多通道通訊中台',
    desc: 'LINE、WhatsApp、Telegram、Email 統一管理。AI 自動回覆率 90%+，人工隨時介入。',
    tags: ['LINE 整合', 'WhatsApp API', 'AI 自動回覆'],
  },
  {
    icon: '✍️',
    color: '#10b981',
    title: 'AI 內容工廠',
    desc: '一鍵生成文章、社群貼文、廣告文案、行銷活動方案。SCQA 框架 + AIDA 結構，品質穩定輸出。',
    tags: ['社群貼文', '廣告文案', '行銷活動'],
  },
  {
    icon: '🔄',
    color: '#f59e0b',
    title: '智能工作流程',
    desc: '視覺化 DAG 流程建構器，支援條件分支、延遲觸發、多動作串聯。無需寫程式即可自動化一切。',
    tags: ['視覺化建構', '條件分支', '多動作串聯'],
  },
  {
    icon: '📦',
    color: '#ec4899',
    title: '全通路訂單管理',
    desc: 'Shopify、Amazon、蝦皮、TikTok 訂單統一管理，自動發送物流通知到用戶偏好的通訊平台。',
    tags: ['Shopify', '蝦皮整合', '物流通知'],
  },
  {
    icon: '📊',
    color: '#06b6d4',
    title: '即時數據分析',
    desc: '轉換率、MAU、漏斗流失點一目了然。AARRR 各層指標追蹤，AI 策略建議協助決策。',
    tags: ['漏斗分析', 'MAU 追蹤', 'AI 策略建議'],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '100px 24px', background: '#0f1117' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.06em' }}>FEATURES</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 16 }}>
            一個平台，搞定所有成長需求
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            從流量獲取到老客回購，AI GrowthOS 覆蓋品牌成長的每一個環節。
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: '#1a1d2e', borderRadius: 14, border: '1px solid #2a2d3e',
                padding: '28px 28px 24px', borderTop: `3px solid ${f.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb' }}>{f.title}</h3>
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
      </div>
    </section>
  );
}
