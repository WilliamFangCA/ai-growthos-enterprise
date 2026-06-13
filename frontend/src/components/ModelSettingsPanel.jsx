import React, { useState, useEffect, useRef } from 'react';
import { useModelSettings } from '../contexts/ModelSettings.jsx';

const providerColors = {
  GLM:        { bg: 'rgba(16,185,129,0.15)',  text: '#10b981', border: 'rgba(16,185,129,0.3)'  },
  Claude:     { bg: 'rgba(139,92,246,0.15)',  text: '#8b5cf6', border: 'rgba(139,92,246,0.3)'  },
  MiniMax:    { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
  OpenRouter: { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4', border: 'rgba(6,182,212,0.3)'   },
  Ollama:     { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  OpenAI:     { bg: 'rgba(16,163,127,0.15)',  text: '#10a37f', border: 'rgba(16,163,127,0.3)'  },
  Gemini:     { bg: 'rgba(66,133,244,0.15)',  text: '#4285f4', border: 'rgba(66,133,244,0.3)'  },
  Qwen:       { bg: 'rgba(249,115,22,0.15)',  text: '#f97316', border: 'rgba(249,115,22,0.3)'  },
  NVIDIA:     { bg: 'rgba(118,185,0,0.15)',   text: '#76b900', border: 'rgba(118,185,0,0.3)'   },
  Doubao:     { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
};

const badgeColors = {
  '推薦': '#3b82f6',
  '最強': '#f59e0b',
  '快速': '#10b981',
  '強力': '#8b5cf6',
  '推理': '#ec4899',
  '本地': '#6b7280',
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ModelSettingsPanel() {
  const { selectedModel, systemPrompt, temperature, saveSettings, AVAILABLE_MODELS } = useModelSettings();
  const [open, setOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [saved, setSaved] = useState(false);

  // knowledge base docs state
  const [kbDocs, setKbDocs] = useState([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbError, setKbError] = useState('');
  const fileInputRef = useRef(null);

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    if (open) fetchKbDocs();
  }, [open]);

  async function fetchKbDocs() {
    try {
      const data = await apiFetch('/api/global-kb');
      setKbDocs(data);
    } catch {
      setKbDocs([]);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'txt', 'md', 'docx'];
    if (!allowedExts.includes(ext)) {
      setKbError('僅支援 PDF、TXT、MD、DOCX 格式');
      return;
    }
    setKbUploading(true);
    setKbError('');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiFetch('/api/global-kb/upload', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, file_base64: base64, format: ext }),
      });
      await fetchKbDocs();
    } catch (err) {
      setKbError('上傳失敗：' + err.message);
    } finally {
      setKbUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteDoc(id) {
    try {
      await apiFetch(`/api/global-kb/${id}`, { method: 'DELETE' });
      setKbDocs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      setKbError('刪除失敗：' + err.message);
    }
  }

  function handleSave() {
    saveSettings({ systemPrompt: localPrompt, temperature: localTemp });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleModelSelect(modelId) {
    saveSettings({ selectedModel: modelId });
  }

  return (
    <div style={{ borderTop: '1px solid #2a2d3e' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚙️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.06em' }}>AI 模型</div>
            <div style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500, marginTop: 1 }}>
              {currentModel.label}
              <span style={{
                marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 3,
                background: providerColors[currentModel.provider]?.bg,
                color: providerColors[currentModel.provider]?.text,
                border: `1px solid ${providerColors[currentModel.provider]?.border}`,
              }}>
                {currentModel.provider}
              </span>
            </div>
          </div>
        </div>
        <span style={{ color: '#6b7280', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={{ padding: '0 12px 16px', background: '#0a0d14' }}>

          {/* Model list */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, letterSpacing: '0.08em' }}>選擇模型</div>
            {AVAILABLE_MODELS.map(m => {
              const isSelected = m.id === selectedModel;
              const pc = providerColors[m.provider] || {};
              return (
                <button
                  key={m.id}
                  onClick={() => handleModelSelect(m.id)}
                  style={{
                    width: '100%', marginBottom: 4, padding: '7px 10px', borderRadius: 6,
                    border: isSelected ? `1px solid ${pc.text || '#3b82f6'}` : '1px solid #2a2d3e',
                    background: isSelected ? pc.bg : 'transparent',
                    cursor: 'pointer', textAlign: 'left', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: isSelected ? '#f9fafb' : '#9ca3af', fontWeight: isSelected ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.label}
                      {m.badge && (
                        <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: badgeColors[m.badge] + '33', color: badgeColors[m.badge] }}>
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{m.description}</div>
                  </div>
                  {isSelected && <span style={{ color: pc.text, fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Temperature */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
              <span>TEMPERATURE</span>
              <span style={{ color: '#e5e7eb' }}>{localTemp.toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.1"
              value={localTemp}
              onChange={e => setLocalTemp(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6b7280', marginTop: 2 }}>
              <span>精準</span><span>創意</span>
            </div>
          </div>

          {/* System Prompt */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, letterSpacing: '0.08em' }}>SYSTEM PROMPT</div>
            <textarea
              value={localPrompt}
              onChange={e => setLocalPrompt(e.target.value)}
              rows={5}
              style={{
                width: '100%', padding: '8px', borderRadius: 6,
                background: '#12151f', border: '1px solid #2a2d3e',
                color: '#e5e7eb', fontSize: 11, lineHeight: 1.5,
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              placeholder="輸入全局 system prompt..."
            />
          </div>

          {/* Knowledge Docs */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>KNOWLEDGE DOCS</span>
              <span style={{ color: '#4b5563' }}>{kbDocs.length}/5 份</span>
            </div>

            {/* doc list */}
            {kbDocs.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                {kbDocs.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', marginBottom: 3, borderRadius: 5,
                    background: '#12151f', border: '1px solid #2a2d3e',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 11 }}>📄</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{doc.name}</div>
                        <div style={{ fontSize: 9, color: '#6b7280' }}>{doc.char_count ? `${doc.char_count.toLocaleString()} 字` : ''}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                      title="刪除"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => { if (kbDocs.length < 5) fileInputRef.current?.click(); }}
              disabled={kbUploading || kbDocs.length >= 5}
              style={{
                width: '100%', padding: '6px', borderRadius: 5,
                border: '1px dashed #3a3d50', background: 'transparent',
                color: kbDocs.length >= 5 ? '#4b5563' : '#9ca3af',
                fontSize: 11, cursor: kbDocs.length >= 5 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {kbUploading ? '⏳ 上傳中...' : kbDocs.length >= 5 ? '已達上限 5 份' : '＋ 上傳知識文件'}
            </button>
            {kbError && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{kbError}</div>}
            <div style={{ fontSize: 9, color: '#4b5563', marginTop: 4 }}>支援 PDF · TXT · MD · DOCX，每份取前 8000 字</div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: saved ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              color: '#fff', fontSize: 12, fontWeight: 600, transition: 'background 0.3s',
            }}
          >
            {saved ? '✓ 已儲存' : '儲存設定'}
          </button>
        </div>
      )}
    </div>
  );
}
