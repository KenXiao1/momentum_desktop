import { 
  Chain, 
  DeletedChain, 
  ScheduledSession, 
  ActiveSession, 
  CompletionHistory, 
  RSIPNode, 
  RSIPMeta, 
  TaskTimeStats 
} from '../types';

// 数据文件名常量
const DATA_FILES = {
  CHAINS: 'chains.json',
  SCHEDULED_SESSIONS: 'scheduled_sessions.json',
  ACTIVE_SESSION: 'active_session.json',
  COMPLETION_HISTORY: 'completion_history.json',
  RSIP_NODES: 'rsip_nodes.json',
  RSIP_META: 'rsip_meta.json',
  TASK_TIME_STATS: 'task_time_stats.json',
  SETTINGS: 'settings.json'
};

export interface LocalStorageSettings {
  dataPath: string;
  backupPath: string;
  backupInterval: number; // 备份间隔（小时）
  maxBackupCount: number; // 最大备份文件数量
  autoBackup: boolean;
  lastBackupTime?: Date;
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
    };
  }
}

export class LocalFileStorageService {
  private settings: LocalStorageSettings;
  private isInitialized = false;

  constructor() {
    // 默认设置
    this.settings = {
      dataPath: '',
      backupPath: '',
      backupInterval: 48, // 48小时 = 2天
      maxBackupCount: 10,
      autoBackup: true
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 检查是否在Electron环境中
    if (!window.electronAPI?.storage) {
      throw new Error('本地文件存储仅在Electron环境中可用');
    }

    try {
      // 获取默认数据路径
      const defaultDataPath = await window.electronAPI.storage.getDefaultDataPath();
      
      // 尝试加载已有设置
      const settingsPath = `${defaultDataPath}/${DATA_FILES.SETTINGS}`;
      let savedSettings: Partial<LocalStorageSettings> | null = null;
      
      try {
        savedSettings = await window.electronAPI.storage.readFile(settingsPath);
      } catch {
        // 设置文件不存在，使用默认设置
      }

      // 合并设置
      this.settings = {
        ...this.settings,
        dataPath: savedSettings?.dataPath || defaultDataPath,
        backupPath: savedSettings?.backupPath || `${defaultDataPath}/backups`,
        ...savedSettings
      };

      // 确保数据目录存在
      await this.ensureDirectoriesExist();

      // 保存设置
      await this.saveSettings();

      this.isInitialized = true;
      console.log('本地文件存储初始化完成:', this.settings);
    } catch (error) {
      console.error('本地文件存储初始化失败:', error);
      throw error;
    }
  }

  private async ensureDirectoriesExist(): Promise<void> {
    const { dataPath, backupPath } = this.settings;
    
    if (!await window.electronAPI!.storage.directoryExists(dataPath)) {
      await window.electronAPI!.storage.createDirectory(dataPath);
    }
    
    if (!await window.electronAPI!.storage.directoryExists(backupPath)) {
      await window.electronAPI!.storage.createDirectory(backupPath);
    }
  }

  async getSettings(): Promise<LocalStorageSettings> {
    await this.initialize();
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<LocalStorageSettings>): Promise<void> {
    await this.initialize();
    
    const oldDataPath = this.settings.dataPath;
    this.settings = { ...this.settings, ...newSettings };
    
    // 如果数据路径改变了，需要迁移数据
    if (newSettings.dataPath && newSettings.dataPath !== oldDataPath) {
      await this.migrateData(oldDataPath, newSettings.dataPath);
    }
    
    await this.ensureDirectoriesExist();
    await this.saveSettings();
  }

  private async saveSettings(): Promise<void> {
    const settingsPath = `${this.settings.dataPath}/${DATA_FILES.SETTINGS}`;
    await window.electronAPI!.storage.writeFile(settingsPath, this.settings);
  }

  private async migrateData(oldPath: string, newPath: string): Promise<void> {
    console.log(`开始迁移数据从 ${oldPath} 到 ${newPath}`);
    
    try {
      // 确保新目录存在
      await window.electronAPI!.storage.createDirectory(newPath);
      
      // 获取所有数据文件
      const dataFiles = Object.values(DATA_FILES);
      
      for (const fileName of dataFiles) {
        const oldFile = `${oldPath}/${fileName}`;
        const newFile = `${newPath}/${fileName}`;
        
        try {
          // 检查旧文件是否存在
          const stats = await window.electronAPI!.storage.getFileStats(oldFile);
          if (stats?.isFile) {
            await window.electronAPI!.storage.copyFile(oldFile, newFile);
            console.log(`已迁移文件: ${fileName}`);
          }
        } catch (error) {
          console.warn(`迁移文件 ${fileName} 失败:`, error);
        }
      }
      
      console.log('数据迁移完成');
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw error;
    }
  }

  private getFilePath(fileName: string): string {
    return `${this.settings.dataPath}/${fileName}`;
  }

  // 通用读取方法
  private async readData<T>(fileName: string, defaultValue: T): Promise<T> {
    await this.initialize();
    
    try {
      const data = await window.electronAPI!.storage.readFile(this.getFilePath(fileName));
      return data || defaultValue;
    } catch (error) {
      console.warn(`读取 ${fileName} 失败，使用默认值:`, error);
      return defaultValue;
    }
  }

  // 通用写入方法
  private async writeData<T>(fileName: string, data: T): Promise<void> {
    await this.initialize();
    
    try {
      // 创建一个WeakSet来跟踪已访问的对象，防止循环引用
      const seen = new WeakSet();
      
      // 序列化数据，处理Date对象和循环引用
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
        // 处理null和undefined
        if (value === null || value === undefined) {
          return value;
        }
        
        // 处理Date对象
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // 处理对象类型，防止循环引用
        if (typeof value === 'object' && value !== null) {
          // 排除特定的不可序列化对象
          if (value === window || 
              value instanceof Window || 
              value instanceof HTMLElement || 
              value instanceof Node ||
              value instanceof EventTarget ||
              typeof value === 'function') {
            return undefined; // 跳过这些对象
          }
          
          // 检查循环引用
          if (seen.has(value)) {
            return undefined; // 跳过循环引用
          }
          seen.add(value);
        }
        
        return value;
      }));
      
