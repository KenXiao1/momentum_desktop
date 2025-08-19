import React, { useEffect, useState } from 'react';
import { WindowControlService } from '../services/WindowControlService';
import { X, Minus, Square, Settings } from 'lucide-react';
import { ExitConfirmDialog } from './ExitConfirmDialog';
import { SettingsModal } from './SettingsModal';
import { userPreferences } from '../utils/userPreferences';
import { useDialog } from './DialogManager';

const WindowControls: React.FC = () => {
  const dialog = useDialog();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = WindowControlService.onWindowStateChange((state) => {
      setIsMaximized(!!state.isMaximized);
    });
    return () => unsubscribe?.();
  }, []);



  // 监听来自主进程的打开设置消息
  useEffect(() => {
    if (WindowControlService.isAvailableSync()) {
      const handleOpenSettings = () => {
        setShowSettingsModal(true);
      };

      window.electron.ipcRenderer.on('open-window-settings', handleOpenSettings);
      
      return () => {
        try {
          window.electron.ipcRenderer.removeListener?.('open-window-settings', handleOpenSettings);
        } catch {
          // 忽略清理错误
        }
      };
    }
  }, []);

  const handleTitlebarDoubleClick = () => {
    if (WindowControlService.isAvailableSync()) {
      WindowControlService.maximizeWindow();
    } else {
      // 在浏览器环境下尝试全屏
      if (document.documentElement.requestFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    }
  };

  const handleMinimize = () => {
    if (WindowControlService.isAvailableSync()) {
      WindowControlService.minimizeWindow();
    } else {
      console.log('最小化功能仅在 Electron 环境中可用');
      // 在浏览器中可以选择隐藏窗口或显示消息
    }
  };

  const handleMaximize = () => {
    if (WindowControlService.isAvailableSync()) {
      WindowControlService.maximizeWindow();
    } else {
      // 在浏览器环境下尝试全屏
      if (document.documentElement.requestFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    }
  };

  const handleClose = () => {
    if (WindowControlService.isAvailableSync()) {
      // 在 Electron 环境下，检查用户偏好
      const exitBehavior = userPreferences.getExitBehavior();
      
      if (exitBehavior === 'ask') {
        // 显示确认对话框
        setShowExitDialog(true);
      } else if (exitBehavior === 'hide') {
        // 直接隐藏到托盘
        WindowControlService.hideToTray();
      } else {
        // 直接退出
        WindowControlService.closeWindow();
      }
    } else {
        // 在浏览器环境下询问用户
        dialog.showConfirm({
          title: '确认关闭',
          message: '确定要关闭应用吗？',
          onConfirm: () => {
            window.close(); // 可能不会工作，但尝试一下
          }
        });
    }
  };

  const handleExitConfirm = (action: 'hide' | 'exit', rememberChoice?: boolean) => {
    setShowExitDialog(false);
    
    if (rememberChoice) {
      // 保存用户选择
      userPreferences.setExitBehavior(action);
    }
    
    if (action === 'hide') {
      WindowControlService.hideToTray();
    } else {
      WindowControlService.closeWindow();
    }
  };

  const handleExitCancel = () => {
    setShowExitDialog(false);
  };

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleSettingsModalClose = () => {
    setShowSettingsModal(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-[#2b2d30] flex items-center justify-between z-[9999] select-none" onDoubleClick={handleTitlebarDoubleClick}>
      {/* 拖拽区域 */}
      <div className="flex-1 h-full electron-drag" />

      {/* 控制按钮区域（VSCode风格：矩形、靠右） */}
      <div className="flex h-full electron-no-drag">
        <button
          onClick={handleSettingsClick}
          className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] text-gray-200"
          aria-label="窗口设置"
          title="窗口设置"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] text-gray-200"
          aria-label="最小化窗口"
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] text-gray-200"
          aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
          title={isMaximized ? '还原' : '最大化'}
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white text-gray-200"
          aria-label="关闭窗口"
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>

      {/* 退出确认对话框 */}
      <ExitConfirmDialog
        isOpen={showExitDialog}
        onClose={handleExitCancel}
        onConfirm={handleExitConfirm}
      />

      {/* 应用设置模态框 */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={handleSettingsModalClose}
        initialTab="window"
      />
    </div>
  );
};

export default WindowControls;