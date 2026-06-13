import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/apiClient.js';
import { useUISettings } from '../contexts/UISettingsContext.jsx';

const STORAGE_KEY = 'growthos_integrations';

const ALL_PLATFORMS = [
  { id: 'amazon',        name: 'Amazon',             icon: '📦', color: '#FF9900', region: '🇺🇸' },
  { id: 'ebay',          name: 'eBay',               icon: '🔵', color: '#0064D2', region: '🇺🇸' },
  { id: 'walmart',       name: 'Walmart',            icon: '🔵', color: '#0071CE', region: '🇺🇸' },
  { id: 'etsy',          name: 'Etsy',               icon: '🧡', color: '#F1641E', region: '🇺🇸' },
  { id: 'target',        name: 'Target Plus',        icon: '🎯', color: '#CC0000', region: '🇺🇸' },
  { id: 'newegg',        name: 'Newegg',             icon: '🔶', color: '#FF8000', region: '🇺🇸' },
  { id: 'wayfair',       name: 'Wayfair',            icon: '🏠', color: '#7B189F', region: '🇺🇸' },
  { id: 'bestbuy',       name: 'Best Buy',           icon: '💛', color: '#003591', region: '🇺🇸' },
  { id: 'mercado_libre', name: 'Mercado Libre',      icon: '🟡', color: '#FFE600', region: '🌎' },
  { id: 'shopee',        name: 'Shopee',             icon: '🛒', color: '#EE4D2D', region: '🇸🇬' },
  { id: 'lazada',        name: 'Lazada',             icon: '🟣', color: '#0F146D', region: '🇸🇬' },
  { id: 'tokopedia',     name: 'Tokopedia',          icon: '🟢', color: '#42B549', region: '🇮🇩' },
  { id: 'qoo10',         name: 'Qoo10',              icon: '🔴', color: '#E31837', region: '🇸🇬' },
  { id: 'pinduoduo',     name: '拼多多',             icon: '🛍️', color: '#E02020', region: '🇨🇳' },
  { id: 'tiktok_shop',   name: 'Douyin/TikTok Shop', icon: '🎵', color: '#010101', region: '🇨🇳' },
  { id: 'taobao',        name: '淘寶 Taobao',        icon: '🛒', color: '#FF6600', region: '🇨🇳' },
  { id: 'tmall',         name: '天貓 Tmall',         icon: '🏪', color: '#FF0000', region: '🇨🇳' },
  { id: 'jd',            name: '京東 JD.com',        icon: '🏬', color: '#C0000C', region: '🇨🇳' },
  { id: 'alibaba',       name: 'Alibaba.com',        icon: '🌐', color: '#FF6A00', region: '🇨🇳' },
  { id: 'temu',          name: 'Temu',               icon: '🧡', color: '#FF6900', region: '🇨🇳' },
  { id: 'aliexpress',    name: 'AliExpress',         icon: '🟠', color: '#E43226', region: '🇨🇳' },
  { id: 'shein',         name: 'SHEIN',              icon: '⚫', color: '#444444', region: '🇸🇬' },
  { id: 'flipkart',      name: 'Flipkart',           icon: '💛', color: '#F7DB15', region: '🇮🇳' },
  { id: 'meesho',        name: 'Meesho',             icon: '🟣', color: '#9B5CF6', region: '🇮🇳' },
  { id: 'rakuten',       name: 'Rakuten 樂天',       icon: '🔴', color: '#BF0000', region: '🇯🇵' },
  { id: 'yahoo_japan',   name: 'Yahoo Shopping JP',  icon: '🔴', color: '#FF0033', region: '🇯🇵' },
  { id: 'coupang',       name: 'Coupang',            icon: '🟠', color: '#EF6B00', region: '🇰🇷' },
  { id: 'naver',         name: 'Naver Shopping',     icon: '🟢', color: '#03C75A', region: '🇰🇷' },
  { id: 'gmarket',       name: 'Gmarket',            icon: '🟡', color: '#FFCC00', region: '🇰🇷' },
  { id: 'eleventh',      name: '11st',               icon: '🔴', color: '#E60012', region: '🇰🇷' },
  { id: 'otto',          name: 'OTTO',               icon: '🟤', color: '#F25B00', region: '🇩🇪' },
  { id: 'otto_market',   name: 'Otto Market',        icon: '🟤', color: '#F25B00', region: '🇩🇪' },
  { id: 'allegro',       name: 'Allegro',            icon: '🟠', color: '#FF6B00', region: '🇵🇱' },
  { id: 'bol',           name: 'Bol.com',            icon: '🔵', color: '#0B5CA8', region: '🇳🇱' },
  { id: 'zalando',       name: 'Zalando',            icon: '🟠', color: '#F27806', region: '🇩🇪' },
  { id: 'cdiscount',     name: 'Cdiscount',          icon: '🔵', color: '#0054A6', region: '🇫🇷' },
  { id: 'fnac',          name: 'Fnac Darty',         icon: '🟢', color: '#008F5D', region: '🇫🇷' },
  { id: 'carrefour',     name: 'Carrefour',          icon: '🔵', color: '#0067B2', region: '🇫🇷' },
  { id: 'ozon',          name: 'Ozon',               icon: '🔵', color: '#005BFF', region: '🇷🇺' },
  { id: 'wildberries',   name: 'Wildberries',        icon: '🟣', color: '#CB11AB', region: '🇷🇺' },
  { id: 'shopify',       name: 'Shopify',            icon: '🛍️', color: '#96BF48', region: '🌐' },
  { id: 'momo',          name: 'Momo 購物',          icon: '🔴', color: '#D61F3F', region: '🇹🇼' },
  { id: 'pchome',        name: 'PChome',             icon: '🖥️', color: '#CC0000', region: '🇹🇼' },
];

