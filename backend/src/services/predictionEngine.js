// AI 預測引擎（MiroFish 核心原生重寫）
//
// MiroFish（https://github.com/666ghj/MiroFish）是一套「多代理 AI 預測引擎」：
//   抽取種子資料 → 建立帶人格/記憶的代理數位世界 → 模擬互動 → 產出預測報告。
// 原專案為 Python + OASIS/CAMEL-AI + Zep Cloud + GraphRAG。此處以 Node 原生重寫其核心
// 五階段流程，全程走既有 aiRouter.callAI（預設模型 glm-5-turbo），無需任何外部服務。
//
// 流程：runPrediction(id)
//   1. 種子萃取 (seed)      — 由 topic + materials 萃取實體/訊號/驅動因子
//   2. 代理生成 (agents)    — 生成多元利害關係人代理（人格/立場/特質）
//   3. 多代理模擬 (simulate) — 跑 N 輪，注入情境變數，累積時序記憶
//   4. 報告生成 (report)    — ReportAgent 彙整結構化預測報告
// 每階段更新 predictions.stage/status；任何錯誤 → status='error'。背景執行，不阻塞 API。

const { run, get } = require('../db');
const { callAI } = require('../aiRouter');

const DEFAULT_MODEL = 'glm-5-turbo';
const MAX_AGENTS = 12;
const MAX_ROUNDS = 4;

// 預測的多模態輸入（圖片 base64 / 附件清單）暫存於記憶體，由 POST 設定、runPrediction 取用後清除。
// 圖片體積大不入 DB；POST 後 runPrediction 立即執行於同一進程，故記憶體傳遞足夠。
const pendingInputs = new Map();
function setPredictionInputs(id, data) { pendingInputs.set(String(id), data || {}); }

// ── 從 LLM 回應安全萃取 JSON（去除 ```json code fence / 前後雜訊）──────────────
function safeJsonParse(text, fallback) {
  if (!text) return fallback;
  let s = String(text).trim();
  // 去除 markdown code fence
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(s);
  } catch (_) {
    // 退而求其次：抓第一個 { ... } 或 [ ... ] 區塊
    const objMatch = s.match(/\{[\s\S]*\}/);
    const arrMatch = s.match(/\[[\s\S]*\]/);
    const candidate = objMatch && arrMatch
      ? (objMatch.index <= arrMatch.index ? objMatch[0] : arrMatch[0])
      : (objMatch ? objMatch[0] : (arrMatch ? arrMatch[0] : null));
    if (candidate) {
      try { return JSON.parse(candidate); } catch (_) {}
    }
    return fallback;
  }
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

