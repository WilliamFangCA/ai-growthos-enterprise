import React, { createContext, useContext, useState, useEffect } from 'react';

const AVAILABLE_MODELS = [
  {
    id: 'glm-4.5-air',
    label: 'GLM-4.5 Air',
    provider: 'GLM',
    badge: '推薦',
    description: '快速、低成本，適合日常任務',
  },
  {
    id: 'glm-4.5',
    label: 'GLM-4.5',
    provider: 'GLM',
    description: '均衡能力，適合複雜分析',
  },
  {
    id: 'glm-5',
    label: 'GLM-5',
    provider: 'GLM',
    badge: '最強',
    description: '最高智能，適合策略決策',
  },
  {
    id: 'glm-5-turbo',
    label: 'GLM-5 Turbo',
    provider: 'GLM',
    description: '高速高智能平衡版',
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
  const [selectedModel, setSelectedModel] = useState('glm-4.5-air');
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
