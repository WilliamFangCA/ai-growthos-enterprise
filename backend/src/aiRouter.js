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

// 預設 fallback 優先順序：主模型失敗時依序嘗試
const FALLBACK_CHAIN = [
  { model: 'glm-5-turbo',                          provider: 'glm'        },
  { model: 'MiniMax-M3',                            provider: 'minimax'    },
  { model: 'MiniMax-M2.7-highspeed',                provider: 'minimax'    },
  { model: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter' },
  { model: 'claude-sonnet-4-6',                     provider: 'claude'     },
  { model: 'ollama/llama3.2',                       provider: 'ollama'     },
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

function getProvider(model) {
  if (model.startsWith('ollama/') || OLLAMA_MODELS.has(model)) return 'ollama';
  if (CLAUDE_MODELS.has(model) || model.startsWith('claude-'))  return 'claude';
  if (MINIMAX_MODELS.has(model) || model.startsWith('MiniMax-')) return 'minimax';
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

  console.log('[aiRouter] All providers failed, using mock. key:', mockKey);
  return { content: MOCK_RESPONSES[mockKey], model: 'mock', tokensUsed: 0, source: 'mock' };
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
