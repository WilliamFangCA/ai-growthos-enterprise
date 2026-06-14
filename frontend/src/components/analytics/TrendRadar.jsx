import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useUISettings } from '../../contexts/UISettingsContext.jsx';

// ── 等距矩形投影（零依賴世界地圖）──────────────────────────────────────────────
const MAP_W = 1000, MAP_H = 500;
const project = (lon, lat) => [((lon + 180) / 360) * MAP_W, ((90 - lat) / 180) * MAP_H];
const GEO_URL = 'https://cdn.jsdelivr.net/gh/martynafford/natural-earth-geojson@master/110m/cultural/ne_110m_admin_0_countries.json';

// ── 主題調色盤（深/淺色集中管理，不寫死任何背景/文字色）──────────────────────────
function makePalette(theme) {
  const dark = theme !== 'light';
  return {
    dark,
    text: dark ? '#f9fafb' : '#111827',
    sub: dark ? '#9ca3af' : '#6b7280',
    faint: dark ? '#6b7280' : '#9ca3af',
    card: dark ? '#1a1d2e' : '#ffffff',
    inner: dark ? '#0f1117' : '#f7f8fb',
    border: dark ? '#2a2d3e' : '#e5e7eb',
    ocean: dark ? '#0d1322' : '#eaf0f7',
    land: dark ? '#1e2740' : '#d7e0ec',
    landStroke: dark ? '#33415f' : '#bcc8da',
    grid: dark ? '#1b2335' : '#e3e8f0',
    accent: '#3b82f6',
    chip: dark ? '#0f1117' : '#f1f3f7',
    shadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
    glow: dark ? 1 : 0.6,
    radarFill: dark ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.25)',
  };
}

const heatColor = (score) => (score >= 66 ? '#ef4444' : score >= 33 ? '#f59e0b' : '#3b82f6');

