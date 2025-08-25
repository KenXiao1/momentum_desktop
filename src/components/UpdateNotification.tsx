import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { userPreferences } from '../utils/userPreferences';

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  assets: any[];
}

interface UpdateNotificationProps {
  onDismiss?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onDismiss }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => userPreferences.getAutoCheckUpdates());

  // 监控状态变化的调试useEffect
  useEffect(() => {
    console.log('状态变化:', {
      isVisible,
      updateDownloaded,
      isDownloading,
      autoUpdateEnabled,
      updateInfo: updateInfo?.version
    });
  }, [isVisible, updateDownloaded, isDownloading, autoUpdateEnabled, updateInfo]);

  useEffect(() => {
    getCurrentVersion();
    
    // 初始化主进程的自动更新设置
    const initAutoUpdateSetting = async () => {
      const currentAutoCheck = userPreferences.getAutoCheckUpdates();
      setAutoUpdateEnabled(currentAutoCheck);
      if (window.electronAPI?.update?.initAutoCheck) {
        await window.electronAPI.update.initAutoCheck(currentAutoCheck);
        console.log('已同步自动更新设置到主进程:', currentAutoCheck);
      }
    };
    
    initAutoUpdateSetting();

    // 监听来自主进程的更新通知
    if (window.electron?.ipcRenderer) {
      const handleUpdateAvailable = (info: UpdateInfo) => {
        console.log('收到update-available事件:', info.version);
        setUpdateInfo(info);
        // 重置下载完成状态
        setUpdateDownloaded(false);
        // 获取当前的自动更新设置（实时获取，不使用缓存的状态）
        const currentAutoCheck = userPreferences.getAutoCheckUpdates();
        setAutoUpdateEnabled(currentAutoCheck);
        
        // 只有当自动更新启用时才处理更新
        if (currentAutoCheck) {
          console.log('自动更新已启用，开始静默下载');
          setIsDownloading(true);
          setIsVisible(true); // 显示横幅以显示下载状态
          // 不需要在这里触发下载，主进程已经处理了
        }
        // 当自动更新关闭时，不显示任何更新通知
      };

      const handleUpdateDownloaded = () => {
        console.log('收到update-downloaded事件');
        // 使用函数式状态更新确保状态正确更新
        setIsDownloading(prev => {
          console.log('设置isDownloading为false，当前值:', prev);
          return false;
        });
        setUpdateDownloaded(prev => {
          console.log('设置updateDownloaded为true，当前值:', prev);
          return true;
        });
        // 下载完成后确保横幅可见
        setIsVisible(true);
        console.log('更新下载完成，状态已更新');
      };

      const handleUpdateError = () => {
        setIsDownloading(false);
        // 如果自动更新失败，显示手动更新选项
        if (updateInfo) {
          setIsVisible(true);
        }
      };

      const handleDownloadProgress = (progress: any) => {
        // 可以在这里处理下载进度
        console.log('下载进度:', progress);
      };

      window.electron.ipcRenderer.on('update-available', handleUpdateAvailable);
      window.electron.ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
      window.electron.ipcRenderer.on('update-error', handleUpdateError);
      window.electron.ipcRenderer.on('download-progress', handleDownloadProgress);

      return () => {
        window.electron.ipcRenderer.removeListener('update-available', handleUpdateAvailable);
        window.electron.ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
        window.electron.ipcRenderer.removeListener('update-error', handleUpdateError);
        window.electron.ipcRenderer.removeListener('download-progress', handleDownloadProgress);
      };
    }
  }, []);

  const getCurrentVersion = async () => {
    try {
      if (window.electronAPI?.app?.getVersion) {
        const version = await window.electronAPI.app.getVersion();
        setCurrentVersion(version);
      }
    } catch (error) {
      console.error('获取版本信息失败:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      
      if (window.electronAPI?.update?.checkStatus) {
        const status = await window.electronAPI.update.checkStatus();
        if (status.updateAvailable && status.updateInfo) {
          setUpdateInfo(status.updateInfo);
          // 用户显式触发检查更新时，直接开始下载
          setUpdateDownloaded(false);
          setIsDownloading(true);
          setIsVisible(true);
          // 触发下载
          if (window.electronAPI?.update?.download) {
            window.electronAPI.update.download();
          }
        }
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    } finally {
      setIsChecking(false);
    }
  };





  const handleInstallUpdate = async () => {
    try {
      if (window.electronAPI?.update?.install) {
        await window.electronAPI.update.install();
      }
    } catch (error) {
      console.error('安装更新失败:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };



  // 显示更新通知横幅
  if (isVisible && updateInfo) {
    console.log('渲染状态:', { isVisible, updateDownloaded, isDownloading, updateInfo: updateInfo?.version });
    // 如果更新已下载完成，显示安装按钮
    if (updateDownloaded) {
      return (
        <div className="relative">
          <button
            onClick={handleInstallUpdate}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-green-500 dark:border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-sm font-medium shadow-sm transition-colors backdrop-blur-sm"
            title={`点击安装 v${updateInfo.version}`}
          >
            <Download className="w-4 h-4" />
            <span>点击安装更新</span>
          </button>
        </div>
      );
    }
    
    // 如果正在下载，显示下载进度
    if (isDownloading) {
      return (
        <div className="relative">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 text-sm font-medium shadow-sm backdrop-blur-sm">
            <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>正在下载新版本</span>
          </div>
        </div>
      );
    }
    
    // 当自动更新关闭时，不显示任何更新通知
    // 移除了手动更新选项的横幅
  }

  // 无更新时不渲染任何内容
  return null;
};

// 导出检查更新方法供外部调用
export const triggerUpdateCheck = async () => {
  if (window.electronAPI?.update?.checkForUpdates) {
    await window.electronAPI.update.checkForUpdates();
  }
};
