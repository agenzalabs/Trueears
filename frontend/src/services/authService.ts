import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface AuthState {
  is_authenticated: boolean;
  user: UserInfo | null;
}

export const authService = {
  /**
   * Start Google OAuth login flow
   * Opens browser for Google sign-in
   */
  startGoogleLogin: async (): Promise<void> => {
    return invoke('start_google_login');
  },

  /**
   * Get current authentication state
   */
  getAuthState: async (): Promise<AuthState> => {
    return invoke('get_auth_state');
  },

  /**
   * Logout - clears tokens from keychain
   */
  logout: async (): Promise<void> => {
    return invoke('logout');
  },

  /**
   * Get stored user info
   */
  getUserInfo: async (): Promise<UserInfo | null> => {
    return invoke('get_user_info');
  },

  /**
   * Get stored access token for authenticated API requests
   */
  getAccessToken: async (): Promise<string | null> => {
    return invoke('get_access_token');
  },

  /**
   * Get a valid access token, transparently refreshing it if the stored one
   * has expired. Returns null if no valid token can be obtained.
   */
  getValidAccessToken: async (): Promise<string | null> => {
    return invoke('get_valid_access_token');
  },

  /**
   * Force a token refresh using the stored refresh token.
   * Returns the new access token, or null if refresh failed.
   */
  refreshToken: async (): Promise<string | null> => {
    return invoke('refresh_auth_token');
  },

  /**
   * Listen for auth success event
   */
  onAuthSuccess: async (callback: (user: UserInfo) => void): Promise<() => void> => {
    return listen<UserInfo>('auth-success', (event) => {
      callback(event.payload);
    });
  },

  /**
   * Listen for auth error event
   */
  onAuthError: async (callback: (error: string) => void): Promise<() => void> => {
    return listen<string>('auth-error', (event) => {
      callback(event.payload);
    });
  },
};
