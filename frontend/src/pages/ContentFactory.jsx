import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../utils/apiClient.js';
import { useUISettings } from '../contexts/UISettingsContext.jsx';
import { CONTENT_PRESETS } from '../constants/contentPresets.js';

const CONTENT_TYPES = [
  { id: 'article',  labelKey: 'cfTypeArticle',  descKey: 'cfTypeArticleDesc',  icon: '📝', color: '#3b82f6' },
  { id: 'social',   labelKey: 'cfTypeSocial',   descKey: 'cfTypeSocialDesc',   icon: '💬', color: '#8b5cf6' },
  { id: 'ad',       labelKey: 'cfTypeAd',       descKey: 'cfTypeAdDesc',       icon: '🎯', color: '#f59e0b' },
  { id: 'campaign', labelKey: 'cfTypeCampaign', descKey: 'cfTypeCampaignDesc', icon: '🚀', color: '#10b981' },
  { id: 'image',    labelKey: 'cfTypeImage',    descKey: 'cfTypeImageDesc',    icon: '🎨', color: '#ec4899', media: true },
  { id: 'video',    labelKey: 'cfTypeVideo',    descKey: 'cfTypeVideoDesc',    icon: '🎬', color: '#ef4444', media: true },
  { id: 'music',    labelKey: 'cfTypeMusic',    descKey: 'cfTypeMusicDesc',    icon: '🎵', color: '#14b8a6', media: true },
];

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '3:4'];
const MUSIC_STYLES = [
  { id: 'pop',        labelKey: 'cfStylePop' },
  { id: 'rock',       labelKey: 'cfStyleRock' },
  { id: 'electronic', labelKey: 'cfStyleElectronic' },
  { id: 'classical',  labelKey: 'cfStyleClassical' },
  { id: 'lofi',       labelKey: 'cfStyleLofi' },
  { id: 'jazz',       labelKey: 'cfStyleJazz' },
];

const selectStyle = {
  background: '#0f1117',
  border: '1px solid #2a2d3e',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e5e7eb',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

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

// 媒體任務結果渲染（img / video / audio）
function MediaResult({ job, t }) {
  if (job.kind === 'image') {
    return (
      <img
        src={job.result_url}
        alt={job.prompt}
        style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 10, border: '1px solid #2a2d3e' }}
      />
    );
  }
  if (job.kind === 'video') {
    return (
      <video
        src={job.result_url}
        controls
        style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 10, border: '1px solid #2a2d3e', background: '#000' }}
      />
    );
  }
  return <audio src={job.result_url} controls style={{ width: '100%' }} />;
}

