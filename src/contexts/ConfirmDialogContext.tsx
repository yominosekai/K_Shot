'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import ConfirmDialog, {
  ConfirmDialogProps,
  ConfirmDialogVariant,
} from '@/components/ConfirmDialog';

type ConfirmDialogOptions = Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>;

interface ConfirmDialogState {
  open: boolean;
  options: ConfirmDialogOptions;
  resolver: ((value: boolean) => void) | null;
}

const defaultOptions: ConfirmDialogOptions = {
  title: '確認',
  message: '',
  confirmText: 'OK',
  cancelText: 'キャンセル',
  hideCancel: false,
  variant: 'default' as ConfirmDialogVariant,
};

const ConfirmDialogContext = createContext<{
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    options: defaultOptions,
    resolver: null,
  });

  const closeDialog = useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolver?.(result);
      return {
        open: false,
        options: defaultOptions,
        resolver: null,
      };
    });
  }, []);

  const confirm = useCallback(
    (options: ConfirmDialogOptions) => {
      return new Promise<boolean>((resolve) => {
        setState({
          open: true,
          options: { ...defaultOptions, ...options },
          resolver: resolve,
        });
      });
    },
    []
  );

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        {...state.options}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context.confirm;
}

