import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Starter',
    nameZh: '入門版',
    monthlyPrice: 1999,
    yearlyMonthlyPrice: 1599,
    color: '#10b981',
    desc: '個人賣家 / 剛起步的小店',
    features: [
      'LINE 官方帳號 AI 自動回覆',
      '每月 750 則 AI 回覆訊息',
      '蝦皮 / Shopee 訂單整合',
      '最多 500 位買家 CRM',
      'AI 商品文案生成（每月 30 次）',
      '基礎銷售數據報表',
      'Email 客服支援',
    ],
    cta: '免費試用 14 天',
    popular: false,
  },
  {
    name: 'Pro',
    nameZh: '專業版',
    monthlyPrice: 3999,
    yearlyMonthlyPrice: 3199,
    color: '#3b82f6',
    desc: '月營收 NT$10 萬+ 的成長賣家',
    features: [
      '所有 Starter 功能',
      '無限 AI 回覆訊息',
      '全通路整合（LINE / 蝦皮 / TikTok / Shopify）',
      '無限買家 CRM + VIP 標記',
      'AI 商品文案生成（無限次）',
      '行銷自動化工作流',
      '舊客召回 + 棄單追蹤',
      '進階數據分析 + AI 策略建議',
      '優先客服支援（24h 內回覆）',
    ],
    cta: '立即升級 Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    nameZh: '企業版',
    monthlyPrice: 12999,
    yearlyMonthlyPrice: 10399,
    color: '#8b5cf6',
    desc: '多品牌 / 大型電商團隊',
    features: [
      '所有 Pro 功能',
      '多品牌帳號管理',
      '自訂 AI 回覆個性與話術',
      '專屬客戶成功經理',
      'SLA 99.9% 保障',
      'API 存取 + Webhook 整合',
      '客製化報表與匯出',
      '專案導入顧問服務',
    ],
    cta: '聯繫我們',
    popular: false,
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const navigate = useNavigate();

  return (
    <section id="pricing" style={{ padding: '100px 24px', background: 'linear-gradient(180deg, #0f1117 0%, #1a1d2e 50%, #0f1117 100%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.06em' }}>定價方案</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            月付 NT$1,999 起，省下 3 個人力
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 28 }}>所有方案均含 14 天免費試用，隨時可取消</p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '6px 16px' }}>
            <span style={{ fontSize: 13, color: yearly ? '#6b7280' : '#f9fafb', fontWeight: yearly ? 400 : 600 }}>月付</span>
            <button onClick={() => setYearly(y => !y)} style={{
              width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: yearly ? '#3b82f6' : '#374151', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{ position: 'absolute', top: 3, left: yearly ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: 13, color: yearly ? '#f9fafb' : '#6b7280', fontWeight: yearly ? 600 : 400 }}>
              年付 <span style={{ color: '#10b981', fontWeight: 700 }}>省 20%</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              style={{
                background: plan.popular ? 'linear-gradient(180deg, #1e2a4a, #1a1d2e)' : '#1a1d2e',
                borderRadius: 16, border: `1px solid ${plan.popular ? '#3b82f6' : '#2a2d3e'}`,
                padding: '32px 28px', position: 'relative',
                boxShadow: plan.popular ? '0 0 40px rgba(59,130,246,0.15)' : 'none',
              }}
            >
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 20, padding: '4px 16px', fontSize: 11, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  最受歡迎
                </div>
              )}

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: plan.color, fontWeight: 600 }}>{plan.name}</span>
                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{plan.nameZh}</span>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{plan.desc}</p>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#f9fafb' }}>
                  NT${(yearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice).toLocaleString()}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>/月</span>
                {yearly && (
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                    年付 NT${(plan.yearlyMonthlyPrice * 12).toLocaleString()} （省 NT${((plan.monthlyPrice - plan.yearlyMonthlyPrice) * 12).toLocaleString()}）
                  </div>
                )}
              </div>

              <button
                onClick={() => plan.name === 'Enterprise' ? document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }) : navigate('/signup')}
                style={{
                  width: '100%', padding: '11px', borderRadius: 9, border: plan.popular ? 'none' : `1px solid ${plan.color}40`,
                  background: plan.popular ? 'linear-gradient(90deg, #3b82f6, #6366f1)' : `${plan.color}15`,
                  color: plan.popular ? '#fff' : plan.color, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 24,
                }}
              >
                {plan.cta}
              </button>

              <div style={{ borderTop: '1px solid #2a2d3e', paddingTop: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: plan.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['🔒', '不需要信用卡', '14 天試用完全免費'], ['💳', '支援多種付款', '信用卡 / 銀行轉帳 / 發票'], ['🔄', '隨時取消', '無違約金、無隱藏費用']].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '12px 18px' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{title}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
