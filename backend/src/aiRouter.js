// AI Router: GLM (z.ai Anthropic-format) → Claude → Mock
// GLM uses Anthropic protocol via https://open.bigmodel.cn/api/anthropic/v1

// ── Circuit Breaker (in-memory, per provider) ──────────────────────────────
const CIRCUIT = {};
const CB_THRESHOLD = 5;
const CB_RESET_MS  = 30000;

function cbOpen(provider) {
  const s = CIRCUIT[provider];
  return s && s.openUntil > Date.now();
}

function cbRecord(provider, success) {
  if (!CIRCUIT[provider]) CIRCUIT[provider] = { fails: 0, openUntil: 0 };
  if (success) {
    CIRCUIT[provider].fails = 0;
    CIRCUIT[provider].openUntil = 0;
  } else {
    CIRCUIT[provider].fails += 1;
    if (CIRCUIT[provider].fails >= CB_THRESHOLD) {
      CIRCUIT[provider].openUntil = Date.now() + CB_RESET_MS;
      console.warn(`[aiRouter] Circuit OPEN for ${provider} (${CB_RESET_MS / 1000}s)`);
    }
  }
}

async function withRetry(fn, provider, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    if (cbOpen(provider)) return null;
    try {
      const result = await fn();
      if (result) { cbRecord(provider, true); return result; }
      cbRecord(provider, false);
      return null;
    } catch (err) {
      cbRecord(provider, false);
      if (i < attempts - 1) {
        const delay = (2 ** i) * 1000 + Math.random() * 200;
        console.warn(`[aiRouter] ${provider} attempt ${i + 1} failed, retry in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return null;
}

const MOCK_RESPONSES_ZH = {
  article: `（模擬結果 — AI 服務暫時無法連線，以下為範例輸出）

# AI 行銷自動化：2026 實戰指南

**情境（Situation）：** 行銷團隊如今要管理的渠道數量是三年前的 5 倍。

**衝突（Conflict）：** 渠道越多，雜訊越多——沒有智能調度，流量不會自動變成營收。

**疑問（Question）：** 頂尖團隊是怎麼穿越這片複雜度的？

**答案（Answer）：** 從每一次互動中學習的 AI 原生自動化。

關鍵戰術：
1. 預測式名單評分取代靜態規則
2. 內容隨買家階段自動調整
3. 流失模型提前 14 天觸發挽留動作
4. 多觸點歸因淘汰虛榮指標`,

  social: `（模擬結果 — AI 服務暫時無法連線，以下為範例輸出）

🚀 你的競爭對手已經在用 AI 搶你的客戶了。

當他們在規模化做個人化行銷時，多數團隊還在複製貼上模板。

AI 驅動的成長實際長這樣：
✅ 同樣的廣告預算，3 倍的商機
✅ 流失徵兆提前 2 週被偵測
✅ 內容會轉化，因為它建立在真實數據上

#AI行銷 #GrowthOS #B2BSaaS #行銷自動化`,

  ad: `（模擬結果 — AI 服務暫時無法連線，以下為範例輸出）

**別再讓營收從指縫溜走**

→ 注意（Attention）：68% 的行銷預算浪費在錯誤的受眾上。
→ 興趣（Interest）：AI GrowthOS 自動分析每一個訊號。
→ 慾望（Desire）：客戶在 90 天內平均提升 40% 轉化率。
→ 行動（Action）：立即免費試用，無需信用卡。

[免費試用 AI GrowthOS →]`,

  campaign: `（模擬結果 — AI 服務暫時無法連線，以下為範例輸出）

## 活動企劃：「解鎖 Q3」成長計畫

**工具（Tool）：** AI GrowthOS 全功能試用
**場景（Implementation）：** LinkedIn 開發信 + 內容 SEO + 夥伴聯合行銷
**包裝（Packaging）：** 「Q3 成長健檢」— 免費 30 分鐘 AI 漏斗分析

時間線：W1-2 內容上線 → W3-4 開發信 → W5-6 線上講座 → W7-8 轉化衝刺
預算：$8,000｜目標：200 MQL｜CAC 目標：<$200`,

  default: `（模擬結果 — AI 服務暫時無法連線，以下為範例輸出）

根據分析，我的策略建議如下：

關鍵洞察：多數失敗源自「訊息、受眾、時機」三者錯位，AI 驅動的系統能同時解決這三個問題。

建議：從價值最高的客群開始，為每個觸點埋設追蹤，讓數據引導優化。

下一步：定義 ICP → 漏斗埋點 → 部署自動觸發 → 每週覆盤。`,
};

const MOCK_RESPONSES = {
  article: `# AI Marketing Automation: The 2026 Playbook

**Situation:** Marketing teams today manage 5x more channels than three years ago.

**Conflict:** More channels mean more noise, not more revenue—without intelligent orchestration.

**Question:** How do top-performing teams cut through the complexity?

**Answer:** AI-native automation that learns from every interaction.

Key tactics:
1. Predictive lead scoring replaces static rules
2. Dynamic content adapts to buyer stage automatically
3. Churn models trigger intervention 14 days before cancellation
4. Multi-touch attribution kills vanity metrics`,

  social: `🚀 Your competitors are already using AI to out-market you.

While they personalize at scale, most teams are still copying templates.

Here's what AI-powered growth looks like in practice:
✅ 3x more pipeline from the same ad spend
✅ Churn detected 2 weeks early—every time
✅ Content that converts because it's built on real data

#AIMarketing #GrowthOS #B2BSaaS #MarketingAutomation`,

  ad: `**Stop Leaving Revenue on the Table**

→ Attention: 68% of marketing budgets are wasted on the wrong audience.
→ Interest: AI GrowthOS analyzes every signal automatically.
→ Desire: Our customers see 40% higher conversion rates within 90 days.
→ Action: Start your free trial today. No credit card required.

[Try AI GrowthOS Free →]`,

  campaign: `## Campaign: "Unlock Q3" Growth Initiative

**Tool (工具):** AI GrowthOS trial with full feature access
**Implementation (場景):** LinkedIn outbound + content SEO + partner co-marketing
**Packaging (包裝):** "Q3 Growth Audit" — free 30-min AI analysis of their current funnel

Timeline: W1-2 Content launch → W3-4 Outbound → W5-6 Webinar → W7-8 Conversion push
Budget: $8,000 | Target: 200 MQLs | CAC target: <$200`,

  default: `Based on my analysis, here's my strategic recommendation:

The key insight is that most failures stem from misalignment between message, audience, and timing. AI-driven systems solve all three simultaneously.

My recommendation: Start with your highest-value customer segment, instrument every touchpoint, and let the data guide optimization.

Next steps: Define your ICP → instrument your funnel → deploy automated triggers → measure weekly.`,
};

// GLM model name mapping for z.ai plan
const GLM_MODELS = {
  'glm-4.5-air': 'glm-4.5-air',
  'glm-4.5':     'glm-4.5',
  'glm-4.6':     'glm-4.6',
  'glm-4.7':     'glm-4.7',
  'glm-5':       'glm-5',
  'glm-5-turbo': 'glm-5-turbo',
  'glm-5.1':     'glm-5.1',
  // Legacy aliases
  'glm-4-air':   'glm-4.5-air',
  'glm-4':       'glm-4.5',
  'glm-4-flash': 'glm-4.5-air',
};

// Claude model aliases
const CLAUDE_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-8',
  'claude-haiku-20240307',
]);

const MINIMAX_MODELS = new Set([
  'MiniMax-M3',
  'MiniMax-M2.7',
  'MiniMax-M2.7-highspeed',
  'MiniMax-M2.5',
  'MiniMax-M2.5-highspeed',
  'MiniMax-M2.1',
  'MiniMax-M2.1-highspeed',
  'MiniMax-M2',
]);

const OPENROUTER_MODELS = new Set([
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'poolside/laguna-m.1:free',
]);

const OLLAMA_MODELS = new Set([
  'ollama/llama3.2',
  'ollama/qwen2.5:7b',
  'ollama/gemma3:4b',
  'ollama/mistral',
]);

const OPENAI_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1-mini',
  'o3-mini',
]);

const GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash-preview-04-17',
]);

// NVIDIA NIM (OpenAI-compatible endpoint)
const NVIDIA_MODELS = new Set([
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-405b-instruct',
  'deepseek-ai/deepseek-r1',
  'mistralai/mistral-7b-instruct-v0.3',
]);

// Volcano Engine ARK (Doubao via OpenAI-compatible endpoint)
const VOLCANO_MODELS = new Set([
  'doubao-pro-32k',
  'doubao-lite-32k',
  'doubao-pro-4k',
  'doubao-lite-4k',
  'doubao-1.5-pro-32k',
  'doubao-1.5-lite-32k',
]);

// Alibaba Cloud Model Studio (Qwen via OpenAI-compatible endpoint)
const ALIBABA_MODELS = new Set([
  'qwen-turbo',
  'qwen-turbo-latest',
  'qwen-plus',
  'qwen-plus-latest',
  'qwen-max',
  'qwen-max-latest',
  'qwen2.5-72b-instruct',
  'qwen2.5-32b-instruct',
  'qwen2.5-14b-instruct',
  'qwen2.5-7b-instruct',
  'qwen3-235b-a22b',
  'qwen3-30b-a3b',
]);

// 預設 fallback 優先順序：主模型失敗時依序嘗試
const FALLBACK_CHAIN = [
  { model: 'glm-5-turbo',                                  provider: 'glm'     },
  { model: 'doubao-lite-32k',                              provider: 'volcano' },
  { model: 'doubao-pro-32k',                               provider: 'volcano' },
  { model: 'nvidia/llama-3.3-nemotron-super-49b-v1',       provider: 'nvidia'  },
  { model: 'nvidia/llama-3.1-nemotron-70b-instruct',       provider: 'nvidia'  },
  { model: 'qwen-turbo',                           provider: 'alibaba'    },
  { model: 'qwen-plus',                            provider: 'alibaba'    },
  { model: 'gpt-4o-mini',                          provider: 'openai'     },
  { model: 'gemini-2.0-flash',                     provider: 'gemini'     },
  { model: 'MiniMax-M3',                           provider: 'minimax'    },
  { model: 'MiniMax-M2.7-highspeed',               provider: 'minimax'    },
  { model: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter' },
  { model: 'claude-sonnet-4-6',                    provider: 'claude'     },
  { model: 'ollama/llama3.2',                      provider: 'ollama'     },
];

function buildUserContent(prompt, images = []) {
  if (!images || images.length === 0) return prompt;
  // Build multi-modal content array (Anthropic format)
  const content = [];
  for (const img of images) {
    if (img.base64 && img.mimeType) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
      });
    }
  }
  content.push({ type: 'text', text: prompt });
  return content;
}

