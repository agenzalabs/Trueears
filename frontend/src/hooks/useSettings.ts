import { useState, useEffect } from 'react';
import { DEFAULT_LLM_MODEL, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';

export type Provider = 'groq' | 'gemini';

export const DEFAULT_GROQ_MODEL = 'whisper-large-v3-turbo';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const GROQ_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
  'distil-whisper-large-v3-en'
];

export const GEMINI_MODELS = [
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export const LLM_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

export const useSettings = () => {
  const [apiKeys, setApiKeys] = useState({ groq: '', gemini: '' });
  const [models, setModels] = useState({ groq: DEFAULT_GROQ_MODEL, gemini: DEFAULT_GEMINI_MODEL });
  const [provider, setProvider] = useState<Provider>('groq');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  
  // LLM post-processing settings
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState(DEFAULT_LLM_MODEL);
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  useEffect(() => {
    const loadKeys = () => {
      const groqKey = localStorage.getItem('GROQ_API_KEY') || '';
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      // Check for new key first, fallback to old key for backward compatibility
      const savedProvider = (localStorage.getItem('SCRIBE_PROVIDER') || localStorage.getItem('STT_PROVIDER')) as Provider | null;
      
      const groqModel = localStorage.getItem('GROQ_MODEL') || DEFAULT_GROQ_MODEL;
      const geminiModel = localStorage.getItem('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;

      setApiKeys({ groq: groqKey, gemini: geminiKey });
      setModels({ groq: groqModel, gemini: geminiModel });
      if (savedProvider) setProvider(savedProvider);
      
      // Load LLM settings
      const savedLlmEnabled = localStorage.getItem('SCRIBE_LLM_ENABLED') === 'true';
      const savedLlmApiKey = localStorage.getItem('SCRIBE_LLM_API_KEY') || groqKey; // Default to groq key
      const savedLlmModel = localStorage.getItem('SCRIBE_LLM_MODEL') || DEFAULT_LLM_MODEL;
      const savedSystemPrompt = localStorage.getItem('SCRIBE_DEFAULT_SYSTEM_PROMPT') || DEFAULT_SYSTEM_PROMPT;
      
      setLlmEnabled(savedLlmEnabled);
      setLlmApiKey(savedLlmApiKey);
      setLlmModel(savedLlmModel);
      setDefaultSystemPrompt(savedSystemPrompt);
      
      setIsKeyLoaded(true);
    };
    loadKeys();
  }, []);

  const saveKey = (key: string, providerToSave: Provider) => {
    const newKeys = { ...apiKeys, [providerToSave]: key };
    setApiKeys(newKeys);
    
    if (providerToSave === 'groq') {
        localStorage.setItem('GROQ_API_KEY', key);
    } else {
        localStorage.setItem('GEMINI_API_KEY', key);
    }
    localStorage.setItem('SCRIBE_PROVIDER', providerToSave);
    // Remove old key if it exists (migration)
    localStorage.removeItem('STT_PROVIDER');
  };

  const saveModel = (model: string, providerToSave: Provider) => {
    const newModels = { ...models, [providerToSave]: model };
    setModels(newModels);

    if (providerToSave === 'groq') {
        localStorage.setItem('GROQ_MODEL', model);
    } else {
        localStorage.setItem('GEMINI_MODEL', model);
    }
  };

  const setProviderAndSave = (newProvider: Provider) => {
      setProvider(newProvider);
      localStorage.setItem('SCRIBE_PROVIDER', newProvider);
      // Remove old key if it exists (migration)
      localStorage.removeItem('STT_PROVIDER');
  }

  const saveLlmEnabled = (enabled: boolean) => {
    setLlmEnabled(enabled);
    localStorage.setItem('SCRIBE_LLM_ENABLED', enabled.toString());
  };

  const saveLlmApiKey = (key: string) => {
    setLlmApiKey(key);
    localStorage.setItem('SCRIBE_LLM_API_KEY', key);
  };

  const saveLlmModel = (model: string) => {
    setLlmModel(model);
    localStorage.setItem('SCRIBE_LLM_MODEL', model);
  };

  const saveDefaultSystemPrompt = (prompt: string) => {
    setDefaultSystemPrompt(prompt);
    localStorage.setItem('SCRIBE_DEFAULT_SYSTEM_PROMPT', prompt);
  };

  return {
    apiKeys,
    models,
    provider,
    setProvider: setProviderAndSave,
    isKeyLoaded,
    saveKey,
    saveModel,
    // LLM settings
    llmEnabled,
    llmApiKey,
    llmModel,
    defaultSystemPrompt,
    saveLlmEnabled,
    saveLlmApiKey,
    saveLlmModel,
    saveDefaultSystemPrompt,
  };
};
