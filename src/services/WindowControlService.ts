
// 使用preload脚本暴露的全局对象
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        once: (channel: string, listener: (...args: any[]) => void) => void;
        removeListener?: (channel: string, listener: (...args: any[]) => void) => void;
      }
    }
  }
}

export class WindowControlService {
  // 检查electron API是否可用
  private static isElectronAvailable() {
    const available = window && window.electron && window.electron.ipcRenderer;
    console.log('Checking Electron API availability:', {
      hasWindow: !!window,
      hasElectron: !!(window as any)?.electron,
      hasIpcRenderer: !!(window as any)?.electron?.ipcRenderer,
      available
    });
    return available;
  }

  // 提供同步检查方法，供组件在渲染时快速判断
  static isAvailableSync(): boolean {
    return !!this.isElectronAvailable();
  }

  // 提供公共异步可用性检查（带短暂重试）
  static async isAvailable(): Promise<boolean> {
    return await this.ensureElectronAvailable();
  }

  // 确保Electron API可用的异步方法
  private static async ensureElectronAvailable(): Promise<boolean> {
    // 如果已经可用，直接返回
    if (this.isElectronAvailable()) {
      return true;
    }

    // 尝试等待短暂时间，让preload有机会初始化
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 5;
      const interval = setInterval(() => {
        attempts++;
        if (this.isElectronAvailable()) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error('Electron API not available after multiple attempts');
          resolve(false);
        }
      }, 100); // 每100ms检查一次
    });
  }

  static async minimizeWindow() {
    if (await this.ensureElectronAvailable()) {
      window.electron.ipcRenderer.send('window:minimize');
    } else {
      console.error('Electron API not available');
    }
  }

  static async maximizeWindow() {
    if (await this.ensureElectronAvailable()) {
      window.electron.ipcRenderer.send('window:maximize');
    } else {
      console.error('Electron API not available');
    }
  }

  static async closeWindow() {
    if (await this.ensureElectronAvailable()) {
      window.electron.ipcRenderer.send('window:close');
    } else {
      console.error('Electron API not available');
    }
  }

  static async hideToTray() {
    if (await this.ensureElectronAvailable()) {
      window.electron.ipcRenderer.send('window:hide-to-tray');
    } else {
      console.error('Electron API not available');
    }
  }

  static setupIpcListeners() {
    // 可以在这里设置IPC监听器
  }

  // 订阅窗口状态变化（最大化/还原）
  static onWindowStateChange(listener: (state: { isMaximized: boolean }) => void) {
    if (!this.isElectronAvailable()) return () => {};
    const wrapped = (state: { isMaximized: boolean }) => listener(state);
    window.electron.ipcRenderer.on('window:state', wrapped);
    // 请求一次初始状态
    window.electron.ipcRenderer.send('window:query-state');
    // 返回取消订阅函数
    return () => {
      try {
        window.electron.ipcRenderer.removeListener?.('window:state', wrapped);
      } catch (_) {
        // ignore
      }
    };
  }
}