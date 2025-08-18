/**
 * 桌面通知工具类
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationManager {
  private permission: NotificationPermission = 'default';
  private isEnabled: boolean = false;

  constructor() {
    this.checkPermission();
    this.loadEnabledState();
  }

  /**
   * 检查通知权限
   */
  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 从本地存储加载启用状态
   */
  private loadEnabledState() {
    const stored = localStorage.getItem('notifications_enabled');
    this.isEnabled = stored === 'true' && this.permission === 'granted';
  }

  /**
   * 保存启用状态到本地存储
   */
  private saveEnabledState() {
    localStorage.setItem('notifications_enabled', this.isEnabled.toString());
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持桌面通知');
      return false;
    }

    if (this.permission === 'granted') {
      this.isEnabled = true;
      this.saveEnabledState();
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';
      this.saveEnabledState();
      return permission === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  }

  /**
   * 启用通知
   */
  async enableNotifications(): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      this.isEnabled = true;
      this.saveEnabledState();
    }
    return hasPermission;
  }

  /**
   * 禁用通知
   */
  disableNotifications(): void {
    this.isEnabled = false;
    this.saveEnabledState();
  }

  /**
   * 检查通知是否启用
   */
  isNotificationsEnabled(): boolean {
    return this.isEnabled && this.permission === 'granted';
  }
  /**
   * 显示通知
   */
  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    // 如果用户主动关闭了通知，直接返回null，不显示任何提示
    if (!this.isNotificationsEnabled()) {
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/vite.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: Date.now(),
      });

      // 添加点击事件处理
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自动关闭通知（除非需要用户交互）
      if (!options.requireInteraction) {
        setTimeout(() => {
          if (notification) {
            notification.close();
          }
        }, 5000);
      }

      return notification;
    } catch (error) {
      // 静默处理错误，不显示任何提示
      return null;
    }
  }

  /**
   * 任务完成通知
   */
  async notifyTaskCompleted(chainName: string, streak: number) {
    if (!this.isNotificationsEnabled()) return null;
    
    return this.showNotification({
      title: '任务完成',
      body: `"${chainName}"已完成！当前记录: #${streak}`,
      icon: '/vite.svg',
      tag: `task-completed-${Date.now()}`, // 确保每次通知都是唯一的
      requireInteraction: false,
    });
  }

  /**
   * 任务即将结束通知
   */
  async notifyTaskWarning(chainName: string, timeRemaining: string) {
    if (!this.isNotificationsEnabled()) return null;
    
    return this.showNotification({
      title: '任务即将结束',
      body: `"${chainName}"还剩${timeRemaining}，请继续保持专注！`,
      icon: '/vite.svg',
      tag: `task-warning-${Date.now()}`, // 确保每次通知都是唯一的
      requireInteraction: false,
    });
  }

  /**
   * 预约即将到期通知
   */
  async notifyScheduleWarning(chainName: string, timeRemaining: string) {
    if (!this.isNotificationsEnabled()) return null;
    
    return this.showNotification({
      title: '预约即将到期', 
      body: `"${chainName}"预约还剩${timeRemaining}，请准备开始任务！`,
      icon: '/vite.svg',
      tag: `schedule-warning-${Date.now()}`, // 确保每次通知都是唯一的
      requireInteraction: true,
    });
  }

  /**
   * 预约失败通知
   */
  async notifyScheduleFailed(chainName: string) {
    if (!this.isNotificationsEnabled()) return null;
    
    return this.showNotification({
      title: '预约失败',
      body: `"${chainName}"预约时间已到期，需要进行规则判定`,
      icon: '/vite.svg',
      tag: `schedule-failed-${Date.now()}`, // 确保每次通知都是唯一的
      requireInteraction: true,
    });
  }

  /**
   * 任务失败通知
   */
  async notifyTaskFailed(chainName: string, reason?: string) {
    if (!this.isNotificationsEnabled()) return null;
    
    return this.showNotification({
      title: '任务失败',
      body: reason ? `"${chainName}": ${reason}` : `"${chainName}"执行失败`,
      icon: '/vite.svg',
      tag: `task-failed-${Date.now()}`, // 确保每次通知都是唯一的
      requireInteraction: true,
    });
  }

  /**
   * 检查是否支持通知
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * 获取当前权限状态
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// 导出单例实例
export const notificationManager = new NotificationManager();