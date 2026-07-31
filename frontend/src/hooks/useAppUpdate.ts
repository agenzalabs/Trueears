import { useCallback, useEffect, useState } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { IDLE_UPDATE_STATUS, updateService, type UpdateStatus } from '../services/updateService';

/**
 * Live view of the background updater, plus the two actions the UI needs.
 *
 * Checking and downloading happen in Rust; this hook only reflects that state
 * and lets the user trigger a check or the restart-and-install.
 */
export const useAppUpdate = () => {
  const [status, setStatus] = useState<UpdateStatus>(IDLE_UPDATE_STATUS);
  const [isChecking, setIsChecking] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;

    void (async () => {
      const current = await updateService.getStatus();
      if (!disposed) setStatus(current);

      const stop = await updateService.onStatusChange((next) => {
        if (!disposed) setStatus(next);
      });

      if (disposed) stop();
      else unlisten = stop;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const check = useCallback(async () => {
    setInstallError(null);
    setIsChecking(true);
    try {
      const next = await updateService.check();
      setStatus(next);
    } catch (error) {
      console.error('[useAppUpdate] Update check failed:', error);
      setStatus({
        ...IDLE_UPDATE_STATUS,
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    setInstallError(null);
    try {
      // On Windows this never returns - the process exits and the installer
      // relaunches the app.
      await updateService.install();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[useAppUpdate] Update install failed:', error);
      setInstallError(message);
    }
  }, []);

  return {
    status,
    /** True while a manual check triggered from this window is running. */
    isChecking: isChecking || status.state === 'checking',
    isDownloading: status.state === 'downloading',
    isReady: status.state === 'ready',
    installError,
    check,
    installAndRestart,
  };
};
