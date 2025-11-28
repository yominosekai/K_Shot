'use client';

import { ReactNode } from 'react';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

export type ConfirmDialogVariant = 'default' | 'danger' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  title?: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  ConfirmDialogVariant,
  { icon: ReactNode; iconClass: string; confirmClass: string }
> = {
  default: {
    icon: <HelpCircle className="w-6 h-6" />,
    iconClass: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconClass: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
  danger: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconClass: 'text-red-500 bg-red-50 dark:bg-red-900/30',
    confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
};

export function ConfirmDialog({
  open,
  title = '確認',
  message = '',
  confirmText = 'OK',
  cancelText = 'キャンセル',
  hideCancel = false,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const config = variantConfig[variant];
  const renderedMessage =
    typeof message === 'string' ? (
      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{message}</p>
    ) : (
      message
    );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${config.iconClass}`}>{config.icon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <div className="mt-3">{renderedMessage}</div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            {!hideCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors ${config.confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

