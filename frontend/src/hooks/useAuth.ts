import { useState, useEffect, useCallback } from 'react';
import { authService, AuthState, UserInfo } from '../services/authService';
import { paymentService } from '../services/paymentService';

interface UseAuthReturn {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshAuthState: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<UserInfo | null>(null);

    // Load initial auth state
    const refreshAuthState = useCallback(async () => {
        try {
            const [state, accessToken] = await Promise.all([
                authService.getAuthState(),
                authService.getAccessToken().catch((error) => {
                    console.error('[useAuth] Failed to fetch access token:', error);
                    return null;
                }),
            ]);
            setIsAuthenticated(state.is_authenticated);
            setUser(state.user);

            if (state.is_authenticated && accessToken) {
                paymentService.setAuthToken(accessToken);
            } else {
                paymentService.clearAuthToken();
            }
        } catch (error) {
            console.error('[useAuth] Failed to get auth state:', error);
            setIsAuthenticated(false);
            setUser(null);
            paymentService.clearAuthToken();
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initialize and listen for auth events
    useEffect(() => {
        let unlistenSuccess: (() => void) | undefined;
        let unlistenError: (() => void) | undefined;

        const init = async () => {
            // Load initial state
            await refreshAuthState();

            // Listen for auth success
            unlistenSuccess = await authService.onAuthSuccess((userInfo) => {
                console.log('[useAuth] Auth success:', userInfo.email);
                setIsLoading(true);
                void refreshAuthState();
            });

            // Listen for auth error
            unlistenError = await authService.onAuthError((error) => {
                console.error('[useAuth] Auth error:', error);
                setIsLoading(false);
            });
        };

        init();

        return () => {
            if (unlistenSuccess) unlistenSuccess();
            if (unlistenError) unlistenError();
        };
    }, [refreshAuthState]);

    // Start login flow
    const login = useCallback(async () => {
        try {
            setIsLoading(true);
            await authService.startGoogleLogin();
            // Auth state will be updated via events
        } catch (error) {
            console.error('[useAuth] Login failed:', error);
            setIsLoading(false);
            throw error;
        }
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            setIsLoading(true);
            await authService.logout();
            setIsAuthenticated(false);
            setUser(null);
            paymentService.clearAuthToken();
        } catch (error) {
            console.error('[useAuth] Logout failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        refreshAuthState,
    };
};
