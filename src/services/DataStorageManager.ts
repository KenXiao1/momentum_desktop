import { storage as localStorageUtils } from '../utils/storage';
import { localFileStorage } from './LocalFileStorage';
import { dataBackupService } from './DataBackupService';
import { isSupabaseConfigured } from '../lib/supabase';
import { SupabaseStorage } from '../utils/supabaseStorage';

export type StorageMode = 'localStorage' | 'fileSystem' | 'supabase';

export interface DataStorageConfig {
  mode: StorageMode;
  initialized: boolean;
  autoMigrationEnabled: boolean;
}

export class DataStorageManager {
  private config: DataStorageConfig = {
    mode: 'localStorage',
    initialized: false,
    autoMigrationEnabled: true
  };
  private currentStorage: any = localStorageUtils;

  async initialize(): Promise<void> {
    try {
      console.log('初始化数据存储管理器...');
      
      // 确定存储模式
      await this.determineStorageMode();
      
      // 初始化对应的存储服务
      await this.initializeStorage();
      
      // 启动自动备份（仅限文件系统模式）
      if (this.config.mode === 'fileSystem') {
        await this.startAutoBackup();
      }
      
      this.config.initialized = true;
      console.log(`数据存储管理器初始化完成，模式: ${this.config.mode}`);
    } catch (error) {
      console.error('数据存储管理器初始化失败:', error);
      throw error;
    }
  }

  private async determineStorageMode(): Promise<void> {
    // 优先级：文件系统 > Supabase > localStorage
    if (window.electronAPI?.storage) {
      this.config.mode = 'fileSystem';
      console.log('检测到Electron环境，使用文件系统存储');
    } else if (isSupabaseConfigured) {
      this.config.mode = 'supabase';
      console.log('检测到Supabase配置，使用云端存储');
    } else {
      this.config.mode = 'localStorage';
      console.log('使用浏览器本地存储');
    }
  }

