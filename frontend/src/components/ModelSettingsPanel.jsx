import React, { useState } from 'react';
import { useModelSettings } from '../contexts/ModelSettings.jsx';

const providerColors = {
  GLM:        { bg: 'rgba(16,185,129,0.15)',  text: '#10b981', border: 'rgba(16,185,129,0.3)' },
  Claude:     { bg: 'rgba(139,92,246,0.15)',  text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
  MiniMax:    { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  OpenRouter: { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
  Ollama:     { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
};

const badgeColors = {
  '推薦': '#3b82f6',
  '最強': '#f59e0b',
  '快速': '#10b981',
  '強力': '#8b5cf6',
  '推理': '#ec4899',
  '本地': '#6b7280',
};

export default function ModelSettingsPanel() {
  const { selectedModel, systemPrompt, temperature, saveSettings, AVAILABLE_MODELS } = useModelSettings();
  const [open, setOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [saved, setSaved] = useState(false);

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

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
