import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  onConfirm: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = '确定',
  onConfirm,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertCircle size={20} className="text-orange-600 dark:text-orange-400" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
      default:
        return <Info size={20} className="text-blue-600 dark:text-blue-400" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'bg-orange-100 dark:bg-orange-900/20';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-blue-100 dark:bg-blue-900/20';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return '成功';
      case 'warning':
        return '警告';
      case 'error':
        return '错误';
      default:
        return '提示';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl ${getIconBg()} flex items-center justify-center`}>
              {getIcon()}
            </div>
            <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">
              {title || getDefaultTitle()}
            </h3>
          </div>
          <button
            onClick={onConfirm}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-slate-300 font-chinese leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 pt-0">
          <button
            onClick={onConfirm}
            className={`px-6 py-2 ${getButtonColor()} text-white rounded-xl font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};