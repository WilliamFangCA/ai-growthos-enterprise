import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, ReferenceDot,
} from 'recharts';
import { apiFetch } from '../../utils/apiClient.js';
import { useModelSettings } from '../../contexts/ModelSettings.jsx';
import { processFile, formatFileSize, FILE_ICON } from '../../utils/fileReader.js';

// AI 預測面板（MiroFish 核心原生重寫）
// 左欄：預測清單 + 新增表單；右欄：選中預測的多代理模擬報告。
// 進行中（pending/running）的預測會每 3s 輪詢狀態，顯示 stage 進度。

const COL = {
  bg: '#0f1117', card: '#1a1d2e', inner: '#0f1117', border: '#2a2d3e',
  text: '#f9fafb', sub: '#9ca3af', faint: '#6b7280', accent: '#3b82f6',
};

const STATUS_META = {
  pending: { label: '排隊中', color: '#f59e0b' },
  running: { label: '模擬中', color: '#3b82f6' },
  done: { label: '完成', color: '#10b981' },
  error: { label: '失敗', color: '#ef4444' },
};

const STAGE_STEPS = [
  ['seed', '種子萃取'], ['agents', '代理生成'], ['simulate', '多代理模擬'], ['report', '報告生成'],
];

function fmtDate(t) {
  if (!t) return '';
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: m.color, padding: '2px 8px', borderRadius: 999,
      background: `${m.color}1a`, border: `1px solid ${m.color}55`, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

function Bar({ label, value, max = 100, color, suffix = '%' }) {
  const w = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COL.sub, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: COL.text, fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: COL.inner, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 6, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

export default function PredictionPanel() {
  const { selectedModel } = useModelSettings();
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ topic: '', materials: '', agentCount: 8, rounds: 2, variables: '' });
  const pollRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const r = await apiFetch('/api/predictions');
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      setSelectedId(prev => prev || (arr[0] && arr[0].id) || null);
    } catch (_) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // 載入/輪詢選中預測詳情
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    const fetchDetail = async () => {
      try {
        const r = await apiFetch(`/api/predictions/${selectedId}`);
        const d = await r.json();
        if (cancelled) return;
        setDetail(d);
        const running = d.status === 'pending' || d.status === 'running';
        if (running) {
          clearTimeout(pollRef.current);
          pollRef.current = setTimeout(fetchDetail, 3000);
        } else {
          // 完成時刷新清單（更新標題/信心值/狀態）
          loadList();
        }
      } catch (_) {}
    };
    fetchDetail();
    return () => { cancelled = true; clearTimeout(pollRef.current); };
  }, [selectedId, loadList]);

  const submit = async () => {
    if (!form.topic.trim() || submitting) return;
    setSubmitting(true);
    try {
      const body = {
        topic: form.topic.trim(),
        materials: form.materials.trim(),
        agentCount: Number(form.agentCount) || 8,
        rounds: Number(form.rounds) || 2,
        variables: form.variables.split(/[,，\n]/).map(s => s.trim()).filter(Boolean),
        model: selectedModel || 'glm-5-turbo',
        language: 'zh-TW',
      };
      const r = await apiFetch('/api/predictions', { method: 'POST', body: JSON.stringify(body) });
      const created = await r.json();
      if (created && created.id) {
        setShowForm(false);
        setForm({ topic: '', materials: '', agentCount: 8, rounds: 2, variables: '' });
        await loadList();
        setSelectedId(created.id);
        setDetail(null);
      }
    } catch (_) {} finally { setSubmitting(false); }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('確定刪除此預測？')) return;
    try {
      await apiFetch(`/api/predictions/${id}`, { method: 'DELETE' });
      const next = list.filter(p => p.id !== id);
      setList(next);
      if (selectedId === id) { setSelectedId(next[0]?.id || null); setDetail(null); }
    } catch (_) {}
  };

  const CARD = { background: COL.card, border: `1px solid ${COL.border}`, borderRadius: 12, padding: '16px 18px' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
      {/* ── 左欄：清單 + 新增 ───────────────────────────────────────────── */}
      <div style={{ ...CARD, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: COL.text, margin: 0 }}>🔮 預測清單</h2>
          <button onClick={() => setShowForm(s => !s)} style={{
            fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', border: 'none', borderRadius: 8,
            padding: '6px 12px', background: showForm ? COL.faint : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
          }}>{showForm ? '取消' : '＋ 新增'}</button>
        </div>

        {showForm && (
          <div style={{ background: COL.inner, border: `1px solid ${COL.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Field label="預測主題 *">
              <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="例：2026 台灣電動車市場滲透率" style={inputStyle} />
            </Field>
            <Field label="背景材料（新聞、政策、訊號…）">
              <textarea value={form.materials} onChange={e => setForm({ ...form, materials: e.target.value })}
                rows={3} placeholder="貼上相關資料，AI 會從中萃取種子" style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <Field label="情境變數（選填，可注入假設，逗號分隔）">
              <input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })}
                placeholder="例：油價維持高檔, 補助提前退場" style={inputStyle} />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="代理數 (3-12)" style={{ flex: 1 }}>
                <input type="number" min={3} max={12} value={form.agentCount}
                  onChange={e => setForm({ ...form, agentCount: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="模擬輪數 (1-4)" style={{ flex: 1 }}>
                <input type="number" min={1} max={4} value={form.rounds}
                  onChange={e => setForm({ ...form, rounds: e.target.value })} style={inputStyle} />
              </Field>
            </div>
            <button onClick={submit} disabled={submitting || !form.topic.trim()} style={{
              width: '100%', marginTop: 6, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#fff',
              background: submitting || !form.topic.trim() ? COL.faint : 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
            }}>{submitting ? '建立中…' : '開始預測'}</button>
            <div style={{ fontSize: 11, color: COL.faint, marginTop: 6 }}>模型：{selectedModel || 'glm-5-turbo'}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
          {loading && <div style={{ color: COL.faint, fontSize: 13, padding: 8 }}>載入中…</div>}
          {!loading && list.length === 0 && <div style={{ color: COL.faint, fontSize: 13, padding: 8 }}>尚無預測，點「＋ 新增」建立第一筆。</div>}
          {list.map(p => {
            const active = p.id === selectedId;
            return (
              <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                background: active ? 'rgba(59,130,246,0.12)' : COL.inner,
                border: `1px solid ${active ? COL.accent : COL.border}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COL.text, lineHeight: 1.4 }}>{p.topic}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: COL.faint }}>{fmtDate(p.created_at)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.status === 'done' && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>信心 {p.confidence}%</span>}
                    <button onClick={e => remove(p.id, e)} title="刪除" style={{
                      border: 'none', background: 'transparent', color: COL.faint, cursor: 'pointer', fontSize: 13,
                    }}>✕</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 右欄：報告 ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!detail && <div style={{ ...CARD, color: COL.faint, fontSize: 13 }}>選擇左側預測以檢視報告。</div>}
        {detail && <ReportView detail={detail} CARD={CARD} />}
      </div>
    </div>
  );
}

