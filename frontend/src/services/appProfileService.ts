import { AppProfile, ActiveWindowInfo, DEFAULT_APP_PROFILES, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';

const STORAGE_KEY = 'Trueears_APP_PROFILES';

type ProfilesListener = (profiles: AppProfile[]) => void;

// In-memory cache (fast sync reads for prompt matching)
let cachedProfiles: AppProfile[] = [];
let cacheInitialized = false;
let loadPromise: Promise<void> | null = null;
let storeListenerRegistered = false;
const listeners = new Set<ProfilesListener>();

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Old default profile IDs that should be removed
const OLD_DEFAULT_IDS = new Set([
  'vscode', 'cursor', 'slack', 'discord', 'outlook', 'chrome', 
  'notion', 'onenote', 'word', 'whatsapp', 'whatsapp-firefox'
]);

// Validate that a profile has required fields
function isValidProfile(p: AppProfile): boolean {
  return !!(
    p.id && 
    p.displayName && 
    p.displayName.trim() !== '' &&
    p.appName && 
    p.appName.trim() !== '' &&
    !OLD_DEFAULT_IDS.has(p.id) &&
    !p.id.startsWith('tutorial-')
  );
}

function parseProfiles(raw: string | null): AppProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AppProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidProfile);
  } catch {
    return [];
  }
}