  private async initializeStorage(): Promise<void> {
    switch (this.config.mode) {
      case 'fileSystem':
        this.currentStorage = localFileStorage;
        await localFileStorage.initialize();
        
        // 检查是否需要从localStorage迁移数据
        if (this.config.autoMigrationEnabled) {
          await this.migrateFromLocalStorage();
        }
        break;
        
      case 'supabase':
        this.currentStorage = new SupabaseStorage();
        break;
        
      case 'localStorage':
      default:
        this.currentStorage = localStorageUtils;
        break;
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('检查是否需要从localStorage迁移数据...');
      
      // 检查文件系统中是否已有数据
      const existingChains = await localFileStorage.getChains();
      if (existingChains.length > 0) {
        console.log('文件系统中已有数据，跳过迁移');
        return;
      }
      
      // 检查localStorage中是否有数据
      const localChains = localStorageUtils.getChains();
      if (localChains.length === 0) {
        console.log('localStorage中无数据，跳过迁移');
        return;
      }
      
      console.log(`开始迁移 ${localChains.length} 条链数据...`);
      
      // 迁移所有数据
      await localFileStorage.saveChains(localChains);
      
      const localScheduledSessions = localStorageUtils.getScheduledSessions();
      if (localScheduledSessions.length > 0) {
        await localFileStorage.saveScheduledSessions(localScheduledSessions);
      }
      
      const localActiveSession = localStorageUtils.getActiveSession();
      if (localActiveSession) {
        await localFileStorage.saveActiveSession(localActiveSession);
      }
      
      const localCompletionHistory = localStorageUtils.getCompletionHistory();
      if (localCompletionHistory.length > 0) {
        await localFileStorage.saveCompletionHistory(localCompletionHistory);
      }
      
      const localRSIPNodes = localStorageUtils.getRSIPNodes();
      if (localRSIPNodes.length > 0) {
        await localFileStorage.saveRSIPNodes(localRSIPNodes);
      }
      
      const localRSIPMeta = localStorageUtils.getRSIPMeta();
      if (localRSIPMeta.lastAddedAt || localRSIPMeta.allowMultiplePerDay) {
        await localFileStorage.saveRSIPMeta(localRSIPMeta);
      }
      
      const localTaskTimeStats = localStorageUtils.getTaskTimeStats();
      if (localTaskTimeStats.length > 0) {
        await localFileStorage.saveTaskTimeStats(localTaskTimeStats);
      }
      
      console.log('数据迁移完成！');
      
      // 创建迁移完成后的初始备份
      setTimeout(async () => {
        try {
          await dataBackupService.createBackup('数据迁移完成后的初始备份');
          console.log('迁移后初始备份创建成功');
        } catch (error) {
          console.warn('创建迁移后备份失败:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('数据迁移失败:', error);
      // 迁移失败不应该阻止应用启动，只记录错误
    }
  }

  private async startAutoBackup(): Promise<void> {
    try {
      console.log('启动自动备份服务...');
      await dataBackupService.startAutoBackup();
    } catch (error) {
      console.error('启动自动备份失败:', error);
    }
  }

  getStorage() {
    if (!this.config.initialized) {
      throw new Error('数据存储管理器尚未初始化');
    }
    return this.currentStorage;
  }

  getStorageMode(): StorageMode {
    return this.config.mode;
  }

  isInitialized(): boolean {
    return this.config.initialized;
  }

  async switchStorageMode(newMode: StorageMode): Promise<void> {
    if (newMode === this.config.mode) {
      console.log(`已经是 ${newMode} 模式，无需切换`);
      return;
    }
    
    console.log(`切换存储模式从 ${this.config.mode} 到 ${newMode}`);
    
    // 停止当前模式的服务
    if (this.config.mode === 'fileSystem') {
      dataBackupService.stopAutoBackup();
    }
    
    // 切换到新模式
    this.config.mode = newMode;
    await this.initializeStorage();
    
    // 启动新模式的服务
    if (newMode === 'fileSystem') {
      await this.startAutoBackup();
    }
    
    console.log(`存储模式切换完成: ${newMode}`);
  }

  async getStorageInfo(): Promise<{
    mode: StorageMode;
    isAvailable: boolean;
    description: string;
    features: string[];
  }> {
    const info = {
      mode: this.config.mode,
      isAvailable: false,
      description: '',
      features: [] as string[]
    };

    switch (this.config.mode) {
      case 'fileSystem':
        info.isAvailable = !!window.electronAPI?.storage;
        info.description = '本地文件系统存储，支持自定义路径和自动备份';
        info.features = [
          '自定义存储路径',
          '自动定期备份',
          'ZIP压缩备份',
          '备份恢复功能',
          '数据迁移'
        ];
        break;
        
      case 'supabase':
        info.isAvailable = isSupabaseConfigured;
        info.description = 'Supabase云端存储，支持多设备同步';
        info.features = [
          '云端存储',
          '多设备同步',
          '用户认证',
          '实时数据更新'
        ];
        break;
        
      case 'localStorage':
        info.isAvailable = true;
        info.description = '浏览器本地存储，简单可靠';
        info.features = [
          '无需配置',
          '离线可用',
          '快速访问'
        ];
        break;
    }

    return info;
  }

  async createManualBackup(description?: string): Promise<string | null> {
    if (this.config.mode !== 'fileSystem') {
      throw new Error('手动备份功能仅在文件系统存储模式下可用');
    }
    
    return await dataBackupService.createBackup(description || '手动创建的备份');
  }

  async getBackupStatus() {
    if (this.config.mode !== 'fileSystem') {
      return null;
    }
    
    return await dataBackupService.getBackupStatus();
  }

  // 获取存储统计信息
  async getStorageStats() {
    switch (this.config.mode) {
      case 'fileSystem':
        return await localFileStorage.getStorageStats();
        
      case 'localStorage':
        // 计算localStorage的大小
        let totalSize = 0;
        let fileCount = 0;
        
        const keys = ['momentum_chains', 'momentum_scheduled_sessions', 'momentum_active_session', 
                     'momentum_completion_history', 'momentum_rsip_nodes', 'momentum_rsip_meta', 
                     'momentum_task_time_stats'];
        
        for (const key of keys) {
          const data = localStorage.getItem(key);
          if (data) {
            totalSize += new Blob([data]).size;
            fileCount++;
          }
        }
        
        return {
          totalSize,
          fileCount,
          lastModified: new Date() // localStorage没有修改时间，使用当前时间
        };
        
      default:
        return {
          totalSize: 0,
          fileCount: 0,
          lastModified: null
        };
    }
  }
}

// 创建单例实例
export const dataStorageManager = new DataStorageManager();
