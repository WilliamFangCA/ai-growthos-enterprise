import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient.js';

const STATUS_META = {
  pending:            { label: '待付款',   color: 'bg-yellow-100 text-yellow-700',  icon: '⏳' },
  paid:               { label: '已付款',   color: 'bg-blue-100 text-blue-700',      icon: '💳' },
  processing:         { label: '備貨中',   color: 'bg-purple-100 text-purple-700',  icon: '📦' },
  shipped:            { label: '已出貨',   color: 'bg-indigo-100 text-indigo-700',  icon: '🚚' },
  in_transit:         { label: '配送中',   color: 'bg-cyan-100 text-cyan-700',      icon: '🛣️' },
  delivered:          { label: '已到貨',   color: 'bg-green-100 text-green-700',    icon: '✅' },
  completed:          { label: '已完成',   color: 'bg-emerald-100 text-emerald-700',icon: '🎉' },
  refund_requested:   { label: '退款申請', color: 'bg-orange-100 text-orange-700',  icon: '🔄' },
  refunded:           { label: '已退款',   color: 'bg-red-100 text-red-700',        icon: '💸' },
  exchange_requested: { label: '換貨申請', color: 'bg-pink-100 text-pink-700',      icon: '🔃' },
  exchanged:          { label: '換貨完成', color: 'bg-rose-100 text-rose-700',      icon: '✔️' },
};

const PLATFORM_META = {
  shopify: { label: 'Shopify',  icon: '🛍️', color: 'text-green-600' },
  amazon:  { label: 'Amazon',   icon: '📦', color: 'text-orange-600' },
  shopee:  { label: 'Shopee',   icon: '🛒', color: 'text-red-600' },
  tiktok:  { label: 'TikTok',   icon: '🎵', color: 'text-pink-600' },
  jd:      { label: 'JD.com',   icon: '🏪', color: 'text-red-600' },
  custom:  { label: '自建商城', icon: '🏬', color: 'text-blue-600' },
};

const STATUS_FLOW = ['pending','paid','processing','shipped','in_transit','delivered','completed'];

