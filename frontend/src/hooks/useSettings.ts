import { useState, useEffect } from 'react';
import { DEFAULT_LLM_MODEL, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';
import { debug } from '../utils/debug';

export const DEFAULT_GROQ_MODEL = 'whisper-large-v3-turbo';

export const GROQ_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
  'distil-whisper-large-v3-en'
];

export const LLM_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

export const useSettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GROQ_MODEL);
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  
  // LLM post-processing settings
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState(DEFAULT_LLM_MODEL);
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  
  // Language settings
  const [language, setLanguage] = useState<string>('en');
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(false);
  
  // Onboarding state - default to false so banner shows until we confirm it's complete
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  // Theme state - default to 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Recording mode state - 'auto' | 'toggle' | 'push-to-talk'
  const [recordingMode, setRecordingMode] = useState<'auto' | 'toggle' | 'push-to-talk'>('auto');

  const loadKeys = async () => {
    // Try to load from store first
    let groqKey = await tauriAPI.getStoreValue('GROQ_API_KEY');
    let groqModel = await tauriAPI.getStoreValue('GROQ_MODEL');
    let savedLlmEnabled = await tauriAPI.getStoreValue('Trueears_LLM_ENABLED');
    let savedLlmApiKey = await tauriAPI.getStoreValue('Trueears_LLM_API_KEY');
    let savedLlmModel = await tauriAPI.getStoreValue('Trueears_LLM_MODEL');
    let savedSystemPrompt = await tauriAPI.getStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT');
    const savedOnboardingComplete = await tauriAPI.getStoreValue('Trueears_ONBOARDING_COMPLETE');
    const savedTheme = await tauriAPI.getStoreValue('Trueears_THEME');

    debug.log('[useSettings] loadKeys - store values:', {
      groqKey, groqModel,
      savedLlmEnabled, savedLlmApiKey, savedLlmModel, savedSystemPrompt
    });

    // If store is empty, migrate from localStorage
    if (groqKey === null) {
      // groqKey = localStorage.getItem('GROQ_API_KEY') || '';
      // await tauriAPI.setStoreValue('GROQ_API_KEY', groqKey);
      groqKey = '';
    }
    if (groqModel === null) {
      groqModel = localStorage.getItem('GROQ_MODEL') || DEFAULT_GROQ_MODEL;
      await tauriAPI.setStoreValue('GROQ_MODEL', groqModel);
    }
    if (savedLlmEnabled === null) {
      savedLlmEnabled = localStorage.getItem('Trueears_LLM_ENABLED') || 'false';
      await tauriAPI.setStoreValue('Trueears_LLM_ENABLED', savedLlmEnabled);
    }
    if (savedLlmApiKey === null) {
      savedLlmApiKey = localStorage.getItem('Trueears_LLM_API_KEY') || groqKey || '';
      await tauriAPI.setStoreValue('Trueears_LLM_API_KEY', savedLlmApiKey);
    }
    if (savedLlmModel === null) {
      savedLlmModel = localStorage.getItem('Trueears_LLM_MODEL') || DEFAULT_LLM_MODEL;
      await tauriAPI.setStoreValue('Trueears_LLM_MODEL', savedLlmModel);
    }
    if (savedSystemPrompt === null) {
      savedSystemPrompt = localStorage.getItem('Trueears_DEFAULT_SYSTEM_PROMPT') || DEFAULT_SYSTEM_PROMPT;
      await tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', savedSystemPrompt);
    }

    // Load language settings
    let savedLanguage = await tauriAPI.getStoreValue('Trueears_LANGUAGE');
    let savedAutoDetect = await tauriAPI.getStoreValue('Trueears_AUTO_DETECT_LANGUAGE');

    if (savedLanguage === null) {
      savedLanguage = localStorage.getItem('Trueears_LANGUAGE') || 'en';
      await tauriAPI.setStoreValue('Trueears_LANGUAGE', savedLanguage);
    }
    if (savedAutoDetect === null) {
      savedAutoDetect = localStorage.getItem('Trueears_AUTO_DETECT_LANGUAGE') || 'false';
      await tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', savedAutoDetect);
    }

    setApiKey(groqKey || '');
    setModel(groqModel || DEFAULT_GROQ_MODEL);
    
    setLlmEnabled(savedLlmEnabled === 'true');
    setLlmApiKey(savedLlmApiKey || groqKey || '');
    setLlmModel(savedLlmModel || DEFAULT_LLM_MODEL);
    setDefaultSystemPrompt(savedSystemPrompt || DEFAULT_SYSTEM_PROMPT);
    
    setLanguage(savedLanguage || 'en');
    setAutoDetectLanguage(savedAutoDetect === 'true');
    
    setOnboardingComplete(savedOnboardingComplete === 'true');
    
    // Load theme
    const validTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    setTheme(validTheme);
    document.documentElement.setAttribute('data-theme', validTheme);
    
    // Load recording mode
    let savedRecordingMode = await tauriAPI.getStoreValue('Trueears_RECORDING_MODE');
    if (savedRecordingMode === null) {
      savedRecordingMode = 'auto';
      await tauriAPI.setStoreValue('Trueears_RECORDING_MODE', savedRecordingMode);
    }
    const validRecordingMode = (savedRecordingMode === 'auto' || savedRecordingMode === 'toggle' || savedRecordingMode === 'push-to-talk') 
      ? savedRecordingMode as 'auto' | 'toggle' | 'push-to-talk'
      : 'auto';
    setRecordingMode(validRecordingMode);
    
    setIsKeyLoaded(true);
  };

  useEffect(() => {
    const init = async () => {
      await loadKeys();

      // Listen for Tauri event (cross-window)
      let unlistenTauri: (() => void) | undefined;
      tauriAPI.onSettingsChanged(async () => {
        debug.log('[useSettings] settings-changed event received, reloading keys');
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

  const saveApiKey = async (key: string) => {
    setApiKey(key);
    await tauriAPI.setStoreValue('GROQ_API_KEY', key);
    tauriAPI.emitSettingsChanged();
  };

  const saveGroqModel = async (newModel: string) => {
    setModel(newModel);
    await tauriAPI.setStoreValue('GROQ_MODEL', newModel);
    tauriAPI.emitSettingsChanged();
  };

  const saveLlmEnabled = async (enabled: boolean) => {
    debug.log('[useSettings] saveLlmEnabled called with:', enabled);
    setLlmEnabled(enabled);
    await tauriAPI.setStoreValue('Trueears_LLM_ENABLED', enabled.toString());
    tauriAPI.emitSettingsChanged();
  };

  const saveLlmApiKey = async (key: string) => {
    setLlmApiKey(key);
    await tauriAPI.setStoreValue('Trueears_LLM_API_KEY', key);
    tauriAPI.emitSettingsChanged();
  };

  const saveLlmModel = async (model: string) => {
    setLlmModel(model);
    await tauriAPI.setStoreValue('Trueears_LLM_MODEL', model);
    tauriAPI.emitSettingsChanged();
  };

  const saveDefaultSystemPrompt = async (prompt: string) => {
    setDefaultSystemPrompt(prompt);
    await tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', prompt);
    tauriAPI.emitSettingsChanged();
  };

  const markOnboardingComplete = async () => {
    setOnboardingComplete(true);
    await tauriAPI.setStoreValue('Trueears_ONBOARDING_COMPLETE', 'true');
  };

  const saveLanguage = async (lang: string) => {
    setLanguage(lang);
    await tauriAPI.setStoreValue('Trueears_LANGUAGE', lang);
    tauriAPI.emitSettingsChanged();
  };

  const saveAutoDetectLanguage = async (enabled: boolean) => {
    setAutoDetectLanguage(enabled);
    await tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', enabled.toString());
    tauriAPI.emitSettingsChanged();
  };

  const saveTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await tauriAPI.setStoreValue('Trueears_THEME', newTheme);
    tauriAPI.emitSettingsChanged();
  };

  const saveRecordingMode = async (mode: 'auto' | 'toggle' | 'push-to-talk') => {
    setRecordingMode(mode);
    await tauriAPI.setStoreValue('Trueears_RECORDING_MODE', mode);
    tauriAPI.emitSettingsChanged();
  };

  return {
    apiKey,
    model,
    isKeyLoaded,
    saveApiKey,
    saveGroqModel,
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
    // Language settings
    language,
    autoDetectLanguage,
    saveLanguage,
    saveAutoDetectLanguage,
    // Theme settings
    theme,
    saveTheme,
    // Recording mode settings
    recordingMode,
    saveRecordingMode,
  };
};
