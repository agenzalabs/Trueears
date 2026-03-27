import { useState, useEffect } from 'react';
import { DEFAULT_LLM_MODEL, DEFAULT_SYSTEM_PROMPT } from '../types/appProfile';
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

  // Microphone state
  const [microphoneId, setMicrophoneId] = useState<string>('default');

  const loadKeys = async (isActive: () => boolean = () => true) => {
    const snapshot = await tauriAPI.getSettingsSnapshot();

    // Try to load from store snapshot first
    let groqKey = snapshot?.groqApiKey ?? null;
    let groqModel = snapshot?.groqModel ?? null;
    let savedLlmEnabled = snapshot?.llmEnabled ?? null;
    let savedLlmApiKey = snapshot?.llmApiKey ?? null;
    let savedLlmModel = snapshot?.llmModel ?? null;
    let savedSystemPrompt = snapshot?.defaultSystemPrompt ?? null;
    const savedOnboardingComplete = snapshot?.onboardingComplete ?? null;
    const savedTheme = snapshot?.theme ?? null;
    let savedLanguage = snapshot?.language ?? null;
    let savedAutoDetect = snapshot?.autoDetectLanguage ?? null;
    let savedRecordingMode = snapshot?.recordingMode ?? null;
    let savedMicId = snapshot?.microphoneId ?? null;

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
    const pendingWrites: Array<Promise<void>> = [];

    if (groqModel === null) {
      groqModel = localStorage.getItem('GROQ_MODEL') || DEFAULT_GROQ_MODEL;
      pendingWrites.push(tauriAPI.setStoreValue('GROQ_MODEL', groqModel));
    }
    if (savedLlmEnabled === null) {
      savedLlmEnabled = localStorage.getItem('Trueears_LLM_ENABLED') || 'false';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_ENABLED', savedLlmEnabled));
    }
    if (savedLlmApiKey === null) {
      savedLlmApiKey = localStorage.getItem('Trueears_LLM_API_KEY') || groqKey || '';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_API_KEY', savedLlmApiKey));
    }
    if (savedLlmModel === null) {
      savedLlmModel = localStorage.getItem('Trueears_LLM_MODEL') || DEFAULT_LLM_MODEL;
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_LLM_MODEL', savedLlmModel));
    }
    if (savedSystemPrompt === null) {
      savedSystemPrompt = localStorage.getItem('Trueears_DEFAULT_SYSTEM_PROMPT') || DEFAULT_SYSTEM_PROMPT;
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', savedSystemPrompt));
    }

    if (savedLanguage === null) {
      savedLanguage = localStorage.getItem('Trueears_LANGUAGE') || 'en';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_LANGUAGE', savedLanguage));
    }
    if (savedAutoDetect === null) {
      savedAutoDetect = localStorage.getItem('Trueears_AUTO_DETECT_LANGUAGE') || 'false';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', savedAutoDetect));
    }

    // Load recording mode
    if (savedRecordingMode === null) {
      savedRecordingMode = 'auto';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_RECORDING_MODE', savedRecordingMode));
    }

    // Load microphone ID
    if (savedMicId === null) {
      savedMicId = localStorage.getItem('Trueears_MICROPHONE_ID') || 'default';
      pendingWrites.push(tauriAPI.setStoreValue('Trueears_MICROPHONE_ID', savedMicId));
    }

    if (pendingWrites.length > 0) {
      await Promise.all(pendingWrites);
    }

    if (!isActive()) {
      return;
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
    const validRecordingMode = (savedRecordingMode === 'auto' || savedRecordingMode === 'toggle' || savedRecordingMode === 'push-to-talk')
      ? savedRecordingMode as 'auto' | 'toggle' | 'push-to-talk'
      : 'auto';
    setRecordingMode(validRecordingMode);
    setMicrophoneId(savedMicId || 'default');

    setIsKeyLoaded(true);
  };

  useEffect(() => {
    let isActive = true;
    let unlistenTauri: (() => void) | undefined;

    const init = async () => {
      await loadKeys(() => isActive);

      unlistenTauri = await tauriAPI.onSettingsChanged(async () => {
        debug.log('[useSettings] settings-changed event received, reloading keys');
        await loadKeys(() => isActive);
      });
    };

    void init();

    return () => {
      isActive = false;
      if (unlistenTauri) unlistenTauri();
    };
  }, []);

  const saveApiKey = async (key: string) => {
    setApiKey(key);
    await tauriAPI.setStoreValue('GROQ_API_KEY', key);
  };

  const saveGroqModel = async (newModel: string) => {
    setModel(newModel);
    await tauriAPI.setStoreValue('GROQ_MODEL', newModel);
  };

  const saveLlmEnabled = async (enabled: boolean) => {
    debug.log('[useSettings] saveLlmEnabled called with:', enabled);
    setLlmEnabled(enabled);
    await tauriAPI.setStoreValue('Trueears_LLM_ENABLED', enabled.toString());
  };

  const saveLlmApiKey = async (key: string) => {
    setLlmApiKey(key);
    await tauriAPI.setStoreValue('Trueears_LLM_API_KEY', key);
  };

  const saveLlmModel = async (model: string) => {
    setLlmModel(model);
    await tauriAPI.setStoreValue('Trueears_LLM_MODEL', model);
  };

  const saveDefaultSystemPrompt = async (prompt: string) => {
    setDefaultSystemPrompt(prompt);
    await tauriAPI.setStoreValue('Trueears_DEFAULT_SYSTEM_PROMPT', prompt);
  };

  const markOnboardingComplete = async () => {
    setOnboardingComplete(true);
    await tauriAPI.setStoreValue('Trueears_ONBOARDING_COMPLETE', 'true');
  };

  const saveLanguage = async (lang: string) => {
    setLanguage(lang);
    await tauriAPI.setStoreValue('Trueears_LANGUAGE', lang);
  };

  const saveAutoDetectLanguage = async (enabled: boolean) => {
    setAutoDetectLanguage(enabled);
    await tauriAPI.setStoreValue('Trueears_AUTO_DETECT_LANGUAGE', enabled.toString());
  };

  const saveTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await tauriAPI.setStoreValue('Trueears_THEME', newTheme);
  };

  const saveRecordingMode = async (mode: 'auto' | 'toggle' | 'push-to-talk') => {
    setRecordingMode(mode);
    await tauriAPI.setStoreValue('Trueears_RECORDING_MODE', mode);
  };

  const saveMicrophoneId = async (id: string) => {
    setMicrophoneId(id);
    await tauriAPI.setStoreValue('Trueears_MICROPHONE_ID', id);
    // Also save to localStorage for fallback/web matches
    localStorage.setItem('Trueears_MICROPHONE_ID', id);
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
    // Microphone settings
    microphoneId,
    saveMicrophoneId,
  };
};
