import React, { useState, useEffect } from 'react';
import { X, Settings, Minimize2, Power, RotateCcw } from 'lucide-react';
import { userPreferences } from '../utils/userPreferences';
import { useDialog } from './DialogManager';

export interface WindowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowSettingsModal: React.FC<WindowSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const dialog = useDialog();
  const [exitBehavior, setExitBehavior] = useState<'ask' | 'hide' | 'exit'>('ask');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalBehavior, setOriginalBehavior] = useState<'ask' | 'hide' | 'exit'>('ask');

  // 加载当前设置
  useEffect(() => {
    if (isOpen) {
      const currentBehavior = userPreferences.getExitBehavior();
      setExitBehavior(currentBehavior);
      setOriginalBehavior(currentBehavior);
      setHasChanges(false);
    }
  }, [isOpen]);

  // 检测设置变化
  useEffect(() => {
    setHasChanges(exitBehavior !== originalBehavior);
  }, [exitBehavior, originalBehavior]);

  // ESC键关闭对话框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = async () => {
    if (hasChanges) {
      const confirmed = await dialog.showConfirm({
        message: '您有未保存的更改，确定要关闭吗？',
        title: '确认关闭'
      });
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    userPreferences.setExitBehavior(exitBehavior);
    setOriginalBehavior(exitBehavior);
    setHasChanges(false);
    onClose();
  };

  const handleReset = async () => {
    const confirmed = await dialog.showConfirm({
      message: '确定要重置为默认设置吗？这将清除所有窗口相关的偏好设置。',
      title: '重置设置'
    });
    if (confirmed) {
      userPreferences.setExitBehavior('ask');
      setExitBehavior('ask');
      setOriginalBehavior('ask');
      setHasChanges(false);
    }
  };

  if (!isOpen) return null;

  const getBehaviorDescription = (behavior: 'ask' | 'hide' | 'exit') => {
    switch (behavior) {
      case 'ask':
        return '每次点击关闭按钮时都会询问您的选择';
      case 'hide':
        return '点击关闭按钮时自动隐藏到系统托盘';
      case 'exit':
        return '点击关闭按钮时直接退出应用程序';
    }
  };

  const getBehaviorIcon = (behavior: 'ask' | 'hide' | 'exit') => {
    switch (behavior) {
      case 'ask':
        return <Settings className="w-5 h-5" />;
      case 'hide':
        return <Minimize2 className="w-5 h-5" />;
      case 'exit':
        return <Power className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 对话框容器 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-[500px] max-w-[90vw]">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              窗口设置
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="关闭设置"
          >
            <X size={20} />
          </button>
        </div>

        {/* 设置内容 */}
        <div className="space-y-6">
          {/* 退出行为设置 */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              点击关闭按钮时的行为
            </h4>
            <div className="space-y-3">
              {(['ask', 'hide', 'exit'] as const).map((behavior) => (
                <div
                  key={behavior}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    exitBehavior === behavior
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => setExitBehavior(behavior)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      exitBehavior === behavior
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {exitBehavior === behavior && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div className={`${
                      exitBehavior === behavior 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {getBehaviorIcon(behavior)}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        exitBehavior === behavior
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {behavior === 'ask' && '总是询问'}
                        {behavior === 'hide' && '隐藏到托盘'}
                        {behavior === 'exit' && '直接退出'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getBehaviorDescription(behavior)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>提示：</strong> 您可以随时通过右键点击标题栏或系统托盘图标来重新打开此设置界面。
            </p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw size={16} />
            <span>重置为默认</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