async function callGLM(prompt, systemPrompt, model, maxTokens, temperature, images = []) {
  const apiKey = process.env.GLM_API_KEY;
  const baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic/v1';

  if (!apiKey) return null;

  const glmModel = GLM_MODELS[model] || (model.startsWith('glm-') ? model : 'glm-4.6');

  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: glmModel,
      max_tokens: maxTokens,
      system: systemPrompt || 'You are a helpful AI assistant.',
      messages: [{ role: 'user', content: buildUserContent(prompt, images) }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok) {
    console.warn('[aiRouter] GLM error:', data.error?.message || response.status);
    return null;
  }

  const content = data.content?.[0]?.text || '';
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { content, model: glmModel, tokensUsed, source: 'glm' };
}

async function callClaude(prompt, systemPrompt, model, maxTokens, images = []) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey === 'your_claude_key_here') return null;

  const claudeModel = CLAUDE_MODELS.has(model) ? model : 'claude-haiku-4-5-20251001';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      max_tokens: maxTokens,
      system: systemPrompt || 'You are a helpful AI assistant.',
      messages: [{ role: 'user', content: buildUserContent(prompt, images) }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok) {
    console.warn('[aiRouter] Claude error:', data.error?.message || response.status);
    return null;
  }

  const content = data.content?.[0]?.text || '';
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { content, model: claudeModel, tokensUsed, source: 'claude' };
}

