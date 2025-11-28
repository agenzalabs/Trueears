export interface ActiveWindowInfo {
  app_name: string;
  window_title: string;
  executable_path: string;
}

export interface AppProfile {
  id: string;
  appName: string;          // e.g., "Code.exe", "slack.exe"
  displayName: string;      // e.g., "VS Code", "Slack"
  systemPrompt: string;     // LLM system prompt
  enabled: boolean;
  windowTitlePattern?: string; // Optional regex pattern to match window title for more specific matching
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
  'You are a text formatter. Your ONLY job is to format the transcribed text exactly as spoken. Format questions, statements, and all spoken text with proper punctuation, capitalization, and grammar. DO NOT answer questions or provide responses - only format the exact words that were spoken. Return ONLY the formatted transcription, never add explanatory text or answers.';

// Default formatting instructions (used when no profile matches)
export const DEFAULT_SYSTEM_PROMPT = 
  'Use proper punctuation and capitalization. Keep the original meaning and tone.';

// App-specific formatting instructions (these get appended to BASE_SYSTEM_PROMPT)
export const DEFAULT_APP_PROFILES: AppProfile[] = [
  {
    id: 'vscode',
    appName: 'Code.exe',
    displayName: 'VS Code',
    systemPrompt: 'Format as code comments or technical documentation. Use technical terminology and preserve code-related keywords. When a file name is mentioned (e.g., "user service dot js", "app dot py", "config dot json"), format it in proper camelCase or kebab-case naming convention and prepend an @ sign to the file name (e.g., @userService.js, @app.py, @config.json). Convert spoken file extensions correctly (.js, .py, .ts, .tsx, .json, .css, etc.).',
    enabled: true,
  },
  {
    id: 'cursor',
    appName: 'Cursor.exe',
    displayName: 'Cursor',
    systemPrompt: 'Format as code comments or technical documentation. Use technical terminology and preserve code-related keywords. When a file name is mentioned (e.g., "user service dot js", "app dot py", "config dot json"), format it in proper camelCase or kebab-case naming convention and prepend an @ sign to the file name (e.g., @userService.js, @app.py, @config.json). Convert spoken file extensions correctly (.js, .py, .ts, .tsx, .json, .css, etc.).',
    enabled: true,
  },
  {
    id: 'slack',
    appName: 'slack.exe',
    displayName: 'Slack',
    systemPrompt: 'Format as a casual chat message. Keep the tone conversational and friendly. Use casual punctuation.',
    enabled: true,
  },
  {
    id: 'discord',
    appName: 'Discord.exe',
    displayName: 'Discord',
    systemPrompt: 'Format as a casual chat message. Keep the tone conversational. Use casual punctuation.',
    enabled: true,
  },
  {
    id: 'outlook',
    appName: 'OUTLOOK.EXE',
    displayName: 'Outlook',
    systemPrompt: 'Format as professional email content. Use proper grammar, formal tone, and clear structure.',
    enabled: true,
  },
  {
    id: 'chrome',
    appName: 'chrome.exe',
    displayName: 'Google Chrome (Gmail)',
    systemPrompt: 'Format as professional email or message text. Use proper grammar and clear structure.',
    enabled: true,
  },
  {
    id: 'notion',
    appName: 'Notion.exe',
    displayName: 'Notion',
    systemPrompt: 'Format as structured notes. Use bullet points for lists and clear organization.',
    enabled: true,
  },
  {
    id: 'onenote',
    appName: 'ONENOTE.EXE',
    displayName: 'OneNote',
    systemPrompt: 'Format as structured notes. Use bullet points for lists and clear organization.',
    enabled: true,
  },
  {
    id: 'word',
    appName: 'WINWORD.EXE',
    displayName: 'Microsoft Word',
    systemPrompt: 'Format as formal document content. Use proper grammar, professional language, and paragraph structure.',
    enabled: true,
  },
  // --- Tutorial Profiles (For Onboarding) ---
  {
    id: 'tutorial-slack',
    appName: 'scribe.exe', 
    displayName: 'Tutorial (Slack Mode)',
    windowTitlePattern: 'Tutorial - Slack',
    systemPrompt: 'Format as a casual chat message. Keep the tone conversational and friendly. Use emojis only if specifically told by user.',
    enabled: true,
  },
  {
    id: 'tutorial-gmail',
    appName: 'scribe.exe',
    displayName: 'Tutorial (Gmail Mode)',
    windowTitlePattern: 'Tutorial - Gmail',
    systemPrompt: 'Format as a professional email body. Use proper grammar, formal tone, and clear paragraph structure. Do not include subject lines unless explicitly dictated.',
    enabled: true,
  },
  {
    id: 'tutorial-notion',
    appName: 'scribe.exe',
    displayName: 'Tutorial (Notion Mode)',
    windowTitlePattern: 'Tutorial - Notion',
    systemPrompt: 'Format as structured markdown notes. Use bullet points (-) for lists and clear organization.',
    enabled: true,
  },
];
