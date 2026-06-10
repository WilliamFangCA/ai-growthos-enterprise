import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Starter',
    nameZh: '入門版',
    monthlyPrice: 299,
    yearlyPrice: 239,
    color: '#10b981',
    desc: '適合個人創業者與小型品牌',
    features: [
      '最多 3 個 AI 自動化工作流',
      '2 個通訊平台整合',
      'AI 內容生成（每月 50 次）',
      'CRM 管理（最多 500 聯絡人）',
      '基礎數據分析',
      '電子郵件支援',
    ],
    cta: '免費試用 14 天',
    popular: false,
  },
  {
    name: 'Pro',
    nameZh: '專業版',
    monthlyPrice: 899,
    yearlyPrice: 719,
    color: '#3b82f6',
    desc: '適合成長中的電商與 SaaS 品牌',
    features: [
      '無限 AI 自動化工作流',
      '全部 6 個通訊平台',
      'AI 內容生成（每月無限次）',
      'CRM 管理（無限聯絡人）',
      '進階 AARRR 漏斗分析',
      '5 個電商平台整合',
      '優先技術支援',
      'AI 策略建議',
    ],
    cta: '立即升級',
    popular: true,
  },
  {
    name: 'Enterprise',
    nameZh: '企業版',
    monthlyPrice: 2499,
    yearlyPrice: 1999,
    color: '#8b5cf6',
    desc: '適合大型企業與多品牌管理',
    features: [
      'Pro 版全部功能',
      '多租戶品牌管理',
      'SSO / SAML 企業登入',
      '自訂 AI 模型與系統指令',
      '專屬客戶成功經理',
      'SLA 99.9% 正常運行保障',
      'API 存取與 Webhook',
      '白標定制服務',
    ],
    cta: '聯繫銷售',
    popular: false,
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const navigate = useNavigate();

  return (
    <section id="pricing" style={{ padding: '100px 24px', background: 'linear-gradient(180deg, #0f1117 0%, #1a1d2e 50%, #0f1117 100%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, letterSpacing: '0.06em' }}>PRICING</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>
            透明定價，按需擴展
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 28 }}>所有方案均含 14 天免費試用，無需信用卡</p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 10, padding: '6px 16px' }}>
            <span style={{ fontSize: 13, color: yearly ? '#6b7280' : '#f9fafb', fontWeight: yearly ? 400 : 600 }}>月繳</span>
            <button onClick={() => setYearly(y => !y)} style={{
              width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: yearly ? '#3b82f6' : '#374151', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{ position: 'absolute', top: 3, left: yearly ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: 13, color: yearly ? '#f9fafb' : '#6b7280', fontWeight: yearly ? 600 : 400 }}>
              年繳 <span style={{ color: '#10b981', fontWeight: 700 }}>省 20%</span>
            </span>
          </div>
        </div>

        {/* Plans */}
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
                <span style={{ fontSize: 38, fontWeight: 900, color: '#f9fafb' }}>
                  NT${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>/月</span>
                {yearly && (
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                    年繳 NT${plan.yearlyPrice * 12} （省 NT${(plan.monthlyPrice - plan.yearlyPrice) * 12}）
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/signup')}
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

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#6b7280' }}>
          所有方案均支援信用卡、PayPal 付款。企業方案提供發票與轉帳。
        </p>
      </div>
    </section>
  );
}
