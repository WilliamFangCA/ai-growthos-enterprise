import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient.js';
import PlatformIcon from '../components/PlatformIcon.jsx';
import CommHubOnboarding from './CommHubOnboarding.jsx';

const PLATFORM_META = {
  line:      { label: 'LINE',      color: 'bg-green-500',  text: 'text-green-600',  icon: '💬' },
  whatsapp:  { label: 'WhatsApp',  color: 'bg-emerald-500',text: 'text-emerald-600',icon: '📱' },
  telegram:  { label: 'Telegram',  color: 'bg-blue-500',   text: 'text-blue-600',   icon: '✈️' },
  messenger: { label: 'Messenger', color: 'bg-purple-500', text: 'text-purple-600', icon: '💌' },
  instagram: { label: 'Instagram', color: 'bg-pink-500',   text: 'text-pink-600',   icon: '📸' },
  email:     { label: 'Email',     color: 'bg-orange-500', text: 'text-orange-600', icon: '📧' },
  wechat:    { label: 'WeChat',    color: 'bg-lime-500',   text: 'text-lime-600',   icon: '💚' },
  voice:     { label: '語音通話',   color: 'bg-teal-500',   text: 'text-teal-600',   icon: '📞' },
};

const SKIPPED_LABEL = {
  quiet_hours: '🌙 靜默時段（23:00-08:00）',
  human_takeover: '👤 人工接管中',
  no_matching_rule: '⚠️ 無匹配規則',
  conversation_not_found: '❌ 對話不存在',
  error: '❌ 引擎錯誤',
};

const STATUS_BADGE = {
  open:       'bg-blue-100 text-blue-700',
  resolved:   'bg-gray-100 text-gray-600',
  ai_handled: 'bg-green-100 text-green-700',
  pending_human: 'bg-orange-100 text-orange-700',
};

function fmtTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小時前`;
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

export default function CommHub() {
  const location = useLocation();
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [tab, setTab] = useState('inbox');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: 'line', account_name: '', channel_id: '' });
  const [simForm, setSimForm] = useState({ platform: 'line', contact_name: '', message: '' });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hubPrompt, setHubPrompt] = useState('');
  const [hubAiModel, setHubAiModel] = useState('');
  const [hubKbName, setHubKbName] = useState('');
  const [hubKbFile, setHubKbFile] = useState(null);
  const [hubSaving, setHubSaving] = useState(false);
  const [hubKbUploading, setHubKbUploading] = useState(false);
  const [hubSettingsMsg, setHubSettingsMsg] = useState(null);
  const hubKbFileRef = useRef(null);
  const pendingSelectId = useRef(location.state?.conversationId ?? null);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadStats(); loadAccounts(); loadHubSettings(); }, []);
  useEffect(() => { loadConvos(); }, [filterStatus, filterPlatform]);
  useEffect(() => { if (selected) loadMessages(selected.id); }, [selected]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-refresh every 15s when inbox is open
  useEffect(() => {
    if (tab !== 'inbox') return;
    const t = setInterval(() => { loadStats(); loadConvos(); }, 15000);
    return () => clearInterval(t);
  }, [tab, filterStatus, filterPlatform]);

  async function loadHubSettings() {
    try {
      const r = await apiFetch('/api/hub-settings/comms');
      if (r.ok) {
        const d = await r.json();
        setHubPrompt(d.system_prompt || '');
        setHubAiModel(d.ai_model || '');
        setHubKbName(d.knowledge_base_name || '');
      }
    } catch {}
  }

  async function saveHubPrompt() {
    setHubSaving(true);
    setHubSettingsMsg(null);
    try {
      const r = await apiFetch('/api/hub-settings/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: hubPrompt, ai_model: hubAiModel }),
      });
      setHubSettingsMsg(r.ok ? { type: 'ok', text: '✓ Prompt 已儲存' } : { type: 'err', text: '儲存失敗' });
    } catch { setHubSettingsMsg({ type: 'err', text: '儲存失敗' }); }
    setHubSaving(false);
    setTimeout(() => setHubSettingsMsg(null), 3000);
  }

  async function uploadHubKb() {
    if (!hubKbFile) return;
    setHubKbUploading(true);
    setHubSettingsMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const ext = hubKbFile.name.split('.').pop().toLowerCase();
          const r = await apiFetch('/api/hub-settings/comms/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: hubKbFile.name, file_base64: base64, format: ext }),
          });
          if (r.ok) {
            setHubKbName(hubKbFile.name);
            setHubKbFile(null);
            if (hubKbFileRef.current) hubKbFileRef.current.value = '';
            setHubSettingsMsg({ type: 'ok', text: '✓ 知識庫已上傳' });
          } else {
            setHubSettingsMsg({ type: 'err', text: '上傳失敗' });
          }
        } finally { setHubKbUploading(false); }
      };
      reader.readAsDataURL(hubKbFile);
    } catch { setHubKbUploading(false); setHubSettingsMsg({ type: 'err', text: '上傳失敗' }); }
    setTimeout(() => setHubSettingsMsg(null), 3000);
  }

  async function deleteHubKb() {
    try {
      await apiFetch('/api/hub-settings/comms/kb', { method: 'DELETE' });
      setHubKbName('');
      setHubKbFile(null);
      if (hubKbFileRef.current) hubKbFileRef.current.value = '';
      setHubSettingsMsg({ type: 'ok', text: '✓ 知識庫已移除' });
    } catch { setHubSettingsMsg({ type: 'err', text: '移除失敗' }); }
    setTimeout(() => setHubSettingsMsg(null), 3000);
  }

  async function loadStats() {
    try {
      const r = await apiFetch('/api/comms/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }

  async function loadAccounts() {
    try {
      const r = await apiFetch('/api/comms/accounts');
      if (r.ok) {
        const data = await r.json();
        setAccounts(data);
        if (data.length === 0 && !localStorage.getItem('comms_onboarding_done')) {
          setShowOnboarding(true);
        }
      }
    } catch {}
  }

  function completeOnboarding() {
    localStorage.setItem('comms_onboarding_done', '1');
    setShowOnboarding(false);
    loadAccounts();
  }

  async function loadConvos() {
    try {
      let url = '/api/comms/conversations?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterPlatform) url += `platform=${filterPlatform}&`;
      const r = await apiFetch(url);
      if (r.ok) {
        const data = await r.json();
        setConvos(data);
        if (pendingSelectId.current) {
          const target = data.find(c => c.id === pendingSelectId.current);
          if (target) {
            setSelected(target);
            pendingSelectId.current = null;
          }
        }
      }
    } catch {}
  }

  async function loadMessages(id) {
    try {
      const r = await apiFetch(`/api/comms/conversations/${id}/messages`);
      if (r.ok) {
        setMessages(await r.json());
        setConvos(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
      }
    } catch {}
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return;
    setSendLoading(true);
    try {
      await apiFetch('/api/comms/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selected.id, content: reply, sent_by: 'human' }),
      });
      setReply('');
      loadMessages(selected.id);
      loadConvos();
    } finally {
      setSendLoading(false);
    }
  }

  async function generateAIReply() {
    if (!selected) return;
    setAiLoading(true);
    try {
      const r = await apiFetch('/api/comms/messages/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selected.id }),
      });
      if (r.ok) {
        const data = await r.json();
        setReply(data.content);
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function assignConvo(id, assigned_to) {
    await apiFetch(`/api/comms/conversations/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to }),
    });
    loadConvos();
    if (selected?.id === id) setSelected(prev => ({ ...prev, assigned_to }));
  }

  async function resolveConvo(id) {
    await apiFetch(`/api/comms/conversations/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    loadConvos();
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'resolved' }));
  }

  async function addAccount() {
    if (!newAccount.account_name) return;
    await apiFetch('/api/comms/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount),
    });
    setShowAddAccount(false);
    setNewAccount({ platform: 'line', account_name: '', channel_id: '' });
    loadAccounts();
  }

  async function simulateWebhook() {
    if (!simForm.contact_name || !simForm.message) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const r = await apiFetch('/api/comms/webhook/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simForm),
      });
      const data = await r.json();
      setSimResult(data);
      loadConvos();
      loadStats();
    } catch (e) {
      setSimResult({ error: e.message });
    } finally {
      setSimLoading(false);
    }
  }

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([loadStats(), loadConvos()]);
    setRefreshing(false);
  }

  const pm = (p) => PLATFORM_META[p] || { label: p, color: 'bg-gray-400', text: 'text-gray-600', icon: '💬' };

  return (
    <div className="h-full flex flex-col">
      {showOnboarding && <CommHubOnboarding onComplete={completeOnboarding} />}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通訊中台</h1>
          <p className="text-sm text-gray-500">統一收件匣 · AI 自動回覆 · 全渠道管理</p>
        </div>
        <div className="flex gap-2">
          {[
            { label: '全部對話', value: stats.totalConvos || 0, color: 'text-gray-700' },
            { label: '進行中', value: stats.openConvos || 0, color: 'text-blue-600' },
            { label: 'AI 處理中', value: stats.aiHandled || 0, color: 'text-green-600' },
            { label: '未讀訊息', value: stats.totalUnread || 0, color: 'text-red-600' },
            { label: 'AI 回覆率', value: `${stats.aiReplyRate || 0}%`, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100 min-w-[80px]">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {[['inbox','📬 統一收件匣'],['simulate','⚡ 模擬測試'],['accounts','🔗 帳號管理'],['settings','⚙️ AI 設定']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
        <button onClick={() => setShowOnboarding(true)} title="設定指南"
          className="mb-1 px-3 py-1 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
          🚀 設定指南
        </button>
        <button onClick={refreshAll} title="刷新"
          className={`ml-2 mb-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
          ↻
        </button>
      </div>

      {tab === 'inbox' && (
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Conversation List */}
          <div className="w-72 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Filters */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300">
                <option value="">所有狀態</option>
                <option value="open">進行中</option>
                <option value="resolved">已解決</option>
              </select>
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300">
                <option value="">所有平台</option>
                {Object.entries(PLATFORM_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {convos.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm space-y-3">
                  <div className="text-4xl">📭</div>
                  <p>暫無對話</p>
                  <button onClick={() => setTab('simulate')}
                    className="text-xs px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                    ⚡ 模擬第一條訊息
                  </button>
                </div>
              ) : convos.map(c => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full p-3 text-left hover:bg-blue-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{c.contact_avatar || '👤'}</span>
                    <span className="font-medium text-sm text-gray-800 flex-1 truncate">{c.contact_name}</span>
                    {c.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{c.unread_count}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${pm(c.platform).color}`}>{pm(c.platform).label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.assigned_to === 'ai' ? '🤖 AI' : '👤 人工'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtTime(c.last_message_at)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="text-sm">選擇一個對話開始</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selected.contact_avatar || '👤'}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{selected.contact_name}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1 ${pm(selected.platform).color}`}><PlatformIcon id={selected.platform} size={12} color="white" /> {pm(selected.platform).label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[selected.status] || ''}`}>{selected.status}</span>
                        {selected.tags && selected.tags.split(',').filter(Boolean).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selected.assigned_to === 'ai' ? (
                      <button onClick={() => assignConvo(selected.id, 'human')}
                        className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors">
                        👤 人工接管
                      </button>
                    ) : (
                      <button onClick={() => assignConvo(selected.id, 'ai')}
                        className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                        🤖 交還 AI
                      </button>
                    )}
                    {selected.status !== 'resolved' && (
                      <button onClick={() => resolveConvo(selected.id)}
                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        ✓ 標記已解決
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => {
                    if (msg.sent_by === 'system') return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs px-3 py-1 bg-gray-100 text-gray-500 rounded-full">{msg.content}</span>
                      </div>
                    );
                    return (
                      <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.direction === 'outbound'
                            ? msg.sent_by === 'ai' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.direction === 'outbound' && (
                            <div className="text-xs opacity-75 mb-1">
                              {msg.sent_by === 'ai' ? `🤖 AI${msg.ai_node_type ? ` · ${msg.ai_node_type}` : ''}` : '👤 人工'}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'opacity-70' : 'text-gray-400'}`}>
                            {fmtTime(msg.sent_at)}
                            {msg.quality_score && <span className="ml-2">★{msg.quality_score}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-gray-100">
                  <div className="flex gap-2 mb-2">
                    <button onClick={generateAIReply} disabled={aiLoading}
                      className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1">
                      {aiLoading ? '⏳ 生成中...' : '🤖 AI 建議回覆'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="輸入回覆... (Enter 發送, Shift+Enter 換行)"
                      rows={3}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button onClick={sendReply} disabled={sendLoading || !reply.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium">
                      {sendLoading ? '...' : '發送'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'simulate' && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">模擬訊息接收</h2>
          <p className="text-sm text-gray-500 mb-6">模擬一條平台訊息進入系統，觸發 AI Rules Engine 自動回覆</p>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">平台</label>
                <select value={simForm.platform} onChange={e => setSimForm(p => ({ ...p, platform: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {Object.entries(PLATFORM_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">聯絡人名稱</label>
                <input value={simForm.contact_name} onChange={e => setSimForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder="例：測試用戶A"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">訊息內容</label>
              <textarea value={simForm.message} onChange={e => setSimForm(p => ({ ...p, message: e.target.value }))}
                placeholder="例：你好，我想詢問你們的產品價格..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={simulateWebhook} disabled={simLoading || !simForm.contact_name || !simForm.message}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {simLoading ? '⏳ 發送中...' : '⚡ 發送模擬訊息'}
            </button>
          </div>

          {simResult && (
            <div className={`mt-5 rounded-xl p-4 text-sm border ${simResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              {simResult.error ? (
                <p className="text-red-700">錯誤：{simResult.error}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-800">✓ 訊息已接收</span>
                    <span className="text-xs text-gray-500">對話 #{simResult.conversation_id}</span>
                  </div>
                  {simResult.aiReply ? (
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-xs text-gray-500 mb-1">
                        🤖 AI 回覆 · 規則：{simResult.ruleMatched} · {simResult.source || 'mock'}
                      </div>
                      <p className="text-gray-800">{simResult.aiReply}</p>
                    </div>
                  ) : (
                    <p className="text-orange-600 text-xs">
                      {SKIPPED_LABEL[simResult.skipped] || `跳過：${simResult.skipped}`}
                    </p>
                  )}
                  <button onClick={() => { setTab('inbox'); loadConvos(); }}
                    className="text-xs text-blue-600 hover:underline">
                    → 在收件匣查看對話
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick test presets */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">快速測試情境</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '首次詢價', msg: '你好！我想了解一下你們有什麼產品可以推薦？' },
                { label: '訂單查詢', msg: '我的訂單什麼時候出貨？' },
                { label: '英文訊息', msg: 'Hi! I want to know more about your products.' },
                { label: '售後問題', msg: '收到的商品有瑕疵，可以退換嗎？' },
              ].map(p => (
                <button key={p.label} onClick={() => setSimForm(s => ({ ...s, message: p.msg }))}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">已綁定通訊帳號</h2>
            <button onClick={() => setShowAddAccount(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              + 新增帳號
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full ${pm(acc.platform).color} flex items-center justify-center text-white`}>
                    <PlatformIcon id={acc.platform} size={20} color="white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{acc.account_name}</div>
                    <div className="text-xs text-gray-500">{pm(acc.platform).label}</div>
                  </div>
                  <div className={`ml-auto w-2 h-2 rounded-full ${acc.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
                {acc.channel_id && <p className="text-xs text-gray-500 truncate">ID: {acc.channel_id}</p>}
                {acc.webhook_url && <p className="text-xs text-gray-400 truncate mt-1">Webhook: {acc.webhook_url}</p>}
              </div>
            ))}
          </div>

          {showAddAccount && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold mb-4">新增通訊帳號</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">平台</label>
                    <select value={newAccount.platform} onChange={e => setNewAccount(p => ({ ...p, platform: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      {Object.entries(PLATFORM_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">帳號名稱</label>
                    <input value={newAccount.account_name} onChange={e => setNewAccount(p => ({ ...p, account_name: e.target.value }))}
                      placeholder="例：LINE 官方帳號"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">Channel ID / 帳號 ID（選填）</label>
                    <input value={newAccount.channel_id} onChange={e => setNewAccount(p => ({ ...p, channel_id: e.target.value }))}
                      placeholder="@handle 或數字 ID"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowAddAccount(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button onClick={addAccount}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    新增
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">AI 設定</h2>
          <p className="text-sm text-gray-500 mb-6">設定通訊中台 AI 的角色與知識庫，影響所有 AI 自動回覆和規則引擎</p>

          {hubSettingsMsg && (
            <div className={`mb-4 text-sm px-4 py-2.5 rounded-xl ${hubSettingsMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {hubSettingsMsg.text}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">AI 模型</label>
              <p className="text-xs text-gray-400 mb-2">選擇通訊中台使用的 AI 模型。留空則使用系統預設（GLM-5 Turbo）。</p>
              <select
                value={hubAiModel}
                onChange={e => setHubAiModel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="">自動（系統預設 glm-5-turbo）</option>
                <optgroup label="NVIDIA NIM">
                  <option value="nvidia/llama-3.3-nemotron-super-49b-v1">Llama 3.3 Nemotron 49B</option>
                  <option value="nvidia/llama-3.1-nemotron-70b-instruct">Llama 3.1 Nemotron 70B</option>
                  <option value="meta/llama-3.3-70b-instruct">Meta Llama 3.3 70B</option>
                  <option value="deepseek-ai/deepseek-r1">DeepSeek R1 (NVIDIA)</option>
                </optgroup>
                <optgroup label="豆包 Doubao (Volcano Engine)">
                  <option value="doubao-lite-32k">豆包 Lite 32K</option>
                  <option value="doubao-pro-32k">豆包 Pro 32K</option>
                </optgroup>
                <optgroup label="GLM (智譜 ZhipuAI)">
                  <option value="glm-5-turbo">GLM-5 Turbo</option>
                  <option value="glm-5">GLM-5</option>
                  <option value="glm-4.6">GLM-4.6</option>
                </optgroup>
                <optgroup label="通義千問 Qwen (Alibaba)">
                  <option value="qwen-turbo">Qwen Turbo</option>
                  <option value="qwen-plus">Qwen Plus</option>
                  <option value="qwen-max">Qwen Max</option>
                </optgroup>
                <optgroup label="OpenAI">
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                </optgroup>
                <optgroup label="Google Gemini">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </optgroup>
                <optgroup label="MiniMax">
                  <option value="MiniMax-M3">MiniMax M3</option>
                </optgroup>
              </select>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">AI 系統 Prompt</label>
              <p className="text-xs text-gray-400 mb-2">AI 的角色設定、回覆風格、品牌語調等。留空則使用預設客服設定。</p>
              <textarea
                value={hubPrompt}
                onChange={e => setHubPrompt(e.target.value)}
                rows={8}
                placeholder={`例：你是「品牌名稱」的專業客服，使用繁體中文，語氣親切有禮。回覆要簡短精準，不超過 3 句話。如果客戶詢問退款，請引導至 refund@brand.com。`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
              />
              <button
                onClick={saveHubPrompt}
                disabled={hubSaving}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {hubSaving ? '儲存中…' : '儲存設定'}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">產品知識庫</label>
              <p className="text-xs text-gray-400 mb-3">上傳 PDF、TXT 或 MD 文件，AI 在回覆時會自動讀取作為背景知識（最多 8000 字元）</p>
              {hubKbName && (
                <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-base">📄</span>
                  <span className="text-sm text-blue-800 flex-1 truncate">{hubKbName}</span>
                  <button
                    onClick={deleteHubKb}
                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                    移除
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={hubKbFileRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={e => setHubKbFile(e.target.files[0] || null)}
                  className="text-sm text-gray-500 flex-1"
                />
                <button
                  onClick={uploadHubKb}
                  disabled={!hubKbFile || hubKbUploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                  {hubKbUploading ? '上傳中…' : '上傳文件'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