const STATUS_COLORS = {
  draft:    { bg: '#1e293b', text: '#94a3b8', label: '草稿' },
  active:   { bg: '#052e16', text: '#4ade80', label: '上架中' },
  inactive: { bg: '#1c1917', text: '#f97316', label: '已下架' },
  archived: { bg: '#1e1b4b', text: '#818cf8', label: '已封存' },
};

function getConnectedPlatforms() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return (data.ecommerce_accounts || []).filter(a => a.enabled && a.platform);
  } catch { return []; }
}

function PlatformBadge({ id, size = 'sm' }) {
  const p = ALL_PLATFORMS.find(x => x.id === id);
  if (!p) return null;
  const pad = size === 'sm' ? '2px 7px' : '4px 10px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 20,
      background: p.color + '20', border: `1px solid ${p.color}40`,
      fontSize: fs, color: p.color, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: fs + 1 }}>{p.icon}</span> {p.name}
    </span>
  );
}

function PublishStatusDot({ status }) {
  const color = status === 'published' ? '#4ade80' : status === 'failed' ? '#f87171' : '#94a3b8';
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 4 }} />;
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({ product, colors, onClose, onSaved }) {
  const connected = getConnectedPlatforms();
  const [form, setForm] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || '',
    compare_price: product?.compare_price || '',
    currency: product?.currency || 'TWD',
    sku: product?.sku || '',
    stock: product?.stock || '',
    category: product?.category || '',
    tags: product?.tags || '',
    status: product?.status || 'draft',
    platforms: product?.platforms || [],
    images: product?.images || [],
  });
  const [saving, setSaving] = useState(false);
  const [imgUrl, setImgUrl] = useState('');

  function updateForm(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function togglePlatform(id) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id)
        ? f.platforms.filter(p => p !== id)
        : [...f.platforms, id],
    }));
  }

  function addImage() {
    const url = imgUrl.trim();
    if (!url) return;
    setForm(f => ({ ...f, images: [...f.images, url] }));
    setImgUrl('');
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      const method = product ? 'PUT' : 'POST';
      const url = product ? `/api/product-listings/${product.id}` : '/api/product-listings';
      const r = await apiFetch(url, { method, body: JSON.stringify({ ...form, price: Number(form.price), compare_price: Number(form.compare_price), stock: Number(form.stock) }) });
      const data = await r.json();
      onSaved(data);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
    color: colors.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: colors.textDim, marginBottom: 5,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.card, borderRadius: 16,
          border: `1px solid ${colors.border}`,
          width: '100%', maxWidth: 700, maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>
            {product ? '編輯商品' : '新增商品'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textDim, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>商品名稱 *</label>
            <input style={inputStyle} value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="商品完整名稱" />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>商品文案 / 描述</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
              placeholder="詳細描述商品特色、規格、使用方式..."
            />
          </div>

          {/* Price row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
            <div>
              <label style={labelStyle}>售價 *</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.price} onChange={e => updateForm('price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>原價 / 劃線價</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.compare_price} onChange={e => updateForm('compare_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>幣別</label>
              <select style={inputStyle} value={form.currency} onChange={e => updateForm('currency', e.target.value)}>
                {['TWD','USD','CNY','JPY','KRW','EUR','GBP','SGD','MYR','IDR','INR','BRL','RUB','PLN'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU / Stock / Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>SKU</label>
              <input style={inputStyle} value={form.sku} onChange={e => updateForm('sku', e.target.value)} placeholder="SKU-001" />
            </div>
            <div>
              <label style={labelStyle}>庫存數量</label>
              <input style={inputStyle} type="number" min="0" value={form.stock} onChange={e => updateForm('stock', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>分類</label>
              <input style={inputStyle} value={form.category} onChange={e => updateForm('category', e.target.value)} placeholder="電子、服飾..." />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>標籤 (逗號分隔)</label>
            <input style={inputStyle} value={form.tags} onChange={e => updateForm('tags', e.target.value)} placeholder="新品, 熱銷, 限時優惠" />
          </div>

          {/* Images */}
          <div>
            <label style={labelStyle}>商品圖片</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={imgUrl}
                onChange={e => setImgUrl(e.target.value)}
                placeholder="貼上圖片網址或 /media/xxx.jpg"
                onKeyDown={e => e.key === 'Enter' && addImage()}
              />
              <button
                onClick={addImage}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#3b82f6', color: '#fff', fontSize: 13,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >新增</button>
            </div>
            {form.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {form.images.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: `1px solid ${colors.border}` }} />
                    <button
                      onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#ef4444', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish platforms */}
          <div>
            <label style={labelStyle}>發佈到電商平台</label>
            {connected.length === 0 ? (
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: colors.inputBg, border: `1px solid ${colors.border}`,
                fontSize: 12, color: colors.textDim,
              }}>
                尚未連接任何電商帳號，請前往「設定 → 電商平台」新增帳號
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {connected.map(acc => {
                  const p = ALL_PLATFORMS.find(x => x.id === acc.platform);
                  if (!p) return null;
                  const selected = form.platforms.includes(acc.platform);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => togglePlatform(acc.platform)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                        border: `1.5px solid ${selected ? p.color : colors.border}`,
                        background: selected ? p.color + '20' : 'transparent',
                        fontSize: 12, color: selected ? p.color : colors.textDim,
                        fontWeight: selected ? 700 : 400, transition: 'all 0.15s',
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{acc.account_name || p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>狀態</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(STATUS_COLORS).map(([s, meta]) => (
                <label
                  key={s}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    border: `1.5px solid ${form.status === s ? '#3b82f6' : colors.border}`,
                    background: form.status === s ? 'rgba(59,130,246,0.1)' : 'transparent',
                    fontSize: 12, color: form.status === s ? '#3b82f6' : colors.textDim,
                  }}
                >
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => updateForm('status', s)} style={{ display: 'none' }} />
                  {meta.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px', borderTop: `1px solid ${colors.border}`,
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'transparent',
            color: colors.textDim, fontSize: 13, cursor: 'pointer',
          }}>取消</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title}
            style={{
              padding: '9px 24px', borderRadius: 8, border: 'none',
              background: saving || !form.title ? '#374151' : '#3b82f6',
              color: saving || !form.title ? '#6b7280' : '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving || !form.title ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '儲存中...' : '儲存商品'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Publish Modal ─────────────────────────────────────────────────────────────

function PublishModal({ product, colors, onClose, onPublished }) {
  const connected = getConnectedPlatforms();
  const [selected, setSelected] = useState(product.platforms || []);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);

  function togglePlatform(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function handlePublish() {
    if (!selected.length) return;
    setPublishing(true);
    try {
      const r = await apiFetch(`/api/product-listings/${product.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ platforms: selected }),
      });
      const data = await r.json();
      setResult(data);
      onPublished(data);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: colors.card, borderRadius: 16,
        border: `1px solid ${colors.border}`,
        width: '100%', maxWidth: 500,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>發佈商品到電商平台</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textDim, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: colors.textDim, marginBottom: 16 }}>
            商品：<span style={{ color: colors.text, fontWeight: 600 }}>{product.title}</span>
          </div>

          {result ? (
            <div>
              <div style={{ fontSize: 13, color: '#4ade80', marginBottom: 12, fontWeight: 600 }}>發佈完成！</div>
              {Object.entries(result.results || {}).map(([pid, r]) => {
                const p = ALL_PLATFORMS.find(x => x.id === pid);
                return (
                  <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <PublishStatusDot status={r.success ? 'published' : 'failed'} />
                    <span style={{ fontSize: 12, color: colors.text }}>{p?.name || pid}</span>
                    <span style={{ fontSize: 11, color: r.success ? '#4ade80' : '#f87171', marginLeft: 'auto' }}>
                      {r.success ? '✓ 已發佈' : '✗ 失敗'}
                    </span>
                  </div>
                );
              })}
              <button onClick={onClose} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>關閉</button>
            </div>
          ) : connected.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.textDim }}>尚未連接任何電商帳號，請先至「設定 → 電商平台」新增。</div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>選擇發佈平台</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {connected.map(acc => {
                    const p = ALL_PLATFORMS.find(x => x.id === acc.platform);
                    if (!p) return null;
                    const isSelected = selected.includes(acc.platform);
                    return (
                      <label
                        key={acc.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${isSelected ? p.color : colors.border}`,
                          background: isSelected ? p.color + '15' : colors.inputBg,
                          transition: 'all 0.15s',
                        }}
                      >
                        <input type="checkbox" checked={isSelected} onChange={() => togglePlatform(acc.platform)} style={{ accentColor: p.color, width: 15, height: 15 }} />
                        <span style={{ fontSize: 16 }}>{p.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: colors.textDim }}>{acc.account_name}</div>
                        </div>
                        {(product.publish_status || {})[acc.platform] && (
                          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4ade80' }}>
                            已發佈 ✓
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing || !selected.length}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                  background: publishing || !selected.length ? '#374151' : '#3b82f6',
                  color: publishing || !selected.length ? '#6b7280' : '#fff',
                  fontSize: 14, fontWeight: 600,
                  cursor: publishing || !selected.length ? 'not-allowed' : 'pointer',
                }}
              >
                {publishing ? '發佈中...' : `發佈到 ${selected.length} 個平台`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Platform Messages Panel ───────────────────────────────────────────────────

function PlatformMessagesPanel({ colors }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('');
  const connected = getConnectedPlatforms();

  async function load() {
    setLoading(true);
    try {
      const qs = filterPlatform ? `?platform=${filterPlatform}` : '';
      const r = await apiFetch(`/api/product-listings/messages/list${qs}`);
      const data = await r.json();
      setMessages(data.messages || []);
    } catch { setMessages([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterPlatform]);

  async function markRead(id) {
    await apiFetch(`/api/product-listings/messages/${id}/read`, { method: 'PUT' });
    setMessages(m => m.map(x => x.id === id ? { ...x, is_read: 1 } : x));
  }

  function fmtDate(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: colors.textDim }}>篩選平台：</span>
        {[{ id: '', name: '全部', icon: '🌐', color: '#6b7280' }, ...ALL_PLATFORMS.filter(p => connected.some(c => c.platform === p.id))].map(p => (
          <button
            key={p.id}
            onClick={() => setFilterPlatform(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, border: `1px solid ${filterPlatform === p.id ? p.color : colors.border}`,
              background: filterPlatform === p.id ? p.color + '20' : 'transparent',
              color: filterPlatform === p.id ? p.color : colors.textDim,
              fontSize: 12, cursor: 'pointer', fontWeight: filterPlatform === p.id ? 700 : 400,
            }}
          >
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>載入中...</div>
      ) : messages.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '36px 20px',
          color: colors.textDim, fontSize: 13,
          background: colors.card, border: `1px dashed ${colors.border}`,
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>💬</div>
          尚無買家訊息。當各平台買家傳送訊息時，訊息將同步顯示於此。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => {
            const p = ALL_PLATFORMS.find(x => x.id === msg.platform);
            return (
              <div
                key={msg.id}
                onClick={() => !msg.is_read && markRead(msg.id)}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: msg.is_read ? colors.card : colors.card,
                  border: `1px solid ${msg.is_read ? colors.border : p?.color + '60' || colors.border}`,
                  cursor: msg.is_read ? 'default' : 'pointer',
                  opacity: msg.is_read ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {p && <PlatformBadge id={p.id} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{msg.buyer_name || '匿名買家'}</span>
                  <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 'auto' }}>{fmtDate(msg.sent_at)}</span>
                  {!msg.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 13, color: msg.is_read ? colors.textDim : colors.text, lineHeight: 1.5 }}>
                  {msg.direction === 'outbound' && <span style={{ fontSize: 11, color: '#10b981', marginRight: 6 }}>↑ 已回覆</span>}
                  {msg.content}
                </div>
                {msg.order_id && (
                  <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>訂單：{msg.order_id}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProductListings() {
  const { colors } = useUISettings();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [publishProduct, setPublishProduct] = useState(null);
  const [tab, setTab] = useState('products');
  const LIMIT = 20;

  async function loadProducts() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page, limit: LIMIT });
      if (filterStatus) qs.set('status', filterStatus);
      if (filterPlatform) qs.set('platform', filterPlatform);
      if (q) qs.set('q', q);
      const r = await apiFetch(`/api/product-listings?${qs}`);
      const data = await r.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch { setProducts([]); } finally { setLoading(false); }
  }

  useEffect(() => { loadProducts(); }, [page, filterStatus, filterPlatform, q]);

  function handleSaved(product) {
    setShowForm(false);
    setEditProduct(null);
    loadProducts();
  }

  function handlePublished(result) {
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm('確定要刪除此商品嗎？')) return;
    await apiFetch(`/api/product-listings/${id}`, { method: 'DELETE' });
    loadProducts();
  }

  const connected = getConnectedPlatforms();
  const connectedPlatformIds = [...new Set(connected.map(c => c.platform))];

  const s = {
    page: { padding: '24px 28px', minHeight: '100vh', background: colors.bg },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 22, fontWeight: 700, color: colors.text },
    tabs: { display: 'flex', gap: 4, marginBottom: 20 },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>商品管理 · 多平台發佈</div>
          <div style={{ fontSize: 13, color: colors.textDim, marginTop: 4 }}>
            管理商品資料、一鍵發佈到 40 個電商平台，並查看買家訊息
          </div>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16 }}>＋</span> 新增商品
        </button>
      </div>

      {/* Connected platforms summary */}
      {connectedPlatformIds.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: colors.card, border: `1px solid ${colors.border}`,
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: colors.textDim, marginRight: 4 }}>已連接：</span>
          {connectedPlatformIds.map(id => <PlatformBadge key={id} id={id} />)}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'products', label: '商品列表', icon: '📦' },
          { id: 'messages', label: '買家訊息', icon: '💬' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: tab === t.id ? '#3b82f6' : colors.card,
              color: tab === t.id ? '#fff' : colors.textDim,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === 'messages' ? (
        <PlatformMessagesPanel colors={colors} />
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="搜尋商品名稱、SKU..."
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13,
                background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                color: colors.text, outline: 'none', width: 220,
              }}
            />
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                color: colors.text, outline: 'none',
              }}
            >
              <option value="">全部狀態</option>
              {Object.entries(STATUS_COLORS).map(([s, m]) => (
                <option key={s} value={s}>{m.label}</option>
              ))}
            </select>
            <select
              value={filterPlatform}
              onChange={e => { setFilterPlatform(e.target.value); setPage(1); }}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
                color: colors.text, outline: 'none',
              }}
            >
              <option value="">全部平台</option>
              {connectedPlatformIds.map(id => {
                const p = ALL_PLATFORMS.find(x => x.id === id);
                return <option key={id} value={id}>{p?.icon} {p?.name || id}</option>;
              })}
            </select>
            <span style={{ fontSize: 12, color: colors.textDim, marginLeft: 'auto' }}>共 {total} 件商品</span>
          </div>

          {/* Product grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: colors.textDim }}>載入中...</div>
          ) : products.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: colors.textDim, fontSize: 13,
              background: colors.card, border: `1px dashed ${colors.border}`,
              borderRadius: 16,
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🛍️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: 8 }}>尚無商品</div>
              <div>點擊右上角「新增商品」開始建立您的商品庫</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {products.map(p => {
                const statusMeta = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                const publishedCount = Object.values(p.publish_status || {}).filter(x => x.status === 'published').length;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: colors.card, borderRadius: 14,
                      border: `1px solid ${colors.border}`,
                      overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      height: 140, background: colors.inputBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 36, opacity: 0.3 }}>🛍️</span>
                      )}
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        padding: '2px 8px', borderRadius: 20,
                        background: statusMeta.bg, color: statusMeta.text,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {statusMeta.label}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, lineHeight: 1.4 }}>
                        {p.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                          {p.currency} {Number(p.price).toLocaleString()}
                        </div>
                        {p.sku && <div style={{ fontSize: 11, color: colors.textDim }}>SKU: {p.sku}</div>}
                      </div>

                      {p.platforms?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.platforms.slice(0, 4).map(pid => (
                            <PlatformBadge key={pid} id={pid} />
                          ))}
                          {p.platforms.length > 4 && (
                            <span style={{ fontSize: 11, color: colors.textDim, alignSelf: 'center' }}>+{p.platforms.length - 4}</span>
                          )}
                        </div>
                      )}

                      {publishedCount > 0 && (
                        <div style={{ fontSize: 11, color: '#4ade80' }}>
                          <PublishStatusDot status="published" />
                          已發佈到 {publishedCount} 個平台
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{
                      display: 'flex', gap: 6, padding: '10px 16px',
                      borderTop: `1px solid ${colors.border}`,
                    }}>
                      <button
                        onClick={() => setPublishProduct(p)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        🚀 發佈
                      </button>
                      <button
                        onClick={() => { setEditProduct(p); setShowForm(true); }}
                        style={{
                          padding: '7px 12px', borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          background: 'transparent', color: colors.textDim,
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        style={{
                          padding: '7px 12px', borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          background: 'transparent', color: '#f87171',
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: `1px solid ${colors.border}`, background: 'transparent',
                  color: page === 1 ? colors.textDim : colors.text, cursor: page === 1 ? 'default' : 'pointer',
                }}
              >← 上一頁</button>
              <span style={{ padding: '7px 14px', fontSize: 13, color: colors.textDim, alignSelf: 'center' }}>
                {page} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: `1px solid ${colors.border}`, background: 'transparent',
                  color: page >= Math.ceil(total / LIMIT) ? colors.textDim : colors.text,
                  cursor: page >= Math.ceil(total / LIMIT) ? 'default' : 'pointer',
                }}
              >下一頁 →</button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          colors={colors}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSaved={handleSaved}
        />
      )}
      {publishProduct && (
        <PublishModal
          product={publishProduct}
          colors={colors}
          onClose={() => setPublishProduct(null)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
