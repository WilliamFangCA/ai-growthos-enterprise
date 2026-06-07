import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useModelSettings } from '../contexts/ModelSettings.jsx';
import { processFile, formatFileSize, FILE_ICON } from '../utils/fileReader.js';

const LAYER_COLORS = {
  Strategy:    { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', text: '#a78bfa' },
  Product:     { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa' },
  Engineering: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399' },
  Business:    { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
  Intelligence:{ bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#f87171' },
};

function AgentCard({ agent, onInvoke }) {
  const colors = LAYER_COLORS[agent.layer] || LAYER_COLORS.Strategy;
  return (
    <div
      style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, letterSpacing: '0.06em' }}>
          {agent.layer?.toUpperCase()}
        </span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} title="Online" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb' }}>{agent.role}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Modeled on {agent.persona}</div>
      </div>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.6, flex: 1, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {agent.description || 'AI agent ready to assist.'}
      </p>
      <button onClick={() => onInvoke(agent)}
        style={{ marginTop: 4, padding: '7px 14px', borderRadius: 7, width: '100%', cursor: 'pointer',
          background: 'linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))',
          border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 500 }}>
        召喚 Agent
      </button>
    </div>
  );
}

// ─── File Attachment Chip ───────────────────────────────────────────────────
function AttachmentChip({ file, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px',
      borderRadius: 20, background: '#0f1117', border: '1px solid #2a2d3e', maxWidth: 220 }}>
      {file.type === 'image' && file.preview
        ? <img src={file.preview} alt="" style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover' }} />
        : <span style={{ fontSize: 14 }}>{FILE_ICON[file.type] || FILE_ICON.unknown}</span>
      }
      <span style={{ fontSize: 11, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {file.name}
      </span>
      <span style={{ fontSize: 10, color: '#6b7280', flexShrink: 0 }}>{formatFileSize(file.size)}</span>
      <button onClick={() => onRemove(file.name)}
        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14,
          padding: '0 0 0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────
function DropZone({ onFiles, isDragging, setIsDragging }) {
  const inputRef = useRef(null);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const items = [...(e.dataTransfer?.files || [])];
    if (items.length) onFiles(items);
  }, [onFiles, setIsDragging]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `1.5px dashed ${isDragging ? '#3b82f6' : '#2a2d3e'}`,
        borderRadius: 8, padding: '12px 16px', cursor: 'pointer', marginBottom: 10,
        background: isDragging ? 'rgba(59,130,246,0.06)' : 'transparent',
        display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 20 }}>📎</span>
      <div>
        <div style={{ fontSize: 12, color: isDragging ? '#60a5fa' : '#9ca3af', fontWeight: 500 }}>
          拖曳或點擊上傳文件
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
          支援 PDF、Word (DOCX)、圖片（JPG/PNG/WebP）、文字檔（TXT/MD/CSV/JSON）· 無大小限制
        </div>
      </div>
      <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp,.txt,.md,.csv,.json,.yaml,.yml,.xml,.html"
        style={{ display: 'none' }} onChange={e => onFiles([...e.target.files])} />
    </div>
  );
}