export default function ContentFactory() {
  const { t, language } = useUISettings();
  const [selectedType, setSelectedType] = useState('article');
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // 媒體生成選項與任務狀態
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState('720p');
  const [musicStyle, setMusicStyle] = useState('pop');
  const [lyrics, setLyrics] = useState('');
  const [mediaJob, setMediaJob] = useState(null);
  const [mediaHistory, setMediaHistory] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const typeInfo = CONTENT_TYPES.find(ct => ct.id === selectedType);
  const isMedia = !!typeInfo?.media;
  const typeColor = typeInfo?.color || '#3b82f6';
  const presets = CONTENT_PRESETS[selectedType] || [];
  const jobRunning = mediaJob && (mediaJob.status === 'pending' || mediaJob.status === 'processing');

  const stopTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  const fetchHistory = useCallback(() => {
    apiFetch('/api/content/history')
      .then(r => r.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setHistoryLoading(false);
      })
      .catch(() => setHistoryLoading(false));
  }, []);

  const fetchMediaHistory = useCallback((kind) => {
    apiFetch(`/api/content/media?kind=${kind}`)
      .then(r => r.json())
      .then(data => setMediaHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 切換類型：媒體類型載入該類歷史，並清空上一個結果
  useEffect(() => {
    setOutput('');
    setMediaJob(null);
    stopTimers();
    if (isMedia) fetchMediaHistory(selectedType);
  }, [selectedType, isMedia, fetchMediaHistory, stopTimers]);

  const startPolling = (jobId) => {
    stopTimers();
    const startedAt = Date.now();
    setElapsed(0);
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/content/media/${jobId}`);
        const job = await res.json();
        if (job.error && !job.status) return;
        setMediaJob(job);
        if (job.status === 'done' || job.status === 'failed') {
          stopTimers();
          fetchMediaHistory(job.kind);
        }
      } catch {
        // 網路抖動：下一輪再試
      }
    }, 3000);
  };

  const handleGenerateMedia = async () => {
    const options = {};
    if (selectedType === 'image') options.aspectRatio = aspectRatio;
    if (selectedType === 'video') { options.duration = duration; options.resolution = resolution; }
    if (selectedType === 'music') {
      options.style = t(MUSIC_STYLES.find(s => s.id === musicStyle)?.labelKey || 'cfStylePop');
      if (lyrics.trim()) options.lyrics = lyrics.trim();
    }

    try {
      const res = await apiFetch('/api/content/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: selectedType, prompt, options, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMediaJob({ id: data.id, kind: selectedType, status: 'pending', prompt });
      startPolling(data.id);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (isMedia) {
      if (jobRunning) return;
      setMediaJob(null);
      await handleGenerateMedia();
      return;
    }

    setLoading(true);
    setOutput('');

    try {
      const body = { type: selectedType, prompt, language };
      if (platform) body.platform = platform;

      const res = await apiFetch('/api/content/generate', {
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
      setToast({ message: t('cfCopied'), type: 'success' });
    });
  };

  const handleCopyLink = (url) => {
    const abs = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(abs).then(() => {
      setToast({ message: t('cfLinkCopied'), type: 'success' });
    });
  };

  const applyPreset = (preset) => {
    setPrompt(preset.prompt[language] ?? preset.prompt['zh-TW'] ?? preset.prompt.en);
  };

  const generateDisabled = loading || jobRunning || !prompt.trim();

  return (
    <div className="fade-in" style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>{t('cfTitle')}</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
          {t('cfSubtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, letterSpacing: '0.08em' }}>
            {t('cfContentType')}
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
                    {t(type.labelKey)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t(type.descKey)}</div>
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
              {t('cfGenerateHeading')} {t(typeInfo?.labelKey)}
            </div>

            {/* 情境範例模板 */}
            {presets.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                  💡 {t('cfPresetsLabel')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {presets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: `${typeColor}10`,
                        border: `1px solid ${typeColor}40`,
                        color: typeColor,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${typeColor}25`)}
                      onMouseLeave={e => (e.currentTarget.style.background = `${typeColor}10`)}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label[language] ?? preset.label['zh-TW'] ?? preset.label.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedType === 'social' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  {t('cfPlatformLabel')}
                </label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={selectStyle}>
                  <option value="">{t('cfAnyPlatform')}</option>
                  <option value="LINE">LINE</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Threads">Threads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="TikTok">TikTok</option>
                </select>
              </div>
            )}

            {/* 媒體生成選項 */}
            {selectedType === 'image' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  {t('cfAspectRatio')}
                </label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={selectStyle}>
                  {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {selectedType === 'video' && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    {t('cfDuration')}
                  </label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={selectStyle}>
                    <option value={6}>6s</option>
                    <option value={10}>10s</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    {t('cfResolution')}
                  </label>
                  <select value={resolution} onChange={e => setResolution(e.target.value)} style={selectStyle}>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
              </div>
            )}

            {selectedType === 'music' && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    {t('cfMusicStyle')}
                  </label>
                  <select value={musicStyle} onChange={e => setMusicStyle(e.target.value)} style={selectStyle}>
                    {MUSIC_STYLES.map(s => <option key={s.id} value={s.id}>{t(s.labelKey)}</option>)}
                  </select>
                </div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  {t('cfLyrics')}
                </label>
                <textarea
                  value={lyrics}
                  onChange={e => setLyrics(e.target.value)}
                  placeholder={t('cfLyricsPlaceholder')}
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#0f1117',
                    border: '1px solid #2a2d3e',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#f9fafb',
                    fontSize: 13,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={isMedia ? t('cfMediaPromptPlaceholder') : t('cfPromptPlaceholder')}
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
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {t('cfCtrlEnterHint')}
                {selectedType === 'video' && ` · ${t('cfVideoTimeHint')}`}
                {selectedType === 'music' && ` · ${t('cfMusicTimeHint')}`}
              </span>
              <button
                onClick={handleGenerate}
                disabled={generateDisabled}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  background: generateDisabled
                    ? '#2a2d3e'
                    : `linear-gradient(90deg, ${typeColor}, ${typeColor}cc)`,
                  border: 'none',
                  color: generateDisabled ? '#6b7280' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: generateDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading || jobRunning ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderColor: '#4b5563', borderTopColor: '#9ca3af' }} />
                    {t('cfGenerating')}
                  </>
                ) : (
                  t('cfGenerateBtn')
                )}
              </button>
            </div>
          </div>

          {/* Output area: 文字 */}
          {!isMedia && (output || loading) && (
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
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{t('cfOutputTitle')}</div>
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
                    {t('cfCopy')}
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', padding: '20px 0' }}>
                  <div className="spinner" />
                  {t('cfAiWorking')}
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

          {/* Output area: 媒體 */}
          {isMedia && mediaJob && (
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
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{t('cfOutputTitle')}</div>
                {mediaJob.status === 'done' && mediaJob.result_url && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={mediaJob.result_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        background: `${typeColor}1f`,
                        border: `1px solid ${typeColor}4d`,
                        color: typeColor,
                        fontSize: 12,
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      ⬇ {t('cfDownload')}
                    </a>
                    <button
                      onClick={() => handleCopyLink(mediaJob.result_url)}
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
                      🔗 {t('cfCopyLink')}
                    </button>
                  </div>
                )}
              </div>

              {jobRunning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', padding: '20px 0' }}>
                  <div className="spinner" />
                  {mediaJob.status === 'pending' ? t('cfMediaQueued') : `${t('cfMediaProcessing')}…`}
                  <span style={{ fontSize: 12 }}>
                    {t('cfElapsed')} {elapsed}{t('cfSecondsUnit')}
                  </span>
                </div>
              )}

              {mediaJob.status === 'failed' && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>
                    ✕ {t('cfMediaFailed')}{mediaJob.error ? `：${mediaJob.error}` : ''}
                  </div>
                  <button
                    onClick={handleGenerate}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      background: `${typeColor}1f`,
                      border: `1px solid ${typeColor}4d`,
                      color: typeColor,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {t('cfRetry')}
                  </button>
                </div>
              )}

              {mediaJob.status === 'done' && mediaJob.result_url && (
                <div>
                  {mediaJob.provider === 'mock' && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#fbbf24',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.25)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 12,
                      }}
                    >
                      ⚠ {t('cfMockNotice')}
                    </div>
                  )}
                  <MediaResult job={mediaJob} t={t} />
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
          {t('cfHistoryTitle')}
        </h3>

        {isMedia ? (
          mediaHistory.length === 0 ? (
            <div style={{ color: '#6b7280', fontSize: 13 }}>{t('cfHistoryEmpty')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mediaHistory.slice(0, 5).map(item => (
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
                  {item.kind === 'image' && item.status === 'done' && item.result_url ? (
                    <img
                      src={item.result_url}
                      alt=""
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2d3e' }}
                    />
                  ) : (
                    <span style={{ fontSize: 22, width: 44, textAlign: 'center' }}>
                      {CONTENT_TYPES.find(ct => ct.id === item.kind)?.icon || '📄'}
                    </span>
                  )}
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
                      {item.provider || '—'} · {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  {item.status === 'done' && item.result_url ? (
                    <button
                      onClick={() => setMediaJob(item)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        background: `${typeColor}1f`,
                        border: `1px solid ${typeColor}4d`,
                        color: typeColor,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ▶
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: item.status === 'failed' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)',
                        border: `1px solid ${item.status === 'failed' ? 'rgba(248,113,113,0.35)' : 'rgba(251,191,36,0.35)'}`,
                        color: item.status === 'failed' ? '#f87171' : '#fbbf24',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.status === 'failed' ? t('cfMediaFailed') : t('cfMediaProcessing')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        ) : historyLoading ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>{t('cfLoading')}</div>
        ) : history.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>{t('cfHistoryEmpty')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 5).map(item => {
              const itemType = CONTENT_TYPES.find(ct => ct.id === item.type);
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
                  <span style={{ fontSize: 16 }}>{itemType?.icon || '📄'}</span>
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
                      background: `${itemType?.color || '#6b7280'}18`,
                      border: `1px solid ${itemType?.color || '#6b7280'}40`,
                      color: itemType?.color || '#6b7280',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {itemType ? t(itemType.labelKey) : item.type}
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