function ReportView({ detail, CARD }) {
  const { status, stage, topic, error } = detail;
  const result = detail.result || {};
  const report = result.report || {};

  if (status === 'pending' || status === 'running') {
    const curIdx = STAGE_STEPS.findIndex(([k]) => k === stage);
    return (
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: COL.text, margin: '0 0 4px' }}>{topic}</h2>
        <p style={{ color: COL.sub, fontSize: 13, margin: '0 0 18px' }}>多代理模擬進行中…（每 3 秒更新）</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STAGE_STEPS.map(([k, label], i) => {
            const reached = curIdx >= i;
            const isCur = stage === k;
            return (
              <div key={k} style={{
                flex: 1, minWidth: 120, padding: '12px 10px', borderRadius: 10, textAlign: 'center',
                background: reached ? 'rgba(59,130,246,0.12)' : COL.inner,
                border: `1px solid ${isCur ? COL.accent : reached ? '#3b82f655' : COL.border}`,
              }}>
                <div style={{ fontSize: 18 }}>{reached ? (isCur ? '⏳' : '✅') : '○'}</div>
                <div style={{ fontSize: 12, color: reached ? COL.text : COL.faint, marginTop: 4 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={CARD}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: COL.text, margin: '0 0 8px' }}>{topic}</h2>
        <div style={{ color: '#ef4444', fontSize: 13 }}>預測失敗：{error || '未知錯誤'}</div>
      </div>
    );
  }

  // done
  const dist = report.distribution || {};
  const seed = result.seed || {};
  const agents = result.agents || [];
  const rounds = result.rounds || [];

  return (
    <>
      {/* 結論卡 */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COL.accent, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>AI 預測報告 · {topic}</div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: COL.text, margin: '0 0 10px', lineHeight: 1.4 }}>{report.headline}</h2>
            <p style={{ color: COL.sub, fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{report.outlook}</p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 92 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#10b981' }}>{report.confidence}%</div>
            <div style={{ fontSize: 11, color: COL.faint }}>信心度</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 情境分佈 */}
        <div style={CARD}>
          <h3 style={cardTitle}>情境機率分佈</h3>
          <Bar label="基準情境 (Base)" value={dist.base ?? 0} color="#3b82f6" />
          <Bar label="樂觀情境 (Bull)" value={dist.bull ?? 0} color="#10b981" />
          <Bar label="悲觀情境 (Bear)" value={dist.bear ?? 0} color="#ef4444" />
        </div>
        {/* 關鍵驅動 */}
        <div style={CARD}>
          <h3 style={cardTitle}>關鍵驅動因子</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(report.keyDrivers || []).map((d, i) => (
              <span key={i} style={chip}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 時間軸 */}
        <div style={CARD}>
          <h3 style={cardTitle}>預期時間軸</h3>
          {(report.timeline || []).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COL.accent, minWidth: 54 }}>{t.when}</span>
              <span style={{ fontSize: 13, color: COL.sub, lineHeight: 1.5 }}>{t.event}</span>
            </div>
          ))}
        </div>
        {/* 風險 */}
        <div style={CARD}>
          <h3 style={cardTitle}>主要風險</h3>
          {(report.risks || []).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{ color: '#ef4444' }}>⚠</span>
              <span style={{ fontSize: 13, color: COL.sub, lineHeight: 1.5 }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 建議 */}
      {report.recommendation && (
        <div style={{ ...CARD, borderLeft: '3px solid #8b5cf6' }}>
          <h3 style={cardTitle}>💡 行動建議</h3>
          <p style={{ fontSize: 13.5, color: COL.text, lineHeight: 1.7, margin: 0 }}>{report.recommendation}</p>
        </div>
      )}

      {/* 模擬世界：代理 + 回合 */}
      <div style={CARD}>
        <h3 style={cardTitle}>🌐 模擬世界（代理 {agents.length} · 回合 {rounds.length}）</h3>
        {seed.summary && <p style={{ fontSize: 12.5, color: COL.faint, lineHeight: 1.6, margin: '0 0 14px' }}>{seed.summary}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {agents.map(a => (
            <div key={a.id} style={{ background: COL.inner, border: `1px solid ${COL.border}`, borderRadius: 8, padding: '8px 10px', maxWidth: 200 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COL.text }}>{a.name}</div>
              <div style={{ fontSize: 11, color: COL.faint }}>{a.role} · {a.stance}</div>
            </div>
          ))}
        </div>
        {rounds.map(r => (
          <div key={r.round} style={{ borderTop: `1px solid ${COL.border}`, paddingTop: 10, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COL.accent }}>第 {r.round} 回合</span>
              <span style={{ fontSize: 11, color: r.aggregateSentiment >= 0 ? '#10b981' : '#ef4444' }}>
                集體情緒 {Number(r.aggregateSentiment).toFixed(2)}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: COL.sub, lineHeight: 1.6, margin: 0 }}>{r.roundSummary}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={{ display: 'block', fontSize: 11, color: COL.sub, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#0b0d14', border: `1px solid ${COL.border}`,
  borderRadius: 8, padding: '8px 10px', color: COL.text, fontSize: 13, outline: 'none',
};
const cardTitle = { fontSize: 13, fontWeight: 600, color: COL.text, margin: '0 0 12px' };
const chip = {
  fontSize: 12, color: COL.text, background: COL.inner, border: `1px solid ${COL.border}`,
  borderRadius: 999, padding: '5px 11px',
};
