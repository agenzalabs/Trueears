import { useCallback, useEffect, useState } from 'react';
import {
  currentMonitor,
  getCurrentWindow,
  monitorFromPoint,
  primaryMonitor,
  type Monitor,
} from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { tauriAPI } from '../utils/tauriApi';
import { debug } from '../utils/debug';

/** Gap in CSS pixels between the capsule and the bottom edge of the screen. */
const BOTTOM_GAP = 48;

export interface OverlayAnchor {
  /** CSS pixels between the capsule and the bottom edge of the overlay window. */
  bottom: number;
  /** CSS pixels between the capsule centre and the left edge of the overlay window. */
  left: number | string;
}

/** Linux runs the overlay as a small centred panel, so the window *is* the capsule area. */
const LINUX_ANCHOR: OverlayAnchor = { bottom: 12 + BOTTOM_GAP, left: '50%' };

/** Neutral first-frame value, replaced as soon as the real geometry is read. */
const INITIAL_ANCHOR: OverlayAnchor = { bottom: 200 + BOTTOM_GAP, left: '50%' };

/**
 * Pick the monitor the capsule should be drawn on. The overlay window spans the
 * whole desktop, so `currentMonitor()` is ambiguous for it - the monitor under
 * the cursor is the screen the user is actually working on.
 */
const resolveTargetMonitor = async (): Promise<Monitor | null> => {
  const cursor = await tauriAPI.getCursorPosition();
  if (cursor) {
    try {
      const monitor = await monitorFromPoint(cursor.x, cursor.y);
      if (monitor) return monitor;
    } catch (error) {
      debug.log('[useOverlayAnchor] monitorFromPoint failed:', error);
    }
  }

  try {
    const monitor = await primaryMonitor();
    if (monitor) return monitor;
  } catch (error) {
    debug.log('[useOverlayAnchor] primaryMonitor failed:', error);
  }

  try {
    return await currentMonitor();
  } catch (error) {
    debug.log('[useOverlayAnchor] currentMonitor failed:', error);
    return null;
  }
};

/**
 * Translate the desktop-spanning overlay window into "bottom centre of the
 * screen the user is on", in CSS pixels.
 *
 * Window position/size and monitor bounds are physical pixels; CSS offsets are
 * logical pixels, so everything has to be divided by the scale factor. Getting
 * that wrong (or reading the geometry once at startup and never again) is what
 * pushed the capsule off-screen while recording carried on working.
 */
const resolveAnchor = async (): Promise<OverlayAnchor> => {
  const appWindow = getCurrentWindow();
  const [position, size, scaleFactor] = await Promise.all([
    appWindow.outerPosition(),
    appWindow.outerSize(),
    appWindow.scaleFactor(),
  ]);

  const monitor = await resolveTargetMonitor();

  if (!monitor || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    // Fall back to the old assumption: the window is padded symmetrically
    // around a desktop whose top-left corner is (0, 0).
    debug.log('[useOverlayAnchor] No monitor info - falling back to symmetric padding');
    return { bottom: Math.abs(Math.min(position.y, 0)) + BOTTOM_GAP, left: '50%' };
  }

  // How far the window extends past the bottom edge of the target monitor.
  const overflowBelow = position.y + size.height - (monitor.position.y + monitor.size.height);
  const bottom = Math.max(0, overflowBelow) / scaleFactor + BOTTOM_GAP;
  const left = (monitor.position.x + monitor.size.width / 2 - position.x) / scaleFactor;

  debug.log('[useOverlayAnchor] Resolved anchor', {
    window: { x: position.x, y: position.y, width: size.width, height: size.height },
    monitor: {
      name: monitor.name,
      x: monitor.position.x,
      y: monitor.position.y,
      width: monitor.size.width,
      height: monitor.size.height,
    },
    scaleFactor,
    anchor: { bottom, left },
  });

  return { bottom, left };
};

/**
 * Keeps the capsule anchored to the bottom centre of the active screen.
 *
 * Recomputed on mount, whenever the OS moves/resizes/rescales the overlay
 * window (docking, resolution or DPI changes, monitor sleep), and on demand via
 * `refresh()` right before the overlay is shown.
 */
export const useOverlayAnchor = (isLinux: boolean) => {
  const [anchor, setAnchor] = useState<OverlayAnchor>(isLinux ? LINUX_ANCHOR : INITIAL_ANCHOR);

  const refresh = useCallback(async (): Promise<void> => {
    if (isLinux) {
      setAnchor(LINUX_ANCHOR);
      return;
    }

    try {
      const next = await resolveAnchor();
      setAnchor((prev) => (prev.bottom === next.bottom && prev.left === next.left ? prev : next));
    } catch (error) {
      console.error('[useOverlayAnchor] Failed to resolve overlay anchor:', error);
    }
  }, [isLinux]);

  useEffect(() => {
    let disposed = false;
    const unlisten: UnlistenFn[] = [];

    void refresh();

    if (!isLinux) {
      void (async () => {
        try {
          const appWindow = getCurrentWindow();
          const handler = () => {
            void refresh();
          };
          const subscriptions = await Promise.all([
            appWindow.onMoved(handler),
            appWindow.onResized(handler),
            appWindow.onScaleChanged(handler),
          ]);

          if (disposed) {
            subscriptions.forEach((stop) => stop());
          } else {
            unlisten.push(...subscriptions);
          }
        } catch (error) {
          console.error('[useOverlayAnchor] Failed to watch window geometry:', error);
        }
      })();
    }

    return () => {
      disposed = true;
      unlisten.forEach((stop) => stop());
    };
  }, [isLinux, refresh]);

  return { anchor, refreshAnchor: refresh };
};
