import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient.js';

const TRIGGER_TYPES = [
  { value: 'acquisition',    label: '獲客節點',   icon: '🎯', desc: '首次加好友/追蹤/訂閱時觸發' },
  { value: 'activation',     label: '激活節點',   icon: '🚀', desc: '首次互動/購買/登入時觸發' },
  { value: 'retention',      label: '留存節點',   icon: '🔁', desc: 'N 天未互動時觸發' },
  { value: 'revenue',        label: '收入節點',   icon: '💰', desc: '瀏覽商品/加購/放棄結帳時觸發' },
  { value: 'referral',       label: '裂變節點',   icon: '📣', desc: '達成積分/邀請門檻時觸發' },
  { value: 'order_status',   label: '訂單節點',   icon: '📦', desc: '訂單狀態變更時自動推播' },
  { value: 'service',        label: '客服節點',   icon: '🎧', desc: '收到任意客服問題時觸發' },
  { value: 'event',          label: '活動節點',   icon: '🎪', desc: '活動報名/簽到/結束時觸發' },
  { value: 'vip',            label: 'VIP 節點',   icon: '⭐', desc: '達到會員升級門檻時觸發' },
  { value: 'community',      label: '社群節點',   icon: '👥', desc: '社群靜默/健康度異常時觸發' },
  { value: 'content_event',  label: '內容節點',   icon: '📝', desc: '內容發布/互動事件時觸發' },
];

const MODEL_OPTIONS = [
  { value: 'glm-4.5-air', label: 'GLM-4.5-Air (快速)' },
  { value: 'glm-4.5',     label: 'GLM-4.5 (標準)' },
  { value: 'glm-5',       label: 'GLM-5 (高品質)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
];

const TEMPLATE_VARS = ['{name}', '{brand}', '{order_id}', '{amount}', '{tracking_no}', '{delivery_date}', '{event_name}', '{new_tier}', '{points}', '{tip_of_day}'];

function TriggerBadge({ type }) {
  const meta = TRIGGER_TYPES.find(t => t.value === type) || { label: type, icon: '❓' };
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
      {meta.icon} {meta.label}
    </span>
  );
}

