import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, addEdge,
  Handle, Position, MiniMap, Controls, Background, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { apiFetch } from '../utils/apiClient.js';
import { NODE_REGISTRY, NODE_CATEGORIES, nodeMeta, v1ToGraph } from '../components/workflow/nodeRegistry.js';

const CATEGORY_OPTIONS = [
  ['acquisition', '🎯 獲客'], ['activation', '⚡ 激活'], ['retention', '💎 留存'],
  ['revenue', '💰 收入'], ['referral', '🔗 裂變'], ['order', '📦 訂單'], ['comms', '💬 通訊'], ['general', '⚙️ 一般'],
];

const INP = { background: '#0f1117', border: '1px solid #2a2d3e', borderRadius: 7, padding: '7px 10px', color: '#f9fafb', fontSize: 12, outline: 'none', boxSizing: 'border-box', width: '100%' };

// ── 自訂節點 ──
function GenericNode({ id, type, data, selected }) {
  const meta = nodeMeta(type);
  const summary = data.template || data.prompt || data.task || data.condition || data.tag ||
    (data.field ? `${data.field} ${data.operator || ''} ${data.value ?? ''}` : '') ||
    (data.hours ? `${data.hours} 小時` : '') || (data.amount ? `+${data.amount}` : '') ||
    data.url || data.tool_id || data.channel || data.assignee || data.trigger_type || '';
  const outs = meta.handles?.out;
  return (
    <div style={{
      minWidth: 150, maxWidth: 200, borderRadius: 10, padding: '10px 12px',
      background: '#1a1d2e',
      border: `1.5px solid ${selected ? meta.color : '#2a2d3e'}`,
      boxShadow: selected ? `0 0 12px ${meta.color}40` : '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {meta.handles?.in && <Handle type="target" position={Position.Left} style={{ background: '#6b7280', width: 8, height: 8 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{data.label || meta.label}</span>
      </div>
      {summary && (
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {String(summary).slice(0, 40)}
        </div>
      )}
      {outs === 'single' && <Handle type="source" position={Position.Right} style={{ background: meta.color, width: 8, height: 8 }} />}
      {Array.isArray(outs) && (
        <>
          <Handle type="source" id="true" position={Position.Right} style={{ top: '32%', background: '#10b981', width: 8, height: 8 }} />
          <Handle type="source" id="false" position={Position.Right} style={{ top: '70%', background: '#ef4444', width: 8, height: 8 }} />
          <div style={{ position: 'absolute', right: -16, top: '24%', fontSize: 8, color: '#10b981' }}>✓</div>
          <div style={{ position: 'absolute', right: -16, top: '62%', fontSize: 8, color: '#ef4444' }}>✗</div>
        </>
      )}
    </div>
  );
}

const nodeTypes = Object.fromEntries(Object.keys(NODE_REGISTRY).map(k => [k, GenericNode]));

// ── 節點設定表單 ──
function ConfigPanel({ node, onChange, onDelete, tools }) {
  const meta = nodeMeta(node.type);
  return (
    <div style={{ width: 280, flexShrink: 0, background: '#12151f', borderLeft: '1px solid #2a2d3e', padding: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.label}</span>
      </div>
      <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 14px' }}>{meta.description}</p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>節點名稱</label>
        <input style={INP} value={node.data.label || ''} onChange={e => onChange({ label: e.target.value })} />
      </div>

      {meta.configFields.map(f => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>{f.label}</label>
          {f.fieldType === 'textarea' ? (
            <textarea style={{ ...INP, resize: 'vertical', minHeight: 70, fontFamily: 'inherit', lineHeight: 1.5 }} rows={3}
              value={node.data[f.key] ?? ''} placeholder={f.placeholder}
              onChange={e => onChange({ [f.key]: e.target.value })} />
          ) : f.fieldType === 'number' ? (
            <input type="number" style={INP} value={node.data[f.key] ?? 0}
              onChange={e => onChange({ [f.key]: Number(e.target.value) })} />
          ) : f.fieldType === 'select' ? (
            <select style={{ ...INP, cursor: 'pointer' }} value={node.data[f.key] ?? ''}
              onChange={e => onChange({ [f.key]: e.target.value })}>
              {(f.options || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ) : f.fieldType === 'tool' ? (
            <select style={{ ...INP, cursor: 'pointer' }} value={node.data[f.key] ?? ''}
              onChange={e => onChange({ [f.key]: e.target.value })}>
              <option value="">— 選擇工具 —</option>
              {tools.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
          ) : (
            <input style={INP} value={node.data[f.key] ?? ''} placeholder={f.placeholder}
              onChange={e => onChange({ [f.key]: e.target.value })} />
          )}
        </div>
      ))}

      {node.type !== 'trigger' && (
        <button onClick={onDelete} style={{
          width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
        }}>
          🗑 刪除此節點
        </button>
      )}
      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 12, lineHeight: 1.6 }}>
        💡 拖曳節點移動位置；從節點右側圓點拖出連線到下一個節點；選取連線按 Delete 可刪除。
      </div>
    </div>
  );
}

// ── 主編輯器 ──
function BuilderInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef(null);
  const idCounter = useRef(1);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [meta, setMeta] = useState({ name: '', category: 'general', description: '' });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runTrace, setRunTrace] = useState(null);
  const [toast, setToast] = useState(null);
  const [tools, setTools] = useState([]);
  const [savedId, setSavedId] = useState(id ? parseInt(id, 10) : null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 載入工具清單（tool 節點下拉用）
  useEffect(() => {
    apiFetch('/api/tools').then(r => r.json()).then(d => setTools(d.tools || [])).catch(() => {});
  }, []);

  // 載入既有工作流
  useEffect(() => {
    if (!id) {
      // 新建：預設一個觸發節點
      setNodes([{ id: 'trigger', type: 'trigger', position: { x: 60, y: 180 }, data: { label: '觸發器', trigger_type: 'manual' } }]);
      return;
    }
    apiFetch('/api/workflows').then(r => r.json()).then(list => {
      const wf = (Array.isArray(list) ? list : []).find(w => w.id === parseInt(id, 10));
      if (!wf) { showToast('找不到此工作流', 'error'); setLoading(false); return; }
      setMeta({ name: wf.name, category: wf.category || 'general', description: wf.description || '' });
      const graph = wf.format === 'v2' && wf.graph ? wf.graph : v1ToGraph(wf);
      setNodes(graph.nodes.map(n => ({ ...n, data: { ...nodeMeta(n.type).defaultData, ...n.data } })));
      setEdges((graph.edges || []).map(e => ({ ...e, animated: true, style: { stroke: '#4b5563' } })));
      idCounter.current = graph.nodes.length + 10;
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const onConnect = useCallback(params => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#4b5563' } }, eds));
  }, [setEdges]);

  // 拖放新增節點
  const onDragOver = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback(e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !NODE_REGISTRY[type]) return;
    if (type === 'trigger' && nodes.some(n => n.type === 'trigger')) {
      showToast('一個工作流只能有一個觸發節點', 'error');
      return;
    }
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newId = `n${Date.now()}_${idCounter.current++}`;
    setNodes(nds => [...nds, { id: newId, type, position, data: { ...NODE_REGISTRY[type].defaultData } }]);
    setSelectedId(newId);
  }, [screenToFlowPosition, setNodes, nodes]);

  const selectedNode = nodes.find(n => n.id === selectedId);

  const updateSelectedData = (patch) => {
    setNodes(nds => nds.map(n => n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  const deleteSelected = () => {
    setNodes(nds => nds.filter(n => n.id !== selectedId));
    setEdges(eds => eds.filter(e => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  async function handleSave() {
    if (!meta.name.trim()) { showToast('請先填寫工作流名稱', 'error'); return; }
    setSaving(true);
    try {
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const payload = {
        name: meta.name,
        category: meta.category,
        description: meta.description,
        trigger_type: triggerNode?.data?.trigger_type || 'manual',
        actions: {
          format: 'v2',
          nodes: nodes.map(({ id: nid, type, position, data }) => ({ id: nid, type, position, data })),
          edges: edges.map(({ id: eid, source, target, sourceHandle }) => ({ id: eid, source, target, ...(sourceHandle ? { sourceHandle } : {}) })),
        },
      };
      const r = savedId
        ? await apiFetch(`/api/workflows/${savedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await apiFetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '儲存失敗');
      if (!savedId) setSavedId(data.id);
      showToast(`✅ 「${meta.name}」已儲存（${nodes.length} 節點 / ${edges.length} 連線）`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!savedId) { showToast('請先儲存工作流再執行', 'error'); return; }
    setRunning(true);
    setRunTrace(null);
    try {
      const r = await apiFetch(`/api/workflows/${savedId}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '執行失敗');
      setRunTrace(data);
      showToast(`✅ 模擬執行完成：${data.results?.length || 0} 個步驟`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRunning(false);
    }
  }

  const statusColor = (s) =>
    s === 'executed' ? '#10b981' : s === 'branch_true' ? '#10b981' : s === 'branch_false' ? '#f59e0b'
    : s === 'error' || s === 'cycle_aborted' || s === 'max_steps_aborted' ? '#ef4444' : '#9ca3af';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0f1117', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#12151f', borderBottom: '1px solid #2a2d3e' }}>
        <button onClick={() => navigate('/app/workflows')} style={{ background: 'none', border: '1px solid #2a2d3e', borderRadius: 7, color: '#9ca3af', padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
          ← 返回列表
        </button>
        <input value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
          placeholder="工作流名稱 *"
          style={{ ...INP, width: 260, fontWeight: 600, fontSize: 14 }} />
        <select value={meta.category} onChange={e => setMeta(m => ({ ...m, category: e.target.value }))}
          style={{ ...INP, width: 110, cursor: 'pointer' }}>
          {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
          placeholder="描述（選填）"
          style={{ ...INP, flex: 1 }} />
        <button onClick={handleRun} disabled={running || !savedId} title={!savedId ? '先儲存才能執行' : ''} style={{
          padding: '7px 16px', borderRadius: 7, cursor: savedId ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, border: 'none',
          background: running ? '#2a2d3e' : 'rgba(16,185,129,0.15)', color: running ? '#6b7280' : '#34d399',
          border: '1px solid rgba(16,185,129,0.4)',
        }}>
          {running ? '⏳ 執行中…' : '▶ 測試執行'}
        </button>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '7px 20px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none',
          background: saving ? '#2a2d3e' : 'linear-gradient(90deg,#3b82f6,#8b5cf6)', color: saving ? '#6b7280' : '#fff',
        }}>
          {saving ? '儲存中…' : '💾 儲存'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Node palette */}
        <div style={{ width: 200, flexShrink: 0, background: '#12151f', borderRight: '1px solid #2a2d3e', overflowY: 'auto', padding: '12px 10px' }}>
          {NODE_CATEGORIES.map(cat => (
            <div key={cat.key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.08em', marginBottom: 6, padding: '0 4px' }}>
                {cat.icon} {cat.label}
              </div>
              {Object.entries(NODE_REGISTRY).filter(([, m]) => m.category === cat.key).map(([type, m]) => (
                <div key={type} draggable
                  onDragStart={e => { e.dataTransfer.setData('application/reactflow', type); e.dataTransfer.effectAllowed = 'move'; }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4,
                    background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, cursor: 'grab',
                    fontSize: 12, color: '#e5e7eb',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = m.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2d3e')}
                >
                  <span>{m.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                  <span style={{ fontSize: 9, color: '#4b5563' }}>⠿</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#4b5563', padding: '0 4px', lineHeight: 1.6 }}>
            把節點拖到右邊畫布，<br />從節點右側圓點拉線連接
          </div>
        </div>

        {/* Canvas */}
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              載入中…
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              colorMode="dark"
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              onSelectionChange={({ nodes: sel }) => setSelectedId(sel?.[0]?.id || null)}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ animated: true, style: { stroke: '#4b5563' } }}
            >
              <Background color="#2a2d3e" gap={20} />
              <Controls style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }} />
              <MiniMap style={{ background: '#12151f' }} nodeColor={n => nodeMeta(n.type).color} maskColor="rgba(15,17,23,0.7)" />
            </ReactFlow>
          )}

          {/* 執行追蹤面板 */}
          {runTrace && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, width: 380, maxHeight: 280, overflowY: 'auto',
              background: '#12151fee', border: '1px solid #2a2d3e', borderRadius: 12, padding: 14, backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f9fafb' }}>
                  🧪 模擬執行追蹤（{runTrace.results?.length || 0} 步驟）
                </span>
                <button onClick={() => setRunTrace(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
              {(runTrace.results || []).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid #1e2035' : 'none', fontSize: 11 }}>
                  <span style={{ color: statusColor(step.status), flexShrink: 0 }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#e5e7eb', fontWeight: 500 }}>
                      {nodeMeta(step.nodeType).icon} {step.label || nodeMeta(step.nodeType).label}
                    </span>
                    {(step.status === 'branch_true' || step.status === 'branch_false') && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: statusColor(step.status) }}>
                        → {step.status === 'branch_true' ? '✓ 分支' : '✗ 分支'}
                      </span>
                    )}
                    <div style={{ color: '#6b7280', marginTop: 1 }}>{step.detail?.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config panel */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            tools={tools}
            onChange={updateSelectedData}
            onDelete={deleteSelected}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 64, right: 20, zIndex: 1200, maxWidth: 380,
          background: '#1a1d2e', borderRadius: 10, padding: '11px 16px', fontSize: 13,
          border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          color: toast.type === 'error' ? '#f87171' : '#e5e7eb',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  );
}
