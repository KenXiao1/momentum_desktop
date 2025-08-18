import { localFileStorage, LocalStorageSettings } from './LocalFileStorage';

export interface BackupFile {
  fileName: string;
  filePath: string;
  createdAt: Date;
  size: number;
  version: string;
}

export interface BackupMetadata {
  version: string;
  createdAt: string;
  dataFiles: string[];
  description?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      storage: {
        getDefaultDataPath: () => Promise<string>;
        selectDataDirectory: () => Promise<string | null>;
        directoryExists: (path: string) => Promise<boolean>;
        createDirectory: (path: string) => Promise<boolean>;
        readFile: (path: string) => Promise<any>;
        writeFile: (path: string, data: any) => Promise<boolean>;
        deleteFile: (path: string) => Promise<boolean>;
        listDirectory: (path: string) => Promise<Array<{
          name: string;
          path: string;
          isDirectory: boolean;
          size: number;
          modifiedAt: Date;
        }>>;
        copyFile: (sourcePath: string, destPath: string) => Promise<boolean>;
        getFileStats: (path: string) => Promise<{
          size: number;
          createdAt: Date;
          modifiedAt: Date;
          isDirectory: boolean;
          isFile: boolean;
        } | null>;
      };
      backup?: {
        createZip: (sourceDir: string, outputPath: string, exclude?: string[]) => Promise<boolean>;
        extractZip: (zipPath: string, outputDir: string) => Promise<boolean>;
      };
    };
  }
}

export class DataBackupService {
  private backupInterval: NodeJS.Timeout | null = null;

  async createBackup(description?: string): Promise<string | null> {
    try {
      const settings = await localFileStorage.getSettings();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `momentum-backup-${timestamp}.zip`;
      const backupPath = `${settings.backupPath}/${backupFileName}`;

      // 确保备份目录存在
      await window.electronAPI!.storage.createDirectory(settings.backupPath);

      // 创建备份元数据
      const metadata: BackupMetadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        dataFiles: [
          'chains.json',
          'scheduled_sessions.json',
          'active_session.json',
          'completion_history.json',
          'rsip_nodes.json',
          'rsip_meta.json',
          'task_time_stats.json',
          'settings.json'
        ],
        description
      };

      // 保存元数据到临时文件
      const metadataPath = `${settings.dataPath}/backup_metadata.json`;
      await window.electronAPI!.storage.writeFile(metadataPath, metadata);

      // 如果有压缩API，使用它创建ZIP
      if (window.electronAPI?.backup?.createZip) {
        const success = await window.electronAPI.backup.createZip(
          settings.dataPath,
          backupPath,
          ['backup_metadata.json'] // 排除临时元数据文件
        );
        
        // 删除临时元数据文件
        await window.electronAPI!.storage.deleteFile(metadataPath);
        
        if (success) {
          // 清理旧备份
          await this.cleanupOldBackups(settings);
          
          // 更新最后备份时间
          await localFileStorage.updateSettings({
            lastBackupTime: new Date()
          });
          
          console.log(`备份创建成功: ${backupPath}`);
          return backupPath;
        }
      } else {
        // 回退方案：简单复制文件
        console.warn('ZIP API不可用，使用文件复制作为备份方案');
        const backupDir = `${settings.backupPath}/momentum-backup-${timestamp}`;
        await window.electronAPI!.storage.createDirectory(backupDir);
        
        // 复制所有数据文件
        for (const fileName of metadata.dataFiles) {
          const sourcePath = `${settings.dataPath}/${fileName}`;
          const destPath = `${backupDir}/${fileName}`;
          
          const stats = await window.electronAPI!.storage.getFileStats(sourcePath);
          if (stats?.isFile) {
            await window.electronAPI!.storage.copyFile(sourcePath, destPath);
          }
        }
        
        // 保存元数据
        await window.electronAPI!.storage.writeFile(`${backupDir}/backup_metadata.json`, metadata);
        
        // 删除临时元数据文件
        await window.electronAPI!.storage.deleteFile(metadataPath);
        
        // 清理旧备份
        await this.cleanupOldBackups(settings);
        
        // 更新最后备份时间
        await localFileStorage.updateSettings({
          lastBackupTime: new Date()
        });
        
        console.log(`备份创建成功（文件夹形式）: ${backupDir}`);
        return backupDir;
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      return null;
    }
    
    return null;
  }

  async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      const settings = await localFileStorage.getSettings();
      
      // 检查是否是ZIP备份
      if (backupPath.endsWith('.zip')) {
        if (window.electronAPI?.backup?.extractZip) {
          const tempDir = `${settings.dataPath}/temp_restore`;
          await window.electronAPI!.storage.createDirectory(tempDir);
          
          const success = await window.electronAPI.backup.extractZip(backupPath, tempDir);
          if (success) {
            // 从临时目录复制文件到数据目录
            const files = await window.electronAPI!.storage.listDirectory(tempDir);
            for (const file of files) {
              if (file.name.endsWith('.json') && file.name !== 'backup_metadata.json') {
                const sourcePath = file.path;
                const destPath = `${settings.dataPath}/${file.name}`;
                await window.electronAPI!.storage.copyFile(sourcePath, destPath);
              }
            }
            
            // 清理临时目录
            const tempFiles = await window.electronAPI!.storage.listDirectory(tempDir);
            for (const file of tempFiles) {
              await window.electronAPI!.storage.deleteFile(file.path);
            }
            
            console.log('备份恢复成功');
            return true;
          }
        } else {
          console.error('ZIP解压API不可用');
          return false;
        }
      } else {
        // 文件夹形式的备份
        const backupFiles = await window.electronAPI!.storage.listDirectory(backupPath);
        
        for (const file of backupFiles) {
          if (file.name.endsWith('.json') && file.name !== 'backup_metadata.json') {
            const sourcePath = file.path;
            const destPath = `${settings.dataPath}/${file.name}`;
            await window.electronAPI!.storage.copyFile(sourcePath, destPath);
          }
        }
        
        console.log('备份恢复成功');
        return true;
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
      return false;
    }
    
