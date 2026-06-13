import React, { createContext, useContext, useState, useEffect } from 'react';

const AVAILABLE_MODELS = [
  {
    id: 'glm-5-turbo',
    label: 'GLM-5 Turbo',
    provider: 'GLM',
    badge: '推薦',
    description: '高速高智能，系統預設主模型',
  },
  {
    id: 'glm-5',
    label: 'GLM-5',
    provider: 'GLM',
    badge: '最強',
    description: '最高智能，適合策略決策',
  },
  {
    id: 'glm-4.5',
    label: 'GLM-4.5',
    provider: 'GLM',
    description: '均衡能力，適合複雜分析',
  },
  {
    id: 'glm-4.5-air',
    label: 'GLM-4.5 Air',
    provider: 'GLM',
    badge: '快速',
    description: '輕量快速，適合高頻日常任務',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    provider: 'Claude',
    badge: '快速',
    description: '輕量快速，適合內容生成',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'Claude',
    badge: '強力',
    description: '高質量推理，適合複雜 Agent 任務',
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'Claude',
    badge: '最強',
    description: '最高智能 Claude，適合深度推理任務',
  },
  {
    id: 'MiniMax-M3',
    label: 'MiniMax M3',
    provider: 'MiniMax',
    badge: '最強',
    description: '最新旗艦模型，最高智能',
  },
  {
    id: 'MiniMax-M2.7',
    label: 'MiniMax M2.7',
    provider: 'MiniMax',
    badge: '推薦',
    description: '均衡能力，適合複雜分析任務',
  },
  {
    id: 'MiniMax-M2.7-highspeed',
    label: 'MiniMax M2.7 快速版',
    provider: 'MiniMax',
    badge: '快速',
    description: '高速低延遲，適合日常高頻任務',
  },
  {
    id: 'MiniMax-M2.5',
    label: 'MiniMax M2.5',
    provider: 'MiniMax',
    description: '穩定均衡版，適合內容生成',
  },
  {
    id: 'MiniMax-M2.5-highspeed',
    label: 'MiniMax M2.5 快速版',
    provider: 'MiniMax',
    badge: '快速',
    description: '快速穩定，適合輕量任務',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    label: 'Nemotron 3 Ultra 550B',
    provider: 'OpenRouter',
    badge: '最強',
    description: 'NVIDIA 最大免費模型，550B 參數',
  },
  {
    id: 'openai/gpt-oss-120b:free',
    label: 'GPT OSS 120B',
    provider: 'OpenRouter',
    badge: '強力',
    description: 'OpenAI 開源 120B，高質量生成',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    label: 'Nemotron 3 Super 120B',
    provider: 'OpenRouter',
    badge: '推薦',
    description: 'NVIDIA 均衡免費模型，120B 參數',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'Gemma 4 31B',
    provider: 'OpenRouter',
    badge: '快速',
    description: 'Google 最新 Gemma 4，輕量高效',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    label: 'Gemma 4 26B',
    provider: 'OpenRouter',
    badge: '快速',
    description: 'Google Gemma 4 精簡版，低延遲',
  },
  {
    id: 'poolside/laguna-m.1:free',
    label: 'Laguna M.1',
    provider: 'OpenRouter',
    description: 'Poolside 代碼專精模型，免費',
  },
  // OpenAI
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    badge: '強力',
    description: 'OpenAI 旗艦模型，高質量多模態推理',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    badge: '快速',
    description: '輕量快速，適合高頻內容生成',
  },
  {
    id: 'o3-mini',
    label: 'OpenAI o3-mini',
    provider: 'OpenAI',
    badge: '推理',
    description: '深度推理模型，適合複雜邏輯任務',
  },
  // Gemini
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'Gemini',
    badge: '快速',
    description: 'Google 最新高速模型，低延遲',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'Gemini',
    badge: '強力',
    description: '超長上下文，適合文件分析任務',
  },
  // Qwen / Alibaba
  {
    id: 'qwen-turbo',
    label: 'Qwen Turbo',
    provider: 'Qwen',
    badge: '快速',
    description: '阿里雲高速模型，中文優化',
  },
  {
    id: 'qwen-plus',
    label: 'Qwen Plus',
    provider: 'Qwen',
    badge: '推薦',
    description: '均衡能力，適合商業內容生成',
  },
  {
    id: 'qwen-max',
    label: 'Qwen Max',
    provider: 'Qwen',
    badge: '最強',
    description: '阿里雲最強模型，頂級中文理解',
  },
  {
    id: 'qwen3-235b-a22b',
    label: 'Qwen3 235B',
    provider: 'Qwen',
    badge: '最強',
    description: 'Qwen3 旗艦 MoE，頂級推理能力',
  },
  // NVIDIA NIM
  {
    id: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    label: 'Nemotron Super 49B',
    provider: 'NVIDIA',
    badge: '推薦',
    description: 'NVIDIA 最佳推理效率模型',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    label: 'Nemotron 70B',
    provider: 'NVIDIA',
    badge: '強力',
    description: 'NVIDIA 70B 指令調優模型',
  },
  {
    id: 'meta/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B',
    provider: 'NVIDIA',
    badge: '快速',
    description: 'Meta Llama 3.3，NVIDIA 加速部署',
  },
  // Doubao / Volcano Engine
  {
    id: 'doubao-1.5-pro-32k',
    label: 'Doubao 1.5 Pro',
    provider: 'Doubao',
    badge: '推薦',
    description: '字節跳動旗艦模型，中文專精',
  },
  {
    id: 'doubao-lite-32k',
    label: 'Doubao Lite',
    provider: 'Doubao',
    badge: '快速',
    description: '輕量高速，適合日常中文任務',
  },
  {
    id: 'ollama/llama3.2',
    label: 'Llama 3.2',
    provider: 'Ollama',
    badge: '本地',
    description: 'Meta Llama 3.2，本地離線運行',
  },
  {
    id: 'ollama/qwen2.5:7b',
    label: 'Qwen 2.5 7B',
    provider: 'Ollama',
    badge: '本地',
    description: 'Qwen 2.5 7B，本地中文優化',
  },
  {
    id: 'ollama/gemma3:4b',
    label: 'Gemma 3 4B',
    provider: 'Ollama',
    badge: '本地',
    description: 'Google Gemma 3 4B，輕量本地',
  },
  {
    id: 'ollama/mistral',
    label: 'Mistral 7B',
    provider: 'Ollama',
    badge: '本地',
    description: 'Mistral 7B，本地快速推理',
  },
];

