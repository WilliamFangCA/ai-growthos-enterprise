import React, { useState, useEffect } from 'react';

const CONTENT_TYPES = [
  {
    id: 'article',
    label: 'Article',
    icon: '📝',
    desc: 'SCQA-structured marketing article',
    color: '#3b82f6',
  },
  {
    id: 'social',
    label: 'Social Post',
    icon: '💬',
    desc: 'High-engagement social media content',
    color: '#8b5cf6',
  },
  {
    id: 'ad',
    label: 'Ad Copy',
    icon: '🎯',
    desc: 'AIDA-structured ad copy',
    color: '#f59e0b',
  },
  {
    id: 'campaign',
    label: 'Campaign Plan',
    icon: '🚀',
    desc: 'TIP model campaign strategy',
    color: '#10b981',
  },
];

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

export default function ContentFactory() {
  const [selectedType, setSelectedType] = useState('article');
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    fetch('/api/content/history')
      .then(r => r.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setHistoryLoading(false);
      })
      .catch(() => setHistoryLoading(false));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setOutput('');

    try {
      const body = { type: selectedType, prompt };
      if (platform) body.platform = platform;

      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.output);
      fetchHistory();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setToast({ message: 'Copied to clipboard!', type: 'success' });
    });
  };

  const typeColor = CONTENT_TYPES.find(t => t.id === selectedType)?.color || '#3b82f6';

  return (
    <div className="fade-in" style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>Content Factory</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
          AI-powered content generation — articles, social posts, ads, campaigns
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, letterSpacing: '0.08em' }}>
            CONTENT TYPE
          </div>
          {CONTENT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: selectedType === type.id ? `${type.color}18` : '#1a1d2e',
                border: `1px solid ${selectedType === type.id ? type.color + '60' : '#2a2d3e'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{type.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: selectedType === type.id ? type.color : '#e5e7eb',
                    }}
                  >
                    {type.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{type.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Input area */}
          <div
            style={{
              background: '#1a1d2e',
              border: '1px solid #2a2d3e',
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb', marginBottom: 12 }}>
              Generate {CONTENT_TYPES.find(t => t.id === selectedType)?.label}
            </div>

            {selectedType === 'social' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  Platform (optional)
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  style={{
                    background: '#0f1117',
                    border: '1px solid #2a2d3e',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: '#e5e7eb',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Any platform</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={`Describe what you want to create...`}
              rows={4}
              style={{
                width: '100%',
                background: '#0f1117',
                border: '1px solid #2a2d3e',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#f9fafb',
                fontSize: 14,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
              onFocus={e => (e.target.style.borderColor = typeColor)}
              onBlur={e => (e.target.style.borderColor = '#2a2d3e')}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.ctrlKey) handleGenerate();
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Ctrl+Enter to generate</span>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background:
                    loading || !prompt.trim()
                      ? '#2a2d3e'
                      : `linear-gradient(90deg, ${typeColor}, ${typeColor}cc)`,
                  border: 'none',
                  color: loading || !prompt.trim() ? '#6b7280' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderColor: '#4b5563', borderTopColor: '#9ca3af' }} />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </div>

          {/* Output area */}
          {(output || loading) && (
            <div
              style={{
                background: '#1a1d2e',
                border: '1px solid #2a2d3e',
                borderRadius: 12,
                padding: '20px 24px',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>Generated Output</div>
                {output && (
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      color: '#60a5fa',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', padding: '20px 0' }}>
                  <div className="spinner" />
                  AI is generating your content...
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 13,
                    color: '#e5e7eb',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {output}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div
        style={{
          background: '#1a1d2e',
          border: '1px solid #2a2d3e',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>
          Generation History
        </h3>
        {historyLoading ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>No history yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 5).map(item => {
              const typeInfo = CONTENT_TYPES.find(t => t.id === item.type);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: '#0f1117',
                    borderRadius: 8,
                    border: '1px solid #2a2d3e',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{typeInfo?.icon || '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#e5e7eb',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.prompt}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {item.model_used} · {item.tokens_used} tokens ·{' '}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: `${typeInfo?.color || '#6b7280'}18`,
                      border: `1px solid ${typeInfo?.color || '#6b7280'}40`,
                      color: typeInfo?.color || '#6b7280',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {typeInfo?.label || item.type}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
