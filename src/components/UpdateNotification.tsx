import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    const shouldAutoCheck = userPreferences.getAutoCheckUpdates();
    if (shouldAutoCheck) {
      // 主动触发一次手动检查，确保开发或首次启动也能拿到状态
      handleManualCheck();
    }
    getCurrentVersion();

    // 监听来自主进程的更新通知
    if (window.electron?.ipcRenderer) {
      const handleUpdateAvailable = (info: UpdateInfo) => {
        setUpdateInfo(info);
        setIsVisible(true);
      };

      window.electron.ipcRenderer.on('update-available', handleUpdateAvailable);

      return () => {
        window.electron.ipcRenderer.removeListener('update-available', handleUpdateAvailable);
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

  const handleManualCheck = async () => {
    try {
      setIsChecking(true);
      
      if (window.electronAPI?.update?.checkManual) {
        const status = await window.electronAPI.update.checkManual();
        if (status.updateAvailable && status.updateInfo) {
          setUpdateInfo(status.updateInfo);
          setIsVisible(true);
        } 
      }
    } catch (error) {
      console.error('手动检查更新失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      if (window.electronAPI?.update?.download) {
        await window.electronAPI.update.download();
        // 静默处理：不弹窗
      }
    } catch (error) {
      console.error('下载更新失败:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const formatReleaseNotes = (notes: string) => {
    // 简单的格式化，截取前200个字符
    return notes.length > 200 ? notes.substring(0, 200) + '...' : notes;
  };

  // 顶部小胶囊提示（仅在有更新时显示）— 作为行内组件放入仪表盘头部行
  if (isVisible && updateInfo) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-amber-500 text-amber-600 bg-amber-50 hover:bg-amber-100 text-xs font-medium shadow-sm transition-colors"
          title={`发现新版本 v${updateInfo.version}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>有可用更新</span>
        </button>

        {showDetails && (
          <div className="absolute mt-2 left-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 z-[60]">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                新版本 v{updateInfo.version}
                {currentVersion && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(当前 v{currentVersion})</span>
                )}
              </div>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 max-h-28 overflow-y-auto mb-3 whitespace-pre-wrap">
              {formatReleaseNotes(updateInfo.releaseNotes || '新版本包含性能改进和错误修复')}
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsVisible(false)}
                className="px-2.5 py-1 text-xs rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                稍后
              </button>
              <button
                onClick={handleDownloadUpdate}
                className="inline-flex items-center space-x-1 px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>更新</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 无更新时不渲染任何内容
  return null;
};