function formatAmount(amount, currency = 'TWD') {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ platform: 'shopify', contact_name: '', contact_email: '', total_amount: '', currency: 'TWD', items: [] });

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadOrders(); }, [filterStatus, filterPlatform, page]);

  async function loadStats() {
    try {
      const r = await apiFetch('/api/orders/stats');
      if (r.ok) setStats(await r.json());
    } catch {}
  }

  async function loadOrders() {
    try {
      let url = `/api/orders?page=${page}&limit=15`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterPlatform) url += `&platform=${filterPlatform}`;
      const r = await apiFetch(url);
      if (r.ok) {
        const data = await r.json();
        setOrders(data.orders);
        setTotal(data.total);
      }
    } catch {}
  }

  async function loadOrderDetail(id) {
    try {
      const r = await apiFetch(`/api/orders/${id}`);
      if (r.ok) setSelected(await r.json());
    } catch {}
  }

  async function updateStatus() {
    if (!selected || !newStatus) return;
    setStatusLoading(true);
    setNotification('');
    try {
      const r = await apiFetch(`/api/orders/${selected.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, tracking_number: trackingNo || undefined, estimated_delivery: estimatedDelivery || undefined }),
      });
      if (r.ok) {
        const data = await r.json();
        setNotification(data.notification || '');
        setShowStatusModal(false);
        loadOrders();
        loadStats();
        loadOrderDetail(selected.id);
      }
    } finally {
      setStatusLoading(false);
    }
  }

  const sm = (s) => STATUS_META[s] || { label: s, color: 'bg-gray-100 text-gray-600', icon: '?' };
  const pm = (p) => PLATFORM_META[p] || { label: p, icon: '🏪', color: 'text-gray-600' };
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">訂單管理中心</h1>
          <p className="text-sm text-gray-500">OMS · 多平台彙整 · AI 自動通知</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + 新增訂單
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        {[
          { label: '總訂單', value: stats.total || 0, color: 'text-gray-700' },
          { label: '今日 GMV', value: `TWD ${Number(stats.todayGMV || 0).toLocaleString()}`, color: 'text-blue-600' },
          { label: '待付款', value: stats.pending || 0, color: 'text-yellow-600' },
          { label: '處理中', value: stats.processing || 0, color: 'text-purple-600' },
          { label: '配送中', value: stats.shipped || 0, color: 'text-indigo-600' },
          { label: '已到貨', value: stats.delivered || 0, color: 'text-green-600' },
          { label: '退款', value: stats.refunds || 0, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Order List */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-gray-100 flex gap-2">
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">所有狀態</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <select value={filterPlatform} onChange={e => { setFilterPlatform(e.target.value); setPage(1); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300">
              <option value="">所有平台</option>
              {Object.entries(PLATFORM_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <span className="ml-auto text-xs text-gray-500 self-center">共 {total} 筆</span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['訂單號', '平台', '客戶', '商品', '金額', '狀態', '建立時間', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} onClick={() => loadOrderDetail(o.id)}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${selected?.id === o.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      <div className="font-medium">{o.platform_order_id || `#${o.id}`}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${pm(o.platform).color}`}>{pm(o.platform).icon} {pm(o.platform).label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-800">{o.contact_name}</div>
                      <div className="text-xs text-gray-400">{o.contact_email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {o.items?.slice(0, 2).map((item, i) => (
                        <div key={i}>{item.name} ×{item.qty}</div>
                      ))}
                      {o.items?.length > 2 && <div className="text-gray-400">+{o.items.length - 2} 項</div>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {formatAmount(o.total_amount, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${sm(o.status).color}`}>
                        {sm(o.status).icon} {sm(o.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); loadOrderDetail(o.id); setNewStatus(''); setShowStatusModal(true); }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        更新
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">暫無訂單</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-100 flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">上一頁</button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">下一頁</button>
            </div>
          )}
        </div>

        {/* Order Detail Panel */}
        {selected && (
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-y-auto p-4 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">訂單詳情</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div><span className="font-medium">訂單號：</span>{selected.platform_order_id || `#${selected.id}`}</div>
                <div><span className="font-medium">平台：</span>{pm(selected.platform).icon} {pm(selected.platform).label}</div>
                <div><span className="font-medium">客戶：</span>{selected.contact_name}</div>
                <div><span className="font-medium">Email：</span>{selected.contact_email || '—'}</div>
                <div><span className="font-medium">地址：</span>{selected.shipping_address || '—'}</div>
              </div>
            </div>

            {/* Status Flow */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">狀態進度</div>
              <div className="flex items-center gap-1">
                {STATUS_FLOW.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`flex-1 h-1.5 rounded-full ${STATUS_FLOW.indexOf(selected.status) >= i ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    {i < STATUS_FLOW.length - 1 && null}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2 text-center">
                <span className={`text-xs px-2 py-1 rounded-full ${sm(selected.status).color}`}>
                  {sm(selected.status).icon} {sm(selected.status).label}
                </span>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">商品明細</div>
              <div className="space-y-2">
                {(selected.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">{item.name} ×{item.qty}</span>
                    <span className="font-medium">{formatAmount(item.price * item.qty, selected.currency)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold">
                  <span>合計</span>
                  <span>{formatAmount(selected.total_amount, selected.currency)}</span>
                </div>
              </div>
            </div>

            {/* Logistics */}
            {selected.tracking_number && (
              <div className="text-xs space-y-1">
                <div className="font-semibold text-gray-600">物流資訊</div>
                <div><span className="font-medium">單號：</span>{selected.tracking_number}</div>
                <div><span className="font-medium">物流：</span>{selected.logistics_provider || '—'}</div>
                <div><span className="font-medium">預計到貨：</span>{fmtDate(selected.estimated_delivery)}</div>
              </div>
            )}

            {/* AI Notifications */}
            {selected.notifications?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">AI 通知記錄</div>
                <div className="space-y-2">
                  {selected.notifications.map(n => (
                    <div key={n.id} className="bg-green-50 rounded-lg p-2 text-xs text-gray-700">
                      <div className="flex items-center gap-1 mb-1 text-green-600 font-medium">
                        <span>🤖</span><span>{sm(n.notification_type)?.label || n.notification_type}</span>
                      </div>
                      <p className="text-gray-600">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setNewStatus(selected.status); setShowStatusModal(true); }}
              className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              更新訂單狀態
            </button>
          </div>
        )}
      </div>

      {/* AI Notification banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-green-600 text-white rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <div className="font-semibold text-sm mb-1">AI 通知已發送</div>
              <p className="text-xs opacity-90">{notification}</p>
            </div>
            <button onClick={() => setNotification('')} className="ml-auto opacity-70 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-1">更新訂單狀態</h3>
            <p className="text-sm text-gray-500 mb-4">訂單 {selected.platform_order_id || `#${selected.id}`} · AI 將自動發送通知給客戶</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">新狀態</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <button key={k} onClick={() => setNewStatus(k)}
                      className={`p-2 rounded-xl border text-xs text-left transition-colors ${newStatus === k ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {['shipped','in_transit'].includes(newStatus) && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">物流單號</label>
                    <input value={trackingNo} onChange={e => setTrackingNo(e.target.value)}
                      placeholder="例：SF1234567890"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">預計到貨日</label>
                    <input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">取消</button>
              <button onClick={updateStatus} disabled={!newStatus || statusLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {statusLoading ? '處理中...' : '確認更新 (AI 將發送通知)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

