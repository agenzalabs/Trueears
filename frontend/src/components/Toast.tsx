import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  bottomOffset?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose, bottomOffset }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-emerald-500/90',
    error: 'bg-rose-500/90',
    info: 'bg-blue-500/90',
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[10000] animate-fadeIn"
      style={{ bottom: bottomOffset ?? 48 }}
    >
      <div className={`${bgColors[type]} text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2 text-xs font-medium`}>
        {type === 'error' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === 'success' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};
