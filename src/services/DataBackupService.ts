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

export class DataBackupService {
  private backupInterval: NodeJS.Timeout | null = null;

  // 将可能是字符串/undefined的时间值安全转为 Date
  private safeToDate(dateValue: Date | string | undefined | null): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    try {
      return new Date(dateValue);
    } catch {
      console.warn('无效的日期值:', dateValue); 
      return null;
    }
  }

  // On first launch after update, remove legacy data/backups directory if present
  private async cleanupLegacyBackupsOnFirstOpen(): Promise<void> {
    try {
      const settings = await localFileStorage.getSettings();
      if ((settings as any).legacyBackupsCleaned) return;

      const legacyBackupsDir = `${settings.dataPath}/backups`;
      try {
        const exists = await window.electronAPI!.storage.directoryExists(legacyBackupsDir);
        if (exists) {
          console.log(`Found legacy backups dir, removing: ${legacyBackupsDir}`);
          await window.electronAPI!.storage.removeDirectory(legacyBackupsDir);
        }
      } catch (e) {
        console.warn('Error removing legacy backups directory:', e);
      }

      await localFileStorage.updateSettings({ legacyBackupsCleaned: true });
    } catch (e) {
      console.warn('Legacy backups cleanup failed (non-fatal):', e);
    }
  }

  async createBackup(description?: string): Promise<string | null> {
    try {
      let settings = await localFileStorage.getSettings();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `momentum-backup-${timestamp}.zip`;

      // 迁出：如备份目录位于 dataPath 内，则迁出到同级 -backups（不删除旧目录，仅更新路径）
      if (settings.backupPath?.startsWith(`${settings.dataPath}/`)) {
        const migrated = `${settings.dataPath}-backups`;
        await localFileStorage.updateSettings({ backupPath: migrated });
        settings = await localFileStorage.getSettings();
      }

      const backupPath = `${settings.backupPath}/${backupFileName}`;

      // 确保备份目录存在
      await window.electronAPI!.storage.createDirectory(settings.backupPath);

      // 备份元数据与要备份的文件列表
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

      // 保护：预估备份体积（白名单 JSON 合计），超上限则中止
      try {
        const maxMB = (settings as any).maxBackupSizeMB ?? 2048;
        let total = 0;
        for (const fileName of metadata.dataFiles) {
          const p = `${settings.dataPath}/${fileName}`;
          try {
            const st = await window.electronAPI!.storage.getFileStats(p);
            if (st?.isFile && typeof st.size === 'number') total += st.size;
          } catch {
            // Ignore per-file stat errors during size precheck
          }
        }
        if (total > maxMB * 1024 * 1024) {
          console.error(`预估备份体积超限: ${(total/1024/1024).toFixed(1)}MB > ${maxMB}MB，已中止`);
          return null;
        }
      } catch {
        // Non-fatal: size precheck failed; proceed without blocking backup
      }

      // 优先使用 ZIP：通过临时目录打包，避免自包含导致无限增大
      if (window.electronAPI?.backup?.createZip) {
        const tempDir = `${settings.dataPath}/.tmp_backup_src`;
        await window.electronAPI!.storage.createDirectory(tempDir);

        try {
          // 仅复制需要的 JSON 数据文件到临时目录
          for (const fileName of metadata.dataFiles) {
            const sourcePath = `${settings.dataPath}/${fileName}`;
            const destPath = `${tempDir}/${fileName}`;
            const stats = await window.electronAPI!.storage.getFileStats(sourcePath);
            if (stats?.isFile) {
              await window.electronAPI!.storage.copyFile(sourcePath, destPath);
            }
          }

          // 写入元数据到临时目录（会被一起打包进 ZIP）
          await window.electronAPI!.storage.writeFile(`${tempDir}/backup_metadata.json`, metadata);

          // 以临时目录为源进行打包，目标文件位于 backups/ 下，不会被包含在源内
          const success = await window.electronAPI.backup.createZip(tempDir, backupPath, []);

          if (success) {
            await this.cleanupOldBackups(settings);
            await localFileStorage.updateSettings({ lastBackupTime: new Date() });
            console.log(`数据备份成功: ${backupPath}`);
            return backupPath;
          }
        } finally {
          // 清理临时目录
          try {
            await window.electronAPI!.storage.removeDirectory(tempDir);
          } catch {
            // 忽略临时目录清理失败
          }
        }
      } else {
        // 兜底：无 ZIP 能力时，按文件夹形式备份
        console.warn('ZIP API 不可用，使用文件夹拷贝作为备份');
        const backupDir = `${settings.backupPath}/momentum-backup-${timestamp}`;
        await window.electronAPI!.storage.createDirectory(backupDir);

        // 复制数据文件
        for (const fileName of metadata.dataFiles) {
          const sourcePath = `${settings.dataPath}/${fileName}`;
          const destPath = `${backupDir}/${fileName}`;
          const stats = await window.electronAPI!.storage.getFileStats(sourcePath);
          if (stats?.isFile) {
            await window.electronAPI!.storage.copyFile(sourcePath, destPath);
          }
        }

        // 写入元数据
        await window.electronAPI!.storage.writeFile(`${backupDir}/backup_metadata.json`, metadata);

        await this.cleanupOldBackups(settings);
        await localFileStorage.updateSettings({ lastBackupTime: new Date() });

        console.log(`数据备份成功（文件夹形式）: ${backupDir}`);
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

      // ZIP 备份
      if (backupPath.endsWith('.zip')) {
        if (window.electronAPI?.backup?.extractZip) {
          const tempDir = `${settings.dataPath}/temp_restore`;
          await window.electronAPI!.storage.createDirectory(tempDir);

          const success = await window.electronAPI.backup.extractZip(backupPath, tempDir);
          if (success) {
            // 将临时目录中的 JSON 拷贝回 dataPath
            const files = await window.electronAPI!.storage.listDirectory(tempDir);
            for (const file of files) {
              if (file.name.endsWith('.json') && file.name !== 'backup_metadata.json') {
                const sourcePath = file.path;
                const destPath = `${settings.dataPath}/${file.name}`;
                await window.electronAPI!.storage.copyFile(sourcePath, destPath);
              }
            }

            // 清空临时目录
            const tempFiles = await window.electronAPI!.storage.listDirectory(tempDir);
            for (const file of tempFiles) {
              await window.electronAPI!.storage.deleteFile(file.path);
            }

            console.log('数据恢复成功');
            return true;
          }
        } else {
          console.error('ZIP 解压 API 不可用');
          return false;
        }
      } else {
        // 文件夹形式的备份恢复
        const backupFiles = await window.electronAPI!.storage.listDirectory(backupPath);

        for (const file of backupFiles) {
          if (file.name.endsWith('.json') && file.name !== 'backup_metadata.json') {
            const sourcePath = file.path;
            const destPath = `${settings.dataPath}/${file.name}`;
            await window.electronAPI!.storage.copyFile(sourcePath, destPath);
          }
        }

        console.log('数据恢复成功');
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
        if (file.name.startsWith('momentum-backup-') && (file.name.endsWith('.zip') || file.isDirectory)) {
          // 版本信息（若为文件夹备份则读取元数据）
          let version = '1.0.0';
          try {
            const metadataPath = file.isDirectory
              ? `${file.path}/backup_metadata.json`
              : `${file.path}/backup_metadata.json`; // ZIP 的元数据需解压后读取

            if (file.isDirectory) {
              const metadata = await window.electronAPI!.storage.readFile(metadataPath) as { version?: string } | null;
              version = metadata?.version || '1.0.0';
            }
          } catch {
            // ignore
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

      // 按修改时间倒序
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  async deleteBackup(backupPath: string): Promise<boolean> {
    try {
      const stats = await window.electronAPI!.storage.getFileStats(backupPath);
      if (!stats) return true;

      if (stats.isFile) {
        await window.electronAPI!.storage.deleteFile(backupPath);
        const verifyStats = await window.electronAPI!.storage.getFileStats(backupPath);
        if (verifyStats) {
          console.error('文件删除失败，文件仍然存在');
          return false;
        }
      } else if (stats.isDirectory) {
        await window.electronAPI!.storage.removeDirectory(backupPath);
        const verifyStats = await window.electronAPI!.storage.getFileStats(backupPath);
        if (verifyStats) {
          console.error('目录删除失败，目录仍然存在');
          return false;
        }
      } else {
        console.error('未知的文件类型');
        return false;
      }

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
          console.log(`已删除过期备份: ${file.fileName}`);
        }
      }
    } catch (error) {
      console.error('清理过期备份失败:', error);
    }
  }

  async startAutoBackup(): Promise<void> {
    // Ensure legacy data/backups is cleaned once after update
    await this.cleanupLegacyBackupsOnFirstOpen();
    const settings = await localFileStorage.getSettings();

    if (!settings.autoBackup) {
      console.log('自动备份已关闭');
      return;
    }

    this.stopAutoBackup();

    const intervalMs = settings.backupInterval * 60 * 60 * 1000;
    console.log(`启用自动备份，周期: ${settings.backupInterval} 小时`);

    this.backupInterval = setInterval(async () => {
      console.log('执行自动备份...');
      const result = await this.createBackup('自动备份');
      if (result) {
        console.log('自动备份完成:', result);
      } else {
        console.error('自动备份失败');
      }
    }, intervalMs);

    // 启动时如已超时则触发一次备份
    const lastBackupTime = this.safeToDate(settings.lastBackupTime);
    if (lastBackupTime) {
      const timeSinceLastBackup = Date.now() - lastBackupTime.getTime();
      if (timeSinceLastBackup >= intervalMs) {
        console.log('上次备份时间过久，5 秒后触发一次备份');
        setTimeout(() => this.createBackup('补偿定时自动备份'), 5000);
      }
    } else {
      console.log('首次启动，5 秒后创建初始备份');
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
      if (!settings.autoBackup) return false;

      const lastBackupTime = this.safeToDate(settings.lastBackupTime);
      if (!lastBackupTime) return true;

      const timeSinceLastBackup = Date.now() - lastBackupTime.getTime();
      const intervalMs = settings.backupInterval * 60 * 60 * 1000;
      return timeSinceLastBackup >= intervalMs;
    } catch (error) {
      console.error('判断是否需要备份失败:', error);
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

      const lastBackupTime = this.safeToDate(settings.lastBackupTime);

      let nextBackupTime: Date | null = null;
      if (settings.autoBackup && lastBackupTime) {
        const intervalMs = settings.backupInterval * 60 * 60 * 1000;
        nextBackupTime = new Date(lastBackupTime.getTime() + intervalMs);
      }

      return {
        lastBackupTime,
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

export const dataBackupService = new DataBackupService();

