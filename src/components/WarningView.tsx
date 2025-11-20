import React from 'react';

interface WarningViewProps {
  message: string;
}

export const WarningView: React.FC<WarningViewProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center w-full h-full px-3 gap-2 animate-fadeIn text-amber-400">
       <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
       </svg>
       <span className="text-xs font-medium whitespace-nowrap">{message}</span>
    </div>
  );
};
