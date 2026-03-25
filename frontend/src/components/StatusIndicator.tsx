import React from 'react';
import { Spinner } from '@/components/ui/ios-spinner';

interface StatusIndicatorProps {
  status: 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled' | 'setup' | 'settings' | 'warning' | 'log-config-needed' | 'log-saved' | 'none';
  onSettingsClick: () => void;
  isDark?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, onSettingsClick, isDark = false }) => {
  const isVisible = status !== 'recording' && status !== 'setup' && status !== 'settings' && status !== 'warning' && status !== 'log-config-needed';
  const isIdle = status === 'idle' || status === 'none';

  const iconColor = isDark ? 'text-white' : 'text-gray-800';
  const dotBg = isDark ? 'bg-white' : 'bg-gray-800';
  const settingsColor = isDark ? '#ffffff' : '#1f2937';

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
    >
      <div className="group relative flex items-center justify-center">
        <div className="flex h-6 w-6 items-center justify-center">
            {status === 'success' || status === 'log-saved' ? (
              <svg className={`h-3.5 w-3.5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'error' ? (
              <svg className={`h-3.5 w-3.5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : status === 'cancelled' ? (
              <svg className={`h-3.5 w-3.5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : status === 'processing' ? (
              <Spinner size="sm" className={iconColor} />
            ) : (
              <div className={`h-1.5 w-1.5 rounded-full ${dotBg}`} />
            )}
        </div>

        {isIdle && (
          <button
            onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 p-1 opacity-0 transition-all duration-200 group-hover:translate-x-7 group-hover:opacity-100"
            style={{ color: settingsColor }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
