'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700 dark:border-gray-600 min-w-[250px]">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-pre-line">{message}</span>
      </div>
    </div>
  );
}