// ─── Invoke Modal ────────────────────────────────────────────────────────────
function InvokeModal({ agent, onClose }) {
  const { selectedModel, systemPrompt, temperature, AVAILABLE_MODELS } = useModelSettings();
  const [task, setTask] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [resultMeta, setResultMeta] = useState(null);
  const [error, setError] = useState('');

  const currentModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  const handleFiles = useCallback(async (rawFiles) => {
    setFileError('');
    setProcessingFiles(true);
    const results = [];
    for (const f of rawFiles) {
      try {
        const processed = await processFile(f);
        results.push(processed);
      } catch (err) {
        setFileError(err.message);
      }
    }
    setAttachments(prev => {
      const names = new Set(prev.map(a => a.name));
      return [...prev, ...results.filter(r => !names.has(r.name))];
    });
    setProcessingFiles(false);
  }, []);

  function removeAttachment(name) {
    setAttachments(prev => prev.filter(a => a.name !== name));
  }

  // Build context string from non-image attachments
  function buildFileContext() {
    const textFiles = attachments.filter(a => a.type !== 'image');
    if (!textFiles.length) return '';
    return '\n\n---\n以下是用戶提供的附件內容：\n\n' +
      textFiles.map(f => `【${FILE_ICON[f.type]} ${f.name}】\n${f.text}`).join('\n\n---\n');
  }

  const handleSubmit = async () => {
    if (!task.trim()) return;
    setLoading(true); setResult(''); setError(''); setResultMeta(null);
    try {
      const imageAttachments = attachments.filter(a => a.type === 'image');
      const fullTask = task + buildFileContext();

      const res = await fetch('/api/agents/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: agent.id,
          task: fullTask,
          model: selectedModel,
          systemPrompt,
          temperature,
          images: imageAttachments.map(a => ({ base64: a.base64, mimeType: a.mimeType, name: a.name })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
      setResultMeta({ source: data.source, model: data.model, tokens: data.tokensUsed });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && (task.trim().length > 0 || attachments.length > 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 16,
        padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', margin: 0 }}>召喚：{agent.role}</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>思維框架：{agent.persona}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 22, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Model info bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
          background: '#0f1117', border: '1px solid #2a2d3e', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>使用模型：</span>
          <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 600 }}>{currentModelInfo?.label || selectedModel}</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, marginLeft: 4,
            background: currentModelInfo?.provider === 'GLM' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
            color: currentModelInfo?.provider === 'GLM' ? '#10b981' : '#8b5cf6',
            border: `1px solid ${currentModelInfo?.provider === 'GLM' ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}` }}>
            {currentModelInfo?.provider}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>temp: {temperature}</span>
        </div>

        {/* Task textarea */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>任務描述</label>
          <textarea value={task} onChange={e => setTask(e.target.value)}
            placeholder={`向 ${agent.persona} 提出你的問題或任務...`} rows={4}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            style={{ width: '100%', background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8,
              padding: '10px 12px', color: '#f9fafb', fontSize: 14, resize: 'vertical',
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#3b82f6')}
            onBlur={e => (e.target.style.borderColor = '#2a2d3e')} />
          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>Ctrl+Enter 發送</div>
        </div>

        {/* Drop Zone */}
        <DropZone onFiles={handleFiles} isDragging={isDragging} setIsDragging={setIsDragging} />

        {/* Processing indicator */}
        {processingFiles && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
            <div className="spinner" style={{ width: 14, height: 14 }} /> 解析文件中...
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8, padding: '6px 10px',
            borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {fileError}
          </div>
        )}

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {attachments.map(f => (
              <AttachmentChip key={f.name} file={f} onRemove={removeAttachment} />
            ))}
          </div>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={!canSubmit}
          style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
            background: !canSubmit ? '#2a2d3e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            color: !canSubmit ? '#6b7280' : '#fff', cursor: !canSubmit ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {loading
            ? <><div className="spinner" style={{ width: 16, height: 16, borderColor: '#4b5563', borderTopColor: '#9ca3af' }} />思考中...</>
            : `獲取 AI 回應${attachments.length ? ` (含 ${attachments.length} 個附件)` : ''}`}
        </button>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{agent.persona} 的回應</div>
              {resultMeta && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>
                    via {resultMeta.source?.toUpperCase()} · {resultMeta.model} · {resultMeta.tokens} tokens
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                    複製
                  </button>
                </div>
              )}
            </div>
            <div style={{ background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 8,
              padding: '14px 16px', fontSize: 13, color: '#e5e7eb', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentCenter() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeAgent, setActiveAgent] = useState(null);
  const { selectedModel, AVAILABLE_MODELS } = useModelSettings();

  const currentModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  function loadAgents() {
    setLoading(true);
    setFetchError('');
    fetch('/api/agents')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setAgents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(err => { setFetchError(err.message); setLoading(false); });
  }

  useEffect(() => { loadAgents(); }, []);

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>AI Agent Center</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {agents.length} 個 Agent 在線 — 基於頂尖專家思維框架
          </p>
        </div>
        {/* Current model badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8,
          background: '#1a1d2e', border: '1px solid #2a2d3e' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%',
            background: currentModelInfo?.provider === 'GLM' ? '#10b981' : '#8b5cf6' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {currentModelInfo?.label || selectedModel}
          </span>
        </div>
      </div>

      {/* Layer legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(LAYER_COLORS).map(([layer, c]) => (
          <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.text }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>{layer}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280' }}>
          <div className="spinner" /> 載入 Agents...
        </div>
      ) : fetchError ? (
        <div style={{ padding: '20px 24px', borderRadius: 12, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ color: '#f87171', fontWeight: 600, marginBottom: 4 }}>無法連接後端 API</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>錯誤：{fetchError} — 請確認後端服務在 localhost:4000 運行</div>
          </div>
          <button onClick={loadAgents}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.4)',
              background: 'transparent', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>
            重試
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onInvoke={setActiveAgent} />
          ))}
        </div>
      )}

      {activeAgent && <InvokeModal agent={activeAgent} onClose={() => setActiveAgent(null)} />}
    </div>
  );
}
