import React from 'react';
import { UserInfo } from '../../services/authService';

interface AccountSectionProps {
    theme: 'light' | 'dark';
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshAuthState: () => Promise<void>;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
    theme,
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshAuthState
}) => {
    const isDark = theme === 'dark';

    if (isLoading) {
        return (
            <div className={`p-8 rounded-2xl ${isDark ? 'bg-[#0a0a0a] border border-[#1a1a1a]' : 'bg-gray-50 border border-gray-100'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-[#151515]' : 'bg-gray-200'} animate-pulse`} />
                    <div className="flex-1">
                        <div className={`h-5 w-32 rounded-lg ${isDark ? 'bg-[#151515]' : 'bg-gray-200'} animate-pulse mb-2`} />
                        <div className={`h-4 w-48 rounded-lg ${isDark ? 'bg-[#151515]' : 'bg-gray-200'} animate-pulse`} />
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#0a0a0a] border border-[#1a1a1a]' : 'bg-gray-50 border border-gray-100'}`}>
                {/* Header Section */}
                <div className="p-8 pb-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide mb-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'}`}>
                                ACCOUNT
                            </div>
                            <h3 className={`font-bold text-xl mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                Sign in to <span className="text-emerald-500">Scribe</span>
                            </h3>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                Sync your settings across devices and unlock premium features.
                            </p>
                        </div>

                        {/* Scribe Logo */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#151515]' : 'bg-white'} shadow-lg`}>
                            <svg className={`w-7 h-7 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Features List */}
                <div className="px-8 py-6">
                    <ul className="space-y-3">
                        {[
                            'Cloud-synced app profiles',
                            'Settings backup & restore',
                            'Priority support access'
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-3">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Action Button */}
                <div className={`p-6 ${isDark ? 'bg-[#0f0f0f] border-t border-[#1a1a1a]' : 'bg-white border-t border-gray-100'}`}>
                    <button
                        onClick={login}
                        className="w-full py-4 rounded-xl font-semibold text-sm uppercase tracking-wider bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    // Authenticated state
    return (
        <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#0a0a0a] border border-[#1a1a1a]' : 'bg-gray-50 border border-gray-100'}`}>
            {/* Profile Header */}
            <div className="p-8">
                <div className="flex items-center gap-5">
                    {/* Profile Picture */}
                    {user.picture ? (
                        <div className="relative">
                            <img
                                src={user.picture}
                                alt={user.name || 'Profile'}
                                className="w-16 h-16 rounded-2xl object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-500/10'} flex items-center justify-center`}>
                            <span className="text-2xl font-bold text-emerald-500">
                                {(user.name || user.email)[0].toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1">
                        <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wide mb-1 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                            CONNECTED
                        </div>
                        <h3 className={`font-['Syne'] font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {user.name || 'User'}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            {user.email}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats/Info Section */}
            <div className={`px-8 py-5 grid grid-cols-3 gap-4 ${isDark ? 'bg-[#0f0f0f] border-y border-[#1a1a1a]' : 'bg-white border-y border-gray-100'}`}>
                {[
                    { label: 'Plan', value: 'Pro', highlight: true },
                    { label: 'Synced', value: 'Yes' },
                    { label: 'Status', value: 'Active' }
                ].map((stat, idx) => (
                    <div key={idx} className="text-center">
                        <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {stat.label}
                        </p>
                        <p className={`text-sm font-bold ${stat.highlight ? 'text-emerald-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Action Button */}
            <div className="p-6">
                <button
                    onClick={logout}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${isDark
                        ? 'bg-[#151515] text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border border-[#252525]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-200'
                        }`}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default AccountSection;
