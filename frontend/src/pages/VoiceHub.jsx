import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient.js';
import { useUISettings } from '../contexts/UISettingsContext.jsx';

// 通話狀態機：idle → listening → thinking → speaking → listening …（endCall 回 idle）

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

const REC_LANG = { 'zh-TW': 'zh-TW', 'zh-CN': 'zh-CN', en: 'en-US' };

const STATUS_COLOR = {
  idle: '#6b7280',
  listening: '#10b981',
  thinking: '#f59e0b',
  speaking: '#3b82f6',
};

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString();
}

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

const GENDER_ICON = { female: '👩', male: '👨', neutral: '🤖' };
const PROVIDER_BADGE = {
  minimax: { label: 'MiniMax', color: '#8b5cf6' },
  openai:  { label: 'OpenAI',  color: '#10b981' },
};

function VoiceCard({ v, selected, inCall, previewing, language, t, onSelect, onPreview }) {
  const isSelected = selected === v.id;
  const badge = PROVIDER_BADGE[v.provider] || PROVIDER_BADGE.minimax;
  return (
    <div
      onClick={() => !inCall && onSelect(v.id)}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: isSelected ? 'rgba(20,184,166,0.1)' : '#1a1d2e',
        border: `1px solid ${isSelected ? 'rgba(20,184,166,0.5)' : '#2a2d3e'}`,
        cursor: inCall ? 'not-allowed' : 'pointer',
        opacity: inCall && !isSelected ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{GENDER_ICON[v.gender] || '🔊'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#14b8a6' : '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v.name[language] ?? v.name['zh-TW']}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 9, color: badge.color, background: badge.color + '18', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>{badge.label}</span>
          <span style={{ fontSize: 10, color: '#6b7280' }}>{v.gender === 'female' ? '女' : v.gender === 'male' ? '男' : '中性'}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onPreview(v.id); }}
        disabled={!!previewing}
        style={{
          padding: '3px 8px',
          borderRadius: 5,
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.3)',
          color: '#60a5fa',
          fontSize: 10,
          cursor: previewing ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {previewing === v.id ? '…' : '🔊'}
      </button>
    </div>
  );
}

