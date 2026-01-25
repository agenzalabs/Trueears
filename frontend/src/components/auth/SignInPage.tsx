import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SignInPageProps {
    onSuccess?: () => void;
}

// Visual component for the right panel (matches StepConnect pattern)
const SignInVisual: React.FC = () => {
    return (
        <div className="w-80 bg-white/90 backdrop-blur-xl border border-gray-300 rounded-2xl p-6 shadow-2xl transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0 hover:scale-105">
            {/* Header */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-100" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-100" />
                <div className="ml-auto text-[10px] font-mono text-gray-600">OAUTH</div>
            </div>
            {/* Body */}
            <div className="font-mono text-[11px] leading-relaxed text-gray-400 space-y-1">
                <div className="flex gap-2">
                    <span className="text-gray-600">$</span>
                    <span className="text-gray-300">Trueears auth --provider=google</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-gray-600">{'>'}</span>
                    <span className="text-gray-500">initiating oauth handshake...</span>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="text-gray-600">{'>'}</span>
                    <span className="text-emerald-400">awaiting authorization</span>
                    <span className="w-1.5 h-3.5 bg-emerald-500 animate-pulse inline-block align-middle" />
                </div>
            </div>
        </div>
    );
};

export const SignInPage: React.FC<SignInPageProps> = ({ onSuccess }) => {
    const { login, isLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            await login();
            // Success will be handled by auth events
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-white text-gray-800 font-sans overflow-hidden p-8">
            {/* Main Modal Container - matching OnboardingWizard design */}
            <div className="relative w-[960px] h-[640px] bg-[#f8fafc] border border-gray-200 rounded-3xl shadow-[0_0_120px_-30px_rgba(16,185,129,0.05)] flex overflow-hidden">

                {/* Left Panel - Interactive */}
                <div className="w-[42%] p-12 flex flex-col border-r border-gray-100 bg-white relative z-10">

                    {/* Logo/Branding */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
                            <span>Authentication</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4 text-gray-900">
                            Welcome to<br />
                            <span className="text-emerald-400">Trueears</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
                            Sign in to sync your settings and access premium features. Your data is encrypted and secure.
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Sign In Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-['Syne'] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3
                ${isLoading
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:-translate-y-0.5 shadow-sm hover:shadow-lg cursor-pointer'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 relative text-gray-400">
                                        {[...Array(12)].map((_, i) => (
                                            <div key={i} className="spinner-blade" />
                                        ))}
                                    </div>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    {/* Google Icon */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </>
                            )}
                        </button>

                        {/* Skip for now */}
                        <div className="text-center mt-6">
                            <button
                                className="text-[10px] text-gray-600 hover:text-gray-800 transition-colors border-b border-transparent hover:border-gray-500 cursor-pointer"
                            >
                                Continue without signing in ↗
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-8">
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            By signing in, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>

                {/* Right Panel - Visuals */}
                <div className="w-[58%] bg-[#f8fafc] relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                        }}
                    />

                    <div className="relative w-full h-full flex items-center justify-center p-12">
                        <SignInVisual />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;