const DEFAULT_SYSTEM_PROMPT = `你是一個專業的 AI 助理，擅長商業策略、行銷自動化和產品開發。
請給出具體可執行的建議，避免模糊的通用回答。
回答使用繁體中文，除非用戶用英文提問。`;

const STORAGE_KEY = 'growthos_model_settings';

const ModelSettingsContext = createContext(null);

export function ModelSettingsProvider({ children }) {
  const [selectedModel, setSelectedModel] = useState('glm-5-turbo');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.selectedModel) setSelectedModel(saved.selectedModel);
      if (saved.systemPrompt) setSystemPrompt(saved.systemPrompt);
      if (saved.temperature !== undefined) setTemperature(saved.temperature);
    } catch {}
  }, []);

  function saveSettings(settings) {
    const next = { selectedModel, systemPrompt, temperature, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (settings.selectedModel !== undefined) setSelectedModel(settings.selectedModel);
    if (settings.systemPrompt !== undefined) setSystemPrompt(settings.systemPrompt);
    if (settings.temperature !== undefined) setTemperature(settings.temperature);
  }

  return (
    <ModelSettingsContext.Provider
      value={{ selectedModel, systemPrompt, temperature, saveSettings, AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT }}
    >
      {children}
    </ModelSettingsContext.Provider>
  );
}

export function useModelSettings() {
  return useContext(ModelSettingsContext);
}

export { AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT };
