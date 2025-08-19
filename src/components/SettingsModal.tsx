import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Minimize2, Power, RotateCcw, Database, Folder, FolderOpen, HardDrive, Archive, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { userPreferences } from '../utils/userPreferences';
import { localFileStorage, LocalStorageSettings } from '../services/LocalFileStorage';
import { dataBackupService, BackupFile } from '../services/DataBackupService';
import { AboutSection } from './AboutSection';
import { useDialog } from './DialogManager';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'window' | 'storage' | 'about';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'window'
}) => {
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<'window' | 'storage' | 'about'>(initialTab);
  
  // 窗口设置状态
  const [exitBehavior, setExitBehavior] = useState<'ask' | 'hide' | 'exit'>('ask');
  const [originalExitBehavior, setOriginalExitBehavior] = useState<'ask' | 'hide' | 'exit'>('ask');
  
  // 存储设置状态
  const [storageSettings, setStorageSettings] = useState<LocalStorageSettings>({
    dataPath: '',
    backupPath: '',
    backupInterval: 48,
    maxBackupCount: 10,
    autoBackup: true
  });
  const [originalStorageSettings, setOriginalStorageSettings] = useState<LocalStorageSettings | null>(null);
  const [backupStatus, setBackupStatus] = useState({
    lastBackupTime: null as Date | null,
    nextBackupTime: null as Date | null,
    backupCount: 0,
    totalBackupSize: 0,
    isAutoBackupEnabled: false
  });
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [storageStats, setStorageStats] = useState({
    totalSize: 0,
    fileCount: 0,
    lastModified: null as Date | null
  });

  // 是否有变化
  const hasWindowChanges = exitBehavior !== originalExitBehavior;
  const hasStorageChanges = originalStorageSettings && JSON.stringify(storageSettings) !== JSON.stringify(originalStorageSettings);
  const hasChanges = hasWindowChanges || hasStorageChanges;

  // 定义 handleClose 函数（必须在使用它的 useEffect 之前）
  const handleClose = useCallback(() => {
    if (hasChanges) {
      dialog.showConfirm({
        title: '确认关闭',
        message: '您有未保存的更改，确定要关闭吗？',
        onConfirm: () => {
          onClose();
        }
      });
    } else {
      onClose();
    }
  }, [hasChanges, onClose, dialog]);

  // 加载设置
  useEffect(() => {
    if (isOpen) {
      loadAllSettings();
    }
  }, [isOpen]);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      // 加载窗口设置
      const currentBehavior = userPreferences.getExitBehavior();
      setExitBehavior(currentBehavior);
      setOriginalExitBehavior(currentBehavior);

      // 加载存储设置（仅在Electron环境中）
      if (window.electronAPI?.storage) {
        const currentStorageSettings = await localFileStorage.getSettings();
        setStorageSettings(currentStorageSettings);
        setOriginalStorageSettings(currentStorageSettings);

        const status = await dataBackupService.getBackupStatus();
        setBackupStatus(status);

        const files = await dataBackupService.getBackupList();
        setBackupFiles(files);

        const stats = await localFileStorage.getStorageStats();
        setStorageStats(stats);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
    setIsLoading(false);
  };

  // ESC键关闭对话框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 保存窗口设置
      if (hasWindowChanges) {
        userPreferences.setExitBehavior(exitBehavior);
        setOriginalExitBehavior(exitBehavior);
      }

      // 保存存储设置
      if (hasStorageChanges && window.electronAPI?.storage) {
        await localFileStorage.updateSettings(storageSettings);
        
        // 重启自动备份
        if (storageSettings.autoBackup) {
          await dataBackupService.startAutoBackup();
        } else {
          dataBackupService.stopAutoBackup();
        }
        
        setOriginalStorageSettings(storageSettings);
        await loadAllSettings(); // 重新加载数据
      }

      onClose();
    } catch (error) {
      console.error('保存设置失败:', error);
      dialog.showAlert({
        message: '保存设置失败，请稍后重试',
        type: 'error',
        title: '保存失败'
      });
    }
    setSaving(false);
  };

  const handleReset = () => {
    dialog.showConfirm({
      title: '重置设置',
      message: '确定要重置为默认设置吗？这将清除所有相关的偏好设置。',
      onConfirm: () => {
      // 重置窗口设置
      setExitBehavior('ask');
      setOriginalExitBehavior('ask');
      userPreferences.setExitBehavior('ask');
      
      // 重置存储设置（如果在Electron环境中）
      if (window.electronAPI?.storage && originalStorageSettings) {
        const defaultSettings: LocalStorageSettings = {
          ...originalStorageSettings,
          backupInterval: 48,
          maxBackupCount: 10,
          autoBackup: true
        };
        setStorageSettings(defaultSettings);
      }
      }
    });
  };

  const handleSelectDataPath = async () => {
    try {
      const selectedPath = await localFileStorage.selectDataDirectory();
      if (selectedPath) {
        setStorageSettings(prev => ({ ...prev, dataPath: selectedPath }));
      }
    } catch (error) {
      console.error('选择数据目录失败:', error);
    }
  };

  const handleSelectBackupPath = async () => {
    try {
      const selectedPath = await localFileStorage.selectDataDirectory();
      if (selectedPath) {
        setStorageSettings(prev => ({ ...prev, backupPath: selectedPath }));
      }
    } catch (error) {
      console.error('选择备份目录失败:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const backupPath = await dataBackupService.createBackup('手动创建的备份');
      if (backupPath) {
        dialog.showAlert({
          message: '备份创建成功！',
          type: 'success',
          title: '备份创建'
        });
        await loadAllSettings(); // 重新加载备份列表
      } else {
        dialog.showAlert({
          message: '备份创建失败，请检查设置并重试',
          type: 'error',
          title: '备份创建失败'
        });
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      dialog.showAlert({
        message: '创建备份时出现错误',
        type: 'error',
        title: '备份创建错误'
      });
    }
    setIsCreatingBackup(false);
  };

  const handleRestoreBackup = async (backupFile: BackupFile) => {
    dialog.showConfirm({
      title: '确认恢复备份',
      message: `确定要恢复备份"${backupFile.fileName}"吗？这将覆盖当前的所有数据。`,
      onConfirm: async () => {
        try {
          const success = await dataBackupService.restoreBackup(backupFile.filePath);
          if (success) {
            dialog.showAlert({
              message: '备份恢复成功！应用将重新加载数据。',
              type: 'success',
              title: '备份恢复成功'
            });
            window.location.reload(); // 重新加载页面以刷新数据
        } else {
          dialog.showAlert({
            message: '备份恢复失败，请稍后重试',
            type: 'error',
            title: '备份恢复失败'
          });
        }
      } catch (error) {
        console.error('恢复备份失败:', error);
        dialog.showAlert({
          message: '恢复备份时出现错误',
          type: 'error',
          title: '备份恢复错误'
        });
      }
    }
    });
  };

  const handleDeleteBackup = async (backupFile: BackupFile) => {
    const confirmed = await dialog.showConfirm({
      title: '确认删除备份',
      message: `确定要删除备份"${backupFile.fileName}"吗？此操作无法撤销。`
    });
    
    if (confirmed) {
      try {
        const success = await dataBackupService.deleteBackup(backupFile.filePath);
        if (success) {
          await loadAllSettings(); // 重新加载备份列表
        } else {
          dialog.showAlert({
            message: '删除备份失败',
            type: 'error',
            title: '删除失败'
          });
        }
      } catch (error) {
        console.error('删除备份失败:', error);
        dialog.showAlert({
          message: '删除备份时出现错误',
          type: 'error',
          title: '删除备份错误'
        });
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '从未';
    return date.toLocaleString('zh-CN');
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 对话框容器 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[800px] max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              应用设置
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

        {/* 标签页 */}
        <div className="flex space-x-1 m-6 mb-0 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('window')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              activeTab === 'window'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Minimize2 size={16} />
            <span>窗口设置</span>
          </button>
          {window.electronAPI?.storage && (
            <button
              onClick={() => setActiveTab('storage')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                activeTab === 'storage'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Database size={16} />
              <span>数据存储</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              activeTab === 'about'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Info size={16} />
            <span>关于</span>
          </button>
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
            </div>
          ) : (
            <div className="space-y-6">
            {/* 窗口设置标签页 */}
            {activeTab === 'window' && (
              <div className="space-y-6">
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

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>提示：</strong> 您可以随时通过右键点击标题栏或系统托盘图标来重新打开此设置界面。
                  </p>
                </div>
              </div>
            )}

            {/* 存储设置标签页 */}
            {activeTab === 'storage' && window.electronAPI?.storage && (
              <div className="space-y-6">
                {/* 存储路径设置 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Folder className="w-5 h-5 mr-2" />
                    存储路径配置
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        数据存储目录
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={storageSettings.dataPath}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                        <button
                          onClick={handleSelectDataPath}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center"
                        >
                          <FolderOpen className="w-4 h-4 mr-1" />
                          选择
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        用户数据将存储在此目录
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        备份存储目录
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={storageSettings.backupPath}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                        <button
                          onClick={handleSelectBackupPath}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center"
                        >
                          <FolderOpen className="w-4 h-4 mr-1" />
                          选择
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        自动备份文件将存储在此目录
                      </p>
                    </div>
                  </div>
                </div>

                {/* 备份设置 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Archive className="w-5 h-5 mr-2" />
                    自动备份设置
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="autoBackup"
                        checked={storageSettings.autoBackup}
                        onChange={(e) => setStorageSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="autoBackup" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        启用自动备份
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          备份间隔（小时）
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={storageSettings.backupInterval}
                          onChange={(e) => setStorageSettings(prev => ({ ...prev, backupInterval: parseInt(e.target.value) || 48 }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          最大备份数量
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={storageSettings.maxBackupCount}
                          onChange={(e) => setStorageSettings(prev => ({ ...prev, maxBackupCount: parseInt(e.target.value) || 10 }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 存储状态 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <HardDrive className="w-5 h-5 mr-2" />
                    存储状态
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400">数据大小</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatFileSize(storageStats.totalSize)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400">文件数量</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {storageStats.fileCount}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-500 dark:text-gray-400">最后修改</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDate(storageStats.lastModified)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 备份管理 */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      备份管理
                    </h4>
                    <button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors flex items-center"
                    >
                      {isCreatingBackup ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          创建中...
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4 mr-2" />
                          立即备份
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">最后备份时间</div>
                      <div className="text-gray-900 dark:text-white">
                        {formatDate(backupStatus.lastBackupTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">下次备份时间</div>
                      <div className="text-gray-900 dark:text-white">
                        {storageSettings.autoBackup && backupStatus.nextBackupTime 
                          ? formatDate(backupStatus.nextBackupTime)
                          : '自动备份未启用'
                        }
                      </div>
                    </div>
                  </div>

                  {/* 备份文件列表 */}
                  <div className="max-h-48 overflow-y-auto">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      备份文件 ({backupFiles.length})
                    </h5>
                    {backupFiles.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">暂无备份文件</p>
                    ) : (
                      <div className="space-y-2">
                        {backupFiles.slice(0, 5).map((backup) => (
                          <div key={backup.fileName} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {backup.fileName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(backup.createdAt)} • {formatFileSize(backup.size)}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleRestoreBackup(backup)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                              >
                                恢复
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(backup)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ))}
                        {backupFiles.length > 5 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            还有 {backupFiles.length - 5} 个备份文件...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 关于标签页 */}
            {activeTab === 'about' && (
              <AboutSection />
            )}

            {/* 如果不在Electron环境中显示存储设置不可用 */}
            {activeTab === 'storage' && !window.electronAPI?.storage && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-4">
                <div className="flex items-start space-x-3 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle size={20} className="mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">功能限制</p>
                    <p className="text-sm">本地存储设置仅在桌面应用中可用。请下载并使用桌面版本来管理本地数据存储。</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* 按钮组 */}
        <div className="flex justify-between items-center p-6 pt-4 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
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
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center ${
                hasChanges && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
