import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

console.log('[tauriAPI] Module loaded');

// Check if we're in Tauri context
const isTauri = () => {
    return '__TAURI_INTERNALS__' in window;
};

export const tauriAPI = {
    onToggleRecording: async (callback: () => void) => {
        console.log('[tauriAPI] Setting up toggle-recording listener, isTauri:', isTauri());
        try {
            if (!isTauri()) {
                console.warn('[tauriAPI] Not in Tauri context, skipping listener setup');
                return () => {};
            }
            const unlisten = await listen('toggle-recording', () => {
                console.log('[tauriAPI] toggle-recording event received!');
                callback();
            });
            console.log('[tauriAPI] toggle-recording listener registered successfully');
            return unlisten;
        } catch (error) {
            console.error('[tauriAPI] Failed to register toggle-recording listener:', error);
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
    }
};
