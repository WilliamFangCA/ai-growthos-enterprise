// AI Router for Cloudflare Workers — same logic as backend/src/aiRouter.js but ESM

const CIRCUIT = {};
const CB_THRESHOLD = 5;
const CB_RESET_MS = 30000;

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
      if (i < attempts - 1) await new Promise(r => setTimeout(r, (2 ** i) * 1000));
    }
  }
  return null;
}

const MOCK = {
  default: 'Based on my analysis, here is my strategic recommendation: Start with your highest-value customer segment, instrument every touchpoint, and let the data guide optimization.',
};

async function callGLM(prompt, systemPrompt, model, maxTokens, env) {
  if (!env.GLM_API_KEY) return null;
  const response = await fetch(`${env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic/v1'}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.GLM_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: model || 'glm-5-turbo', max_tokens: maxTokens, system: systemPrompt || 'You are a helpful AI.', messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) return null;
  return { content: data.content?.[0]?.text || '', model: data.model, tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0), source: 'glm' };
}

export async function callAI(prompt, systemPrompt, options = {}, env = {}) {
  const model = options.model || 'glm-5-turbo';
  const maxTokens = options.maxTokens || 1000;

  const result = await withRetry(() => callGLM(prompt, systemPrompt, model, maxTokens, env), 'glm');
  if (result) return result;

  return { content: MOCK.default, model: 'mock', tokensUsed: 0, source: 'mock' };
}

export function getCircuitStatus() {
  const now = Date.now();
  return Object.entries(CIRCUIT).map(([p, s]) => ({
    provider: p, failures: s.fails,
    state: s.openUntil > now ? 'open' : s.fails > 0 ? 'degraded' : 'closed',
    reopensIn: s.openUntil > now ? Math.ceil((s.openUntil - now) / 1000) : 0,
  }));
}