      await window.electronAPI!.storage.writeFile(this.getFilePath(fileName), serializedData);
    } catch (error) {
      console.error(`写入 ${fileName} 失败:`, error);
      throw error;
    }
  }

  // 链条相关方法
  async getChains(): Promise<Chain[]> {
    const data = await this.readData(DATA_FILES.CHAINS, []);
    return data.map((chain: any) => ({
      ...chain,
      auxiliaryStreak: chain.auxiliaryStreak || 0,
      auxiliaryFailures: chain.auxiliaryFailures || 0,
      auxiliaryExceptions: chain.auxiliaryExceptions || [],
      deletedAt: chain.deletedAt ? new Date(chain.deletedAt) : null,
      createdAt: new Date(chain.createdAt),
      lastCompletedAt: chain.lastCompletedAt ? new Date(chain.lastCompletedAt) : undefined,
    }));
  }

  async saveChains(chains: Chain[]): Promise<void> {
    await this.writeData(DATA_FILES.CHAINS, chains);
  }

  // 计划会话相关方法
  async getScheduledSessions(): Promise<ScheduledSession[]> {
    const data = await this.readData(DATA_FILES.SCHEDULED_SESSIONS, []);
    return data.map((session: any) => ({
      ...session,
      auxiliarySignal: session.auxiliarySignal || '预约信号',
      scheduledAt: new Date(session.scheduledAt),
      expiresAt: new Date(session.expiresAt),
    }));
  }

  async saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    await this.writeData(DATA_FILES.SCHEDULED_SESSIONS, sessions);
  }

  // 活动会话相关方法
  async getActiveSession(): Promise<ActiveSession | null> {
    const data = await this.readData(DATA_FILES.ACTIVE_SESSION, null);
    if (!data) return null;
    
    return {
      ...data,
      startedAt: new Date(data.startedAt),
      pausedAt: data.pausedAt ? new Date(data.pausedAt) : undefined,
    };
  }

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    await this.writeData(DATA_FILES.ACTIVE_SESSION, session);
  }

  // 完成历史相关方法
  async getCompletionHistory(): Promise<CompletionHistory[]> {
    const data = await this.readData(DATA_FILES.COMPLETION_HISTORY, []);
    return data.map((history: any) => ({
      ...history,
      completedAt: new Date(history.completedAt),
    }));
  }

  async saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    await this.writeData(DATA_FILES.COMPLETION_HISTORY, history);
  }

  // RSIP节点相关方法
  async getRSIPNodes(): Promise<RSIPNode[]> {
    const data = await this.readData(DATA_FILES.RSIP_NODES, []);
    return data.map((node: any) => ({
      ...node,
      createdAt: new Date(node.createdAt),
    }));
  }

  async saveRSIPNodes(nodes: RSIPNode[]): Promise<void> {
    await this.writeData(DATA_FILES.RSIP_NODES, nodes);
  }

  // RSIP元数据相关方法
  async getRSIPMeta(): Promise<RSIPMeta> {
    const data = await this.readData(DATA_FILES.RSIP_META, {});
    return {
      lastAddedAt: data.lastAddedAt ? new Date(data.lastAddedAt) : undefined,
      allowMultiplePerDay: !!data.allowMultiplePerDay,
    } as RSIPMeta;
  }

  async saveRSIPMeta(meta: RSIPMeta): Promise<void> {
    const dataToSave = {
      ...meta,
      lastAddedAt: meta.lastAddedAt ? meta.lastAddedAt.toISOString() : undefined,
      allowMultiplePerDay: !!meta.allowMultiplePerDay,
    };
    await this.writeData(DATA_FILES.RSIP_META, dataToSave);
  }

  // 任务时间统计相关方法
  async getTaskTimeStats(): Promise<TaskTimeStats[]> {
    return await this.readData(DATA_FILES.TASK_TIME_STATS, []);
  }

  async saveTaskTimeStats(stats: TaskTimeStats[]): Promise<void> {
    await this.writeData(DATA_FILES.TASK_TIME_STATS, stats);
  }

  // 回收箱相关方法
  async getActiveChains(): Promise<Chain[]> {
    const chains = await this.getChains();
    return chains.filter(chain => chain.deletedAt == null);
  }

  async getDeletedChains(): Promise<DeletedChain[]> {
    const chains = await this.getChains();
    return chains
      .filter(chain => chain.deletedAt != null)
      .map(chain => ({ ...chain, deletedAt: chain.deletedAt! }))
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  async softDeleteChain(chainId: string): Promise<void> {
    const chains = await this.getChains();
    const updatedChains = chains.map(chain => {
      if (chain.id === chainId || this.isChildOf(chain, chainId, chains)) {
        return { ...chain, deletedAt: new Date() };
      }
      return chain;
    });
    await this.saveChains(updatedChains);
  }

  async restoreChain(chainId: string): Promise<void> {
    const chains = await this.getChains();
    const updatedChains = chains.map(chain => {
      if (chain.id === chainId || this.isChildOf(chain, chainId, chains)) {
        return { ...chain, deletedAt: null };
      }
      return chain;
    });
    await this.saveChains(updatedChains);
  }

  async permanentlyDeleteChain(chainId: string): Promise<void> {
    const chains = await this.getChains();
    const updatedChains = chains.filter(chain => 
      chain.id !== chainId && !this.isChildOf(chain, chainId, chains)
    );
    await this.saveChains(updatedChains);
  }

  async cleanupExpiredDeletedChains(olderThanDays: number = 30): Promise<number> {
    const chains = await this.getChains();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const chainsToDelete = chains.filter(chain => 
      chain.deletedAt && chain.deletedAt < cutoffDate
    );
    
    const remainingChains = chains.filter(chain => 
      !chain.deletedAt || chain.deletedAt >= cutoffDate
    );
    
    await this.saveChains(remainingChains);
    return chainsToDelete.length;
  }

  // 任务时间统计辅助方法
  async getLastCompletionTime(chainId: string): Promise<number | null> {
    const stats = await this.getTaskTimeStats();
    const chainStats = stats.find(s => s.chainId === chainId);
    return chainStats?.lastCompletionTime || null;
  }

  async updateTaskTimeStats(chainId: string, actualDuration: number): Promise<void> {
    const stats = await this.getTaskTimeStats();
    const existingIndex = stats.findIndex(s => s.chainId === chainId);
    
    if (existingIndex >= 0) {
      // 更新现有统计
      const existing = stats[existingIndex];
      const newTotalTime = existing.totalTime + actualDuration;
      const newTotalCompletions = existing.totalCompletions + 1;
      
      stats[existingIndex] = {
        ...existing,
        lastCompletionTime: actualDuration,
        averageCompletionTime: Math.round(newTotalTime / newTotalCompletions),
        totalCompletions: newTotalCompletions,
        totalTime: newTotalTime
      };
    } else {
      // 创建新统计
      stats.push({
        chainId,
        lastCompletionTime: actualDuration,
        averageCompletionTime: actualDuration,
        totalCompletions: 1,
        totalTime: actualDuration
      });
    }
    
    await this.saveTaskTimeStats(stats);
  }

  async getTaskAverageTime(chainId: string): Promise<number | null> {
    const stats = await this.getTaskTimeStats();
    const chainStats = stats.find(s => s.chainId === chainId);
    return chainStats?.averageCompletionTime || null;
  }

  // 向后兼容性：为现有历史记录添加用时数据
  async migrateCompletionHistoryForTiming(): Promise<void> {
    const history = await this.getCompletionHistory();
    const chains = await this.getChains();
    let hasChanges = false;

    const updatedHistory = history.map(record => {
      // 如果记录还没有用时相关字段，添加它们
      if (record.actualDuration === undefined || record.isForwardTimed === undefined) {
        const chain = chains.find(c => c.id === record.chainId);
        hasChanges = true;
        
        return {
          ...record,
          actualDuration: record.duration, // 使用原计划时长作为实际用时
          isForwardTimed: chain?.isDurationless || false // 根据链条设置判断是否为正向计时
        };
      }
      return record;
    });

    if (hasChanges) {
      await this.saveCompletionHistory(updatedHistory);
    }
  }

  // 辅助方法：检查链条是否是指定链条的子链条
  private isChildOf(chain: Chain, parentId: string, allChains: Chain[]): boolean {
    if (!chain.parentId) return false;
    if (chain.parentId === parentId) return true;
    
    const parent = allChains.find(c => c.id === chain.parentId);
    if (!parent) return false;
    
    return this.isChildOf(parent, parentId, allChains);
  }

  // 选择数据存储目录
  async selectDataDirectory(): Promise<string | null> {
    await this.initialize();
    return await window.electronAPI!.storage.selectDataDirectory();
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    lastModified: Date | null;
  }> {
    await this.initialize();
    
    try {
      const files = await window.electronAPI!.storage.listDirectory(this.settings.dataPath);
      const dataFiles = files.filter(f => f.name.endsWith('.json'));
      
      const totalSize = dataFiles.reduce((sum, file) => sum + file.size, 0);
      const lastModified = dataFiles.length > 0 
        ? new Date(Math.max(...dataFiles.map(f => f.modifiedAt.getTime())))
        : null;
      
      return {
        totalSize,
        fileCount: dataFiles.length,
        lastModified
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return {
        totalSize: 0,
        fileCount: 0,
        lastModified: null
      };
    }
  }
}

// 创建单例实例
export const localFileStorage = new LocalFileStorageService();
