import { listen, emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Store } from '@tauri-apps/plugin-store';
import { ActiveWindowInfo } from '../types/appProfile';

console.log('[tauriAPI] Module loaded');

// Check if we're in Tauri context
const isTauri = () => {
    return '__TAURI_INTERNALS__' in window;
};

export const tauriAPI = {
    onToggleRecording: async (callback: (windowInfo?: ActiveWindowInfo | null) => void) => {
        console.log('[tauriAPI] Setting up toggle-recording listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen<ActiveWindowInfo | null>('toggle-recording', (event) => {
                console.log('[tauriAPI] toggle-recording event received with payload:', event.payload);
                callback(event.payload);
            });
            console.log('[tauriAPI] toggle-recording listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register toggle-recording listener:', error);
            return () => {};
        }
    },

    onOnboardingTrigger: async (callback: () => void) => {
        console.log('[tauriAPI] Setting up onboarding-trigger listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen('onboarding-trigger', () => {
                console.log('[tauriAPI] onboarding-trigger event received');
                callback();
            });
            console.log('[tauriAPI] onboarding-trigger listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register onboarding-trigger listener:', error);
            return () => {};
        }
    },

    onOnboardingTriggerState: async (callback: (active: boolean) => void) => {
        console.log('[tauriAPI] Setting up onboarding-trigger-state listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen<boolean>('onboarding-trigger-state', (event) => {
                console.log('[tauriAPI] onboarding-trigger-state event received:', event.payload);
                callback(!!event.payload);
            });
            console.log('[tauriAPI] onboarding-trigger-state listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register onboarding-trigger-state listener:', error);
            return () => {};
        }
    },
    
    onOpenSettings: async (callback: () => void) => {
        console.log('[tauriAPI] Setting up open-settings listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen('open-settings', () => {
                console.log('[tauriAPI] open-settings event received!');
                callback();
            });
            console.log('[tauriAPI] open-settings listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register open-settings listener:', error);
            return () => {};
        }
    },
    
    onShowWarning: async (callback: (message: string) => void) => {
        console.log('[tauriAPI] Setting up show-warning listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen<string>('show-warning', (event) => {
                console.log('[tauriAPI] show-warning event received:', event.payload);
                callback(event.payload);
            });
            console.log('[tauriAPI] show-warning listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register show-warning listener:', error);
            return () => {};
        }
    },
    
    setIgnoreMouseEvents: async (ignore: boolean) => {
        try {
            if (!isTauri()) {
                return;
            }
            const window = getCurrentWindow();
            await window.setIgnoreCursorEvents(ignore);
        } catch (error) {
            console.error('[tauriAPI] Failed to set ignore cursor events:', error);
        }
    },
    
    sendTranscription: async (text: string) => {
        console.log('[tauriAPI] Sending transcription:', text, 'isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping invoke');
                return;
            }
            await invoke('transcription_complete', { text });
            console.log('[tauriAPI] Transcription sent successfully');
        } catch (error) {
            console.error('[tauriAPI] Failed to send transcription:', error);
        }
    },
    
    hideWindow: async () => {
        try {
            if (!isTauri()) {
                return;
            }
            const window = getCurrentWindow();
            await window.hide();
        } catch (error) {
            console.error('[tauriAPI] Failed to hide window:', error);
        }
    },
    
    getActiveWindowInfo: async (): Promise<ActiveWindowInfo | null> => {
        console.log('[tauriAPI] Getting active window info, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, returning null');
                return null;
            }
            const windowInfo = await invoke<ActiveWindowInfo | null>('get_active_window_info');
            console.log('[tauriAPI] Active window info:', windowInfo);
            return windowInfo;
        } catch (error) {
            console.error('[tauriAPI] Failed to get active window info:', error);
            return null;
        }
    },

    openSettingsWindow: async (): Promise<void> => {
        console.log('[tauriAPI] Opening settings window, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, cannot open settings window');
                return;
            }
            await invoke('open_settings_window');
            console.log('[tauriAPI] Settings window opened');
        } catch (error) {
            console.error('[tauriAPI] Failed to open settings window:', error);
        }
    },

    emitSettingsChanged: async (): Promise<void> => {
        // Event is now emitted from backend
    },

    onSettingsChanged: async (callback: () => void) => {
        try {
            if (!isTauri()) return () => {};
            const unlisten = await listen('settings-changed', () => {
                console.log('[tauriAPI] settings-changed event received');
                callback();
            });
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register settings-changed listener:', error);
            return () => {};
        }
    },

    getStoreValue: async (key: string): Promise<string | null> => {
        try {
            if (!isTauri()) return null;
            const value = await invoke<string | null>('get_store_value', { key });
            return value;
        } catch (error) {
            console.error('[tauriAPI] Failed to get store value:', error);
            return null;
        }
    },

    setStoreValue: async (key: string, value: string): Promise<void> => {
        try {
            if (!isTauri()) return;
            await invoke('set_store_value', { key, value });
        } catch (error) {
            console.error('[tauriAPI] Failed to set store value:', error);
        }
    },

    setWindowTitle: async (title: string): Promise<void> => {
        try {
            document.title = title; // Sync DOM title
            if (!isTauri()) return;
            console.log('[tauriAPI] Setting window title to:', title);
            const window = getCurrentWindow();
            await window.setTitle(title);
            console.log('[tauriAPI] Window title set command sent');
        } catch (error) {
            console.error('[tauriAPI] Failed to set window title:', error);
        }
    },

    setOnboardingTriggerActive: async (active: boolean): Promise<void> => {
        try {
            if (!isTauri()) return;
            console.log('[tauriAPI] Setting onboarding trigger active:', active);
            await invoke('set_onboarding_trigger_active', { active });
        } catch (error) {
            console.error('[tauriAPI] Failed to set onboarding trigger active:', error);
        }
    }
};
