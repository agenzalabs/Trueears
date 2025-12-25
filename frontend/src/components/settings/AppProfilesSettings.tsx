import React, { useState, useEffect, useRef } from 'react';
import { AppProfile } from '../../types/appProfile';
import { AppProfileService } from '../../services/appProfileService';
import { tauriAPI } from '../../utils/tauriApi';
import { POPULAR_APPS, PopularApp, BrowserVariant } from '../../data/popularApps';
import { invoke } from '@tauri-apps/api/core';

interface AppProfilesSettingsProps {
  theme: 'light' | 'dark';
}

interface InstalledApp {
  name: string;
  executable: string;
  category: string;
  icon_base64?: string;
}

// Backend categories
const CATEGORY_LABELS: Record<string, string> = {
  'browser': 'Browsers',
  'code': 'Code Editors',
  'chat': 'Communication',
  'email': 'Email',
  'notes': 'Note Taking',
  'office': 'Office',
  'design': 'Design',
  'dev': 'Development Tools',
  'media': 'Media',
  'utility': 'Utilities',
};

const CATEGORY_ORDER = ['code', 'email', 'chat', 'notes', 'office', 'design', 'dev', 'media', 'browser', 'utility'];

const CATEGORY_ICONS: Record<string, string> = {
  browser: '🌐', code: '💻', chat: '💬', email: '📧', notes: '📝',
  office: '📄', design: '🎨', dev: '🛠️', media: '🎵', utility: '⚙️',
};

// Default prompts for categories
const CATEGORY_PROMPTS: Record<string, string> = {
  code: 'Keep code blocks intact, minimal prose. Use exact casing for filenames/extensions.',
  email: 'Professional email tone. Concise and clear structure.',
  chat: 'Casual chat style. Short, friendly, conversational.',
  notes: 'Structured notes. Bullets where natural.',
  office: 'Formal document tone. Proper grammar and paragraphs.',
  design: 'Keep it concise and descriptive.',
  dev: 'Technical and precise.',
  media: 'Keep it simple.',
  browser: 'Format appropriately for the website context.',
  utility: 'Keep it simple and clear.',
};

// Check if an app is a browser
const isBrowser = (category: string) => category === 'browser';

const BROWSER_EXECUTABLES = new Set([
  'chrome.exe',
  'msedge.exe',
  'firefox.exe',
  'brave.exe',
  'opera.exe',
  'vivaldi.exe',
  'arc.exe',
]);

const isBrowserExecutable = (exe: string) => {
  const lower = (exe || '').toLowerCase().trim();
  const base = lower.split('\\').pop() || lower;
  return BROWSER_EXECUTABLES.has(base);
};

