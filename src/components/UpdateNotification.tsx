import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';

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
    checkForUpdates();
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
        } else {
          // 没有更新时的提示
          alert('当前已是最新版本！');
        }
      }
    } catch (error) {
      console.error('手动检查更新失败:', error);
      alert('检查更新失败，请稍后重试');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      if (window.electronAPI?.update?.download) {
        const result = await window.electronAPI.update.download();
        if (result.success) {
          alert('正在为您打开下载页面...');
        } else {
          alert(`下载失败: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('下载更新失败:', error);
      alert('下载失败，请稍后重试');
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

  // 顶部通知栏
  if (isVisible && updateInfo) {
    return (
      <div className=\"fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg\">
        <div className=\"flex items-center justify-between px-4 py-3\">
          <div className=\"flex items-center space-x-3\">
            <AlertCircle className=\"w-5 h-5 text-yellow-300\" />
            <div className=\"flex-1\">
              <p className=\"font-medium\">
                🎉 发现新版本 v{updateInfo.version}！
                {currentVersion && (
                  <span className=\"text-blue-100 ml-1\">(当前: v{currentVersion})</span>
                )}
              </p>
              {showDetails && (
                <p className=\"text-sm text-blue-100 mt-1\">
                  {formatReleaseNotes(updateInfo.releaseNotes)}
                </p>
              )}
            </div>
          </div>
          
          <div className=\"flex items-center space-x-2\">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className=\"text-blue-100 hover:text-white transition-colors text-sm underline\"
            >
              {showDetails ? '收起' : '详情'}
            </button>
            
            <button
              onClick={handleDownloadUpdate}
              className=\"flex items-center space-x-1 bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md transition-colors font-medium\"
            >
              <Download className=\"w-4 h-4\" />
              <span>更新</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className=\"text-blue-200 hover:text-white transition-colors\"
            >
              <X className=\"w-5 h-5\" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 检查更新按钮（用于手动检查）
  return (
    <button
      onClick={handleManualCheck}
      disabled={isChecking}
      className=\"flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50\"
      title=\"检查更新\"
    >
      <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
      <span className=\"text-sm\">{isChecking ? '检查中...' : '检查更新'}</span>
    </button>
  );
};

// 更新确认对话框组件
interface UpdateDialogProps {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  updateInfo,
  currentVersion,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !updateInfo) return null;

  return (
    <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50\">
      <div className=\"bg-white rounded-lg shadow-xl max-w-md w-full mx-4\">
        <div className=\"p-6\">
          <div className=\"flex items-center space-x-3 mb-4\">
            <div className=\"flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center\">
              <Download className=\"w-5 h-5 text-blue-600\" />
            </div>
            <div>
              <h3 className=\"text-lg font-semibold text-gray-900\">
                发现新版本
              </h3>
              <p className=\"text-gray-600\">
                v{currentVersion} → v{updateInfo.version}
              </p>
            </div>
          </div>
          
          <div className=\"mb-6\">
            <h4 className=\"font-medium text-gray-900 mb-2\">更新内容:</h4>
            <div className=\"bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto\">
              <p className=\"text-sm text-gray-700 whitespace-pre-wrap\">
                {updateInfo.releaseNotes || '新版本包含性能改进和错误修复'}
              </p>
            </div>
          </div>
          
          <div className=\"flex space-x-3\">
            <button
              onClick={onCancel}
              className=\"flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors\"
            >
              稍后提醒
            </button>
            <button
              onClick={onConfirm}
              className=\"flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium\"
            >
              立即更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
