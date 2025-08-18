/**
 * 预约会话倒计时管理器
 * 用于管理预约会话的倒计时和提前通知功能
 */

import { notificationManager } from './notifications';

export interface ScheduleTimerState {
  chainId: string;
  chainName: string;
  expiresAt: Date;
  hasShown3MinWarning: boolean;
  hasShownExpiryWarning: boolean;
}

export class ScheduleTimerManager {
  private timers: Map<string, ScheduleTimerState> = new Map();
  private intervalId: number | null = null;
  private onExpired?: (chainId: string) => void;

  constructor() {
    this.startMonitoring();
  }

  /**
   * 添加预约会话监控
   */
  addSchedule(
    chainId: string, 
    chainName: string, 
    expiresAt: Date
  ): void {
    this.timers.set(chainId, {
      chainId,
      chainName,
      expiresAt,
      hasShown3MinWarning: false,
      hasShownExpiryWarning: false,
    });

    // 立即检查一次，以防添加的时候已经需要提醒
    this.checkSchedules();
  }

  /**
   * 移除预约会话监控
   */
  removeSchedule(chainId: string): void {
    this.timers.delete(chainId);
  }

  /**
   * 获取预约会话的剩余时间（秒）
   */
  getRemainingTime(chainId: string): number {
    const timer = this.timers.get(chainId);
    if (!timer) return 0;

    const now = Date.now();
    const remaining = timer.expiresAt.getTime() - now;
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * 获取所有活跃的预约会话
   */
  getActiveSchedules(): ScheduleTimerState[] {
    return Array.from(this.timers.values());
  }

  /**
   * 设置过期回调函数
   */
  setOnExpiredCallback(callback: (chainId: string) => void): void {
    this.onExpired = callback;
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // 每10秒检查一次，确保及时响应
    this.intervalId = window.setInterval(() => {
      this.checkSchedules();
    }, 10000);
  }

  /**
   * 检查所有预约会话状态
   */
  private checkSchedules(): void {
    const now = Date.now();

    this.timers.forEach((timer, chainId) => {
      const remaining = timer.expiresAt.getTime() - now;
      const remainingMinutes = remaining / (1000 * 60);

      // 检查是否已过期
      if (remaining <= 0) {
        if (!timer.hasShownExpiryWarning) {
          timer.hasShownExpiryWarning = true;
          notificationManager.notifyScheduleFailed(timer.chainName);
          
          // 触发过期回调
          if (this.onExpired) {
            this.onExpired(chainId);
          }
        }
        return;
      }

      // 检查是否需要显示3分钟提醒
      if (remainingMinutes <= 3 && remainingMinutes > 0 && !timer.hasShown3MinWarning) {
        timer.hasShown3MinWarning = true;
        const minutesText = Math.ceil(remainingMinutes) === 1 ? '1分钟' : `${Math.ceil(remainingMinutes)}分钟`;
        notificationManager.notifyScheduleWarning(timer.chainName, minutesText);
      }
    });
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timers.clear();
  }

  /**
   * 清理过期的预约会话
   */
  cleanupExpired(): void {
    const now = Date.now();
    const expiredChains: string[] = [];

    this.timers.forEach((timer, chainId) => {
      if (timer.expiresAt.getTime() <= now) {
        expiredChains.push(chainId);
      }
    });

    expiredChains.forEach(chainId => {
      this.timers.delete(chainId);
    });
  }

  /**
   * 格式化剩余时间显示
   */
  formatRemainingTime(chainId: string): string {
    const remainingSeconds = this.getRemainingTime(chainId);
    
    if (remainingSeconds <= 0) {
      return '已过期';
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (minutes > 0) {
      return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 检查是否即将过期（剩余3分钟内）
   */
  isAlmostExpired(chainId: string): boolean {
    const remainingSeconds = this.getRemainingTime(chainId);
    return remainingSeconds > 0 && remainingSeconds <= 180; // 3分钟 = 180秒
  }

  /**
   * 检查是否已过期
   */
  isExpired(chainId: string): boolean {
    return this.getRemainingTime(chainId) <= 0;
  }
}

// 创建全局实例
export const scheduleTimerManager = new ScheduleTimerManager();
