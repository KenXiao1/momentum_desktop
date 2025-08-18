/**
 * 用户偏好设置管理
 */

export interface UserPreferences {
  // 退出行为设置
  exitBehavior: 'ask' | 'hide' | 'exit';
  
  // 其他可能的偏好设置
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  minimizeToTray?: boolean;
  startWithSystem?: boolean;
}

const STORAGE_KEY = 'momentum_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  exitBehavior: 'ask',
  theme: 'system',
  notifications: true,
  minimizeToTray: true,
  startWithSystem: false,
};

export class UserPreferencesManager {
  private preferences: UserPreferences;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * 加载用户偏好设置
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * 保存用户偏好设置
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
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
  setExitBehavior(behavior: 'ask' | 'hide' | 'exit'): void {
    this.preferences.exitBehavior = behavior;
    this.savePreferences();
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
  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.preferences.theme = theme;
    this.savePreferences();
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
  setNotifications(enabled: boolean): void {
    this.preferences.notifications = enabled;
    this.savePreferences();
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
  setMinimizeToTray(enabled: boolean): void {
    this.preferences.minimizeToTray = enabled;
    this.savePreferences();
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
  setStartWithSystem(enabled: boolean): void {
    this.preferences.startWithSystem = enabled;
    this.savePreferences();
  }

  /**
   * 重置所有偏好设置
   */
  reset(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  /**
   * 更新多个偏好设置
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }
}

// 导出单例实例
export const userPreferences = new UserPreferencesManager();
