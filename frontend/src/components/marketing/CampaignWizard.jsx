import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiClient.js';

// 活動建立精靈：基本資訊 → 觸發設定 → 目標受眾 → AI 自動執行 → 確認建立

const TYPE_META = {
  email_sequence:    { label: 'Email 序列', icon: '📧', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  push_notification: { label: 'Push 推播',  icon: '🔔', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  social_post:       { label: '社群貼文',    icon: '📱', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  sms:               { label: 'SMS 簡訊',    icon: '💬', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  line_message:      { label: 'LINE 訊息',   icon: '💚', color: '#06b06a', bg: 'rgba(6,176,106,0.12)' },
};

const EVENT_OPTIONS = [
  { key: 'user_signup',         label: '用戶註冊 / 加好友',   icon: '👤' },
  { key: 'first_purchase',      label: '首次購買',           icon: '🛒' },
  { key: 'cart_abandoned',      label: '購物車放棄',         icon: '🛍️' },
  { key: 'inactive_n_days',     label: 'N 天未活躍',         icon: '😴', hasN: true, nLabel: '天數', nDefault: 30 },
  { key: 'birthday',            label: '會員生日',           icon: '🎂' },
  { key: 'points_threshold',    label: '積分達到門檻',       icon: '⭐', hasN: true, nLabel: '積分', nDefault: 1000 },
  { key: 'order_status_change', label: '訂單狀態變更',       icon: '📦' },
  { key: 'member_upgrade',      label: '會員等級升級',       icon: '👑' },
];

const STAGE_OPTIONS = [
  { key: 'new',     label: '新用戶',     color: '#3b82f6' },
  { key: 'active',  label: '活躍',       color: '#10b981' },
  { key: 'at_risk', label: '流失風險',   color: '#f59e0b' },
  { key: 'lost',    label: '已流失',     color: '#ef4444' },
];

const RFM_OPTIONS = [
  { key: 'champions', label: '冠軍客戶', icon: '🏆' },
  { key: 'loyal',     label: '忠誠客戶', icon: '💎' },
  { key: 'at_risk',   label: '需挽留',   icon: '⚠️' },
  { key: 'lost',      label: '已流失',   icon: '💤' },
];

const LEVEL_OPTIONS = [
  { key: 'member',   label: '一般會員' }, { key: 'silver', label: '白銀' },
  { key: 'gold',     label: '黃金' },     { key: 'platinum', label: '白金' },
  { key: 'diamond',  label: '鑽石' },     { key: 'vip', label: 'VIP' },
];

const MODEL_OPTIONS = ['glm-5-turbo', 'glm-4.5-air', 'glm-4.5', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];

const STEPS = ['基本資訊', '觸發設定', '目標受眾', 'AI 自動執行', '確認建立'];

const INP = { background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7, padding: '8px 12px', color: '#f9fafb', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const LABEL = { fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 };

function Chip({ active, color = '#3b82f6', onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
      fontWeight: active ? 600 : 400,
      background: active ? `${color}20` : 'transparent',
      border: `1px solid ${active ? color : '#2a2d3e'}`,
      color: active ? color : '#9ca3af',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{children}</button>
  );
}

export default function CampaignWizard({ initial = {}, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: initial.name || '',
    type: initial.type || 'email_sequence',
    trigger_type: initial.trigger_type || 'manual',
    trigger_config: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '09:00',
      recurrence: 'once',
      event: 'user_signup',
      n: 30,
    },
    audience_config: { stages: [], rfm_buckets: [], member_levels: [], tags: [] },
    ai_config: {
      auto_execute: true,
      message_template: initial.message_template || '您好 {name}！我們為您準備了專屬優惠，{level} 會員限定，立即查看 👉',
      model: 'glm-5-turbo',
    },
    create_reply_rule: true,
  });

  // 受眾即時預估（400ms debounce）
  const [audiencePreview, setAudiencePreview] = useState({ count: null, sample: [] });
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await apiFetch('/api/marketing/audience/count', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.audience_config),
        });
        if (r.ok) setAudiencePreview(await r.json());
      } catch {}
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [form.audience_config]);

  const [tagInput, setTagInput] = useState('');

  const set = (patch) => setForm(p => ({ ...p, ...patch }));
  const setTrigger = (patch) => setForm(p => ({ ...p, trigger_config: { ...p.trigger_config, ...patch } }));
  const setAudience = (patch) => setForm(p => ({ ...p, audience_config: { ...p.audience_config, ...patch } }));
  const setAI = (patch) => setForm(p => ({ ...p, ai_config: { ...p.ai_config, ...patch } }));

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  // 受眾摘要標籤（人類可讀）
  function audienceSummary() {
    const a = form.audience_config;
    const parts = [];
    if (a.stages.length) parts.push(a.stages.map(s => STAGE_OPTIONS.find(o => o.key === s)?.label).join('/'));
    if (a.rfm_buckets.length) parts.push(a.rfm_buckets.map(s => RFM_OPTIONS.find(o => o.key === s)?.label).join('/'));
    if (a.member_levels.length) parts.push(a.member_levels.map(s => LEVEL_OPTIONS.find(o => o.key === s)?.label).join('/'));
    if (a.tags.length) parts.push(`標籤:${a.tags.join(',')}`);
    return parts.length ? parts.join(' + ') : '全部用戶';
  }

  function triggerSummary() {
    const tc = form.trigger_config;
    if (form.trigger_type === 'scheduled') {
      const rec = { once: '單次', daily: '每天', weekly: '每週', monthly: '每月' }[tc.recurrence];
      return `${tc.date} ${tc.time} 起，${rec}執行`;
    }
    if (form.trigger_type === 'event_based') {
      const ev = EVENT_OPTIONS.find(e => e.key === tc.event);
      return `${ev?.icon} ${ev?.label}${ev?.hasN ? `（${tc.n} ${ev.nLabel}）` : ''} 時自動觸發`;
    }
    return '手動觸發 — 建立後在活動列表點「立即執行」';
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  };

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      // 只送出與觸發方式相關的設定
      const tc = form.trigger_type === 'scheduled'
        ? { date: form.trigger_config.date, time: form.trigger_config.time, recurrence: form.trigger_config.recurrence }
        : form.trigger_type === 'event_based'
        ? { event: form.trigger_config.event, n: form.trigger_config.n }
        : {};
      const r = await apiFetch('/api/marketing/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          trigger_type: form.trigger_type,
          trigger_config: tc,
          audience_segment: audienceSummary(),
          audience_config: form.audience_config,
          ai_config: form.ai_config,
          create_reply_rule: form.ai_config.auto_execute && form.create_reply_rule,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || '建立失敗'); return; }
      onCreated(data);
      onClose();
    } catch (e) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  const selectedEvent = EVENT_OPTIONS.find(e => e.key === form.trigger_config.event);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header + Stepper */}
        <div style={{ padding: '22px 26px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>建立行銷活動</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <button onClick={() => i < step && setStep(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                  cursor: i < step ? 'pointer' : 'default', padding: 0,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? '#10b981' : i === step ? '#3b82f6' : '#2a2d3e',
                    color: i <= step ? '#fff' : '#6b7280',
                  }}>{i < step ? '✓' : i + 1}</span>
                  <span style={{ fontSize: 11, color: i === step ? '#f9fafb' : '#6b7280', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
                </button>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? '#10b981' : '#2a2d3e', margin: '0 8px' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 26px 16px' }}>
          {/* Step 0: 基本資訊 */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>活動名稱 *</label>
                <input value={form.name} autoFocus onChange={e => set({ name: e.target.value })}
                  placeholder="例：流失會員雙11喚回活動"
                  style={{ ...INP, width: '100%' }} />
              </div>
              <div>
                <label style={LABEL}>發送渠道</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} onClick={() => set({ type: key })} style={{
                      padding: '10px 12px', borderRadius: 8, border: `1px solid ${form.type === key ? meta.color : '#2a2d3e'}`,
                      background: form.type === key ? meta.bg : 'transparent',
                      color: form.type === key ? meta.color : '#9ca3af',
                      cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {meta.icon} {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: 觸發設定 */}
          {step === 1 && (
            <div>
              <label style={LABEL}>觸發方式</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  ['manual', '▶️ 手動觸發', '需要時手動執行'],
                  ['scheduled', '🕐 排程觸發', '指定時間自動執行'],
                  ['event_based', '⚡ 事件觸發', '用戶行為自動觸發'],
                ].map(([key, label, desc]) => (
                  <button key={key} onClick={() => set({ trigger_type: key })} style={{
                    flex: 1, padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `1.5px solid ${form.trigger_type === key ? '#3b82f6' : '#2a2d3e'}`,
                    background: form.trigger_type === key ? 'rgba(59,130,246,0.12)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.trigger_type === key ? '#60a5fa' : '#e5e7eb', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{desc}</div>
                  </button>
                ))}
              </div>

              {form.trigger_type === 'scheduled' && (
                <div style={{ background: '#0f1117', borderRadius: 10, padding: 16, borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={LABEL}>開始日期</label>
                      <input type="date" value={form.trigger_config.date} onChange={e => setTrigger({ date: e.target.value })}
                        style={{ ...INP, width: '100%', colorScheme: 'dark' }} />
                    </div>
                    <div>
                      <label style={LABEL}>執行時間</label>
                      <input type="time" value={form.trigger_config.time} onChange={e => setTrigger({ time: e.target.value })}
                        style={{ ...INP, width: '100%', colorScheme: 'dark' }} />
                    </div>
                  </div>
                  <label style={LABEL}>重複頻率</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['once', '單次'], ['daily', '每天'], ['weekly', '每週'], ['monthly', '每月']].map(([k, v]) => (
                      <Chip key={k} active={form.trigger_config.recurrence === k} onClick={() => setTrigger({ recurrence: k })}>{v}</Chip>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 10 }}>
                    ⏰ 系統排程器每分鐘掃描一次，到達設定時間自動執行此活動
                  </div>
                </div>
              )}

              {form.trigger_type === 'event_based' && (
                <div style={{ background: '#0f1117', borderRadius: 10, padding: 16, borderLeft: '3px solid #f59e0b' }}>
                  <label style={LABEL}>觸發事件</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
                    {EVENT_OPTIONS.map(ev => (
                      <button key={ev.key} onClick={() => setTrigger({ event: ev.key, n: ev.nDefault ?? form.trigger_config.n })} style={{
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 12,
                        border: `1px solid ${form.trigger_config.event === ev.key ? '#f59e0b' : '#2a2d3e'}`,
                        background: form.trigger_config.event === ev.key ? 'rgba(245,158,11,0.12)' : 'transparent',
                        color: form.trigger_config.event === ev.key ? '#fbbf24' : '#9ca3af',
                      }}>
                        {ev.icon} {ev.label}
                      </button>
                    ))}
                  </div>
                  {selectedEvent?.hasN && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ ...LABEL, marginBottom: 0 }}>{selectedEvent.nLabel}門檻：</label>
                      <input type="number" value={form.trigger_config.n} onChange={e => setTrigger({ n: Number(e.target.value) })}
                        style={{ ...INP, width: 100 }} />
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{selectedEvent.key === 'inactive_n_days' ? '天未活躍即觸發' : '點即觸發'}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 10 }}>
                    ⚡ 事件由通訊中台 Webhook / CRM 行為更新自動偵測，符合條件即對該用戶執行
                  </div>
                </div>
              )}

              {form.trigger_type === 'manual' && (
                <div style={{ background: '#0f1117', borderRadius: 10, padding: 16, fontSize: 12, color: '#9ca3af', borderLeft: '3px solid #6b7280' }}>
                  建立後，活動會以草稿狀態存在。隨時可在活動詳情點「⚡ 立即執行」對選定受眾發送。
                </div>
              )}
            </div>
          )}

          {/* Step 2: 目標受眾 */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>預估觸達人數</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>
                  {audiencePreview.count === null ? '…' : `${audiencePreview.count} 人`}
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>生命週期階段（不選 = 全部）</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGE_OPTIONS.map(s => (
                    <Chip key={s.key} color={s.color} active={form.audience_config.stages.includes(s.key)}
                      onClick={() => setAudience({ stages: toggleArr(form.audience_config.stages, s.key) })}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>RFM 價值分群</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {RFM_OPTIONS.map(s => (
                    <Chip key={s.key} color="#8b5cf6" active={form.audience_config.rfm_buckets.includes(s.key)}
                      onClick={() => setAudience({ rfm_buckets: toggleArr(form.audience_config.rfm_buckets, s.key) })}>
                      {s.icon} {s.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>會員等級</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVEL_OPTIONS.map(s => (
                    <Chip key={s.key} color="#f59e0b" active={form.audience_config.member_levels.includes(s.key)}
                      onClick={() => setAudience({ member_levels: toggleArr(form.audience_config.member_levels, s.key) })}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <label style={LABEL}>客戶標籤（輸入後按 Enter 加入）</label>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      setAudience({ tags: [...form.audience_config.tags, tagInput.trim()] });
                      setTagInput('');
                    }
                  }}
                  placeholder="例：enterprise / saas / ecommerce"
                  style={{ ...INP, width: '100%' }} />
                {form.audience_config.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {form.audience_config.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {tag}
                        <button onClick={() => setAudience({ tags: form.audience_config.tags.filter(t => t !== tag) })}
                          style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, fontSize: 12 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {audiencePreview.sample?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label style={LABEL}>受眾樣本</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {audiencePreview.sample.map(c => (
                      <span key={c.id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#0f1117', border: '1px solid #2a2d3e', color: '#9ca3af' }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AI 自動執行 */}
          {step === 3 && (
            <div>
              <button onClick={() => setAI({ auto_execute: !form.ai_config.auto_execute })} style={{
                width: '100%', padding: '14px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 16,
                border: `1.5px solid ${form.ai_config.auto_execute ? '#10b981' : '#2a2d3e'}`,
                background: form.ai_config.auto_execute ? 'rgba(16,185,129,0.08)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              }}>
                <span style={{ fontSize: 24 }}>{form.ai_config.auto_execute ? '🤖' : '😴'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: form.ai_config.auto_execute ? '#34d399' : '#9ca3af' }}>
                    AI 自動執行 {form.ai_config.auto_execute ? '已開啟' : '已關閉'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    開啟後，活動觸發時 AI 會根據每位客戶的輪廓（等級/標籤/行為）自動個性化改寫訊息再發送
                  </div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 12, position: 'relative', flexShrink: 0,
                  background: form.ai_config.auto_execute ? '#10b981' : '#2a2d3e', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                    left: form.ai_config.auto_execute ? 20 : 2, transition: 'left 0.2s',
                  }} />
                </div>
              </button>

              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>訊息模板（可用變數：{'{name}'} 姓名、{'{points}'} 積分、{'{level}'} 等級）</label>
                <textarea value={form.ai_config.message_template} rows={4}
                  onChange={e => setAI({ message_template: e.target.value })}
                  style={{ ...INP, width: '100%', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {['{name}', '{points}', '{level}'].map(v => (
                    <button key={v} onClick={() => setAI({ message_template: form.ai_config.message_template + ' ' + v })}
                      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#0f1117', border: '1px solid #2a2d3e', color: '#60a5fa', cursor: 'pointer' }}>
                      + {v}
                    </button>
                  ))}
                </div>
              </div>

              {form.ai_config.auto_execute && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={LABEL}>AI 模型</label>
                    <select value={form.ai_config.model} onChange={e => setAI({ model: e.target.value })}
                      style={{ ...INP, width: '100%', cursor: 'pointer' }}>
                      {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10,
                    background: '#0f1117', border: '1px solid #2a2d3e', cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={form.create_reply_rule}
                      onChange={e => set({ create_reply_rule: e.target.checked })} />
                    <div>
                      <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>同時建立 AI 自動回覆規則</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        在「AI 自動回覆」頁建立一條與此活動關聯的規則，客戶回覆活動訊息時 AI 自動接待
                      </div>
                    </div>
                  </label>
                </>
              )}

              <div style={{ marginTop: 14, fontSize: 11, color: '#6b7280', background: 'rgba(59,130,246,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                💡 目前為「模擬執行」模式：AI 真實生成訊息內容，發送步驟完整寫入執行日誌但不會真的送出。在系統設定填入渠道金鑰後即可切換為真實發送。
              </div>
            </div>
          )}

          {/* Step 4: 確認 */}
          {step === 4 && (
            <div>
              {[
                ['活動名稱', form.name],
                ['發送渠道', `${TYPE_META[form.type]?.icon} ${TYPE_META[form.type]?.label}`],
                ['觸發方式', triggerSummary()],
                ['目標受眾', `${audienceSummary()}（預估 ${audiencePreview.count ?? '—'} 人）`],
                ['AI 自動執行', form.ai_config.auto_execute ? `✅ 開啟（${form.ai_config.model}）` : '❌ 關閉'],
                ['同步建立 AI 回覆規則', form.ai_config.auto_execute && form.create_reply_rule ? '✅ 是' : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #1e2035' }}>
                  <span style={{ width: 150, fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#e5e7eb' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <label style={LABEL}>訊息模板預覽</label>
                <div style={{ background: '#0f1117', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d1d5db', lineHeight: 1.6, borderLeft: '3px solid #10b981' }}>
                  {form.ai_config.message_template}
                </div>
              </div>
              {error && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '10px 12px' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 26px', borderTop: '1px solid #2a2d3e', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()} style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid #2a2d3e', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13,
          }}>
            {step > 0 ? '← 上一步' : '取消'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()} style={{
              padding: '9px 24px', borderRadius: 8, border: 'none', cursor: canNext() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
              background: canNext() ? 'linear-gradient(90deg,#3b82f6,#8b5cf6)' : '#2a2d3e',
              color: canNext() ? '#fff' : '#6b7280',
            }}>
              下一步 →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: '9px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: saving ? '#2a2d3e' : 'linear-gradient(90deg,#10b981,#3b82f6)',
              color: saving ? '#6b7280' : '#fff',
            }}>
              {saving ? '建立中…' : '🚀 建立活動'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
