// Popular Apps Catalog

export type AppCategory = 'code-editor' | 'email' | 'communication' | 'note-taking' | 'productivity' | 'browser';

export interface BrowserVariant {
  browserId: 'chrome' | 'edge' | 'firefox' | 'brave' | 'opera';
  browserName: string;
  executable: string;
  windowTitlePattern: string;
}

export interface PopularApp {
  id: string;
  displayName: string;
  description: string;
  category: AppCategory;
  // We will look for icons in /apps/{id}.svg or .png
  // For now, we keep an emoji fallback just in case the file isn't there
  iconFallback: string; 
  accentColor: string;
  
  // Browser-specific configuration
  isBrowserBased: boolean;
  urlHint?: string;
  browserVariants?: BrowserVariant[];
  
  // Direct desktop app configuration
  executable?: string;
  windowTitlePattern?: string;
  
  // Default system prompt
  systemPrompt: string;
}

export const POPULAR_APPS: PopularApp[] = [
  // Code Editors
  {
    id: 'cursor',
    displayName: 'Cursor',
    description: 'AI-first code editor',
    category: 'code-editor',
    iconFallback: '⚡',
    accentColor: '#8B5CF6', // Purple
    isBrowserBased: false,
    executable: 'Cursor.exe',
    systemPrompt: 'Keep code blocks intact, minimal prose. Use exact casing for filenames/extensions.',
  },
  {
    id: 'vscode',
    displayName: 'VS Code',
    description: 'Code editor by Microsoft',
    category: 'code-editor',
    iconFallback: '💻',
    accentColor: '#007ACC', // Blue
    isBrowserBased: false,
    executable: 'Code.exe',
    systemPrompt: 'Keep code blocks intact, minimal prose. Use exact casing for filenames/extensions.',
  },
  {
    id: 'vscode-insiders',
    displayName: 'VS Code Insiders',
    description: 'Code editor (Insiders)',
    category: 'code-editor',
    iconFallback: '💻',
    accentColor: '#007ACC',
    isBrowserBased: false,
    executable: 'Code - Insiders.exe',
    systemPrompt: 'Keep code blocks intact, minimal prose. Use exact casing for filenames/extensions.',
  },
  
  // Email
  {
    id: 'gmail',
    displayName: 'Gmail',
    description: 'Google Email',
    category: 'email',
    iconFallback: '📧',
    accentColor: '#EA4335', // Red
    isBrowserBased: true,
    urlHint: 'mail.google.com',
    browserVariants: [
      { browserId: 'chrome', browserName: 'Chrome', executable: 'chrome.exe', windowTitlePattern: 'Gmail' },
      { browserId: 'edge', browserName: 'Edge', executable: 'msedge.exe', windowTitlePattern: 'Gmail' },
      { browserId: 'firefox', browserName: 'Firefox', executable: 'firefox.exe', windowTitlePattern: 'Gmail' },
      { browserId: 'brave', browserName: 'Brave', executable: 'brave.exe', windowTitlePattern: 'Gmail' },
    ],
    systemPrompt: 'Professional email tone. Clear paragraphs. No subject unless dictated.',
  },
  {
    id: 'outlook',
    displayName: 'Outlook',
    description: 'Microsoft Email',
    category: 'email',
    iconFallback: '📨',
    accentColor: '#0F6CBD', // Blue
    isBrowserBased: false,
    executable: 'OUTLOOK.EXE',
    systemPrompt: 'Professional email tone. Concise and clear structure.',
  },
  
  // Communication
  {
    id: 'slack',
    displayName: 'Slack',
    description: 'Team Chat',
    category: 'communication',
    iconFallback: '💬',
    accentColor: '#4A154B', // Purple
    isBrowserBased: false,
    executable: 'slack.exe',
    systemPrompt: 'Casual chat style. Short, friendly, conversational. No extra fluff.',
  },
  {
    id: 'discord',
    displayName: 'Discord',
    description: 'Community Chat',
    category: 'communication',
    iconFallback: '🎮',
    accentColor: '#5865F2', // Blurple
    isBrowserBased: false,
    executable: 'Discord.exe',
    systemPrompt: 'Casual chat style. Short, friendly, conversational.',
  },
  {
    id: 'whatsapp',
    displayName: 'WhatsApp',
    description: 'Messaging',
    category: 'communication',
    iconFallback: '💚',
    accentColor: '#25D366', // Green
    isBrowserBased: true,
    urlHint: 'web.whatsapp.com',
    browserVariants: [
      { browserId: 'chrome', browserName: 'Chrome', executable: 'chrome.exe', windowTitlePattern: 'WhatsApp' },
      { browserId: 'edge', browserName: 'Edge', executable: 'msedge.exe', windowTitlePattern: 'WhatsApp' },
    ],
    systemPrompt: 'Casual chat style. Friendly and emoji-friendly if spoken.',
  },
  {
    id: 'teams',
    displayName: 'Teams',
    description: 'Microsoft Teams',
    category: 'communication',
    iconFallback: '👥',
    accentColor: '#6264A7', // Purple
    isBrowserBased: false,
    executable: 'Teams.exe',
    systemPrompt: 'Business chat tone. Clear, concise, professional.',
  },
  
  // Note-taking
  {
    id: 'notion',
    displayName: 'Notion',
    description: 'Wiki & Docs',
    category: 'note-taking',
    iconFallback: '📝',
    accentColor: '#000000', // Black
    isBrowserBased: false,
    executable: 'Notion.exe',
    systemPrompt: 'Structured notes. Bullets where natural. Light Markdown ok.',
  },
  {
    id: 'onenote',
    displayName: 'OneNote',
    description: 'Digital Notebook',
    category: 'note-taking',
    iconFallback: '📓',
    accentColor: '#7719AA', // Purple
    isBrowserBased: false,
    executable: 'ONENOTE.EXE',
    systemPrompt: 'Structured notes. Bullets where helpful.',
  },
  
  // Productivity
  {
    id: 'word',
    displayName: 'Word',
    description: 'Document Editor',
    category: 'productivity',
    iconFallback: '📄',
    accentColor: '#2B579A', // Blue
    isBrowserBased: false,
    executable: 'WINWORD.EXE',
    systemPrompt: 'Formal document tone. Proper grammar and paragraphs.',
  },
  {
    id: 'docs',
    displayName: 'Google Docs',
    description: 'Cloud Documents',
    category: 'productivity',
    iconFallback: '📃',
    accentColor: '#4285F4', // Blue
    isBrowserBased: true,
    urlHint: 'docs.google.com',
    browserVariants: [
      { browserId: 'chrome', browserName: 'Chrome', executable: 'chrome.exe', windowTitlePattern: 'Google Docs' },
      { browserId: 'edge', browserName: 'Edge', executable: 'msedge.exe', windowTitlePattern: 'Google Docs' },
    ],
    systemPrompt: 'Formal document tone. Proper grammar and paragraphs.',
  },
];

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  'code-editor': 'Code Editors',
  'email': 'Email',
  'communication': 'Communication',
  'note-taking': 'Note Taking',
  'productivity': 'Productivity',
  'browser': 'Web Browsers',
};

export const CATEGORY_ORDER: AppCategory[] = ['code-editor', 'email', 'communication', 'note-taking', 'productivity'];