function readProfilesFromLocalStorage(): AppProfile[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  const valid = parseProfiles(stored);
  // Keep localStorage clean (remove invalid/legacy profiles)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppProfile[];
      if (Array.isArray(parsed) && parsed.length !== valid.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return valid;
}

function writeProfilesToLocalStorage(profiles: AppProfile[]): void {
  cachedProfiles = profiles;
  cacheInitialized = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function notifyListeners(): void {
  for (const cb of listeners) {
    try {
      cb(cachedProfiles);
    } catch (e) {
      console.warn('[AppProfileService] listener error', e);
    }
  }
}

export class AppProfileService {
  static subTrueears(cb: ProfilesListener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  static async ensureLoaded(): Promise<void> {
    // In Tauri, profiles must be hydrated from the durable store (settings.json),
    // even if we already have a local cache (e.g. legacy localStorage during migration).
    if (!isTauriRuntime()) {
      if (!cacheInitialized) {
        cachedProfiles = readProfilesFromLocalStorage();
        cacheInitialized = true;
        notifyListeners();
      }
      return;
    }
    if (!loadPromise) {
      loadPromise = this.bootstrapStoreSync();
    }
    await loadPromise;
  }

  static getProfiles(): AppProfile[] {
    if (!cacheInitialized) {
      // Synchronous fallback: allow immediate UI render.
      // In Tauri we will migrate this to store ASAP and then clear localStorage.
      cachedProfiles = readProfilesFromLocalStorage();
      cacheInitialized = true;
      notifyListeners();

      // Start async store sync/migration (authoritative in Tauri)
      void this.ensureLoaded();
    }
    return cachedProfiles;
  }

  static saveProfiles(profiles: AppProfile[]): void {
    try {
      // Only save valid profiles
      const toSave = profiles.filter(isValidProfile);
      cachedProfiles = toSave;
      cacheInitialized = true;
      notifyListeners();

      if (isTauriRuntime()) {
        // Persist to Tauri store (durable + cross-window)
        void tauriAPI.setStoreValue(STORAGE_KEY, JSON.stringify(toSave));
        // Do not persist profiles in localStorage in production (can be per-window / confusing)
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      } else {
        // Browser/dev fallback
        writeProfilesToLocalStorage(toSave);
      }
    } catch (error) {
      console.error('Failed to save app profiles:', error);
    }
  }

  static matchProfile(windowInfo: ActiveWindowInfo | null, profiles?: AppProfile[]): AppProfile | null {
    if (!windowInfo) {
      console.log('[AppProfileService] No window info provided');
      return null;
    }

    const activeApp = windowInfo.app_name.toLowerCase();
    const activePath = (windowInfo.executable_path || '').toLowerCase();
    const activeBasename = activePath.split(/[\\/]/).pop() || activeApp;
    const activeStem = activeBasename.endsWith('.exe')
      ? activeBasename.replace(/\.exe$/i, '')
      : activeBasename;
    const activeUrlCanon = normalizeWebsiteUrl(windowInfo.url);

    console.log('[AppProfileService] Matching profile for:', {
      app_name: windowInfo.app_name,
      window_title: windowInfo.window_title,
      activeBasename,
      activeStem,
      url: windowInfo.url
    });

    const storedProfiles = profiles || this.getProfiles();
    const tutorialProfiles = DEFAULT_APP_PROFILES.filter(p => p.id.startsWith('tutorial-'));
    const allProfiles = [...storedProfiles, ...tutorialProfiles.filter(tp => !storedProfiles.some(sp => sp.id === tp.id))];
    
    console.log('[AppProfileService] Total profiles to check:', allProfiles.length);
    
    // Get candidates where appName matches
    const candidates = allProfiles.filter(
      profile => 
        profile.enabled && 
        profile.appName && 
        matchesExecutable(profile.appName, activeApp, activeBasename, activeStem)
    );

    console.log('[AppProfileService] Matching candidates:', candidates.map(c => ({ id: c.id, appName: c.appName, windowTitlePattern: c.windowTitlePattern })));

    if (candidates.length === 0) {
      console.log('[AppProfileService] No candidates matched');
      return null;
    }

    // 1) Prefer URL matches for browser profiles (when URL is available)
    if (activeUrlCanon) {
      const urlMatches = candidates
        .filter(p => !!p.websiteUrl)
        .map(p => ({ p, canon: normalizeWebsiteUrl(p.websiteUrl) }))
        .filter((x): x is { p: AppProfile; canon: string } => !!x.canon)
        // Prefer most-specific match (longest canonical URL)
        .sort((a, b) => b.canon.length - a.canon.length)
        .filter(({ canon }) => urlMatchesCanonical(activeUrlCanon, canon))
        .map(x => x.p);

      if (urlMatches.length > 0) {
        console.log('[AppProfileService] Using URL-matched profile:', urlMatches[0].displayName);
        return urlMatches[0];
      }
    }

    // Among candidates, match by:
    // - explicit title pattern (regex), OR
    // - best-effort title keywords derived from websiteUrl (when URL is not available)
    const titleMatches = candidates.filter(profile => {
      const title = windowInfo.window_title || '';
      let matched = false;

      if (profile.windowTitlePattern) {
        try {
          const regex = new RegExp(profile.windowTitlePattern, 'i');
          matched = regex.test(title);
          console.log(`[AppProfileService] Title pattern "${profile.windowTitlePattern}" vs "${title}": ${matched}`);
        } catch {
          // ignore invalid regex
        }
      }

      // If URL isn't available (common for browsers), try keywords derived from websiteUrl.
      if (!matched && !activeUrlCanon && profile.websiteUrl) {
        const canon = normalizeWebsiteUrl(profile.websiteUrl);
        const keywords = canon ? deriveTitleKeywordsFromWebsiteUrl(canon) : [];
        const lowerTitle = title.toLowerCase();
        const kwMatch = keywords.find(k => lowerTitle.includes(k));
        if (kwMatch) {
          matched = true;
          console.log(`[AppProfileService] Title keyword "${kwMatch}" (from websiteUrl "${canon}") vs "${title}": true`);
        }
      }

      return matched;
    });

    if (titleMatches.length > 0) {
      console.log('[AppProfileService] Using title-matched profile:', titleMatches[0].displayName);
      return titleMatches[0];
    }

    // If no title matches, return app-only matches (no title pattern)
    const appOnlyMatches = candidates.filter(profile => !profile.windowTitlePattern);
    if (appOnlyMatches.length > 0) {
      console.log('[AppProfileService] Using app-only profile:', appOnlyMatches[0].displayName);
      return appOnlyMatches[0];
    }
    
    console.log('[AppProfileService] No suitable profile found (all had windowTitlePattern but none matched)');
    return null;
  }

  static getSystemPrompt(
    windowInfo: ActiveWindowInfo | null,
    defaultPrompt?: string,
    matchedProfile?: AppProfile | null
  ): string {
    const profile = matchedProfile ?? this.matchProfile(windowInfo);
    let fullPrompt = BASE_SYSTEM_PROMPT;
    
    if (profile && profile.systemPrompt) {
      console.log(`[AppProfileService] Matched profile: ${profile.displayName}`);
      fullPrompt += '\n\n' + profile.systemPrompt;
    } else {
      console.log('[AppProfileService] No profile matched, using default formatting');
      fullPrompt += '\n\n' + (defaultPrompt || DEFAULT_SYSTEM_PROMPT);
    }
    
    return fullPrompt;
  }

  static addProfile(profile: AppProfile): void {
    if (!isValidProfile(profile)) {
      console.warn('Attempted to add invalid profile:', profile);
      return;
    }
    
    const profiles = this.getProfiles();
    
    // Check for duplicate
    const exists = profiles.some(p => isDuplicateProfile(p, profile));
    
    if (exists) {
      console.warn('Profile already exists for:', profile.appName);
      return;
    }
    
    profiles.push(profile);
    this.saveProfiles(profiles);
  }

  static updateProfile(id: string, updates: Partial<AppProfile>): void {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates };
      this.saveProfiles(profiles);
    }
  }

  static deleteProfile(id: string): void {
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    this.saveProfiles(filtered);
  }

  static resetToDefaults(): void {
    cachedProfiles = [];
    cacheInitialized = true;
    localStorage.removeItem(STORAGE_KEY);
    // Best-effort: clear store value as well
    void tauriAPI.setStoreValue(STORAGE_KEY, '');
    notifyListeners();
  }
  
  // Clean up any invalid profiles from storage
  static cleanup(): void {
    // Clean localStorage once (legacy), then migrate to store in Tauri
    const valid = readProfilesFromLocalStorage();
    cachedProfiles = valid;
    cacheInitialized = true;
    notifyListeners();

    // Kick off store sync/migration in background
    void this.ensureLoaded();
  }

  /**
   * Ensure profiles are stored durably (Tauri store) and shared across windows.
   * - If store has data, it wins and overwrites localStorage cache.
   * - If store is empty but localStorage has data, migrate localStorage -> store.
   * Also listens for 'settings-changed' and refreshes cache.
   */
  private static async bootstrapStoreSync(): Promise<void> {
    if (!isTauriRuntime()) {
      // Non-Tauri: localStorage is the source of truth
      cachedProfiles = readProfilesFromLocalStorage();
      cacheInitialized = true;
      notifyListeners();
      return;
    }

    if (!storeListenerRegistered) {
      storeListenerRegistered = true;
      try {
        // Listen for cross-window changes (set_store_value emits this)
        await tauriAPI.onSettingsChanged(() => {
          void this.refreshFromStore(false);
        });
      } catch (e) {
        console.warn('[AppProfileService] Failed to register settings-changed listener:', e);
      }
    }

    // Initial sync/migration
    await this.refreshFromStore(true);
  }

  private static async refreshFromStore(allowMigrationFromLocalStorage: boolean): Promise<void> {
    try {
      const storeRaw = await tauriAPI.getStoreValue(STORAGE_KEY);
      if (storeRaw && storeRaw.trim() !== '') {
        // Store wins (even if empty list). If store value is corrupt, ignore it.
        try {
          const parsed = JSON.parse(storeRaw) as AppProfile[];
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(isValidProfile);
            cachedProfiles = valid;
            cacheInitialized = true;
            notifyListeners();
            // Remove any legacy localStorage copy so users see a single source of truth.
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            return;
          }
        } catch {
          // fall through to migration
        }
      }

      if (allowMigrationFromLocalStorage) {
        // Store is empty or missing: migrate localStorage once (legacy installs)
        const local = readProfilesFromLocalStorage();
        cachedProfiles = local;
        cacheInitialized = true;
        notifyListeners();

        if (local.length > 0) {
          await tauriAPI.setStoreValue(STORAGE_KEY, JSON.stringify(local));
        } else {
          // Persist empty list to establish the key
          await tauriAPI.setStoreValue(STORAGE_KEY, '[]');
        }

        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
    } catch (e) {
      console.warn('[AppProfileService] Failed to refresh profiles from store:', e);
    }
  }
}

// Run cleanup on module load
AppProfileService.cleanup();

function matchesExecutable(profileExe: string, activeApp: string, activeBasename: string, activeStem: string): boolean {
  const profileLower = profileExe.toLowerCase();
  const profileStem = profileLower.replace(/\.exe$/i, '');
  return (
    activeApp.includes(profileStem) ||
    activeBasename === profileLower ||
    activeBasename === profileStem ||
    activeStem === profileStem
  );
}

const BROWSER_EXECUTABLES = new Set([
  'chrome.exe',
  'chrome',
  'google-chrome',
  'msedge.exe',
  'msedge',
  'microsoft-edge',
  'firefox.exe',
  'firefox',
  'brave.exe',
  'brave',
  'brave-browser',
  'opera.exe',
  'opera',
  'vivaldi.exe',
  'vivaldi',
  'arc.exe',
  'arc',
  'chromium',
  'chromium-browser',
]);

function isBrowserExecutable(exe: string): boolean {
  const lower = (exe || '').toLowerCase().trim();
  const base = lower.split(/[\\/]/).pop() || lower;
  return BROWSER_EXECUTABLES.has(base);
}

/**
 * Normalize a website URL/domain for storage + comparison.
 * Returns a canonical string like "mail.google.com" or "github.com/org".
 */
function normalizeWebsiteUrl(raw?: string | null): string | null {
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
    // Best-effort fallback (still useful for de-dupe)
    return input.toLowerCase();
  }
}