function setStage(id, stage, status) {
  run(
    `UPDATE predictions SET stage = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [stage, status, id]
  );
}

async function runPrediction(id) {
  const rowAtStart = get(`SELECT * FROM predictions WHERE id = ?`, [id]);
  if (!rowAtStart) return;

  const cfg = safeJsonParse(rowAtStart.config_json, {}) || {};
  const model = cfg.model || DEFAULT_MODEL;
  const language = cfg.language || 'zh-TW';
  const agentCount = clampInt(cfg.agentCount, 3, MAX_AGENTS, 8);
  const rounds = clampInt(cfg.rounds, 1, MAX_ROUNDS, 2);
  const variables = Array.isArray(cfg.variables) ? cfg.variables.filter(Boolean) : [];
  const topic = rowAtStart.topic;
  const materials = rowAtStart.materials || '（未提供額外材料，請依主題與常識推理）';

  // 多模態輸入（圖片/附件清單）— 由 POST 暫存於記憶體
  const inputs = pendingInputs.get(String(id)) || {};
  pendingInputs.delete(String(id));
  const images = Array.isArray(inputs.images) ? inputs.images.slice(0, 4) : [];
  const attachments = Array.isArray(inputs.attachments) ? inputs.attachments : [];

  const aiOpts = { model, language, temperature: 0.7 };
  let tokensTotal = 0;
  let modelUsed = model;

  async function ask(prompt, system, maxTokens, imgs) {
    const opts = { ...aiOpts, maxTokens };
    if (imgs && imgs.length) opts.images = imgs;
    const r = await callAI(prompt, system, opts);
    tokensTotal += r.tokensUsed || 0;
    if (r.model) modelUsed = r.model;
    return r.content || '';
  }

  try {
    setStage(id, 'seed', 'running');

    // ── 1. 種子萃取 ────────────────────────────────────────────────────────────
    const seedSystem = '你是 MiroFish 預測引擎的「種子萃取代理」。你的任務是從使用者提供的主題與多模態材料（文字、文件、圖片、影音）中，萃取出可用於建構模擬世界的關鍵資訊。若附有圖片，請判讀圖片內容（如圖表、走勢、數據、場景）並納入訊號。只輸出 JSON，不要任何多餘文字或解釋。';
    const attachNote = attachments.length
      ? `\n\n附加材料清單（${attachments.length} 件）：\n${attachments.map(a => `• [${a.kind}] ${a.name}${a.note ? `（${a.note}）` : ''}`).join('\n')}${images.length ? `\n（已附上 ${images.length} 張圖片，請一併判讀）` : ''}`
      : '';
    const seedPrompt = `主題：${topic}\n\n材料：\n${materials}${attachNote}\n\n請綜合所有文字與圖片，萃取並輸出以下 JSON 結構：\n{\n  "summary": "對情勢的 2-3 句精煉摘要",\n  "entities": ["關鍵利害關係人/實體，5-8 個"],\n  "signals": ["可觀察到的關鍵訊號/事件，4-6 個（含從圖片判讀到的）"],\n  "drivers": ["影響結果的核心驅動因子，3-5 個"]\n}`;
    const seedRaw = await ask(seedPrompt, seedSystem, 900, images);
    const seed = safeJsonParse(seedRaw, {
      summary: `關於「${topic}」的情勢分析。`,
      entities: [], signals: [], drivers: [],
    });

    // ── 2. 代理生成 ────────────────────────────────────────────────────────────
    setStage(id, 'agents', 'running');
    const agentSystem = '你是 MiroFish 預測引擎的「代理生成器」。根據情勢摘要與關鍵實體，創造一組擁有不同立場、動機與特質的虛擬代理（人格），用於後續多代理模擬。只輸出 JSON 陣列，不要多餘文字。';
    const agentPrompt = `情勢摘要：${seed.summary}\n關鍵實體：${(seed.entities || []).join('、')}\n\n請生成 ${agentCount} 個多元代理，立場需涵蓋正向、保守、中立等不同角度。輸出 JSON 陣列：\n[\n  { "id": "a1", "name": "代理姓名", "role": "代表的角色/群體", "stance": "對主題的初始立場(一句話)", "traits": "性格與決策特質(一句話)" }\n]`;
    const agentRaw = await ask(agentPrompt, agentSystem, 1200);
    let agents = safeJsonParse(agentRaw, []);
    if (!Array.isArray(agents) || agents.length === 0) {
      agents = Array.from({ length: agentCount }, (_, i) => ({
        id: `a${i + 1}`, name: `代理 ${i + 1}`, role: '利害關係人',
        stance: '立場待觀察', traits: '理性決策',
      }));
    }
    agents = agents.slice(0, agentCount).map((a, i) => ({
      id: a.id || `a${i + 1}`,
      name: a.name || `代理 ${i + 1}`,
      role: a.role || '利害關係人',
      stance: a.stance || '',
      traits: a.traits || '',
    }));

    // ── 3. 多代理模擬 ──────────────────────────────────────────────────────────
    setStage(id, 'simulate', 'running');
    const roundLogs = [];
    let memory = '（尚無先前互動）';
    const varText = variables.length ? variables.join('、') : '（無額外注入變數）';
    const agentRoster = agents.map(a => `${a.id} ${a.name}（${a.role}，${a.stance}）`).join('；');

    for (let r = 1; r <= rounds; r++) {
      const simSystem = '你是 MiroFish 預測引擎的「模擬主持人」。你掌管一個由多個代理組成的數位世界。給定代理名冊、注入的情境變數與先前記憶，模擬本回合每個代理的行動與情緒變化，並彙整本回合的集體態勢。只輸出 JSON，不要多餘文字。';
      const simPrompt = `主題：${topic}\n代理名冊：${agentRoster}\n注入情境變數：${varText}\n先前記憶（時序）：${memory}\n\n這是第 ${r}/${rounds} 回合。請模擬本回合並輸出 JSON：\n{\n  "agentReactions": [ { "id": "a1", "action": "本回合採取的行動/發言(一句話)", "sentiment": 0.0, "updatedStance": "更新後的立場(一句話)" } ],\n  "roundSummary": "本回合集體態勢的 2-3 句摘要",\n  "aggregateSentiment": 0.0\n}\n說明：sentiment 與 aggregateSentiment 為 -1(極負向) 到 1(極正向) 之間的數值。`;
      const simRaw = await ask(simPrompt, simSystem, 1400);
      const sim = safeJsonParse(simRaw, {
        agentReactions: [], roundSummary: `第 ${r} 回合互動。`, aggregateSentiment: 0,
      });
      const roundLog = {
        round: r,
        agentReactions: Array.isArray(sim.agentReactions) ? sim.agentReactions : [],
        roundSummary: sim.roundSummary || '',
        aggregateSentiment: typeof sim.aggregateSentiment === 'number' ? sim.aggregateSentiment : 0,
      };
      roundLogs.push(roundLog);
      memory = `第 ${r} 回合：${roundLog.roundSummary}（集體情緒 ${roundLog.aggregateSentiment}）`;
    }

    // ── 4. 報告生成（ReportAgent）──────────────────────────────────────────────
    setStage(id, 'report', 'running');
    const reportSystem = '你是 MiroFish 預測引擎的「報告代理 (ReportAgent)」。綜合種子情勢、代理人格與多回合模擬結果，產出一份結構化、可執行的預測報告。語氣專業、結論明確、附信心度。只輸出 JSON，不要多餘文字。';
    const roundsText = roundLogs.map(r => `第${r.round}回合(情緒${r.aggregateSentiment})：${r.roundSummary}`).join('\n');
    const reportPrompt = `主題：${topic}\n情勢摘要：${seed.summary}\n核心驅動：${(seed.drivers || []).join('、')}\n注入變數：${varText}\n模擬結果：\n${roundsText}\n\n請輸出最終預測報告 JSON：\n{\n  "headline": "一句話預測標題",\n  "outlook": "未來展望 2-4 句，包含方向判斷與最大風險",\n  "confidence": 70,\n  "distribution": { "base": 60, "bull": 25, "bear": 15 },\n  "keyDrivers": ["關鍵驅動因子 3-5 個"],\n  "timeline": [ { "when": "時間點", "event": "預期事件" } ],\n  "risks": ["主要風險 2-4 個"],\n  "recommendation": "給決策者的具體建議 1-2 句"${/(指數|加權|股價|點位|大盤|index|stock|price|台股|盤勢|高點|轉折)/i.test(topic) ? `,\n  "indexForecast": {\n    "unit": "點",\n    "series": [ { "date": "YYYY-MM", "level": 數值 } ],\n    "high": { "date": "YYYY-MM", "level": 數值, "note": "預估高點理由" },\n    "turningPoints": [ { "date": "YYYY-MM", "level": 數值, "type": "高點|轉折(回檔)|轉折(反彈)", "note": "轉折理由" } ]\n  }` : ''}\n}\n說明：confidence 為 0-100；distribution 三者(基準/樂觀/悲觀情境)百分比相加約等於 100。${/(指數|加權|股價|點位|大盤|index|stock|price|台股|盤勢|高點|轉折)/i.test(topic) ? '\nindexForecast：請給未來 8-12 個月每月的預估點位 series（合理推估，非保證），標出最高點 high 與 2-3 個關鍵轉折點 turningPoints（含類型與理由）。' : ''}`;
    const reportRaw = await ask(reportPrompt, reportSystem, 1600);
    const report = safeJsonParse(reportRaw, {
      headline: `關於「${topic}」的預測`,
      outlook: seed.summary,
      confidence: 50,
      distribution: { base: 50, bull: 25, bear: 25 },
      keyDrivers: seed.drivers || [],
      timeline: [],
      risks: [],
      recommendation: '建議持續觀察關鍵訊號變化。',
    });
    const confidence = clampInt(report.confidence, 0, 100, 50);

    const result = { seed, agents, rounds: roundLogs, report };

    run(
      `UPDATE predictions
       SET status='done', stage='done', result_json=?, headline=?, confidence=?,
           model_used=?, tokens_used=?, error=NULL, updated_at=datetime('now')
       WHERE id=?`,
      [JSON.stringify(result), report.headline || topic, confidence, modelUsed, tokensTotal, id]
    );
  } catch (err) {
    console.error(`[predictionEngine] prediction ${id} failed:`, err);
    run(
      `UPDATE predictions SET status='error', error=?, model_used=?, tokens_used=?, updated_at=datetime('now') WHERE id=?`,
      [String(err && err.message || err).slice(0, 500), modelUsed, tokensTotal, id]
    );
  }
}

module.exports = { runPrediction, setPredictionInputs };
