/**
 * 用户偏好设置管理
 */

import { localFileStorage } from '../services/LocalFileStorage';

export interface UserPreferences {
  // 退出行为设置
  exitBehavior: 'ask' | 'hide' | 'exit';
  
  // 其他可能的偏好设置
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  minimizeToTray?: boolean;
  startWithSystem?: boolean;
  // 更新偏好
  autoCheckUpdates?: boolean;
}

const PREFERENCES_FILE = 'user_preferences.json';

const DEFAULT_PREFERENCES: UserPreferences = {
  exitBehavior: 'ask',
  theme: 'system',
  notifications: true,
  minimizeToTray: true,
  startWithSystem: false,
  autoCheckUpdates: true,
};

export class UserPreferencesManager {
  private preferences: UserPreferences;
  private isInitialized = false;

  constructor() {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    if (this.isInitialized) return;
    this.preferences = await this.loadPreferences();
    this.isInitialized = true;
  }

  /**
   * 加载用户偏好设置
   */
  private async loadPreferences(): Promise<UserPreferences> {
    try {
      await localFileStorage.initialize();
      const filePath = `${(await localFileStorage.getSettings()).dataPath}/${PREFERENCES_FILE}`;
      
      if (window.electronAPI?.storage) {
        try {
          const stored = await window.electronAPI.storage.readFile(filePath);
          if (stored) {
            return { ...DEFAULT_PREFERENCES, ...stored };
          }
        } catch (error) {
          // 文件不存在或读取失败，使用默认设置
          console.log('用户偏好设置文件不存在，使用默认设置');
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * 保存用户偏好设置
   */
  private async savePreferences(): Promise<void> {
    try {
      await localFileStorage.initialize();
      const filePath = `${(await localFileStorage.getSettings()).dataPath}/${PREFERENCES_FILE}`;
      
      if (window.electronAPI?.storage) {
        await window.electronAPI.storage.writeFile(filePath, this.preferences);
        console.log('用户偏好设置已保存到文件:', filePath);
      }
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  }

  /**
   * 获取所有偏好设置
   */
  getAll(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * 获取退出行为设置
   */
  getExitBehavior(): 'ask' | 'hide' | 'exit' {
    return this.preferences.exitBehavior;
  }

  /**
   * 设置退出行为
   */
  async setExitBehavior(behavior: 'ask' | 'hide' | 'exit'): Promise<void> {
    this.preferences.exitBehavior = behavior;
    await this.savePreferences();
  }

  /**
   * 获取主题设置
   */
  getTheme(): 'light' | 'dark' | 'system' {
    return this.preferences.theme || 'system';
  }

  /**
   * 设置主题
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    this.preferences.theme = theme;
    await this.savePreferences();
  }

  /**
   * 获取通知设置
   */
  getNotifications(): boolean {
    return this.preferences.notifications !== false;
  }

  /**
   * 设置通知
   */
  async setNotifications(enabled: boolean): Promise<void> {
    this.preferences.notifications = enabled;
    await this.savePreferences();
  }

  /**
   * 获取最小化到托盘设置
   */
  getMinimizeToTray(): boolean {
    return this.preferences.minimizeToTray !== false;
  }

  /**
   * 设置最小化到托盘
   */
  async setMinimizeToTray(enabled: boolean): Promise<void> {
    this.preferences.minimizeToTray = enabled;
    await this.savePreferences();
  }

  /**
   * 获取开机启动设置
   */
  getStartWithSystem(): boolean {
    return this.preferences.startWithSystem === true;
  }

  /**
   * 设置开机启动
   */
  async setStartWithSystem(enabled: boolean): Promise<void> {
    this.preferences.startWithSystem = enabled;
    await this.savePreferences();
  }

  /**
   * 获取是否自动检查更新
   */
  getAutoCheckUpdates(): boolean {
    return this.preferences.autoCheckUpdates !== false;
  }

  /**
   * 设置是否自动检查更新
   */
  async setAutoCheckUpdates(enabled: boolean): Promise<void> {
    this.preferences.autoCheckUpdates = enabled;
    await this.savePreferences();
  }

  /**
   * 重置所有偏好设置
   */
  async reset(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.savePreferences();
  }

  /**
   * 更新多个偏好设置
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    await this.savePreferences();
  }
}

// 导出单例实例
export const userPreferences = new UserPreferencesManager();
