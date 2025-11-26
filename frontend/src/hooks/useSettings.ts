import { useState, useEffect } from 'react';
import { DEFAULT_LLM_MODEL, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';

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
  
  // Onboarding state - default to false so banner shows until we confirm it's complete
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const loadKeys = async () => {
    // Try to load from store first
    let groqKey = await tauriAPI.getStoreValue('GROQ_API_KEY');
    let geminiKey = await tauriAPI.getStoreValue('GEMINI_API_KEY');
    let savedProvider = await tauriAPI.getStoreValue('SCRIBE_PROVIDER') || await tauriAPI.getStoreValue('STT_PROVIDER');
    let groqModel = await tauriAPI.getStoreValue('GROQ_MODEL');
    let geminiModel = await tauriAPI.getStoreValue('GEMINI_MODEL');
    let savedLlmEnabled = await tauriAPI.getStoreValue('SCRIBE_LLM_ENABLED');
    let savedLlmApiKey = await tauriAPI.getStoreValue('SCRIBE_LLM_API_KEY');
    let savedLlmModel = await tauriAPI.getStoreValue('SCRIBE_LLM_MODEL');
    let savedSystemPrompt = await tauriAPI.getStoreValue('SCRIBE_DEFAULT_SYSTEM_PROMPT');
    let savedOnboardingComplete = await tauriAPI.getStoreValue('SCRIBE_ONBOARDING_COMPLETE');

    console.log('[useSettings] loadKeys - store values:', {
      groqKey, geminiKey, savedProvider, groqModel, geminiModel,
      savedLlmEnabled, savedLlmApiKey, savedLlmModel, savedSystemPrompt
    });

    // If store is empty, migrate from localStorage
    if (groqKey === null) {
      groqKey = localStorage.getItem('GROQ_API_KEY') || '';
      await tauriAPI.setStoreValue('GROQ_API_KEY', groqKey);
    }
    if (geminiKey === null) {
      geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      await tauriAPI.setStoreValue('GEMINI_API_KEY', geminiKey);
    }
    if (savedProvider === null) {
      savedProvider = localStorage.getItem('SCRIBE_PROVIDER') || localStorage.getItem('STT_PROVIDER') || null;
      if (savedProvider) await tauriAPI.setStoreValue('SCRIBE_PROVIDER', savedProvider);
    }
    if (groqModel === null) {
      groqModel = localStorage.getItem('GROQ_MODEL') || DEFAULT_GROQ_MODEL;
      await tauriAPI.setStoreValue('GROQ_MODEL', groqModel);
    }
    if (geminiModel === null) {
      geminiModel = localStorage.getItem('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
      await tauriAPI.setStoreValue('GEMINI_MODEL', geminiModel);
    }
    if (savedLlmEnabled === null) {
      savedLlmEnabled = localStorage.getItem('SCRIBE_LLM_ENABLED') || 'false';
      await tauriAPI.setStoreValue('SCRIBE_LLM_ENABLED', savedLlmEnabled);
    }
    if (savedLlmApiKey === null) {
      savedLlmApiKey = localStorage.getItem('SCRIBE_LLM_API_KEY') || groqKey || '';
      await tauriAPI.setStoreValue('SCRIBE_LLM_API_KEY', savedLlmApiKey);
    }
    if (savedLlmModel === null) {
      savedLlmModel = localStorage.getItem('SCRIBE_LLM_MODEL') || DEFAULT_LLM_MODEL;
      await tauriAPI.setStoreValue('SCRIBE_LLM_MODEL', savedLlmModel);
    }
    if (savedSystemPrompt === null) {
      savedSystemPrompt = localStorage.getItem('SCRIBE_DEFAULT_SYSTEM_PROMPT') || DEFAULT_SYSTEM_PROMPT;
      await tauriAPI.setStoreValue('SCRIBE_DEFAULT_SYSTEM_PROMPT', savedSystemPrompt);
    }

    setApiKeys({ groq: groqKey || '', gemini: geminiKey || '' });
    setModels({ groq: groqModel || DEFAULT_GROQ_MODEL, gemini: geminiModel || DEFAULT_GEMINI_MODEL });
    if (savedProvider) setProvider(savedProvider as Provider);
    
    setLlmEnabled(savedLlmEnabled === 'true');
    setLlmApiKey(savedLlmApiKey || groqKey || '');
    setLlmModel(savedLlmModel || DEFAULT_LLM_MODEL);
    setDefaultSystemPrompt(savedSystemPrompt || DEFAULT_SYSTEM_PROMPT);
    setOnboardingComplete(savedOnboardingComplete === 'true');
    
    setIsKeyLoaded(true);
  };

  useEffect(() => {
    const init = async () => {
      await loadKeys();

      // Listen for Tauri event (cross-window)
      let unlistenTauri: (() => void) | undefined;
      tauriAPI.onSettingsChanged(async () => {
        console.log('[useSettings] settings-changed event received, reloading keys');
        await loadKeys();
      }).then(unlisten => {
          unlistenTauri = unlisten;
      });

      return () => {
        if (unlistenTauri) unlistenTauri();
      };
    };

    init();
  }, []);

  const saveKey = async (key: string, providerToSave: Provider) => {
    const newKeys = { ...apiKeys, [providerToSave]: key };
    setApiKeys(newKeys);
    
    if (providerToSave === 'groq') {
        await tauriAPI.setStoreValue('GROQ_API_KEY', key);
    } else {
        await tauriAPI.setStoreValue('GEMINI_API_KEY', key);
    }
    await tauriAPI.setStoreValue('SCRIBE_PROVIDER', providerToSave);
    // Remove old key if it exists (migration)
    await tauriAPI.setStoreValue('STT_PROVIDER', '');
    
    tauriAPI.emitSettingsChanged();
  };

  const saveModel = async (model: string, providerToSave: Provider) => {
    const newModels = { ...models, [providerToSave]: model };
    setModels(newModels);

    if (providerToSave === 'groq') {
        await tauriAPI.setStoreValue('GROQ_MODEL', model);
    } else {
        await tauriAPI.setStoreValue('GEMINI_MODEL', model);
    }
    
    tauriAPI.emitSettingsChanged();
  };

  const setProviderAndSave = async (newProvider: Provider) => {
      setProvider(newProvider);
      await tauriAPI.setStoreValue('SCRIBE_PROVIDER', newProvider);
      // Remove old key if it exists (migration)
      await tauriAPI.setStoreValue('STT_PROVIDER', '');
      
      tauriAPI.emitSettingsChanged();
  }

  const saveLlmEnabled = async (enabled: boolean) => {
    console.log('[useSettings] saveLlmEnabled called with:', enabled);
    setLlmEnabled(enabled);
    await tauriAPI.setStoreValue('SCRIBE_LLM_ENABLED', enabled.toString());
    tauriAPI.emitSettingsChanged();
  };

  const saveLlmApiKey = async (key: string) => {
    setLlmApiKey(key);
    await tauriAPI.setStoreValue('SCRIBE_LLM_API_KEY', key);
    tauriAPI.emitSettingsChanged();
  };

  const saveLlmModel = async (model: string) => {
    setLlmModel(model);
    await tauriAPI.setStoreValue('SCRIBE_LLM_MODEL', model);
    tauriAPI.emitSettingsChanged();
  };

  const saveDefaultSystemPrompt = async (prompt: string) => {
    setDefaultSystemPrompt(prompt);
    await tauriAPI.setStoreValue('SCRIBE_DEFAULT_SYSTEM_PROMPT', prompt);
    tauriAPI.emitSettingsChanged();
  };

  const markOnboardingComplete = async () => {
    setOnboardingComplete(true);
    await tauriAPI.setStoreValue('SCRIBE_ONBOARDING_COMPLETE', 'true');
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
    // Onboarding
    onboardingComplete,
    markOnboardingComplete,
  };
};
