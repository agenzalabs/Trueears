/**
 * Debug logging utility that can be disabled in production.
 *
 * Usage:
 *   import { debug } from '../utils/debug';
 *   debug.log('[Component]', 'message', data);
 *
 * To disable all debug logs, set DEBUG_ENABLED to false.
 */

// Enable debug logging in development, disable in production
const DEBUG_ENABLED = import.meta.env.DEV;

export const debug = {
  log: (...args: unknown[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export default debug;