async function callMiniMax(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'MiniMax-Text-01',
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok || data.base_resp?.status_code !== 0) {
    console.warn('[aiRouter] MiniMax error:', data.base_resp?.status_msg || response.status);
    return null;
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;
  return { content, model, tokensUsed, source: 'minimax' };
}

async function callOpenRouter(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok) {
    console.warn('[aiRouter] OpenRouter error:', data.error?.message || response.status);
    return null;
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
  return { content, model, tokensUsed, source: 'openrouter' };
}

async function callOllama(prompt, systemPrompt, model, maxTokens, temperature) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = model.replace('ollama/', '');

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[aiRouter] Ollama error:', data.error?.message || response.status);
      return null;
    }

    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    return { content, model: ollamaModel, tokensUsed, source: 'ollama' };
  } catch (e) {
    console.warn('[aiRouter] Ollama not reachable:', e.message);
    return null;
  }
}

async function callOpenAI(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const oaiModel = OPENAI_MODELS.has(model) ? model : 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: oaiModel,
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok) {
    console.warn('[aiRouter] OpenAI error:', data.error?.message || response.status);
    return null;
  }

  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
  return { content, model: oaiModel, tokensUsed, source: 'openai' };
}

async function callGemini(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const geminiModel = GEMINI_MODELS.has(model) ? model : 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();
  if (!response.ok) {
    console.warn('[aiRouter] Gemini error:', data.error?.message || response.status);
    return null;
  }

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokensUsed = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);
  return { content, model: geminiModel, tokensUsed, source: 'gemini' };
}

// Alibaba Cloud Model Studio — OpenAI-compatible endpoint
async function callAlibaba(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.ALIBABA_API_KEY;
  const baseUrl = process.env.ALIBABA_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  if (!apiKey) return null;

  const aliModel = ALIBABA_MODELS.has(model) ? model : 'qwen-turbo';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aliModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[aiRouter] Alibaba error:', data.error?.message || response.status);
      return null;
    }

    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    return { content, model: aliModel, tokensUsed, source: 'alibaba' };
  } catch (e) {
    console.warn('[aiRouter] Alibaba failed:', e.message);
    return null;
  }
}

// NVIDIA NIM — OpenAI-compatible endpoint
async function callNVIDIA(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = 'https://integrate.api.nvidia.com/v1';
  if (!apiKey) return null;

  const nvidiaModel = NVIDIA_MODELS.has(model) ? model : 'nvidia/llama-3.3-nemotron-super-49b-v1';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: nvidiaModel,
        max_tokens: maxTokens,
        temperature,
        stream: false,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[aiRouter] NVIDIA error:', data.detail || data.error?.message || response.status);
      return null;
    }

    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    return { content, model: nvidiaModel, tokensUsed, source: 'nvidia' };
  } catch (e) {
    console.warn('[aiRouter] NVIDIA failed:', e.message);
    return null;
  }
}

// Volcano Engine ARK — OpenAI-compatible endpoint
async function callVolcano(prompt, systemPrompt, model, maxTokens, temperature) {
  const apiKey = process.env.VOLCANO_API_KEY;
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  if (!apiKey) return null;

  const volcanoModel = VOLCANO_MODELS.has(model) ? model : 'doubao-lite-32k';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: volcanoModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('[aiRouter] Volcano error:', data.error?.message || response.status);
      return null;
    }

    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    return { content, model: volcanoModel, tokensUsed, source: 'volcano' };
  } catch (e) {
    console.warn('[aiRouter] Volcano failed:', e.message);
    return null;
  }
}

