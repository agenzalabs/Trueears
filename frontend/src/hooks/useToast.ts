import { useState, useCallback } from 'react';
import { ToastType } from '../components/Toast';

export const useToast = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');

  const showToast = useCallback((msg: string, toastType: ToastType = 'info', delayMs: number = 0) => {
    setMessage(msg);
    setType(toastType);
    if (delayMs > 0) {
      setTimeout(() => setIsVisible(true), delayMs);
    } else {
      setIsVisible(true);
    }
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    message,
    type,
    showToast,
    hideToast
  };
};
