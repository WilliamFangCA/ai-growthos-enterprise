import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/apiClient.js';
import StatCard from '../components/StatCard.jsx';

const TX_META = {
  earn:   { label: '獲得', color: 'bg-green-100 text-green-700', sign: '+' },
  redeem: { label: '兌換', color: 'bg-orange-100 text-orange-700', sign: '' },
};

const PARTNER_STATUS = {
  active:     { label: '合作中', color: 'bg-green-100 text-green-700' },
  paused:     { label: '已暫停', color: 'bg-yellow-100 text-yellow-700' },
  terminated: { label: '已終止', color: 'bg-gray-100 text-gray-500' },
};

function fmtNum(n) { return Number(n || 0).toLocaleString(); }
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Membership() {
  const [tab, setTab] = useState('members'); // members | levels | loyalty | partners
  const [stats, setStats] = useState(null);
  const [levels, setLevels] = useState([]);
  const [partnerTiers, setPartnerTiers] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loyalty, setLoyalty] = useState({ transactions: [], stats: {} });
  const [txFilter, setTxFilter] = useState('all');
  const [partnersData, setPartnersData] = useState({ partners: [], stats: {}, tiers: [] });
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text }

  // 積分調整模態框
  const [pointsModal, setPointsModal] = useState(null); // member object
  const [pointsForm, setPointsForm] = useState({ delta: '', reason: '', spend_delta: '' });
  const [pointsLoading, setPointsLoading] = useState(false);

  // 晉升合伙人模態框
  const [promoteModal, setPromoteModal] = useState(null); // member object
  const [promoteTier, setPromoteTier] = useState('affiliate');
  const [promoteLoading, setPromoteLoading] = useState(false);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  }, []);

  async function loadStats() {
    try { const r = await apiFetch('/api/members/stats'); if (r.ok) setStats(await r.json()); } catch {}
  }
  async function loadLevels() {
    try {
      const r = await apiFetch('/api/members/levels');
      if (r.ok) { const d = await r.json(); setLevels(d.levels); setPartnerTiers(d.partnerTiers); }
    } catch {}
  }
  async function loadMembers() {
    try {
      let url = `/api/members?level=${levelFilter}`;
      if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`;
      const r = await apiFetch(url);
      if (r.ok) setMembersList(await r.json());
    } catch {}
  }
  async function loadLoyalty() {
    try { const r = await apiFetch(`/api/members/loyalty?type=${txFilter}`); if (r.ok) setLoyalty(await r.json()); } catch {}
  }
  async function loadPartners() {
    try { const r = await apiFetch('/api/members/partners'); if (r.ok) setPartnersData(await r.json()); } catch {}
  }

  useEffect(() => { loadStats(); loadLevels(); }, []);
  useEffect(() => { loadMembers(); }, [levelFilter]);
  useEffect(() => { loadLoyalty(); }, [txFilter]);
  useEffect(() => { if (tab === 'partners') loadPartners(); }, [tab]);

  async function submitPoints() {
    if (!pointsModal) return;
    const delta = parseInt(pointsForm.delta, 10);
    if (!delta) { showToast('error', '請輸入積分數量（正數加點、負數扣點）'); return; }
    setPointsLoading(true);
    try {
      const r = await apiFetch(`/api/members/${pointsModal.id}/points`, {
        method: 'POST',
        body: JSON.stringify({ delta, reason: pointsForm.reason, spend_delta: pointsForm.spend_delta || 0 }),
      });
      const data = await r.json();
      if (!r.ok) { showToast('error', data.error || '操作失敗'); return; }
      if (data.upgrade?.ai_notification) {
        showToast('success', `${data.upgrade.ai_notification}（AI 已自動推送通知）`);
      } else {
        showToast('success', `✅ ${pointsModal.contact_name} 積分${delta > 0 ? '+' : ''}${delta}，餘額 ${fmtNum(data.balance_after)} 點`);
      }
      setPointsModal(null);
      setPointsForm({ delta: '', reason: '', spend_delta: '' });
      loadMembers(); loadStats(); loadLoyalty();
    } catch {
      showToast('error', '網路錯誤，請稍後再試');
    } finally {
      setPointsLoading(false);
    }
  }

  async function submitPromote() {
    if (!promoteModal) return;
    setPromoteLoading(true);
    try {
      const r = await apiFetch('/api/members/partners', {
        method: 'POST',
        body: JSON.stringify({ member_id: promoteModal.id, tier: promoteTier }),
      });
      const data = await r.json();
      if (!r.ok) { showToast('error', data.error || '晉升失敗'); return; }
      showToast('success', data.ai_notification || `🤝 ${promoteModal.contact_name} 已晉升為合伙人`);
      setPromoteModal(null);
      loadMembers(); loadStats(); loadPartners();
    } catch {
      showToast('error', '網路錯誤，請稍後再試');
    } finally {
      setPromoteLoading(false);
    }
  }

  async function updatePartnerStatus(partner, status) {
    const labels = { paused: '暫停', active: '恢復', terminated: '終止' };
    if (status === 'terminated' && !window.confirm(`確定終止與「${partner.contact_name}」的合伙關係嗎？此操作會停止其分潤。`)) return;
    try {
      const r = await apiFetch(`/api/members/partners/${partner.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (r.ok) { showToast('success', `已${labels[status]}「${partner.contact_name}」的合伙資格`); loadPartners(); }
      else { const d = await r.json(); showToast('error', d.error || '更新失敗'); }
    } catch { showToast('error', '網路錯誤'); }
  }

  const TABS = [
    { key: 'members',  label: '會員列表', icon: '👥' },
    { key: 'levels',   label: '等級制度', icon: '🏆' },
    { key: 'loyalty',  label: '積分流水', icon: '🪙' },
    { key: 'partners', label: '合伙人計劃', icon: '🤝' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">會員運營中心</h1>
          <p className="text-sm text-gray-500">會員等級 · 積分忠誠度 · 合伙人分潤 — 粉絲→客戶→會員→合伙人</p>
        </div>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="總會員數" value={fmtNum(stats.total)} icon="👥" sub={`本月新增積分 ${fmtNum(stats.monthEarned)} 點`} color="#10b981" />
          <StatCard label="積分總池" value={fmtNum(stats.totalPoints)} icon="🪙" sub={`本月兌換 ${fmtNum(stats.monthRedeemed)} 點`} color="#f59e0b" />
          <StatCard label="會員累計消費" value={`NT$ ${fmtNum(stats.totalSpend)}`} icon="💰" sub="全等級加總" color="#3b82f6" />
          <StatCard label="活躍合伙人" value={fmtNum(stats.partners)} icon="🤝" sub={`累計分潤 NT$ ${fmtNum(stats.partnerEarnings)}`} color="#34d399" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── 會員列表 ── */}
      {tab === 'members' && (
        <div className="flex-1 overflow-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => setLevelFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${levelFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              全部
            </button>
            {(stats?.distribution || []).map(lv => (
              <button key={lv.key} onClick={() => setLevelFilter(lv.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${levelFilter === lv.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {lv.icon} {lv.name} ({lv.count})
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadMembers()}
                placeholder="搜尋姓名或 Email，按 Enter"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm w-56" />
              <button onClick={loadMembers} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">搜尋</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">會員</th>
                  <th className="text-left px-4 py-3">等級</th>
                  <th className="text-right px-4 py-3">積分</th>
                  <th className="text-right px-4 py-3">累計消費</th>
                  <th className="text-left px-4 py-3">升級進度</th>
                  <th className="text-right px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {membersList.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.contact_name}</div>
                      <div className="text-xs text-gray-400">{m.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: `${m.level_meta.color}22`, color: m.level_meta.color }}>
                        {m.level_meta.icon} {m.level_meta.name}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">積分 {m.level_meta.pointsMultiplier}x</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtNum(m.points)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">NT$ {fmtNum(m.total_spend)}</td>
                    <td className="px-4 py-3 w-48">
                      {m.next_level ? (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{m.next_level.icon} 距{m.next_level.name}</span>
                            <span>還差 NT$ {fmtNum(m.next_level.remaining)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.round((m.total_spend / (m.total_spend + m.next_level.remaining)) * 100))}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">🏅 已達最高等級</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => { setPointsModal(m); setPointsForm({ delta: '', reason: '', spend_delta: '' }); }}
                        className="px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 mr-1">
                        🪙 調整積分
                      </button>
                      {m.level !== 'partner' && (
                        <button onClick={() => { setPromoteModal(m); setPromoteTier('affiliate'); }}
                          className="px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                          🤝 晉升合伙人
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {membersList.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    沒有符合條件的會員。試試清除篩選，或從 CRM 將聯絡人加入會員體系。
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 等級制度 ── */}
      {tab === 'levels' && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {levels.filter(l => l.key !== 'visitor').map(lv => {
              const dist = stats?.distribution?.find(d => d.key === lv.key);
              return (
                <div key={lv.key} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
                  style={{ borderTop: `3px solid ${lv.color}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl">{lv.icon}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {dist ? `${fmtNum(dist.count)} 人` : '0 人'}
                    </span>
                  </div>
                  <div className="font-bold text-gray-900">{lv.name}</div>
                  <div className="text-xs text-gray-500 mb-3">
                    {lv.inviteOnly ? '邀請制 · 由運營晉升' : lv.minSpend > 0 ? `累計消費 NT$ ${fmtNum(lv.minSpend)} 起` : '註冊即享'}
                    {lv.pointsMultiplier > 0 && ` · 積分 ${lv.pointsMultiplier}x`}
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1.5 mt-auto">
                    {lv.benefits.map((b, i) => <li key={i} className="flex gap-1.5"><span className="text-green-500">✓</span>{b}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            💡 等級依「累計消費」自動升降級，升級時 AI 自動透過會員偏好渠道發送恭賀通知與專屬福利說明（PRD 4.12）。
          </p>
        </div>
      )}

      {/* ── 積分流水 ── */}
      {tab === 'loyalty' && (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 mb-3">
            {[['all', '全部'], ['earn', '獲得'], ['redeem', '兌換']].map(([k, label]) => (
              <button key={k} onClick={() => setTxFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${txFilter === k ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
            <div className="ml-auto text-xs text-gray-500">
              累計發放 <b className="text-green-600">{fmtNum(loyalty.stats?.totalEarned)}</b> 點 ·
              已兌換 <b className="text-orange-600">{fmtNum(loyalty.stats?.totalRedeemed)}</b> 點 ·
              兌換率 <b>{Math.round((loyalty.stats?.redeemRate || 0) * 100)}%</b>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {loyalty.transactions.map(tx => {
              const meta = TX_META[tx.type] || TX_META.earn;
              return (
                <div key={tx.id} className="flex items-center px-4 py-3 gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{tx.contact_name} · {tx.description}</div>
                    <div className="text-xs text-gray-400">{fmtDate(tx.created_at)} · 來源：{tx.source}</div>
                  </div>
                  <div className={`text-sm font-bold ${tx.points_delta >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {meta.sign}{fmtNum(tx.points_delta)}
                  </div>
                  <div className="text-xs text-gray-400 w-24 text-right">餘額 {fmtNum(tx.balance_after)}</div>
                </div>
              );
            })}
            {loyalty.transactions.length === 0 && (
              <div className="px-4 py-10 text-center text-gray-400">尚無積分記錄</div>
            )}
          </div>
        </div>
      )}

      {/* ── 合伙人計劃 ── */}
      {tab === 'partners' && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(partnersData.tiers || partnerTiers).map(t => (
              <div key={t.key} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="font-semibold text-gray-900">{t.name}</div>
                <div className="text-2xl font-bold text-emerald-600 my-1">{Math.round(t.commission * 100)}%</div>
                <div className="text-xs text-gray-500">分潤比例 · 門檻：{t.threshold}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3">合伙人</th>
                  <th className="text-left px-4 py-3">層級</th>
                  <th className="text-right px-4 py-3">分潤比例</th>
                  <th className="text-right px-4 py-3">推薦單數</th>
                  <th className="text-right px-4 py-3">累計收益</th>
                  <th className="text-left px-4 py-3">狀態</th>
                  <th className="text-right px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {partnersData.partners.map(p => {
                  const st = PARTNER_STATUS[p.status] || PARTNER_STATUS.active;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.contact_name}</td>
                      <td className="px-4 py-3 text-gray-700">{p.tier_meta?.name || p.tier}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{Math.round(p.commission_rate * 100)}%</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtNum(p.referral_count)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">NT$ {fmtNum(p.total_earnings)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {p.status === 'active' ? (
                          <button onClick={() => updatePartnerStatus(p, 'paused')}
                            className="px-2.5 py-1 rounded-lg text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 mr-1">⏸ 暫停</button>
                        ) : p.status === 'paused' ? (
                          <button onClick={() => updatePartnerStatus(p, 'active')}
                            className="px-2.5 py-1 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 mr-1">▶ 恢復</button>
                        ) : null}
                        {p.status !== 'terminated' && (
                          <button onClick={() => updatePartnerStatus(p, 'terminated')}
                            className="px-2.5 py-1 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100">終止</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {partnersData.partners.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    尚無合伙人。到「會員列表」挑選高價值會員，點「晉升合伙人」開啟分潤合作。
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 積分調整模態框 ── */}
      {pointsModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center" onClick={() => setPointsModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-1">調整積分 — {pointsModal.contact_name}</h3>
            <p className="text-xs text-gray-500 mb-4">目前 {fmtNum(pointsModal.points)} 點 · 累計消費 NT$ {fmtNum(pointsModal.total_spend)}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 font-medium">積分變動 *（正數加點、負數扣點）</label>
                <input type="number" value={pointsForm.delta} autoFocus
                  onChange={e => setPointsForm(f => ({ ...f, delta: e.target.value }))}
                  placeholder="例：500 或 -200"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                <div className="flex gap-1.5 mt-1.5">
                  {[100, 500, 1000, -200].map(v => (
                    <button key={v} onClick={() => setPointsForm(f => ({ ...f, delta: String(v) }))}
                      className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">原因說明</label>
                <input value={pointsForm.reason}
                  onChange={e => setPointsForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="例：活動補發 / 客訴補償 / 兌換贈品"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium">同步消費金額（選填，會觸發等級升降檢查）</label>
                <input type="number" value={pointsForm.spend_delta}
                  onChange={e => setPointsForm(f => ({ ...f, spend_delta: e.target.value }))}
                  placeholder="例：3500"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPointsModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">取消</button>
              <button onClick={submitPoints} disabled={pointsLoading}
                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {pointsLoading ? '處理中…' : '確認調整'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 晉升合伙人模態框 ── */}
      {promoteModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center" onClick={() => setPromoteModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg mb-1">晉升合伙人 — {promoteModal.contact_name}</h3>
            <p className="text-xs text-gray-500 mb-4">晉升後等級變更為「合伙人」，AI 將自動發送歡迎通知與專屬推薦碼。</p>
            <div className="space-y-2">
              {partnerTiers.map(t => (
                <label key={t.key}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    promoteTier === t.key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="tier" checked={promoteTier === t.key} onChange={() => setPromoteTier(t.key)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.threshold}</div>
                  </div>
                  <div className="text-emerald-600 font-bold">{Math.round(t.commission * 100)}%</div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPromoteModal(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">取消</button>
              <button onClick={submitPromote} disabled={promoteLoading}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {promoteLoading ? '處理中…' : '🤝 確認晉升'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