function getProvider(model) {
  if (model.startsWith('ollama/') || OLLAMA_MODELS.has(model)) return 'ollama';
  if (CLAUDE_MODELS.has(model) || model.startsWith('claude-'))  return 'claude';
  if (MINIMAX_MODELS.has(model) || model.startsWith('MiniMax-')) return 'minimax';
  if (OPENAI_MODELS.has(model) || model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (GEMINI_MODELS.has(model) || model.startsWith('gemini-')) return 'gemini';
  if (ALIBABA_MODELS.has(model) || model.startsWith('qwen')) return 'alibaba';
  if (VOLCANO_MODELS.has(model) || model.startsWith('doubao-')) return 'volcano';
  if (NVIDIA_MODELS.has(model))                                  return 'nvidia';
  if (OPENROUTER_MODELS.has(model) || model.includes('/'))       return 'openrouter';
  return 'glm';
}

async function dispatchModel(prompt, systemPrompt, model, maxTokens, temperature, images, provider) {
  const p = provider || getProvider(model);
  switch (p) {
    case 'glm':        return callGLM(prompt, systemPrompt, model, maxTokens, temperature, images);
    case 'minimax':    return callMiniMax(prompt, systemPrompt, model, maxTokens, temperature);
    case 'openrouter': return callOpenRouter(prompt, systemPrompt, model, maxTokens, temperature);
    case 'claude':     return callClaude(prompt, systemPrompt, model, maxTokens, images);
    case 'ollama':     return callOllama(prompt, systemPrompt, model, maxTokens, temperature);
    case 'openai':     return callOpenAI(prompt, systemPrompt, model, maxTokens, temperature);
    case 'gemini':     return callGemini(prompt, systemPrompt, model, maxTokens, temperature);
    case 'alibaba':    return callAlibaba(prompt, systemPrompt, model, maxTokens, temperature);
    case 'volcano':    return callVolcano(prompt, systemPrompt, model, maxTokens, temperature);
    case 'nvidia':     return callNVIDIA(prompt, systemPrompt, model, maxTokens, temperature);
    default:           return null;
  }
}

async function callAI(prompt, systemPrompt, options = {}) {
  const selectedModel = options.model || 'glm-5-turbo';
  const maxTokens = options.maxTokens || 1000;
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const images = options.images || [];

  // Try selected model first (with circuit breaker + retry)
  const primaryProvider = getProvider(selectedModel);
  const primary = await withRetry(
    () => dispatchModel(prompt, systemPrompt, selectedModel, maxTokens, temperature, images),
    primaryProvider
  );
  if (primary) return primary;

  // Walk fallback chain with circuit breaker
  for (const { model, provider } of FALLBACK_CHAIN) {
    if (model === selectedModel) continue;
    if (cbOpen(provider)) {
      console.log(`[aiRouter] Skipping ${provider} (circuit open)`);
      continue;
    }
    const result = await withRetry(
      () => dispatchModel(prompt, systemPrompt, model, maxTokens, temperature, images, provider),
      provider,
      1 // single attempt per fallback step
    );
    if (result) {
      console.log(`[aiRouter] Fallback succeeded with: ${model}`);
      return result;
    }
  }

  // Mock fallback
  let mockKey = 'default';
  const lowerContext = (prompt + ' ' + (systemPrompt || '')).toLowerCase();
  if (lowerContext.includes('article') || lowerContext.includes('文章') || lowerContext.includes('blog')) mockKey = 'article';
  else if (lowerContext.includes('social') || lowerContext.includes('社群') || lowerContext.includes('post')) mockKey = 'social';
  else if (lowerContext.includes('ad') || lowerContext.includes('廣告') || lowerContext.includes('aida')) mockKey = 'ad';
  else if (lowerContext.includes('campaign') || lowerContext.includes('活動') || lowerContext.includes('tip')) mockKey = 'campaign';

  // 語言選擇：options.language 優先，否則看 prompt 是否含 CJK 字元
  const wantsChinese = options.language
    ? options.language.startsWith('zh')
    : /[一-鿿]/.test(prompt);
  const mockSet = wantsChinese ? MOCK_RESPONSES_ZH : MOCK_RESPONSES;

  console.log('[aiRouter] All providers failed, using mock. key:', mockKey, 'lang:', wantsChinese ? 'zh' : 'en');
  return { content: mockSet[mockKey], model: 'mock', tokensUsed: 0, source: 'mock' };
}

function getCircuitStatus() {
  const now = Date.now();
  return Object.entries(CIRCUIT).map(([provider, s]) => ({
    provider,
    failures: s.fails,
    state: s.openUntil > now ? 'open' : s.fails > 0 ? 'degraded' : 'closed',
    reopensIn: s.openUntil > now ? Math.ceil((s.openUntil - now) / 1000) : 0,
  }));
}

module.exports = { callAI, getCircuitStatus };
