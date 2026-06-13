import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient.js';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Toolbox() {
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // 執行模態框
  const [activeTool, setActiveTool] = useState(null);
  const [inputs, setInputs] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function loadTools() {
    setCatalogLoading(true);
    setLoadError(false);
    try {
      const r = await apiFetch(`/api/tools?category=${category}`);
      if (!r.ok) { setLoadError(true); return; }
      const d = await r.json();
      if (!Array.isArray(d.tools)) { setLoadError(true); return; }
      setTools(d.tools);
      setCategories(d.categories || []);
    } catch {
      setLoadError(true);
    } finally {
      setCatalogLoading(false);
    }
  }
  async function loadHistory() {
    try { const r = await apiFetch('/api/tools/history'); if (r.ok) setHistory(await r.json()); } catch {}
  }

  useEffect(() => { loadTools(); }, [category]);
  useEffect(() => { loadHistory(); }, []);

  function openTool(tool) {
    setActiveTool(tool);
    setInputs({});
    setResult(null);
    setError('');
    setCopied(false);
  }

  async function runTool() {
    if (!activeTool) return;
    const missing = activeTool.inputs.filter(f => f.required && !String(inputs[f.key] || '').trim());
    if (missing.length) { setError(`請填寫：${missing.map(f => f.label).join('、')}`); return; }
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const r = await apiFetch(`/api/tools/${activeTool.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || '執行失敗，請稍後再試'); return; }
      setResult(data);
      loadHistory();
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setRunning(false);
    }
  }

  async function copyResult() {
    if (!result?.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 工具箱</h1>
          <p className="text-sm text-gray-500">運營技能地圖工具化 — 內容 · SEO · 廣告 · 用戶運營 · 社群活動 · 客服 · 數據</p>
        </div>
        <button onClick={() => setShowHistory(s => !s)}
          className={`px-3 py-2 rounded-lg text-sm border ${showHistory ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          🕘 執行記錄 {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* 分類篩選 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          全部工具
        </button>
        {categories.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === c.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 工具卡片 */}
        <div className="flex-1 overflow-auto">
          {catalogLoading && (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">工具載入中…</span>
            </div>
          )}
          {!catalogLoading && loadError && (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div className="text-gray-700 font-medium">工具載入失敗</div>
              <div className="text-xs text-gray-400">可能是網路問題或伺服器尚未更新到最新版本</div>
              <button onClick={loadTools}
                className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                🔄 重試
              </button>
            </div>
          )}
          {!catalogLoading && !loadError && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tools.map(tool => (
              <button key={tool.id} onClick={() => openTool(tool)}
                className="text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{tool.icon}</span>
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600">{tool.name}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{tool.description}</p>
                <div className="mt-3 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">點擊使用 →</div>
              </button>
            ))}
            {tools.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400">此分類暫無工具</div>
            )}
          </div>
          )}
        </div>

        {/* 執行記錄側欄 */}
        {showHistory && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 overflow-auto">
            <div className="px-4 py-3 border-b border-gray-100 font-medium text-sm text-gray-700">最近執行</div>
            {history.map(h => (
              <div key={h.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                onClick={() => { setActiveTool(null); setResult({ tool_name: h.tool_name, output: h.output, model: h.model_used }); }}>
                <div className="text-sm text-gray-900">{h.tool_icon} {h.tool_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{fmtDate(h.created_at)} · {h.model_used}</div>
              </div>
            ))}
            {history.length === 0 && <div className="px-4 py-10 text-center text-gray-400 text-sm">尚無執行記錄</div>}
          </div>
        )}
      </div>

      {/* ── 工具執行 / 結果模態框 ── */}
      {(activeTool || result) && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={() => { if (!running) { setActiveTool(null); setResult(null); } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {activeTool ? `${activeTool.icon} ${activeTool.name}` : `📄 ${result?.tool_name}`}
              </h3>
              <button onClick={() => { setActiveTool(null); setResult(null); }} disabled={running}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              {/* 輸入表單 */}
              {activeTool && !result && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">{activeTool.description}</p>
                  {activeTool.inputs.map((f, i) => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-600 font-medium">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      <textarea value={inputs[f.key] || ''} autoFocus={i === 0} rows={2}
                        onChange={e => setInputs(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" />
                    </div>
                  ))}
                  {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠️ {error}</div>}
                  {running && (
                    <div className="flex items-center gap-3 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-3">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      AI 正在生成中，約需 10–30 秒…
                    </div>
                  )}
                </div>
              )}

              {/* 結果展示 */}
              {result && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      模型：{result.model}{result.source === 'mock' ? '（示範模式，請在系統設定填入 AI 金鑰）' : ''}
                    </span>
                    <button onClick={copyResult}
                      className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
                      {copied ? '✓ 已複製' : '📋 複製結果'}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed font-sans">
                    {result.output}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              {result && activeTool && (
                <button onClick={() => { setResult(null); setError(''); }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">← 修改輸入</button>
              )}
              {activeTool && (
                <button onClick={runTool} disabled={running}
                  className="px-5 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {running ? '生成中…' : result ? '🔄 重新生成' : '⚡ 開始生成'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
