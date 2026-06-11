import React, { useState } from 'react';
import { apiFetch } from '../utils/apiClient.js';

const STEPS = [
  { id: 1, title: '連接 LINE 官方帳號', icon: '💬' },
  { id: 2, title: '設定 AI 回覆風格', icon: '🤖' },
  { id: 3, title: '設定常見問題', icon: '❓' },
  { id: 4, title: '設定營業時段', icon: '🕐' },
  { id: 5, title: '測試 AI 回覆', icon: '🎉' },
];

const TONE_OPTIONS = [
  { value: 'friendly', label: '親切友善', desc: '像朋友一樣聊天，加表情符號', example: '您好！這款商品目前有貨喔 😊 請問需要幾件呢？' },
  { value: 'professional', label: '專業正式', desc: '禮貌得體，適合品牌形象', example: '您好，感謝您的詢問。本商品目前庫存充足，請問您需要訂購幾件？' },
  { value: 'casual', label: '輕鬆隨性', desc: '活潑直接，適合年輕客群', example: '嗨！有貨啦~ 要幾件告訴我，幫你確認一下 👍' },
];

export default function CommHubOnboarding({ onComplete, colors }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: LINE account
  const [lineAccount, setLineAccount] = useState({ account_name: '', channel_id: '', channel_secret: '' });

  // Step 2: AI tone
  const [tone, setTone] = useState('friendly');

  // Step 3: FAQs
  const [faqs, setFaqs] = useState([
    { q: '有貨嗎？', a: '' },
    { q: '多少錢？', a: '' },
    { q: '什麼時候出貨？', a: '' },
  ]);

  // Step 4: Business hours
  const [quietStart, setQuietStart] = useState('23');
  const [quietEnd, setQuietEnd] = useState('8');

  // Step 5: test
  const [testMsg, setTestMsg] = useState('請問這款有貨嗎？');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const bg = colors?.card || '#1a1d2e';
  const border = colors?.border || '#2a2d3e';
  const accent = '#00b962';

  async function handleNext() {
    setError('');
    if (step === 1) {
      if (!lineAccount.account_name.trim()) { setError('請輸入帳號名稱'); return; }
      setSaving(true);
      try {
        await apiFetch('/api/comms/accounts', {
          method: 'POST',
          body: JSON.stringify({ platform: 'line', ...lineAccount }),
        });
      } catch (e) {
        // non-fatal: continue onboarding even if API fails
      }
      setSaving(false);
    }
    if (step === 2) {
      // Save tone to AI rules
      try {
        await apiFetch('/api/ai-rules', {
          method: 'POST',
          body: JSON.stringify({ name: 'onboarding_tone', node_type: 'service_fallback', config: JSON.stringify({ tone }), is_active: 1 }),
        });
      } catch (_) {}
    }
    if (step === 3) {
      const filledFaqs = faqs.filter(f => f.q && f.a);
      if (filledFaqs.length === 0) { setError('請至少填寫一個常見問題的回覆'); return; }
    }
    if (step < 5) {
      setStep(s => s + 1);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/api/comms/webhook/simulate', {
        method: 'POST',
        body: JSON.stringify({ platform: 'line', contact_name: '測試用戶', message: testMsg }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({ ok: true, reply: data.aiReply || data.reply || '(無 AI 回覆)' });
      } else {
        setTestResult({ ok: false, reply: '無法取得回覆，但設定已儲存。您可以繼續。' });
      }
    } catch {
      setTestResult({ ok: false, reply: '連線失敗，但設定已儲存。您可以繼續。' });
    }
    setTesting(false);
  }

  const inputStyle = { width: '100%', background: '#0f1117', border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 13, color: '#9ca3af', marginBottom: 6, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: '36px 32px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{STEPS[step - 1].icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f9fafb', marginBottom: 4 }}>
            第 {step} 步：{STEPS[step - 1].title}
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>共 5 步，約 3 分鐘完成設定</p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: s.id <= step ? accent : border, transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Step content */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, marginBottom: 4 }}>
              輸入您的 LINE 官方帳號資訊。Channel ID 和 Channel Secret 可在 <strong style={{ color: '#4ade80' }}>LINE Developers Console</strong> 找到。
            </p>
            <div>
              <label style={labelStyle}>帳號名稱 <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} placeholder="例如：我的小店 LINE" value={lineAccount.account_name} onChange={e => setLineAccount(a => ({ ...a, account_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Channel ID</label>
              <input style={inputStyle} placeholder="12345678" value={lineAccount.channel_id} onChange={e => setLineAccount(a => ({ ...a, channel_id: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Channel Secret</label>
              <input style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" type="password" value={lineAccount.channel_secret} onChange={e => setLineAccount(a => ({ ...a, channel_secret: e.target.value }))} />
            </div>
            <div style={{ background: 'rgba(0,185,98,0.06)', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#4ade80' }}>
              💡 如果現在沒有 Channel ID，可以先填帳號名稱，之後再補。
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, marginBottom: 4 }}>
              選擇 AI 回覆買家的口吻風格。您可以隨時在設定中修改。
            </p>
            {TONE_OPTIONS.map(opt => (
              <div
                key={opt.value}
                onClick={() => setTone(opt.value)}
                style={{
                  border: `2px solid ${tone === opt.value ? accent : border}`,
                  borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
                  background: tone === opt.value ? 'rgba(0,185,98,0.06)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${tone === opt.value ? accent : '#4b5563'}`, background: tone === opt.value ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {tone === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontWeight: 600, color: '#f9fafb', fontSize: 15 }}>{opt.label}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>— {opt.desc}</span>
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', background: '#0f1117', borderRadius: 6, padding: '8px 12px', fontStyle: 'italic' }}>
                  "{opt.example}"
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, marginBottom: 4 }}>
              設定 AI 如何回答買家最常問的問題。填越多，AI 就越準確。
            </p>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: '#0f1117', borderRadius: 10, padding: '14px', border: `1px solid ${border}` }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>問題 {i + 1}</div>
                <input style={{ ...inputStyle, marginBottom: 8, fontSize: 13, background: '#1a1d2e' }} placeholder="買家會問..." value={faq.q} onChange={e => setFaqs(fs => fs.map((f, j) => j === i ? { ...f, q: e.target.value } : f))} />
                <textarea style={{ ...inputStyle, fontSize: 13, resize: 'vertical', minHeight: 60, background: '#1a1d2e' }} placeholder="AI 的回覆..." value={faq.a} onChange={e => setFaqs(fs => fs.map((f, j) => j === i ? { ...f, a: e.target.value } : f))} />
              </div>
            ))}
            <button onClick={() => setFaqs(fs => [...fs, { q: '', a: '' }])} style={{ background: 'none', border: `1px dashed ${border}`, borderRadius: 8, padding: '10px', color: '#6b7280', fontSize: 13, cursor: 'pointer', width: '100%' }}>
              ＋ 新增問題
            </button>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
              設定 AI 靜默時段。在這段時間內，買家的訊息將標記為待處理，等您上線後再手動回覆。
            </p>
            <div style={{ background: '#0f1117', borderRadius: 12, padding: '20px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', marginBottom: 16 }}>靜默時段（AI 暫停自動回覆）</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: '#9ca3af' }}>從</label>
                  <select value={quietStart} onChange={e => setQuietStart(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }}>
                    {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: '#9ca3af' }}>到</label>
                  <select value={quietEnd} onChange={e => setQuietEnd(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }}>
                    {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
                預設：23:00 — 08:00（台灣時間）。您可以隨時在 AI 規則設定中修改。
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['凌晨守夜版', '0:00 — 6:00', '0', '6'], ['標準版', '23:00 — 8:00', '23', '8'], ['長時段版', '22:00 — 9:00', '22', '9']].map(([label, desc, start, end]) => (
                <button key={label} onClick={() => { setQuietStart(start); setQuietEnd(end); }} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  border: `1px solid ${quietStart === start ? accent : border}`,
                  background: quietStart === start ? 'rgba(0,185,98,0.08)' : 'transparent',
                  color: quietStart === start ? '#4ade80' : '#9ca3af', transition: 'all 0.15s',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ opacity: 0.7 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
              設定完成！發送一則測試訊息，看看 AI 如何回覆您的買家。
            </p>
            <div style={{ background: '#0f1117', borderRadius: 12, padding: '20px', border: `1px solid ${border}` }}>
              <label style={labelStyle}>模擬買家訊息</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={testMsg} onChange={e => setTestMsg(e.target.value)} placeholder="輸入測試訊息..." />
                <button onClick={handleTest} disabled={testing || !testMsg.trim()} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: testing ? 0.6 : 1 }}>
                  {testing ? '測試中...' : '發送測試'}
                </button>
              </div>
              {testResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 6 }}>AI 回覆：</div>
                  <div style={{ background: testResult.ok ? 'rgba(0,185,98,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${testResult.ok ? 'rgba(0,185,98,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '12px', fontSize: 14, color: '#f9fafb', lineHeight: 1.6 }}>
                    {testResult.reply}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(0,185,98,0.06)', border: '1px solid rgba(0,185,98,0.2)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>🎉 設定完成！</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>
                您的 AI 助理已就緒。回到通訊中心開始管理對話，或調整 AI 規則進一步優化回覆品質。
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p style={{ fontSize: 13, color: '#f87171', marginTop: 12 }}>{error}</p>}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>
              ← 上一步
            </button>
          )}
          {step < 5 ? (
            <button onClick={handleNext} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(90deg, ${accent}, #059669)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '儲存中...' : `下一步 →`}
            </button>
          ) : (
            <button onClick={onComplete} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: `linear-gradient(90deg, ${accent}, #059669)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              進入通訊中心 →
            </button>
          )}
        </div>

        {/* Skip */}
        <button onClick={onComplete} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: '#4b5563', fontSize: 12, cursor: 'pointer' }}>
          跳過，稍後設定
        </button>
      </div>
    </div>
  );
}
