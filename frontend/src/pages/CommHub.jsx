import React, { useState, useEffect, useRef } from 'react';

const PLATFORM_META = {
  line:      { label: 'LINE',      color: 'bg-green-500',  text: 'text-green-600',  icon: '💬' },
  whatsapp:  { label: 'WhatsApp',  color: 'bg-emerald-500',text: 'text-emerald-600',icon: '📱' },
  telegram:  { label: 'Telegram',  color: 'bg-blue-500',   text: 'text-blue-600',   icon: '✈️' },
  messenger: { label: 'Messenger', color: 'bg-purple-500', text: 'text-purple-600', icon: '💌' },
  instagram: { label: 'Instagram', color: 'bg-pink-500',   text: 'text-pink-600',   icon: '📸' },
  email:     { label: 'Email',     color: 'bg-orange-500', text: 'text-orange-600', icon: '📧' },
  wechat:    { label: 'WeChat',    color: 'bg-lime-500',   text: 'text-lime-600',   icon: '💚' },
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
  const messagesEndRef = useRef(null);

  useEffect(() => { loadStats(); loadAccounts(); }, []);
  useEffect(() => { loadConvos(); }, [filterStatus, filterPlatform]);
  useEffect(() => { if (selected) loadMessages(selected.id); }, [selected]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadStats() {
    try {
      const r = await fetch('/api/comms/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }

  async function loadAccounts() {
    try {
      const r = await fetch('/api/comms/accounts');
      if (r.ok) setAccounts(await r.json());
    } catch {}
  }

  async function loadConvos() {
    try {
      let url = '/api/comms/conversations?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterPlatform) url += `platform=${filterPlatform}&`;
      const r = await fetch(url);
      if (r.ok) setConvos(await r.json());
    } catch {}
  }

  async function loadMessages(id) {
    try {
      const r = await fetch(`/api/comms/conversations/${id}/messages`);
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
      await fetch('/api/comms/messages/send', {
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
      const r = await fetch('/api/comms/messages/ai-reply', {
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
    await fetch(`/api/comms/conversations/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to }),
    });
    loadConvos();
    if (selected?.id === id) setSelected(prev => ({ ...prev, assigned_to }));
  }

  async function resolveConvo(id) {
    await fetch(`/api/comms/conversations/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    loadConvos();
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'resolved' }));
  }

  async function addAccount() {
    if (!newAccount.account_name) return;
    await fetch('/api/comms/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount),
    });
    setShowAddAccount(false);
    setNewAccount({ platform: 'line', account_name: '', channel_id: '' });
    loadAccounts();
  }

  const pm = (p) => PLATFORM_META[p] || { label: p, color: 'bg-gray-400', text: 'text-gray-600', icon: '💬' };

  return (
    <div className="h-full flex flex-col">
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
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[['inbox','📬 統一收件匣'],['accounts','🔗 帳號管理']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
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
                <div className="p-6 text-center text-gray-400 text-sm">暫無對話</div>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${pm(selected.platform).color}`}>{pm(selected.platform).icon} {pm(selected.platform).label}</span>
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
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.direction === 'outbound'
                          ? msg.sent_by === 'ai' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {msg.direction === 'outbound' && (
                          <div className="text-xs opacity-75 mb-1">{msg.sent_by === 'ai' ? '🤖 AI 回覆' : '👤 人工回覆'}</div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'opacity-70' : 'text-gray-400'}`}>
                          {fmtTime(msg.sent_at)}
                          {msg.quality_score && <span className="ml-2">★{msg.quality_score}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
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
                  <div className={`w-10 h-10 rounded-full ${pm(acc.platform).color} flex items-center justify-center text-white text-lg`}>
                    {pm(acc.platform).icon}
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
    </div>
  );
}
