import React, { useState, useEffect } from 'react';
import { X, Minimize2, Power } from 'lucide-react';

export interface ExitConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'hide' | 'exit', rememberChoice?: boolean) => void;
}

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [selectedAction, setSelectedAction] = useState<'hide' | 'exit'>('hide');
  const [rememberChoice, setRememberChoice] = useState(false);

  // 当对话框打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('hide');
      setRememberChoice(false);
    }
  }, [isOpen]);

  // ESC键关闭对话框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedAction, rememberChoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 对话框容器 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-[400px] max-w-[90vw]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            退出确认
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="关闭对话框"
          >
            <X size={18} />
          </button>
        </div>

        {/* 提示文本 */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          您要关闭窗口，请选择操作：
        </p>

        {/* 选项 */}
        <div className="space-y-3 mb-6">
          {/* 隐藏到系统托盘选项 */}
          <div
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedAction === 'hide'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            onClick={() => setSelectedAction('hide')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedAction === 'hide'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedAction === 'hide' && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <Minimize2 className={`${
                selectedAction === 'hide' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`} size={20} />
              <div>
                <div className={`font-medium ${
                  selectedAction === 'hide'
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  隐藏到系统托盘
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  程序继续在后台运行，可从托盘图标恢复
                </div>
              </div>
            </div>
          </div>

          {/* 完全退出选项 */}
          <div
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedAction === 'exit'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            onClick={() => setSelectedAction('exit')}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedAction === 'exit'
                  ? 'border-red-500 bg-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedAction === 'exit' && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <Power className={`${
                selectedAction === 'exit' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`} size={20} />
              <div>
                <div className={`font-medium ${
                  selectedAction === 'exit'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  完全退出
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  关闭程序，停止所有运行
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 记住选择复选框 */}
        <div className="flex items-center space-x-3 mb-6">
          <input
            type="checkbox"
            id="remember-choice"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label 
            htmlFor="remember-choice" 
            className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
          >
            记住我的选择，下次不再询问
          </label>
        </div>

        {/* 按钮组 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              selectedAction === 'hide'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {selectedAction === 'hide' ? '隐藏到托盘' : '退出程序'}
          </button>
        </div>
      </div>
    </div>
  );
};
