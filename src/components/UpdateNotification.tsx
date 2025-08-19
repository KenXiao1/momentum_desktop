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


  const [currentVersion, setCurrentVersion] = useState('');

  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);

  useEffect(() => {
    const shouldAutoCheck = userPreferences.getAutoCheckUpdates();
    setAutoUpdateEnabled(shouldAutoCheck);
    // 移除自动触发的手动检查，避免阻塞应用启动
    // if (shouldAutoCheck) {
    //   handleManualCheck();
    // }
    getCurrentVersion();

    // 监听来自主进程的更新通知
    if (window.electron?.ipcRenderer) {
      const handleUpdateAvailable = (info: UpdateInfo) => {
        setUpdateInfo(info);
        // 只有在自动更新未开启时才立即显示横幅
        // 如果自动更新开启，等待下载完成后再显示
        if (!autoUpdateEnabled) {
          setIsVisible(true);
        }
        setUpdateDownloaded(false);
      };

      const handleUpdateDownloaded = () => {
        setIsDownloading(false);
        setUpdateDownloaded(true);
        // 下载完成后显示横幅
        setIsVisible(true);
      };

      const handleUpdateError = () => {
        // 处理更新错误
      };

      window.electron.ipcRenderer.on('update-available', handleUpdateAvailable);
      window.electron.ipcRenderer.on('update-downloaded', handleUpdateDownloaded);
      window.electron.ipcRenderer.on('update-error', handleUpdateError);

      return () => {
        window.electron.ipcRenderer.removeListener('update-available', handleUpdateAvailable);
        window.electron.ipcRenderer.removeListener('update-downloaded', handleUpdateDownloaded);
        window.electron.ipcRenderer.removeListener('update-error', handleUpdateError);
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
          setIsVisible(true);
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



  // 简化的更新横幅（仅在下载完成时显示）
  if (isVisible && updateInfo && updateDownloaded) {
    return (
      <div className="relative">
        <button
          onClick={handleInstallUpdate}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-green-500 text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium shadow-sm transition-colors"
          title={`点击安装 v${updateInfo.version}`}
        >
          <Download className="w-4 h-4" />
          <span>新版本 v{updateInfo.version} 已下载完成，点击安装</span>
        </button>
      </div>
    );
  }

  // 无更新时不渲染任何内容
  return null;
};