const escapeRegexLiteral = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normalize a website URL/domain for storage + comparison
const normalizeWebsiteUrl = (raw: string): string | null => {
  const input = (raw || '').trim();
  if (!input) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`;
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let path = url.pathname || '';
    if (path === '/' || path === '') path = '';
    else path = path.replace(/\/+$/, '');
    return path ? `${host}${path}` : host;
  } catch {
    return null;
  }
};

// Confirmation Modal
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, theme }: { 
  isOpen: boolean; title: string; message: string; 
  onConfirm: () => void; onCancel: () => void; theme: 'light' | 'dark';
}) => {
  const isDark = theme === 'dark';
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-xl max-w-md w-full p-6 shadow-2xl ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h3>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium cursor-pointer transition-colors">Remove</button>
        </div>
      </div>
    </div>
  );
};

// Browser Setup Modal - for adding browser-based profiles with website/tab name
const BrowserSetupModal = ({ 
  browserApp, theme, onSave, onClose, existingProfiles
}: { 
  browserApp: InstalledApp;
  theme: 'light' | 'dark';
  onSave: (websiteUrl: string, systemPrompt: string) => void;
  onClose: () => void;
  existingProfiles: AppProfile[];
}) => {
  const isDark = theme === 'dark';
  const [websiteUrlInput, setWebsiteUrlInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const normalized = normalizeWebsiteUrl(websiteUrlInput);
    if (!normalized) {
      setError('Please enter a valid website URL (e.g., mail.google.com)');
      return;
    }
    
    // Check for duplicate
    const exists = existingProfiles.some(p => 
      p.appName.toLowerCase() === browserApp.executable.toLowerCase() && 
      normalizeWebsiteUrl(p.websiteUrl || '') === normalized
    );
    
    if (exists) {
      setError(`A profile for "${normalized}" in ${browserApp.name} already exists`);
      return;
    }
    
    onSave(normalized, systemPrompt.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl max-w-lg w-full p-6 ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`}>
            {browserApp.icon_base64 ? (
              <img src={`data:image/png;base64,${browserApp.icon_base64}`} alt={browserApp.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl">🌐</span>
            )}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Add Website Profile</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>in {browserApp.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Website URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${error ? 'border-rose-500' : isDark ? 'border-[#333] focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'} ${isDark ? 'bg-[#252525] text-gray-200' : 'bg-gray-50 text-gray-800'}`}
              value={websiteUrlInput}
              onChange={e => { setWebsiteUrlInput(e.target.value); setError(''); }}
              placeholder="e.g., mail.google.com or https://web.whatsapp.com"
              autoFocus
            />
            {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
            <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              This will match against the active tab URL (best-effort)
            </p>
          </div>

          <div>
            <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              System Prompt <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
            </label>
            <textarea
              className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-emerald-500' : 'bg-white border-gray-300 text-gray-800 focus:border-emerald-500'}`}
              rows={3}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="e.g., 'Format as casual chat' or 'Use professional email tone'"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className={`flex-1 py-3 rounded-lg font-medium cursor-pointer transition-colors ${isDark ? 'bg-[#252525] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-lg font-medium cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Add Profile</button>
        </div>
      </div>
    </div>
  );
};

// Browser-based app setup modal (Gmail, WhatsApp, etc.)
const BrowserAppSetupModal = ({ 
  app, theme, onSave, onClose, existingProfiles
}: { 
  app: PopularApp;
  theme: 'light' | 'dark';
  onSave: (variant: BrowserVariant, websiteKeyword: string) => void;
  onClose: () => void;
  existingProfiles: AppProfile[];
}) => {
  const isDark = theme === 'dark';
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserVariant | null>(null);
  const [websiteKeyword, setWebsiteKeyword] = useState(app.urlHint?.split('.')[0] || app.displayName);
  const [error, setError] = useState('');

  const getBrowserIcon = (id: string) => ({ chrome: '🌐', edge: '🌊', firefox: '🦊', brave: '🦁', opera: '🎭' }[id] || '🌐');

  const handleSave = () => {
    if (!selectedBrowser) return;
    if (!websiteKeyword.trim()) {
      setError('Website keyword is required');
      return;
    }
    
    const exists = existingProfiles.some(p => 
      p.appName.toLowerCase() === selectedBrowser.executable.toLowerCase() && 
      p.windowTitlePattern?.toLowerCase().includes(websiteKeyword.toLowerCase())
    );
    
    if (exists) {
      setError(`A profile for ${websiteKeyword} in ${selectedBrowser.browserName} already exists`);
      return;
    }
    
    onSave(selectedBrowser, websiteKeyword.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl max-w-lg w-full p-6 ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl bg-white/5">{app.iconFallback}</div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Setup {app.displayName}</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{app.description}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Website/Tab Keyword <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none transition-colors ${error ? 'border-rose-500' : isDark ? 'border-[#333] focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'} ${isDark ? 'bg-[#252525] text-gray-200' : 'bg-gray-50 text-gray-800'}`}
            value={websiteKeyword}
            onChange={e => { setWebsiteKeyword(e.target.value); setError(''); }}
            placeholder="e.g., Gmail, WhatsApp, YouTube"
          />
          {error && <p className="text-rose-500 text-xs mt-1">{error}</p>}
          <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            This keyword will be matched against the browser tab title
          </p>
        </div>

        <div className="mb-6">
          <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Select Browser</label>
          <div className="space-y-2">
            {app.browserVariants?.map(variant => (
              <button
                key={variant.browserId}
                onClick={() => setSelectedBrowser(variant)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedBrowser?.browserId === variant.browserId
                    ? isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-600 bg-emerald-50'
                    : isDark ? 'border-[#333] bg-[#252525] hover:border-[#444]' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>{getBrowserIcon(variant.browserId)}</div>
                  <div className="flex-1">
                    <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{variant.browserName}</div>
                    <div className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{variant.executable}</div>
                  </div>
                  {selectedBrowser?.browserId === variant.browserId && (
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className={`flex-1 py-3 rounded-lg font-medium cursor-pointer transition-colors ${isDark ? 'bg-[#252525] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!selectedBrowser}
            className={`flex-1 py-3 rounded-lg font-medium cursor-pointer transition-colors ${selectedBrowser ? 'bg-emerald-500 text-white hover:bg-emerald-600' : isDark ? 'bg-[#252525] text-gray-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
};

// Profile Edit Modal
const ProfileModal = ({ 
  profile, isOpen, onClose, onSave, onDelete, existingProfiles, theme
}: { 
  profile: AppProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (p: AppProfile) => void;
  onDelete?: (id: string) => void;
  existingProfiles: AppProfile[];
  theme: 'light' | 'dark';
}) => {
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState<AppProfile>({
    id: '', appName: '', displayName: '', systemPrompt: '', enabled: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstalledApp[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState<{displayName?: string; appName?: string; websiteUrl?: string; duplicate?: string}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [selectedAppIcon, setSelectedAppIcon] = useState<string | undefined>();

  useEffect(() => {
    if (profile) {
      setFormData({ ...profile });
      setManualMode(true);
      setSelectedAppIcon(profile.iconBase64);
    } else {
      setFormData({ id: `custom-${Date.now()}`, appName: '', displayName: '', systemPrompt: '', enabled: true });
      setManualMode(false);
      setSelectedAppIcon(undefined);
    }
    setSearchQuery('');
    setSearchResults([]);
    setErrors({});
  }, [profile, isOpen]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await invoke<InstalledApp[]>('search_installed_apps', { query: searchQuery });
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectApp = (app: InstalledApp) => {
    setFormData({ ...formData, appName: app.executable, displayName: app.name });
    setSelectedAppIcon(app.icon_base64);
    setSearchQuery('');
    setSearchResults([]);
    setErrors({});
    setManualMode(true);
  };

  const validateAndSave = () => {
    const newErrors: typeof errors = {};
    if (!formData.displayName.trim()) newErrors.displayName = 'Display name is required';
    if (!formData.appName.trim()) newErrors.appName = 'App executable is required';

    const isBrowserApp = isBrowserExecutable(formData.appName);
    const others = existingProfiles.filter(p => p.id !== formData.id);

    // Browser profiles require URL
    let normalizedUrl: string | null = null;
    if (isBrowserApp) {
      normalizedUrl = normalizeWebsiteUrl(formData.websiteUrl || '') || null;
      if (!normalizedUrl) {
        newErrors.websiteUrl = 'Website URL is required for browser profiles';
      }
    }

    // Duplicate checks
    if (isBrowserApp) {
      if (normalizedUrl) {
        const exists = others.some(p =>
          p.appName.toLowerCase() === formData.appName.toLowerCase() &&
          normalizeWebsiteUrl(p.websiteUrl || '') === normalizedUrl
        );
        if (exists) {
          newErrors.duplicate = `A profile for "${normalizedUrl}" already exists in this browser`;
        }
      }
    } else {
      const exists = others.some(p => p.appName.toLowerCase() === formData.appName.toLowerCase());
      if (exists) {
        newErrors.duplicate = `A profile for "${formData.appName}" already exists`;
      }
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      const hostOnly = normalizedUrl ? normalizedUrl.split('/')[0] : undefined;
      onSave({
        ...formData,
        websiteUrl: normalizedUrl || formData.websiteUrl,
        // safe fallback (only matches if host is literally present in title)
        windowTitlePattern: normalizedUrl ? escapeRegexLiteral(hostOnly || '') : formData.windowTitlePattern,
        iconBase64: selectedAppIcon,
      });
    }
  };

  if (!isOpen) return null;
  const isEditing = !!profile;
  const isBrowserSelected = isBrowserExecutable(formData.appName);
  const otherProfilesForExe = existingProfiles.filter(p =>
    p.id !== formData.id && p.appName.toLowerCase() === formData.appName.toLowerCase()
  );
  const alreadyUsedCount = otherProfilesForExe.length;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className={`rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-200/10">
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {isEditing ? `Edit ${profile.displayName}` : 'Add Custom App'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-full cursor-pointer transition-colors ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {!isEditing && !manualMode && !formData.appName && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Search Installed Apps</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`w-full px-4 py-3 pr-10 text-sm rounded-lg border focus:outline-none transition-colors ${isDark ? 'bg-[#252525] border-[#333] text-gray-200 placeholder-gray-500 focus:border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400 focus:border-emerald-500'}`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Type to search (e.g., Cursor, Chrome, Slack...)"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {searchResults.length > 0 && (
                  <div className={`mt-2 border rounded-lg overflow-hidden ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
                    {searchResults.slice(0, 5).map((app, idx) => (
                      (() => {
                        const usedCount = existingProfiles.filter(p => p.appName.toLowerCase() === app.executable.toLowerCase()).length;
                        const appIsBrowser = isBrowserExecutable(app.executable) || app.category === 'browser';
                        const disabled = usedCount > 0 && !appIsBrowser;
                        const badge = usedCount > 0
                          ? (appIsBrowser ? `${usedCount} website${usedCount === 1 ? '' : 's'}` : 'Already added')
                          : null;

                        return (
                          <button
                            key={idx}
                            onClick={() => { if (!disabled) handleSelectApp(app); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${disabled ? (isDark ? 'opacity-60 cursor-not-allowed' : 'opacity-60 cursor-not-allowed') : 'cursor-pointer'} ${isDark ? (!disabled ? 'hover:bg-[#252525]' : '') : (!disabled ? 'hover:bg-gray-50' : '')} ${idx > 0 ? (isDark ? 'border-t border-[#333]' : 'border-t border-gray-100') : ''}`}
                          >
                        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden ${isDark ? 'bg-[#333]' : 'bg-gray-100'}`}>
                          {app.icon_base64 ? (
                            <img src={`data:image/png;base64,${app.icon_base64}`} alt={app.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-lg">{CATEGORY_ICONS[app.category] || '📦'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className={`font-medium text-sm truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{app.name}</div>
                            {badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium shrink-0 ${disabled ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700') : (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700')}`}>
                                {badge}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{app.executable}</div>
                        </div>
                          </button>
                        );
                      })()
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>No apps found. Enter details manually below.</p>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => { setManualMode(true); setSearchQuery(''); setSearchResults([]); }}
                    className={`text-sm font-medium underline cursor-pointer ${isDark ? 'text-gray-300 hover:text-emerald-400' : 'text-gray-700 hover:text-emerald-600'}`}
                  >
                    Enter app manually
                  </button>
                </div>
              </div>
            )}

            {(manualMode || isEditing || formData.appName) && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${errors.displayName ? 'border-rose-500' : isDark ? 'border-[#333] focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'} ${isDark ? 'bg-[#1a1a1a] text-gray-200' : 'bg-white text-gray-800'}`}
                    value={formData.displayName}
                    onChange={e => { setFormData({ ...formData, displayName: e.target.value }); setErrors({ ...errors, displayName: undefined }); }}
                    placeholder="e.g. My Special App"
                  />
                  {errors.displayName && <p className="text-rose-500 text-xs mt-1">{errors.displayName}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    App Executable <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 rounded-lg border text-sm font-mono focus:outline-none transition-colors ${errors.appName || errors.duplicate ? 'border-rose-500' : isDark ? 'border-[#333] focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'} ${isDark ? 'bg-[#1a1a1a] text-gray-200' : 'bg-white text-gray-800'}`}
                    value={formData.appName}
                    onChange={e => { setFormData({ ...formData, appName: e.target.value }); setErrors({ ...errors, appName: undefined, websiteUrl: undefined, duplicate: undefined }); }}
                    placeholder="e.g., cursor.exe"
                  />
                  {errors.appName && <p className="text-rose-500 text-xs mt-1">{errors.appName}</p>}
                  {errors.duplicate && <p className="text-rose-500 text-xs mt-1">{errors.duplicate}</p>}
                  <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>The .exe file name of your application</p>
                  {alreadyUsedCount > 0 && (
                    <p className={`text-xs mt-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      {isBrowserSelected
                        ? `This browser already has ${alreadyUsedCount} website profile${alreadyUsedCount === 1 ? '' : 's'}.`
                        : 'This app already has a profile in App Profiles. Edit the existing one instead of adding a duplicate.'}
                    </p>
                  )}
                </div>

                {/* Browser URL (only for browser executables) */}
                {isBrowserSelected && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Website URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border text-sm font-mono focus:outline-none transition-colors ${errors.websiteUrl ? 'border-rose-500' : isDark ? 'border-[#333] focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500'} ${isDark ? 'bg-[#1a1a1a] text-gray-200' : 'bg-white text-gray-800'}`}
                      value={formData.websiteUrl || ''}
                      onChange={e => { setFormData({ ...formData, websiteUrl: e.target.value }); setErrors({ ...errors, websiteUrl: undefined, duplicate: undefined }); }}
                      placeholder="e.g., mail.google.com or https://web.whatsapp.com"
                    />
                    {errors.websiteUrl && <p className="text-rose-500 text-xs mt-1">{errors.websiteUrl}</p>}
                    <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Matched against the active tab URL (best-effort)</p>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    System Prompt <span className={`font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                  </label>
                  <textarea
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${isDark ? 'bg-[#1a1a1a] border-[#333] text-gray-200 focus:border-emerald-500' : 'bg-white border-gray-300 text-gray-800 focus:border-emerald-500'}`}
                    rows={4}
                    value={formData.systemPrompt}
                    onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder="Add formatting instructions (e.g., 'Format as casual chat' or 'Use professional email tone')"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200/10">
            {onDelete && isEditing && (
              <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-2.5 rounded-lg text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 font-medium text-sm cursor-pointer transition-colors">Remove</button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className={`px-6 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}>Cancel</button>
            <button onClick={validateAndSave} className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm cursor-pointer transition-colors">Save</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Remove App Profile"
        message={`Are you sure you want to remove "${profile?.displayName}"?`}
        onConfirm={() => { onDelete?.(profile!.id); setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
        theme={theme}
      />
    </>
  );
};

// Main Component
export const AppProfilesSettings: React.FC<AppProfilesSettingsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [browserSetupApp, setBrowserSetupApp] = useState<InstalledApp | null>(null);
  const [browserAppSetup, setBrowserAppSetup] = useState<PopularApp | null>(null);
  const [editingProfile, setEditingProfile] = useState<AppProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installedPopularApps, setInstalledPopularApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedApps = useRef(false);
  const [expandedBrowsers, setExpandedBrowsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Ensure profiles are loaded from the durable store before rendering
    void (async () => {
      await AppProfileService.ensureLoaded();
      loadProfiles();
    })();
    loadInstalledPopularApps();
  }, []);

  // Keep UI in sync when profiles change (including changes from another window)
  useEffect(() => {
    const unsubscribe = AppProfileService.subscribe(() => {
      loadProfiles();
    });
    // Also listen for backend store updates (cross-window)
    let unlisten: (() => void) | undefined;
    tauriAPI.onSettingsChanged(() => {
      void AppProfileService.ensureLoaded().then(() => loadProfiles());
    }).then(u => { unlisten = u; }).catch(() => {});

    return () => {
      unsubscribe();
      unlisten?.();
    };
  }, []);

  const loadInstalledPopularApps = async () => {
    if (hasLoadedApps.current) return;
    setIsLoading(true);
    try {
      const apps = await invoke<InstalledApp[]>('get_installed_popular_apps');
      console.log('Installed popular apps:', apps);
      if (apps && apps.length > 0) {
        setInstalledPopularApps(apps);
        hasLoadedApps.current = true;
      }
    } catch (error) {
      console.error('Failed to load installed popular apps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfiles = () => {
    const all = AppProfileService.getProfiles().filter(p => 
      !p.id.startsWith('tutorial-') && p.appName && p.appName.trim() !== ''
    );
    setProfiles(all);
  };

  const toggleBrowserAccordion = (executable: string) => {
    const key = executable.toLowerCase();
    setExpandedBrowsers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTogglePopularInstalled = (app: InstalledApp, popularAppData: PopularApp | undefined, isEnabled: boolean) => {
    const existing = profiles.find(p => p.appName.toLowerCase() === app.executable.toLowerCase() && !p.windowTitlePattern);
    
    if (isEnabled && existing) {
      AppProfileService.deleteProfile(existing.id);
      loadProfiles();
      return;
    }
    
    // If it's a browser, show browser setup modal
    if (isBrowser(app.category)) {
      setBrowserSetupApp(app);
      return;
    }
    
    // If it's a browser-based app from POPULAR_APPS
    if (popularAppData?.isBrowserBased) {
      setBrowserAppSetup(popularAppData);
      return;
    }
    
    // Regular app
    const newProfile: AppProfile = {
      id: `app-${Date.now()}`,
      appName: app.executable,
      displayName: app.name,
      systemPrompt: popularAppData?.systemPrompt || CATEGORY_PROMPTS[app.category] || '',
      enabled: true,
      iconBase64: app.icon_base64,
    };
    AppProfileService.addProfile(newProfile);
    loadProfiles();
  };

  const handleBrowserSetupSave = (websiteUrl: string, systemPrompt: string) => {
    if (!browserSetupApp) return;
    
    const hostOnly = websiteUrl.split('/')[0];
    const newProfile: AppProfile = {
      id: `browser-${browserSetupApp.executable}-${websiteUrl.toLowerCase()}-${Date.now()}`,
      appName: browserSetupApp.executable,
      displayName: `${websiteUrl} (${browserSetupApp.name})`,
      systemPrompt: systemPrompt || CATEGORY_PROMPTS.browser,
      enabled: true,
      websiteUrl,
      // safe fallback (only matches if the host is literally present in the title)
      windowTitlePattern: escapeRegexLiteral(hostOnly),
      iconBase64: browserSetupApp.icon_base64,
    };
    AppProfileService.addProfile(newProfile);
    setBrowserSetupApp(null);
    loadProfiles();
  };

  const handleBrowserAppSetupSave = (variant: BrowserVariant, websiteKeyword: string) => {
    if (!browserAppSetup) return;
    
    const newProfile: AppProfile = {
      id: `${browserAppSetup.id}-${variant.browserId}-${websiteKeyword.toLowerCase()}-${Date.now()}`,
      appName: variant.executable,
      displayName: `${websiteKeyword} (${variant.browserName})`,
      systemPrompt: browserAppSetup.systemPrompt,
      enabled: true,
      windowTitlePattern: websiteKeyword,
    };
    AppProfileService.addProfile(newProfile);
    setBrowserAppSetup(null);
    loadProfiles();
  };

  const handleSaveProfile = (profile: AppProfile) => {
    if (editingProfile) {
      AppProfileService.updateProfile(profile.id, profile);
    } else {
      AppProfileService.addProfile(profile);
    }
    setIsModalOpen(false);
    setEditingProfile(null);
    loadProfiles();
  };

  const handleDeleteProfile = (id: string) => {
    AppProfileService.deleteProfile(id);
    setIsModalOpen(false);
    setEditingProfile(null);
    loadProfiles();
  };

  const getProfileForApp = (executable: string) => profiles.find(p => 
    p.appName.toLowerCase() === executable.toLowerCase() && !p.windowTitlePattern
  );
  
  // Get profiles for a browser (can have multiple with different windowTitlePatterns)
  const getProfilesForBrowser = (executable: string) => profiles.filter(p => 
    p.appName.toLowerCase() === executable.toLowerCase()
  );
  
  const customProfiles = profiles.filter(p => 
    !installedPopularApps.some(app => app.executable.toLowerCase() === p.appName.toLowerCase()) &&
    p.appName && p.appName.trim() !== ''
  );

  const groupedApps = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = installedPopularApps.filter(app => app.category === category);
    return acc;
  }, {} as Record<string, InstalledApp[]>);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>App Profiles</h2>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Configure app-specific prompts for context-aware transcription formatting.</p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {/* Skeleton loading UI */}
          {['Code Editors', 'Communication', 'Browsers'].map((category, catIndex) => (
            <div key={category}>
              <div className={`h-4 w-24 rounded mb-3 animate-pulse ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} />
              <div className="space-y-2">
                {[1, 2, 3].slice(0, catIndex === 0 ? 3 : 2).map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-300'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon skeleton */}
                      <div className={`w-10 h-10 rounded-lg animate-pulse ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} />
                      <div className="flex-1 space-y-2">
                        {/* Name skeleton */}
                        <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} style={{ width: `${80 + idx * 20}px` }} />
                        {/* Executable skeleton */}
                        <div className={`h-3 w-20 rounded animate-pulse ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`} />
                      </div>
                    </div>
                    {/* Toggle skeleton */}
                    <div className={`w-10 h-6 rounded-full animate-pulse ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map(category => {
            const apps = groupedApps[category];
            if (!apps || apps.length === 0) return null;

            return (
              <div key={category}>
                <h3 className={`text-sm font-medium mb-3 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-2">
                  {apps.map(app => {
                    const isBrowserApp = isBrowser(app.category);
                    const browserProfiles = isBrowserApp ? getProfilesForBrowser(app.executable) : [];
                    const profile = !isBrowserApp ? getProfileForApp(app.executable) : null;
                    const isEnabled = isBrowserApp ? browserProfiles.length > 0 : !!profile;
                    const popularAppData = POPULAR_APPS.find(p => p.executable?.toLowerCase() === app.executable.toLowerCase());

                    return (
                      <div key={app.executable}>
                        <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isDark ? 'bg-[#1a1a1a] border-[#333] hover:bg-[#202020]' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl overflow-hidden ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`}>
                              {app.icon_base64 ? (
                                <img src={`data:image/png;base64,${app.icon_base64}`} alt={app.name} className="w-full h-full object-contain" />
                              ) : (
                                CATEGORY_ICONS[app.category] || '📦'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{profile?.displayName || app.name}</h4>
                                {isBrowserApp && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Browser</span>
                                )}
                                {popularAppData?.isBrowserBased && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${isDark ? 'bg-[#333] text-gray-500' : 'bg-gray-200 text-gray-600'}`}>Web App</span>
                                )}
                              </div>
                              <p className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{app.executable}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!isBrowserApp && isEnabled && (
                              <button
                                onClick={() => { setEditingProfile(profile!); setIsModalOpen(true); }}
                                className={`p-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {isBrowserApp ? (
                              <button
                                onClick={() => setBrowserSetupApp(app)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                              >
                                + Add Website
                              </button>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleTogglePopularInstalled(app, popularAppData, isEnabled)}
                                className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Browser profiles (accordion) */}
                        {isBrowserApp && browserProfiles.length > 0 && (
                          <div className="ml-6 mt-2">
                            <button
                              onClick={() => toggleBrowserAccordion(app.executable)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'bg-[#151515] border border-[#252525] hover:bg-[#1b1b1b]' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}
                            >
                              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {browserProfiles.length} website{browserProfiles.length === 1 ? '' : 's'}
                              </span>
                              <svg
                                className={`w-4 h-4 transition-transform ${expandedBrowsers[app.executable.toLowerCase()] ? 'rotate-180' : ''} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {expandedBrowsers[app.executable.toLowerCase()] && (
                              <div className="mt-2 space-y-1">
                                {browserProfiles.map(bp => (
                                  <div 
                                    key={bp.id}
                                    className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-[#151515] border border-[#252525]' : 'bg-gray-50 border border-gray-200'}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{bp.displayName}</span>
                                      {bp.websiteUrl && (
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${isDark ? 'bg-[#252525] text-gray-500' : 'bg-gray-200 text-gray-600'}`}>
                                          {bp.websiteUrl}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => { setEditingProfile(bp); setIsModalOpen(true); }}
                                      className={`p-1.5 rounded cursor-pointer transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {installedPopularApps.length === 0 && (
            <div className={`text-center py-8 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No popular apps detected. Add a custom app below.</p>
            </div>
          )}

          {customProfiles.length > 0 && (
            <div>
              <h3 className={`text-sm font-medium mb-3 uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Custom Apps</h3>
              <div className="space-y-2">
                {customProfiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isDark ? 'bg-[#1a1a1a] border-[#333] hover:bg-[#202020]' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl overflow-hidden ${isDark ? 'bg-[#252525]' : 'bg-gray-100'}`}>
                        {profile.iconBase64 ? (
                          <img src={`data:image/png;base64,${profile.iconBase64}`} alt={profile.displayName} className="w-full h-full object-contain" />
                        ) : (
                          '🛠️'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{profile.displayName}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>Custom</span>
                        </div>
                        <p className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{profile.appName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingProfile(profile); setIsModalOpen(true); }}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setEditingProfile(null); setIsModalOpen(true); }}
            className={`w-full py-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${isDark ? 'border-[#333] hover:border-emerald-500/50 hover:bg-[#1a1a1a] text-gray-400 hover:text-emerald-400' : 'border-gray-300 hover:border-emerald-500 hover:bg-gray-50 text-gray-500 hover:text-emerald-600'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Add Custom App</span>
            </span>
          </button>
        </div>
      )}

      {/* Browser Setup Modal */}
      {browserSetupApp && (
        <BrowserSetupModal
          browserApp={browserSetupApp}
          theme={theme}
          onSave={handleBrowserSetupSave}
          onClose={() => setBrowserSetupApp(null)}
          existingProfiles={profiles}
        />
      )}

      {/* Browser-based App Setup Modal */}
      {browserAppSetup && (
        <BrowserAppSetupModal
          app={browserAppSetup}
          theme={theme}
          onSave={handleBrowserAppSetupSave}
          onClose={() => setBrowserAppSetup(null)}
          existingProfiles={profiles}
        />
      )}

      {/* Profile Edit Modal */}
      <ProfileModal
        profile={editingProfile}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProfile(null); }}
        onSave={handleSaveProfile}
        onDelete={handleDeleteProfile}
        existingProfiles={profiles}
        theme={theme}
      />
    </div>
  );
};
