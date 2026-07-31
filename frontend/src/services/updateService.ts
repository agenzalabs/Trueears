import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type UpdateState = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface UpdateStatus {
  state: UpdateState;
  /** Version being offered, once known. */
  version: string | null;
  /** Release notes from the update manifest. */
  notes: string | null;
  /** Download progress, 0-100. */
  progress: number | null;
  error: string | null;
}

export const IDLE_UPDATE_STATUS: UpdateStatus = {
  state: 'idle',
  version: null,
  notes: null,
  progress: null,
  error: null,
};

const isTauri = () => '__TAURI_INTERNALS__' in window;

/**
 * Updates are checked and downloaded by the Rust side (so it happens whether or
 * not the settings window is open, and survives that window closing). This is
 * just the read/act surface for the UI.
 */
export const updateService = {
  /** Current status, including an update downloaded before this window opened. */
  getStatus: async (): Promise<UpdateStatus> => {
    if (!isTauri()) return IDLE_UPDATE_STATUS;
    try {
      return await invoke<UpdateStatus>('get_update_status');
    } catch (error) {
      console.error('[updateService] Failed to read update status:', error);
      return IDLE_UPDATE_STATUS;
    }
  },

  /** Force a check now. Resolves once the check (and any download) finishes. */
  check: async (): Promise<UpdateStatus> => {
    if (!isTauri()) return IDLE_UPDATE_STATUS;
    return await invoke<UpdateStatus>('check_for_update');
  },

  /**
   * Install the downloaded update and restart.
   * On Windows the process exits here, so nothing after this runs.
   * Rejects if a recording is in progress.
   */
  install: async (): Promise<void> => {
    if (!isTauri()) return;
    await invoke('install_update');
  },

  /** Subscribe to status changes pushed from the backend. */
  onStatusChange: async (callback: (status: UpdateStatus) => void) => {
    if (!isTauri()) return () => {};
    try {
      return await listen<UpdateStatus>('update-status', (event) => callback(event.payload));
    } catch (error) {
      console.error('[updateService] Failed to listen for update status:', error);
      return () => {};
    }
  },

  /**
   * Report whether the microphone is live, so the backend can refuse to install
   * (which kills the process) in the middle of a recording.
   */
  setRecordingActive: async (active: boolean): Promise<void> => {
    if (!isTauri()) return;
    try {
      await invoke('set_recording_active', { active });
    } catch (error) {
      console.error('[updateService] Failed to report recording state:', error);
    }
  },
};
