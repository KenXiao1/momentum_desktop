import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertDialog } from './AlertDialog';
import { ConfirmationDialog } from './ConfirmationDialog';
import { PromptDialog } from './PromptDialog';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

interface DialogState {
  type: 'alert' | 'confirm' | 'prompt' | null;
  options: any;
  resolve: ((value: any) => void) | null;
}

interface DialogProviderProps {
  children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    type: null,
    options: {},
    resolve: null,
  });

  const showAlert = (options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setDialogState({
        type: 'alert',
        options,
        resolve,
      });
    });
  };

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        type: 'confirm',
        options,
        resolve,
      });
    });
  };

  const showPrompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialogState({
        type: 'prompt',
        options,
        resolve,
      });
    });
  };

  const closeDialog = () => {
    setDialogState({
      type: null,
      options: {},
      resolve: null,
    });
  };

  const handleAlertConfirm = () => {
    if (dialogState.resolve) {
      dialogState.resolve(undefined);
    }
    closeDialog();
  };

  const handleConfirmResult = (result: boolean) => {
    if (dialogState.resolve) {
      dialogState.resolve(result);
    }
    closeDialog();
  };

  const handlePromptResult = (result: string | null) => {
    if (dialogState.resolve) {
      dialogState.resolve(result);
    }
    closeDialog();
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      
      {/* Dialog Container with highest z-index */}
      <div style={{ zIndex: 999999, position: 'relative' }}>
        {/* Alert Dialog */}
        <AlertDialog
          isOpen={dialogState.type === 'alert'}
          title={dialogState.options.title}
          message={dialogState.options.message || ''}
          type={dialogState.options.type}
          confirmText={dialogState.options.confirmText}
          onConfirm={handleAlertConfirm}
        />

        {/* Confirm Dialog */}
        <ConfirmationDialog
          isOpen={dialogState.type === 'confirm'}
          title={dialogState.options.title || '确认'}
          message={dialogState.options.message || ''}
          confirmText={dialogState.options.confirmText || '确定'}
          cancelText={dialogState.options.cancelText || '取消'}
          confirmButtonClass={dialogState.options.confirmButtonClass}
          onConfirm={() => handleConfirmResult(true)}
          onCancel={() => handleConfirmResult(false)}
        />

        {/* Prompt Dialog */}
        <PromptDialog
          isOpen={dialogState.type === 'prompt'}
          title={dialogState.options.title}
          message={dialogState.options.message || ''}
          placeholder={dialogState.options.placeholder}
          defaultValue={dialogState.options.defaultValue}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          onConfirm={(value) => handlePromptResult(value)}
          onCancel={() => handlePromptResult(null)}
        />
      </div>
    </DialogContext.Provider>
  );
};

// 便捷的全局函数，用于替换原生的alert、confirm、prompt
export const createDialogHelpers = (dialog: DialogContextType) => {
  return {
    alert: (message: string, title?: string, type?: 'info' | 'success' | 'warning' | 'error') => {
      return dialog.showAlert({ message, title, type });
    },
    confirm: (message: string, title?: string) => {
      return dialog.showConfirm({ message, title });
    },
    prompt: (message: string, defaultValue?: string, title?: string) => {
      return dialog.showPrompt({ message, defaultValue, title });
    },
  };
};