function relTime(t) {
  if (!t) return '';
  const ms = typeof t === 'number' ? t : Date.parse(t);
  if (!ms || Number.isNaN(ms)) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return '剛剛';
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`;
  return `${Math.floor(s / 86400)} 天前`;
}

// GeoJSON → SVG path（Polygon / MultiPolygon）
function geomToPath(geom) {
  if (!geom) return '';
  const polys = geom.type === 'Polygon' ? [geom.coordinates]
    : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let d = '';
  for (const poly of polys) {
    for (const ring of poly) {
      ring.forEach((pt, i) => {
        const [x, y] = project(pt[0], pt[1]);
        d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
      });
      d += 'Z ';
    }
  }
  return d;
}

export default function TrendRadar() {
  const { theme, language } = useUISettings();
  const P = makePalette(theme);
  const lang = language || 'zh-TW';

  const [region, setRegion] = useState('global');
  const [dim, setDim] = useState('news');
  const [subDim, setSubDim] = useState(null);

  const [radar, setRadar] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [subRadar, setSubRadar] = useState(null);
  const [feed, setFeed] = useState(null);
  const [sources, setSources] = useState(null);
  const [geoPaths, setGeoPaths] = useState(null); // null=loading, []=failed→grid
  const [analysis, setAnalysis] = useState(null);

  const [loadingScan, setLoadingScan] = useState(true);
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceTick] = useState(0); // 讓「最後更新：x 分鐘前」每分鐘刷新
  const [hover, setHover] = useState(null);
  const [showSources, setShowSources] = useState(false);

  const stateRef = useRef({ region, dim, subDim, lang });
  stateRef.current = { region, dim, subDim, lang };

  const loadScan = useCallback((rg, lg, fresh) => {
    setLoadingScan(true);
    const q = fresh ? '&fresh=1' : '';
    Promise.all([
      fetch(`/api/trends/radar?region=${rg}&lang=${lg}${q}`).then(r => r.json()),
      fetch(`/api/trends/world?lang=${lg}${fresh ? '&fresh=1' : ''}`).then(r => r.json()),
    ]).then(([rd, wd]) => {
      setRadar(rd);
      setHotspots(wd.hotspots || []);
      setLastUpdated(Date.now());
    }).catch(() => {}).finally(() => setLoadingScan(false));
  }, []);

  const loadSubRadar = useCallback((d, rg, lg, fresh) => {
    setLoadingSub(true);
    fetch(`/api/trends/subradar?dim=${d}&region=${rg}&lang=${lg}${fresh ? '&fresh=1' : ''}`)
      .then(r => r.json()).then(setSubRadar).catch(() => {}).finally(() => setLoadingSub(false));
  }, []);

  const loadFeed = useCallback((d, sub, rg, lg, fresh) => {
    setLoadingFeed(true);
    const sel = sub ? `sub=${sub}` : `dim=${d}`;
    fetch(`/api/trends/feed?${sel}&region=${rg}&limit=30&lang=${lg}${fresh ? '&fresh=1' : ''}`)
      .then(r => r.json()).then(setFeed).catch(() => {}).finally(() => setLoadingFeed(false));
  }, []);

  // AI 簡報：開啟/切換維度·子維度即自動載入快取簡報（瞬間命中、不需手動點）；fresh=true 為重新生成
  const loadBrief = useCallback((d, sub, rg, lg, fresh) => {
    setAnalyzing(true);
    if (fresh) setAnalysis(null);
    const sel = sub ? `sub=${sub}` : `dim=${d}`;
    fetch(`/api/trends/brief?${sel}&region=${rg}&lang=${lg}${fresh ? '&fresh=1' : ''}`)
      .then(r => r.json())
      .then(setAnalysis)
      .catch(e => setAnalysis({ output: `分析載入失敗：${e.message}`, source: 'error' }))
      .finally(() => setAnalyzing(false));
  }, []);

  const refreshAll = useCallback((fresh) => {
    const { region: rg, dim: d, subDim: sd, lang: lg } = stateRef.current;
    loadScan(rg, lg, fresh);
    loadSubRadar(d, rg, lg, fresh);
    loadFeed(d, sd, rg, lg, fresh);
    loadBrief(d, sd, rg, lg, fresh);
  }, [loadScan, loadSubRadar, loadFeed, loadBrief]);

  // 初次：來源目錄 + 地圖底圖
  useEffect(() => {
    fetch('/api/trends/sources').then(r => r.json()).then(setSources).catch(() => {});
    fetch(GEO_URL).then(r => r.json())
      .then(json => setGeoPaths((json.features || []).map(f => geomToPath(f.geometry)).filter(Boolean)))
      .catch(() => setGeoPaths([])); // 失敗 → 經緯網格降級
  }, []);

  useEffect(() => { loadScan(region, lang, false); }, [region, lang, loadScan]);
  useEffect(() => { loadSubRadar(dim, region, lang, false); }, [dim, region, lang, loadSubRadar]);
  useEffect(() => {
    loadFeed(dim, subDim, region, lang, false);
    loadBrief(dim, subDim, region, lang, false); // 開啟即自動產出分析
  }, [dim, subDim, region, lang, loadFeed, loadBrief]);

  // 自動刷新（每 5 分鐘拉最新快取，不帶 fresh 以免重抓全部 feed）+ 每分鐘更新相對時間
  useEffect(() => {
    const refresh = setInterval(() => refreshAll(false), 5 * 60 * 1000);
    const tick = setInterval(() => forceTick(t => t + 1), 60 * 1000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [refreshAll]);

  const selectDim = (id) => { setDim(id); setSubDim(null); };       // 切大維度時重置子維度
  const runAnalyze = () => loadBrief(dim, subDim, region, lang, true); // 重新生成

  const dims = radar?.dimensions || [];
  const activeDim = dims.find(d => d.id === dim) || (sources?.dimensions || []).find(d => d.id === dim);
  const anyLive = dims.some(d => d.live) || hotspots.some(h => h.live);
  const radarData = dims.map(d => ({ icon: d.icon, label: d.label, score: d.score }));
  const subs = subRadar?.subs || [];
  const activeSub = subs.find(s => s.id === subDim);
  const subRadarData = subs.map(s => ({ label: s.label, score: s.score }));
  // 地區依洲別分組（給 optgroup）
  const regionGroups = (() => {
    const list = sources?.regions || [{ id: 'global', label: '全球', group: '全球' }];
    const order = ['全球', '北美', '南美', '歐洲', '中東', '非洲', '亞太', '大洋洲'];
    const g = {};
    for (const r of list) { (g[r.group || '其他'] ||= []).push(r); }
    return Object.entries(g).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  })();

  // ── 樣式 ──
  const CARD = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 12 };
  const selectStyle = {
    background: P.inner, color: P.text, border: `1px solid ${P.border}`,
    borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer', outline: 'none',
  };
  const btn = (primary) => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${primary ? 'transparent' : P.border}`,
    background: primary ? 'linear-gradient(90deg,#3b82f6,#8b5cf6)' : P.inner,
    color: primary ? '#fff' : P.text,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });
  const h2 = { fontSize: 14, fontWeight: 600, color: P.text, margin: '0 0 14px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: P.text }}>
      {/* keyframes for spinner */}
      <style>{`@keyframes tr-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toolbar */}
      <div style={{ ...CARD, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>🌐 全球趨勢雷達</span>
          <span style={{ fontSize: 11, color: P.faint }}>
            多來源情報系統 · {sources ? `${sources.totalSources}+ 來源` : '…'} · {sources ? `${sources.subCount} 細分維度 · ${sources.regionCount} 地區` : '9 大維度即時掃描'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
          background: anyLive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
          color: anyLive ? '#10b981' : '#f59e0b',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: anyLive ? '#10b981' : '#f59e0b' }} />
          {anyLive ? 'LIVE 即時' : '示範模式'}
        </span>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: P.faint }}>最後更新：{relTime(lastUpdated)}</span>
        )}
        <select value={region} onChange={e => setRegion(e.target.value)} style={selectStyle}>
          {regionGroups.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
          ))}
        </select>
        <button onClick={() => refreshAll(true)} style={btn(false)} disabled={loadingScan}>
          {loadingScan ? <Spinner P={P} /> : '🔄'} 刷新
        </button>
      </div>

      {/* Map + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: 16 }}>
        {/* World hotspot map */}
        <div style={{ ...CARD, padding: 16, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ ...h2, margin: 0 }}>各國時事熱點地圖</h2>
            <span style={{ fontSize: 11, color: P.faint }}>點大小＝即時新聞量 · 點擊查看該國</span>
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: 'block', borderRadius: 8 }}>
              <defs>
                <filter id="trGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>
              <rect x="0" y="0" width={MAP_W} height={MAP_H} fill={P.ocean} rx="8" />
              {/* backdrop: countries or graticule fallback */}
              {geoPaths && geoPaths.length > 0
                ? geoPaths.map((d, i) => (
                    <path key={i} d={d} fill={P.land} stroke={P.landStroke} strokeWidth="0.5" />
                  ))
                : <Graticule color={P.grid} />}
              {/* hotspots */}
              {hotspots.map(h => {
                const [cx, cy] = project(h.lon, h.lat);
                const r = 5 + (h.score / 100) * 12;
                const c = heatColor(h.score);
                const sel = h.region === region;
                return (
                  <g key={h.region} style={{ cursor: 'pointer' }}
                     onMouseEnter={() => setHover({ ...h, cx, cy })}
                     onMouseLeave={() => setHover(null)}
                     onClick={() => { setRegion(h.region); setDim('world'); }}>
                    <circle cx={cx} cy={cy} r={r * 2.4} fill={c} opacity={0.18 * P.glow} filter="url(#trGlow)" />
                    <circle cx={cx} cy={cy} r={r} fill={c} opacity={0.9}>
                      {h.score > 0 && <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2.4s" repeatCount="indefinite" />}
                    </circle>
                    <circle cx={cx} cy={cy} r={Math.max(2, r * 0.35)} fill="#fff" opacity={0.95} />
                    {h.score > 0 && (
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth="1.5">
                        <animate attributeName="r" values={`${r};${r * 2.6}`} dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {sel && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={P.accent} strokeWidth="1.5" strokeDasharray="3 3" />}
                    <text x={cx} y={cy - r - 5} textAnchor="middle" fill={P.text} fontSize="11" fontWeight="600">{h.label}</text>
                  </g>
                );
              })}
            </svg>
            {/* hover tooltip */}
            {hover && (
              <div style={{
                position: 'absolute', left: `${(hover.cx / MAP_W) * 100}%`, top: `${(hover.cy / MAP_H) * 100}%`,
                transform: 'translate(-50%, calc(-100% - 14px))', pointerEvents: 'none', zIndex: 5,
                background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 10px',
                width: 230, boxShadow: P.shadow,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {hover.label} · {hover.count} 則 · 熱度 {hover.score}
                </div>
                {hover.top?.length ? hover.top.map((t, i) => (
                  <div key={i} style={{ fontSize: 11, color: P.sub, marginBottom: 3, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>• {t.title}</div>
                )) : <div style={{ fontSize: 11, color: P.faint }}>暫無即時資料</div>}
              </div>
            )}
          </div>
        </div>

        {/* Radar chart */}
        <div style={{ ...CARD, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <h2 style={h2}>九大維度總覽 <span style={{ fontSize: 11, fontWeight: 400, color: P.faint }}>點維度可下鑽細分</span></h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={P.border} />
                <PolarAngleAxis dataKey="icon" tick={{ fontSize: 15, fill: P.sub }} />
                <Radar dataKey="score" stroke={P.accent} fill={P.radarFill} strokeWidth={2} />
                <Tooltip content={<RadarTip P={P} />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Placeholder P={P} loading={loadingScan} />}
          <div style={{ fontSize: 10, color: P.faint, textAlign: 'center', marginTop: 4 }}>
            分數＝近期資訊量與時效加權（0–100）
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {dims.map(d => {
          const sel = d.id === dim;
          return (
            <div key={d.id} onClick={() => selectDim(d.id)} style={{
              ...CARD, padding: 14, cursor: 'pointer',
              borderColor: sel ? d.color : P.border,
              boxShadow: sel ? `0 0 0 1px ${d.color}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{d.icon}</span>{d.label}
                  {d.subCount ? <span style={{ fontSize: 10, color: P.faint, fontWeight: 400 }}>({d.subCount})</span> : null}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: heatColor(d.score) }}>{d.score}</span>
              </div>
              <div style={{ height: 4, background: P.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${d.score}%`, height: '100%', background: d.color, borderRadius: 2 }} />
              </div>
              {(d.top || []).slice(0, 3).map((t, i) => (
                <a key={i} href={t.link || undefined} target="_blank" rel="noreferrer"
                   onClick={e => e.stopPropagation()}
                   style={{ display: 'block', fontSize: 11, color: P.sub, marginBottom: 3, textDecoration: 'none',
                     lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                   title={t.title}>• {t.title}</a>
              ))}
              {!d.live && <div style={{ fontSize: 10, color: P.faint, marginTop: 4 }}>示範模式</div>}
            </div>
          );
        })}
        {dims.length === 0 && <Placeholder P={P} loading={loadingScan} />}
      </div>

      {/* Sub-dimension drill-down */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: 16 }}>
        {/* Sub radar */}
        <div style={{ ...CARD, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <h2 style={h2}>
            {activeDim?.icon} {activeDim?.label} · 細分信號
            {subRadar?.aggScore != null && <span style={{ fontSize: 11, fontWeight: 400, color: P.faint }}>　綜合 {subRadar.aggScore}</span>}
          </h2>
          {loadingSub && !subRadarData.length ? <Placeholder P={P} loading />
            : subRadarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={subRadarData} outerRadius="70%">
                <PolarGrid stroke={P.border} />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: P.sub }} />
                <Radar dataKey="score" stroke={activeDim?.color || P.accent} fill={P.radarFill} strokeWidth={2} />
                <Tooltip content={<RadarTip P={P} />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Placeholder P={P} loading={false} />}
        </div>

        {/* Sub cards */}
        <div style={{ ...CARD, padding: 16 }}>
          <h2 style={h2}>細分維度 <span style={{ fontSize: 11, fontWeight: 400, color: P.faint }}>點選查看該主題情報與分析</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {subs.map(s => {
              const sel = s.id === subDim;
              return (
                <div key={s.id} onClick={() => setSubDim(sel ? null : s.id)} style={{
                  background: P.inner, border: `1px solid ${sel ? (activeDim?.color || P.accent) : P.border}`,
                  boxShadow: sel ? `0 0 0 1px ${activeDim?.color || P.accent}` : 'none',
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: heatColor(s.score) }}>{s.score}</span>
                  </div>
                  <div style={{ height: 3, background: P.border, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: `${s.score}%`, height: '100%', background: activeDim?.color || P.accent, borderRadius: 2 }} />
                  </div>
                  {(s.top || []).slice(0, 2).map((t, i) => (
                    <a key={i} href={t.link || undefined} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                       title={t.titleOriginal || t.title}
                       style={{ display: 'block', fontSize: 10.5, color: P.sub, marginBottom: 2, textDecoration: 'none',
                         lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {t.title}</a>
                  ))}
                </div>
              );
            })}
            {subs.length === 0 && <Placeholder P={P} loading={loadingSub} />}
          </div>
        </div>
      </div>

      {/* Feed + AI insight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16 }}>
        {/* Live feed */}
        <div style={{ ...CARD, padding: 18 }}>
          <h2 style={h2}>
            {activeDim ? `${activeDim.icon} ${activeDim.label}` : '即時情報'}{activeSub ? ` › ${activeSub.label}` : ''} · 即時情報
            {activeSub && <span onClick={() => setSubDim(null)} style={{ fontSize: 11, color: P.accent, fontWeight: 400, cursor: 'pointer', marginLeft: 8 }}>✕ 回大維度</span>}
            {feed?.sources?.length ? <span style={{ fontSize: 11, color: P.faint, fontWeight: 400 }}>　來源：{feed.sources.join('、')}</span> : null}
          </h2>
          {loadingFeed ? <Placeholder P={P} loading /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 460, overflowY: 'auto' }}>
              {(feed?.items || []).map((it, i) => (
                <a key={i} href={it.link || undefined} target="_blank" rel="noreferrer"
                  title={it.titleOriginal ? `原文：${it.titleOriginal}` : it.title}
                  style={{
                  display: 'block', padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
                  borderBottom: `1px solid ${P.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: P.accent, fontWeight: 600 }}>{it.source}</span>
                    <span style={{ fontSize: 10, color: P.faint, flexShrink: 0 }}>{relTime(it.publishedAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: P.text, fontWeight: 500, lineHeight: 1.4, marginBottom: 2 }}>{it.title}</div>
                  {it.summary && <div style={{ fontSize: 11, color: P.sub, lineHeight: 1.45,
                    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{it.summary}</div>}
                </a>
              ))}
              {feed && (feed.items || []).length === 0 && <div style={{ fontSize: 12, color: P.faint }}>暫無資料</div>}
            </div>
          )}
        </div>

        {/* AI insight */}
        <div style={{ ...CARD, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ ...h2, margin: 0 }}>🧠 AI 趨勢洞察 <span style={{ fontSize: 11, fontWeight: 400, color: P.faint }}>GLM-4.5 Air · 開啟即自動產出</span></h2>
            <button onClick={runAnalyze} style={btn(false)} disabled={analyzing} title="以最新情報重新生成">
              {analyzing ? <Spinner P={P} /> : '🔄'} 重新生成
            </button>
          </div>
          <div style={{ flex: 1, background: P.inner, border: `1px solid ${P.border}`, borderRadius: 8, padding: 14,
            fontSize: 13, lineHeight: 1.7, color: P.text, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 420 }}>
            {analysis ? analysis.output
              : analyzing ? '正在彙整最新情報並產出分析…'
              : `針對「${activeSub?.label || activeDim?.label || '所選維度'}」彙整最新即時資訊中…`}
          </div>
          {analysis?.model && (
            <div style={{ fontSize: 10, color: P.faint, marginTop: 8 }}>
              模型：{analysis.model} · 來源：{analysis.source}
              {analysis.itemCount ? ` · 分析 ${analysis.itemCount} 則` : ''}
              {analysis.ageMinutes != null ? ` · ${analysis.ageMinutes === 0 ? '剛更新' : `${analysis.ageMinutes} 分鐘前`}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Sources directory */}
      <div style={{ ...CARD, padding: 18 }}>
        <div onClick={() => setShowSources(s => !s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <h2 style={{ ...h2, margin: 0 }}>📡 情報來源{sources ? `（${sources.totalSources}+）` : ''}</h2>
          <span style={{ fontSize: 13, color: P.sub }}>{showSources ? '收起 ▲' : '展開 ▼'}</span>
        </div>
        {showSources && sources && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
            {sources.dimensions.map(d => (
              <div key={d.id} style={{ background: P.inner, border: `1px solid ${P.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: d.color }}>{d.icon} {d.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {d.sites.map(s => (
                    <span key={s} style={{ fontSize: 10, color: P.sub, background: P.chip, border: `1px solid ${P.border}`, borderRadius: 5, padding: '2px 6px' }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 小元件 ──────────────────────────────────────────────────────────────────
function Spinner({ P, light }) {
  return <span style={{
    width: 13, height: 13, borderRadius: '50%', display: 'inline-block',
    border: `2px solid ${light ? 'rgba(255,255,255,0.4)' : P.border}`,
    borderTopColor: light ? '#fff' : P.accent, animation: 'tr-spin 0.7s linear infinite',
  }} />;
}

function Placeholder({ P, loading }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 13, display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {loading ? <><Spinner P={P} /> 掃描全球即時情報中…</> : '暫無資料'}
    </div>
  );
}

function Graticule({ color }) {
  const lines = [];
  for (let lon = -150; lon <= 150; lon += 30) {
    const x = ((lon + 180) / 360) * MAP_W;
    lines.push(<line key={`v${lon}`} x1={x} y1={0} x2={x} y2={MAP_H} stroke={color} strokeWidth="0.5" />);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * MAP_H;
    lines.push(<line key={`h${lat}`} x1={0} y1={y} x2={MAP_W} y2={y} stroke={color} strokeWidth="0.5" />);
  }
  return <g>{lines}</g>;
}

function RadarTip({ active, payload, P }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 10px', boxShadow: P.shadow }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: P.text }}>{p.icon} {p.label}</div>
      <div style={{ fontSize: 12, color: heatColor(p.score) }}>信號強度 {p.score}</div>
    </div>
  );
}