    return false;
  }

  async getBackupList(): Promise<BackupFile[]> {
    try {
      const settings = await localFileStorage.getSettings();
      const files = await window.electronAPI!.storage.listDirectory(settings.backupPath);
      
      const backupFiles: BackupFile[] = [];
      
      for (const file of files) {
        if (file.name.startsWith('momentum-backup-') && 
            (file.name.endsWith('.zip') || file.isDirectory)) {
          
          // 尝试读取版本信息
          let version = '1.0.0';
          try {
            const metadataPath = file.isDirectory 
              ? `${file.path}/backup_metadata.json`
              : `${file.path}/backup_metadata.json`; // ZIP中的元数据需要解压后读取
              
            if (file.isDirectory) {
              const metadata = await window.electronAPI!.storage.readFile(metadataPath);
              version = metadata?.version || '1.0.0';
            }
          } catch {
            // 忽略元数据读取错误
          }
          
          backupFiles.push({
            fileName: file.name,
            filePath: file.path,
            createdAt: file.modifiedAt,
            size: file.size,
            version
          });
        }
      }
      
      // 按创建时间倒序排列
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  async deleteBackup(backupPath: string): Promise<boolean> {
    try {
      const stats = await window.electronAPI!.storage.getFileStats(backupPath);
      
      if (stats?.isFile) {
        // 删除ZIP文件
        await window.electronAPI!.storage.deleteFile(backupPath);
      } else if (stats?.isDirectory) {
        // 删除备份文件夹及其内容
        const files = await window.electronAPI!.storage.listDirectory(backupPath);
        for (const file of files) {
          await window.electronAPI!.storage.deleteFile(file.path);
        }
        // 删除空目录（这里可能需要额外的API）
      }
      
      console.log(`备份删除成功: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('删除备份失败:', error);
      return false;
    }
  }

  private async cleanupOldBackups(settings: LocalStorageSettings): Promise<void> {
    try {
      const backupFiles = await this.getBackupList();
      
      if (backupFiles.length > settings.maxBackupCount) {
        const filesToDelete = backupFiles
          .slice(settings.maxBackupCount)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        for (const file of filesToDelete) {
          await this.deleteBackup(file.filePath);
          console.log(`已删除旧备份: ${file.fileName}`);
        }
      }
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  async startAutoBackup(): Promise<void> {
    const settings = await localFileStorage.getSettings();
    
    if (!settings.autoBackup) {
      console.log('自动备份已禁用');
      return;
    }

    this.stopAutoBackup(); // 先停止现有的定时器

    const intervalMs = settings.backupInterval * 60 * 60 * 1000; // 转换为毫秒
    
    console.log(`启动自动备份，间隔: ${settings.backupInterval}小时`);
    
    this.backupInterval = setInterval(async () => {
      console.log('执行自动备份...');
      const result = await this.createBackup('自动备份');
      if (result) {
        console.log('自动备份完成:', result);
      } else {
        console.error('自动备份失败');
      }
    }, intervalMs);

    // 检查是否需要立即执行一次备份
    if (settings.lastBackupTime) {
      const timeSinceLastBackup = Date.now() - settings.lastBackupTime.getTime();
      if (timeSinceLastBackup >= intervalMs) {
        console.log('距离上次备份时间较长，立即执行一次备份');
        setTimeout(() => this.createBackup('启动时自动备份'), 5000);
      }
    } else {
      // 首次启动，5秒后创建初始备份
      console.log('首次启动，5秒后创建初始备份');
      setTimeout(() => this.createBackup('首次启动备份'), 5000);
    }
  }

  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('自动备份已停止');
    }
  }

  async shouldCreateBackup(): Promise<boolean> {
    try {
      const settings = await localFileStorage.getSettings();
      
      if (!settings.autoBackup) {
        return false;
      }

      if (!settings.lastBackupTime) {
        return true; // 从未备份过
      }

      const timeSinceLastBackup = Date.now() - settings.lastBackupTime.getTime();
      const intervalMs = settings.backupInterval * 60 * 60 * 1000;
      
      return timeSinceLastBackup >= intervalMs;
    } catch (error) {
      console.error('检查是否需要备份失败:', error);
      return false;
    }
  }

  async getBackupStatus(): Promise<{
    lastBackupTime: Date | null;
    nextBackupTime: Date | null;
    backupCount: number;
    totalBackupSize: number;
    isAutoBackupEnabled: boolean;
  }> {
    try {
      const settings = await localFileStorage.getSettings();
      const backupFiles = await this.getBackupList();
      
      const totalBackupSize = backupFiles.reduce((sum, file) => sum + file.size, 0);
      
      let nextBackupTime: Date | null = null;
      if (settings.autoBackup && settings.lastBackupTime) {
        const intervalMs = settings.backupInterval * 60 * 60 * 1000;
        nextBackupTime = new Date(settings.lastBackupTime.getTime() + intervalMs);
      }
      
      return {
        lastBackupTime: settings.lastBackupTime || null,
        nextBackupTime,
        backupCount: backupFiles.length,
        totalBackupSize,
        isAutoBackupEnabled: settings.autoBackup
      };
    } catch (error) {
      console.error('获取备份状态失败:', error);
      return {
        lastBackupTime: null,
        nextBackupTime: null,
        backupCount: 0,
        totalBackupSize: 0,
        isAutoBackupEnabled: false
      };
    }
  }
}

// 创建单例实例
export const dataBackupService = new DataBackupService();
