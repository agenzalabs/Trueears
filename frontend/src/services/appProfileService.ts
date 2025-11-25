import { AppProfile, ActiveWindowInfo, DEFAULT_APP_PROFILES, DEFAULT_SYSTEM_PROMPT, BASE_SYSTEM_PROMPT } from '../types/appProfile';
import { tauriAPI } from '../utils/tauriApi';

const STORAGE_KEY = 'SCRIBE_APP_PROFILES';

export class AppProfileService {
  static getProfiles(): AppProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load app profiles:', error);
    }
    // Return default profiles if none are stored
    return DEFAULT_APP_PROFILES;
  }

  static saveProfiles(profiles: AppProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      tauriAPI.emitSettingsChanged();
    } catch (error) {
      console.error('Failed to save app profiles:', error);
    }
  }

  static matchProfile(windowInfo: ActiveWindowInfo | null, profiles?: AppProfile[]): AppProfile | null {
    if (!windowInfo) {
      return null;
    }

    const profileList = profiles || this.getProfiles();
    
    // Get candidates: enabled profiles where appName matches (case-insensitive, partial)
    const candidates = profileList.filter(
      profile => 
        profile.enabled && 
        windowInfo.app_name.toLowerCase().includes(profile.appName.toLowerCase().replace('.exe', ''))
    );

    if (candidates.length === 0) {
      return null;
    }

    // Among candidates, find those with windowTitlePattern that matches
    const titleMatches = candidates.filter(profile => {
      if (!profile.windowTitlePattern) return false;
      try {
        const regex = new RegExp(profile.windowTitlePattern, 'i');
        return regex.test(windowInfo.window_title);
      } catch (error) {
        console.warn(`Invalid regex pattern for profile ${profile.id}: ${profile.windowTitlePattern}`, error);
        return false;
      }
    });

    // If any title matches, take the first one
    if (titleMatches.length > 0) {
      return titleMatches[0];
    }

    // Otherwise, take the first candidate (backwards compatibility)
    return candidates[0];
  }

  static getSystemPrompt(windowInfo: ActiveWindowInfo | null, defaultPrompt?: string): string {
    const profile = this.matchProfile(windowInfo);
    
    // Always start with the base system prompt (contains "DO NOT respond" instructions)
    let fullPrompt = BASE_SYSTEM_PROMPT;
    
    // Append profile-specific or default formatting instructions
    if (profile) {
      console.log(`[AppProfileService] Matched profile: ${profile.displayName}`);
      fullPrompt += '\n\n' + profile.systemPrompt;
    } else {
      console.log('[AppProfileService] No profile matched, using default formatting');
      fullPrompt += '\n\n' + (defaultPrompt || DEFAULT_SYSTEM_PROMPT);
    }
    
    return fullPrompt;
  }

  static addProfile(profile: AppProfile): void {
    const profiles = this.getProfiles();
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
    this.saveProfiles(DEFAULT_APP_PROFILES);
  }
}
