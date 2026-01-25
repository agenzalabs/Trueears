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
}) => {
    const isDark = theme === 'dark';

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className={`p-8 rounded-2xl ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-[#252525]' : 'bg-gray-100'} animate-pulse`} />
                        <div className="flex-1">
                            <div className={`h-5 w-32 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-100'} animate-pulse mb-2`} />
                            <div className={`h-4 w-48 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-100'} animate-pulse`} />
                        </div>
                    </div>
                </div>
            );
        }

        if (!isAuthenticated || !user) {
            return (
                <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${isDark ? 'bg-[#1a1a1a] border border-[#333] hover:border-[#444]' : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                    {/* Header Section */}
                    <div className="p-8 pb-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide mb-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'}`}>
                                    ACCOUNT
                                </div>
                                <h3 className={`font-bold text-xl mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                    Sign in to <span className="text-emerald-500">Trueears</span>
                                </h3>
                                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Sync your settings across devices and unlock premium features.
                                </p>
                            </div>

                            {/* Trueears Logo */}
                            <div className={`group w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDark ? 'bg-[#252525] hover:bg-[#2a2a2a]' : 'bg-gray-50 hover:bg-white hover:shadow-md'} shadow-sm`}>
                                <svg className={`w-7 h-7 transition-colors duration-300 ${isDark ? 'text-gray-300 group-hover:text-emerald-400' : 'text-gray-700 group-hover:text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                                <li key={idx} className="flex items-center gap-3 group">
                                    <div className={`p-1 rounded-full ${isDark ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-emerald-50 group-hover:bg-emerald-100'} transition-colors`}>
                                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className={`text-sm transition-colors ${isDark ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-800'}`}>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Action Button */}
                    <div className={`p-6 ${isDark ? 'bg-[#202020] border-t border-[#333]' : 'bg-gray-50 border-t border-gray-100'}`}>
                        <button
                            onClick={login}
                            className={`w-full py-3 rounded-xl font-semibold text-sm uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3 ${
                                isDark 
                                    ? 'bg-white text-gray-900 hover:bg-emerald-400 hover:border-emerald-400 border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
                                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg'
                            }`}
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

        // Authenticated
        return (
            <div className="space-y-6">
                {/* Profile Card */}
                <div className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
                    {/* Profile Header - Added gradient background for depth */}
                    <div className={`p-8 relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-transparent to-[#252525]/50' : 'bg-gradient-to-r from-transparent to-gray-50/80'}`}>
                        <div className="relative z-10 flex items-center gap-6">
                            {/* Profile Picture with Ring */}
                            {user.picture ? (
                                <div className="relative group">
                                    <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 ${isDark ? 'bg-emerald-500' : 'bg-emerald-400'}`}></div>
                                    <img
                                        src={user.picture}
                                        alt={user.name || 'Profile'}
                                        className={`relative w-20 h-20 rounded-2xl object-cover shadow-lg ${isDark ? 'ring-4 ring-[#252525]' : 'ring-4 ring-white'}`}
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ${isDark ? 'bg-emerald-500 ring-[#1a1a1a]' : 'bg-emerald-500 ring-white'}`}>
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className={`w-20 h-20 rounded-2xl ${isDark ? 'bg-emerald-500/20 text-emerald-400 ring-4 ring-[#252525]' : 'bg-emerald-50 text-emerald-600 ring-4 ring-white'} flex items-center justify-center`}>
                                    <span className="text-3xl font-bold">
                                        {(user.name || user.email)[0].toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide mb-2 ${isDark ? 'bg-[#252525] text-gray-300 border border-[#333]' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    FREE PLAN
                                </div>
                                <h3 className={`font-bold text-2xl truncate mb-0.5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {user.name || 'User'}
                                </h3>
                                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section with vertical dividers style */}
                    <div className={`px-8 py-5 grid grid-cols-3 gap-4 border-y ${isDark ? 'bg-[#151515]/50 border-[#333]' : 'bg-gray-50/50 border-gray-100'}`}>
                        {[
                            { label: 'Plan', value: 'Free' },
                            { label: 'Cloud Sync', value: 'Active', highlight: true },
                            { label: 'Account', value: 'Verified', highlight: true }
                        ].map((stat, idx) => (
                            <div key={idx} className={`text-center relative ${idx !== 2 ? (isDark ? 'after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-px after:bg-[#333]' : 'after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-px after:bg-gray-200') : ''}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {stat.label}
                                </p>
                                <p className={`text-sm font-bold ${stat.highlight ? 'text-emerald-500' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Sign Out Button */}
                    <div className="p-6">
                        <button
                            onClick={logout}
                            className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group ${isDark
                                ? 'bg-[#252525] text-gray-400 hover:bg-[#333] hover:text-gray-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                }`}
                        >
                            <svg className={`w-4 h-4 transition-transform group-hover:-translate-x-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Upgrade Card - More premium look */}
                <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${isDark ? 'bg-[#1a1a1a] border-[#333] hover:border-emerald-500/30' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
                    {/* Background Gradient Mesh */}
                    <div className={`absolute inset-0 opacity-100 ${isDark ? 'bg-gradient-to-br from-emerald-900/10 via-transparent to-emerald-900/5' : 'bg-gradient-to-br from-emerald-50 via-transparent to-emerald-50/50'}`} />
                    
                    <div className="relative p-8">
                        <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isDark ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-emerald-900/20' : 'bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-emerald-100'}`}>
                                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        Upgrade to Pro
                                    </h4>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
                                        RECOMMENDED
                                    </span>
                                </div>
                                <p className={`text-sm mb-5 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Take your productivity to the next level with unlimited dictation, priority processing, and advanced features.
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {[
                                        'Unlimited dictation',
                                        'Priority AI processing',
                                        'Custom vocabulary',
                                        'Premium support'
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'}`} />
                                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>Upgrade Now</span>
                                    <span className="opacity-80 font-normal">—</span>
                                    <span>$9/month</span>
                                    <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Account</h2>
            {renderContent()}
        </div>
    );
};

export default AccountSection;