export default function AIRules() {
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [testRule, setTestRule] = useState(null);
  const [testContext, setTestContext] = useState('{"name":"Alice","brand":"GrowthOS"}');
  const [testResult, setTestResult] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    name: '', trigger_type: 'acquisition', reply_template: '', model: 'glm-4.5-air', language: 'auto',
    platforms: ['all'], is_active: true,
  });

  useEffect(() => { loadRules(); loadStats(); }, []);

  async function loadRules() {
    try {
      const r = await apiFetch('/api/ai-rules');
      if (r.ok) setRules(await r.json());
    } catch {}
  }

  async function loadStats() {
    try {
      const r = await apiFetch('/api/ai-rules/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }

  async function saveRule() {
    const url = editRule ? `/api/ai-rules/${editRule.id}` : '/api/ai-rules';
    const method = editRule ? 'PUT' : 'POST';
    try {
      const r = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_active: form.is_active ? 1 : 0 }),
      });
      if (r.ok) {
        setShowCreateModal(false);
        setEditRule(null);
        resetForm();
        loadRules();
        loadStats();
      }
    } catch {}
  }

  async function deleteRule(id) {
    if (!confirm('確認刪除此規則？')) return;
    await apiFetch(`/api/ai-rules/${id}`, { method: 'DELETE' });
    loadRules();
    loadStats();
  }

  async function toggleActive(rule) {
    await apiFetch(`/api/ai-rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: rule.is_active ? 0 : 1 }),
    });
    loadRules();
  }

  async function runTest() {
    if (!testRule) return;
    setTestLoading(true);
    setTestResult('');
    try {
      let ctx = {};
      try { ctx = JSON.parse(testContext); } catch { ctx = {}; }
      const r = await apiFetch('/api/ai-rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_id: testRule.id, context: ctx }),
      });
      if (r.ok) {
        const data = await r.json();
        setTestResult(data.preview);
      }
    } finally {
      setTestLoading(false);
    }
  }

  function openEdit(rule) {
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      reply_template: rule.reply_template,
      model: rule.model,
      language: rule.language,
      platforms: Array.isArray(rule.platforms) ? rule.platforms : JSON.parse(rule.platforms || '["all"]'),
      is_active: rule.is_active === 1,
    });
    setEditRule(rule);
    setShowCreateModal(true);
  }

  function resetForm() {
    setForm({ name: '', trigger_type: 'acquisition', reply_template: '', model: 'glm-4.5-air', language: 'auto', platforms: ['all'], is_active: true });
  }

  const filtered = filterType ? rules.filter(r => r.trigger_type === filterType) : rules;

  const byType = TRIGGER_TYPES.map(t => ({
    ...t,
    rules: rules.filter(r => r.trigger_type === t.value),
    totalFires: rules.filter(r => r.trigger_type === t.value).reduce((s, r) => s + (r.fire_count || 0), 0),
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 自動回覆規則</h1>
          <p className="text-sm text-gray-500">AARRR 漏斗各節點 · 自動觸發 · AI 生成回覆</p>
        </div>
        <button onClick={() => { resetForm(); setEditRule(null); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增規則
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '總規則數', value: stats.total || 0, sub: `${stats.active || 0} 個啟用中`, color: 'text-blue-600' },
          { label: '累計觸發', value: (stats.totalFires || 0).toLocaleString(), sub: '次 AI 回覆', color: 'text-green-600' },
          { label: '覆蓋節點', value: `${(stats.byType || []).length} / ${TRIGGER_TYPES.length}`, sub: '個漏斗節點', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-700">{s.label}</div>
            <div className="text-xs text-gray-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AARRR Node Overview */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {byType.map(t => (
          <button key={t.value} onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
            className={`p-3 rounded-xl border text-left transition-colors ${filterType === t.value ? 'border-blue-500 bg-blue-50' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
            <div className="text-lg mb-1">{t.icon}</div>
            <div className="text-xs font-semibold text-gray-700">{t.label}</div>
            <div className="text-xs text-gray-400">{t.rules.length} 規則 · {t.totalFires.toLocaleString()} 次</div>
          </button>
        ))}
      </div>

      {/* Rules List */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {filterType ? `${TRIGGER_TYPES.find(t => t.value === filterType)?.label} 規則` : '所有規則'} ({filtered.length})
          </span>
          {filterType && <button onClick={() => setFilterType('')} className="text-xs text-blue-600 hover:underline">清除篩選</button>}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map(rule => (
            <div key={rule.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleActive(rule)}
                  className={`mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.is_active ? 'left-4' : 'left-0.5'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">{rule.name}</span>
                    <TriggerBadge type={rule.trigger_type} />
                    {rule.campaign_id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                        title={rule.campaign_name ? `來源活動：${rule.campaign_name}` : '來源活動已重置'}>
                        📣 {rule.campaign_name || '活動建立'}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">v{rule.version}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{rule.reply_template}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>🤖 {rule.model}</span>
                    <span>🔥 觸發 {(rule.fire_count || 0).toLocaleString()} 次</span>
                    <span>🌐 {Array.isArray(rule.platforms) ? rule.platforms.join(', ') : rule.platforms}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setTestRule(rule); setTestResult(''); }}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                    測試
                  </button>
                  <button onClick={() => openEdit(rule)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                    編輯
                  </button>
                  <button onClick={() => deleteRule(rule.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <div className="text-4xl mb-2">🤖</div>
              <p className="text-sm">暫無回覆規則，點擊「新增規則」開始設定</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{editRule ? '編輯規則' : '新增 AI 回覆規則'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">規則名稱</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="例：歡迎新用戶"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">觸發節點</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIGGER_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm(p => ({ ...p, trigger_type: t.value }))}
                        className={`p-2 rounded-xl border text-xs text-left transition-colors ${form.trigger_type === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="font-medium">{t.icon} {t.label}</div>
                        <div className="text-gray-400 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">回覆模板</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {TEMPLATE_VARS.map(v => (
                      <button key={v} onClick={() => setForm(p => ({ ...p, reply_template: p.reply_template + v }))}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        {v}
                      </button>
                    ))}
                  </div>
                  <textarea value={form.reply_template} onChange={e => setForm(p => ({ ...p, reply_template: e.target.value }))}
                    rows={4}
                    placeholder={`歡迎 {name} 加入 {brand}！有任何問題請隨時告訴我。`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">AI 模型</label>
                    <select value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">語言</label>
                    <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="auto">自動偵測</option>
                      <option value="zh-TW">繁體中文</option>
                      <option value="zh-CN">簡體中文</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{form.is_active ? '啟用' : '停用'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowCreateModal(false); setEditRule(null); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">取消</button>
                <button onClick={saveRule} disabled={!form.name || !form.reply_template}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {editRule ? '儲存變更' : '建立規則'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-1">測試規則</h3>
            <p className="text-sm text-gray-500 mb-4">{testRule.name} · <TriggerBadge type={testRule.trigger_type} /></p>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">回覆模板</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{testRule.reply_template}</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">測試上下文 (JSON)</label>
              <textarea value={testContext} onChange={e => setTestContext(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            {testResult && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="text-xs text-green-600 font-medium mb-1">🤖 AI 生成結果</div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{testResult}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setTestRule(null); setTestResult(''); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">關閉</button>
              <button onClick={runTest} disabled={testLoading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {testLoading ? '生成中...' : '🤖 執行測試'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

