import React, { useState, useEffect } from 'react';
import { authService, UserInfo } from '../../services/authService';

interface StepProps {
    onNext: () => void;
    onPrev: () => void;
}

export const StepSignIn: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Check if user is already signed in on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const state = await authService.getAuthState();
                if (state.is_authenticated && state.user) {
                    setUser(state.user);
                }
            } catch (_err) {
                // Not signed in, that's fine
            }
        };
        checkAuth();
    }, []);

    const handleSignIn = async () => {
        try {
            setIsLoading(true);
            setError(null);
            await authService.startGoogleLogin();

            // Listen for auth success
            const unlisten = await authService.onAuthSuccess((userInfo) => {
                setUser(userInfo);
                setIsLoading(false);
                unlisten();
            });

            // Also listen for errors
            const unlistenError = await authService.onAuthError((err) => {
                setError(err);
                setIsLoading(false);
                unlistenError();
            });
        } catch (err) {
            setError('Failed to start sign-in');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-600 mb-6 tracking-wide w-fit">
                STEP 1 OF 7
            </div>

            <h2 className="font-bold text-2xl text-gray-900 mb-3 leading-tight">
                Welcome to Trueears
            </h2>

            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Sign in with your Google account to get started and sync your settings across devices.
            </p>

            {/* User Profile (if signed in) */}
            {user ? (
                <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-auto">
                    {user.picture ? (
                        <img
                            src={user.picture}
                            alt={user.name || 'Profile'}
                            className="w-12 h-12 rounded-full"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                            {(user.name || user.email)[0].toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            ) : (
                <>
                    {/* Features */}
                    <ul className="space-y-4 flex-1">
                        {[
                            { text: 'Cloud backup for all your settings' },
                            { text: 'Sync app profiles across devices' },
                            { text: 'Priority support access' }
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                {feature.text}
                            </li>
                        ))}
                    </ul>

                    {/* Error message */}
                    {error && (
                        <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}
                </>
            )}

            {/* Button */}
            <div className="mt-auto pt-8">
                {user ? (
                    <button
                        onClick={onNext}
                        className="w-full py-4 rounded-xl font-semibold text-sm uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                    >
                        Continue
                    </button>
                ) : (
                    <button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl font-semibold text-sm tracking-wide bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Sign in with Google</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

// Visual component for right panel
StepSignIn.Visual = function Visual() {
    return (
        <div className="flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease]">
            {/* Trueears Logo */}
            <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-8">
                <svg className="w-14 h-14 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>

            {/* App name */}
            <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-tight">Trueears</h1>
            <p className="text-gray-400 text-sm">AI-Powered Voice Dictation</p>

            {/* Floating accent dots */}
            <div className="flex items-center gap-2 mt-8">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
        </div>
    );
};
