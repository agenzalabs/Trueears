import React from 'react';
import { Spinner } from '@/components/ui/ios-spinner';

interface StatusIndicatorProps {
  status: 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled' | 'setup' | 'settings' | 'warning' | 'log-config-needed' | 'log-saved' | 'none';
  onSettingsClick: () => void;
  isDark?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, onSettingsClick, isDark = false }) => {
  // Determine if the indicator should be visible
  // We hide it for recording, setup, settings, warning, and log-config-needed modes
  const isVisible = status !== 'recording' && status !== 'setup' && status !== 'settings' && status !== 'warning' && status !== 'log-config-needed';

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
    >
      {status === 'success' || status === 'log-saved' ? (
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : status === 'error' ? (
        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : status === 'cancelled' ? (
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        // Idle or Processing (Subtle pulse if processing)
        // We render this even if hidden to allow transition, but only if not success/error
        <div className="relative group flex items-center justify-center w-full h-full">
          <div className="relative flex items-center justify-center w-full h-full">
            {status === 'processing' ? (
              <Spinner size="sm" className={isDark ? 'text-white' : 'text-gray-800'} />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#9ca3af' }} />
            )}
          </div>
          
          {/* Settings Trigger (Only visible on hover of the dot in idle) */}
          {status === 'idle' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
              className="absolute -top-3 -right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
