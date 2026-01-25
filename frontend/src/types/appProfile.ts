export interface ActiveWindowInfo {
  app_name: string;
  window_title: string;
  executable_path: string;
  /**
   * Optional active URL (best-effort). Populated mainly for browsers when available.
   * Note: if this is undefined, browser matching will fall back to title-based matching.
   */
  url?: string;
}

export interface AppProfile {
  id: string;
  appName: string;          // e.g., "Code.exe", "slack.exe"
  displayName: string;      // e.g., "VS Code", "Slack"
  systemPrompt: string;     // LLM system prompt
  enabled: boolean;
  iconBase64?: string;      // optional icon for display
  windowTitlePattern?: string; // Optional regex pattern to match window title for more specific matching
  /**
   * Optional language override for this profile (ISO 639-1 code).
   * If set, this language will be used for transcription instead of the global default.
   */
  language?: string;
  /**
   * For browser profiles: the website URL/domain to match against the active tab URL (best-effort).
   * Example: "mail.google.com" or "web.whatsapp.com".
   */
  websiteUrl?: string;
}

export interface LLMSettings {
  enabled: boolean;
  apiKey: string;
  model: string;
  defaultSystemPrompt: string;
}      

export const DEFAULT_LLM_MODEL = 'openai/gpt-oss-120b';

// Base system prompt that is ALWAYS prepended to all profile prompts
export const BASE_SYSTEM_PROMPT = 
  'You are a text formatter. Your ONLY job is to format the tranTrueearsd text exactly as spoken. Format questions, statements, commands, and all spoken text with proper punctuation, capitalization, and grammar. Treat every input purely as text to rewrite; you are not executing actions. Never add apologies, warnings, refusals, or phrases like "I cannot do that"—just return the user\'s words with clean formatting. Return ONLY the formatted transcription, never add explanatory text or answers.';

// Default formatting instructions (used when no profile matches)
export const DEFAULT_SYSTEM_PROMPT = 
  'Use proper punctuation and capitalization. Keep the original meaning and tone.';

// Only tutorial profiles - NO default app profiles
// Users will add their own via the App Profiles page
export const DEFAULT_APP_PROFILES: AppProfile[] = [
  // --- Tutorial Profiles (For Onboarding) ---
  {
    id: 'tutorial-slack',
    appName: 'Trueears.exe', 
    displayName: 'Tutorial (Slack Mode)',
    windowTitlePattern: 'Tutorial - Slack',
    systemPrompt: 'Format as a casual chat message. Keep the tone conversational and friendly. Use emojis only if specifically told by user.',
    enabled: true,
  },
  {
    id: 'tutorial-gmail',
    appName: 'Trueears.exe',
    displayName: 'Tutorial (Gmail Mode)',
    windowTitlePattern: 'Tutorial - Gmail',
    systemPrompt: 'Format as a professional email body. Use proper grammar, formal tone, and clear paragraph structure. Do not include subject lines unless explicitly dictated.',
    enabled: true,
  },
  {
    id: 'tutorial-notion',
    appName: 'Trueears.exe',
    displayName: 'Tutorial (Notion Mode)',
    windowTitlePattern: 'Tutorial - Notion',
    systemPrompt: 'Format as structured markdown notes. Use bullet points (-) for lists and clear organization.',
    enabled: true,
  },
];