export default function VoiceHub() {
  const { t, language } = useUISettings();
  const navigate = useNavigate();

  const [voices, setVoices] = useState([]);
  const [voicesError, setVoicesError] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('female-tianmei');
  const [previewing, setPreviewing] = useState(null);
  const [contactName, setContactName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState([]); // {role:'user'|'ai', text}
  const [interim, setInterim] = useState('');
  const [duration, setDuration] = useState(0);
  const [calls, setCalls] = useState([]);
  const [toast, setToast] = useState(null);

  const convoIdRef = useRef(null);
  const activeRef = useRef(false);
  const statusRef = useRef('idle');
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const durationTimerRef = useRef(null);
  const voiceRef = useRef(selectedVoice);
  const transcriptEndRef = useRef(null);

  voiceRef.current = selectedVoice;

  const setStatusBoth = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  useEffect(() => {
    apiFetch('/api/voice/voices')
      .then(r => r.json())
      .then(data => {
        setVoices(data.voices || []);
        if (data.default) setSelectedVoice(data.default);
      })
      .catch(() => { setVoicesError(true); });
    loadCalls();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interim]);

  const loadCalls = () => {
    apiFetch('/api/voice/calls')
      .then(r => r.json())
      .then(data => setCalls(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  function cleanup() {
    activeRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} audioRef.current = null; }
    try { window.speechSynthesis?.cancel(); } catch {}
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
  }

  // ── 播放 AI 語音 ──────────────────────────────────────────────────────────
  function playBase64Mp3(b64) {
    return new Promise(resolve => {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
      }
      const audio = new Audio('data:audio/mp3;base64,' + b64);
      audioRef.current = audio;
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      audio.onended = finish;
      audio.onerror = finish;
      const guard = setTimeout(finish, 30000);
      audio.addEventListener('ended', () => clearTimeout(guard), { once: true });
      audio.play().catch(finish);
    });
  }

  function speakWithBrowser(text) {
    return new Promise(resolve => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = REC_LANG[language] || 'zh-TW';
        let settled = false;
        const finish = () => { if (!settled) { settled = true; resolve(); } };
        u.onend = finish;
        u.onerror = finish;
        setTimeout(finish, 20000);
        window.speechSynthesis.speak(u);
      } catch {
        resolve();
      }
    });
  }

  // ── 語音辨識 ──────────────────────────────────────────────────────────────
  function startListening() {
    if (!activeRef.current) return;
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    setStatusBoth('listening');
    setInterim('');

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = REC_LANG[language] || 'zh-TW';
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = '';

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText || finalText);
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setToast({ message: t('vhMicDenied'), type: 'error' });
        endCall();
      }
      // 'no-speech' / 'aborted' 由 onend 處理重啟
    };

    rec.onend = () => {
      if (!activeRef.current) return;
      const text = finalText.trim();
      if (text) {
        sendTurn(text);
      } else if (statusRef.current === 'listening') {
        // 靜音逾時：繼續聆聽
        try { startListening(); } catch {}
      }
    };

    try { rec.start(); } catch {}
  }

  // ── 一輪對話 ──────────────────────────────────────────────────────────────
  async function sendTurn(text) {
    setInterim('');
    setTranscript(prev => [...prev, { role: 'user', text }]);
    setStatusBoth('thinking');

    try {
      const res = await apiFetch(`/api/voice/call/${convoIdRef.current}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: voiceRef.current, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!activeRef.current) return;

      setTranscript(prev => [...prev, { role: 'ai', text: data.reply }]);
      setStatusBoth('speaking');

      if (data.audio) {
        await playBase64Mp3(data.audio);
      } else {
        setToast({ message: t('vhBrowserVoiceFallback'), type: 'error' });
        await speakWithBrowser(data.reply);
      }
    } catch (err) {
      if (activeRef.current) setToast({ message: err.message, type: 'error' });
    }

    if (activeRef.current) {
      await new Promise(r => setTimeout(r, 300));
      startListening();
    }
  }

  // ── 通話控制 ──────────────────────────────────────────────────────────────
  async function startCall() {
    if (!SR) {
      setToast({ message: t('vhNoSupport'), type: 'error' });
      return;
    }
    try {
      const res = await apiFetch('/api/voice/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_name: contactName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      convoIdRef.current = data.conversation_id;
      activeRef.current = true;
      setTranscript([]);
      setDuration(0);
      durationTimerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      startListening();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  }

  async function endCall() {
    const convoId = convoIdRef.current;
    const dur = duration;
    cleanup();
    setStatusBoth('idle');
    setInterim('');
    if (convoId) {
      try {
        await apiFetch(`/api/voice/call/${convoId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration_seconds: dur }),
        });
      } catch {}
      convoIdRef.current = null;
      loadCalls();
    }
  }

  // ── 試聽音色 ──────────────────────────────────────────────────────────────
  async function previewVoice(voiceId) {
    if (previewing) return;
    setPreviewing(voiceId);
    try {
      const res = await apiFetch('/api/voice/tts-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, language }),
      });
      const data = await res.json();
      if (data.audio) await playBase64Mp3(data.audio);
      else setToast({ message: t('vhBrowserVoiceFallback'), type: 'error' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setPreviewing(null);
    }
  }

  const inCall = status !== 'idle';
  const statusText = {
    idle: t('vhStatusIdle'),
    listening: t('vhListening'),
    thinking: t('vhThinking'),
    speaking: t('vhSpeaking'),
  }[status];

  return (
    <div className="fade-in" style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f9fafb', margin: 0 }}>📞 {t('vhTitle')}</h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>{t('vhSubtitle')}</p>
      </div>

      {!SR && (
        <div
          style={{
            fontSize: 13,
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          ⚠ {t('vhNoSupport')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* 左：音色選擇 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, letterSpacing: '0.08em' }}>
            {t('vhVoiceSelect')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', paddingRight: 2 }}>
            {voicesError && (
              <div style={{ color: '#f87171', fontSize: 12, padding: '8px 4px' }}>
                無法載入音色，請重新整理頁面
              </div>
            )}
            {/* 中文音色 */}
            {voices.filter(v => v.category === 'zh' || !v.category).length > 0 && (
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.06em', padding: '6px 2px 2px', fontWeight: 600 }}>
                🇹🇼 中文優化音色（MiniMax）
              </div>
            )}
            {voices.filter(v => v.category === 'zh' || !v.category).map(v => (
              <VoiceCard key={v.id} v={v} selected={selectedVoice} inCall={inCall} previewing={previewing}
                language={language} t={t} onSelect={setSelectedVoice} onPreview={previewVoice} />
            ))}
            {/* 多語言音色 */}
            {voices.filter(v => v.category === 'multilang').length > 0 && (
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.06em', padding: '10px 2px 2px', fontWeight: 600 }}>
                🌐 多語言音色（OpenAI TTS）
              </div>
            )}
            {voices.filter(v => v.category === 'multilang').map(v => (
              <VoiceCard key={v.id} v={v} selected={selectedVoice} inCall={inCall} previewing={previewing}
                language={language} t={t} onSelect={setSelectedVoice} onPreview={previewVoice} />
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              {t('vhYourName')}
            </label>
            <input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              disabled={inCall}
              style={{
                width: '100%',
                background: '#0f1117',
                border: '1px solid #2a2d3e',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#f9fafb',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 右：通話面板 */}
        <div
          style={{
            background: '#1a1d2e',
            border: '1px solid #2a2d3e',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 0,
          }}
        >
          {/* 狀態列 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: STATUS_COLOR[status],
                  display: 'inline-block',
                  animation: inCall ? 'pulse 1.4s ease-in-out infinite' : 'none',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: STATUS_COLOR[status] }}>{statusText}</span>
            </div>
            {inCall && (
              <span style={{ fontSize: 13, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                ⏱ {t('vhCallDuration')} {fmtDuration(duration)}
              </span>
            )}
          </div>

          {/* 通話按鈕 */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            {!inCall ? (
              <button
                onClick={startCall}
                disabled={!SR}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: SR ? 'linear-gradient(135deg, #10b981, #059669)' : '#2a2d3e',
                  border: 'none',
                  color: '#fff',
                  fontSize: 34,
                  cursor: SR ? 'pointer' : 'not-allowed',
                  boxShadow: SR ? '0 0 30px rgba(16,185,129,0.35)' : 'none',
                }}
                title={t('vhStartCall')}
              >
                📞
              </button>
            ) : (
              <button
                onClick={endCall}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 34,
                  cursor: 'pointer',
                  boxShadow: '0 0 30px rgba(239,68,68,0.35)',
                }}
                title={t('vhEndCall')}
              >
                ⏹
              </button>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: -8 }}>
            {!inCall ? t('vhStartCall') : t('vhEndCall')}
          </div>

          {/* 即時逐字稿 */}
          <div
            style={{
              flex: 1,
              minHeight: 160,
              background: '#0f1117',
              border: '1px solid #2a2d3e',
              borderRadius: 10,
              padding: '14px 16px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, letterSpacing: '0.08em' }}>
              {t('vhTranscript')}
            </div>
            {transcript.length === 0 && !interim && (
              <div style={{ color: '#4b5563', fontSize: 13 }}>—</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transcript.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 12,
                      whiteSpace: 'nowrap',
                      background: m.role === 'user' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      color: m.role === 'user' ? '#34d399' : '#60a5fa',
                    }}
                  >
                    {m.role === 'user' ? t('vhYou') : t('vhAI')}
                  </span>
                  <span style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.7 }}>{m.text}</span>
                </div>
              ))}
              {interim && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: 0.6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 12,
                      whiteSpace: 'nowrap',
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      color: '#34d399',
                    }}
                  >
                    {t('vhYou')}
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{interim}…</span>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* 近期通話 */}
      <div
        style={{
          background: '#1a1d2e',
          border: '1px solid #2a2d3e',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb', margin: '0 0 14px' }}>
          {t('vhRecentCalls')}
        </h3>
        {calls.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>{t('vhNoCalls')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {calls.slice(0, 5).map(c => (
              <div
                key={c.id}
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
                <span style={{ fontSize: 18 }}>📞</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e5e7eb' }}>
                    {c.contact_name} · {c.turn_count} {t('vhTurns')}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.last_message} · {fmtTime(c.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/app/comms')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    color: '#60a5fa',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  💬 {t('vhViewInComms')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