function urlMatchesCanonical(activeCanon: string, profileCanon: string): boolean {
  if (activeCanon === profileCanon) return true;
  if (activeCanon.startsWith(profileCanon)) {
    const next = activeCanon.charAt(profileCanon.length);
    return next === '' || next === '/';
  }
  return false;
}

function deriveTitleKeywordsFromWebsiteUrl(canon: string): string[] {
  // canon examples: "web.whatsapp.com", "mail.google.com", "github.com/org/repo"
  const host = canon.split('/')[0].toLowerCase();
  const tokens = new Set<string>();

  // Known special cases where the title doesn't include the domain parts
  const special: Array<[RegExp, string[]]> = [
    [/^mail\.google\.com$/, ['gmail']],
    [/^calendar\.google\.com$/, ['calendar']],
    [/^docs\.google\.com$/, ['docs', 'google docs']],
    [/^drive\.google\.com$/, ['drive']],
    [/^meet\.google\.com$/, ['meet']],
    [/^web\.whatsapp\.com$/, ['whatsapp']],
    [/^whatsapp\.com$/, ['whatsapp']],
    [/^discord\.com$/, ['discord']],
    [/^slack\.com$/, ['slack']],
    [/^outlook\.office\.com$/, ['outlook']],
    [/^teams\.microsoft\.com$/, ['teams']],
  ];
  for (const [re, kws] of special) {
    if (re.test(host)) {
      kws.forEach(k => tokens.add(k.toLowerCase()));
    }
  }

  const hostParts = host.split('.').filter(Boolean);
  // Drop common TLDs and generic prefixes
  const GENERIC = new Set(['www', 'web', 'app', 'm', 'mobile', 'home', 'start', 'login', 'accounts', 'mail']);
  const TLD = new Set(['com', 'net', 'org', 'io', 'app', 'dev', 'ai', 'co', 'uk', 'us', 'in', 'de', 'fr', 'jp', 'cn']);

  for (const p of hostParts) {
    const part = p.toLowerCase();
    if (GENERIC.has(part) || TLD.has(part)) continue;
    if (part.length >= 3) tokens.add(part);
  }

  // Also consider the registrable-ish domain label (second-to-last) when present
  if (hostParts.length >= 2) {
    const d = hostParts[hostParts.length - 2].toLowerCase();
    if (!GENERIC.has(d) && !TLD.has(d) && d.length >= 3) tokens.add(d);
  }

  // Sort longest-first so we match the most specific keyword first
  return Array.from(tokens).sort((a, b) => b.length - a.length);
}

function isDuplicateProfile(existing: AppProfile, incoming: AppProfile): boolean {
  const existingExe = (existing.appName || '').toLowerCase();
  const incomingExe = (incoming.appName || '').toLowerCase();
  if (existingExe !== incomingExe) return false;

  // For browsers: prevent duplicate (same exe + same normalized URL)
  if (isBrowserExecutable(incomingExe)) {
    const a = normalizeWebsiteUrl(existing.websiteUrl);
    const b = normalizeWebsiteUrl(incoming.websiteUrl);
    if (a && b) return a === b;
    // Back-compat: older browser profiles may only have windowTitlePattern
    const ap = (existing.windowTitlePattern || '').trim().toLowerCase();
    const bp = (incoming.windowTitlePattern || '').trim().toLowerCase();
    return ap !== '' && bp !== '' && ap === bp;
  }

  // For non-browsers: only 1 profile per executable
  return true;
}
