/**
 * 自动更新测试工具
 * 
 * 使用方法：
 * 1. 打开开发者控制台 (F12)
 * 2. 输入: window.testUpdater.help() 查看所有可用命令
 * 3. 使用各种测试函数来模拟更新流程
 */

class TestUpdater {
  
  /**
   * 显示帮助信息
   */
  help() {
    console.log(`
🧪 自动更新测试工具

可用命令：
• testUpdater.simulateUpdate()       - 模拟发现更新（显示更新横幅）
• testUpdater.simulateDownload()     - 模拟下载进度（带进度条）
• testUpdater.simulateError()        - 模拟下载错误
• testUpdater.forceLatest()          - ⭐ 模拟真实更新（本机版本→0.0.9）
• testUpdater.reset()                - 重置所有更新状态
• testUpdater.status()               - 查看当前更新状态
• testUpdater.help()                 - 显示此帮助信息

🎯 推荐测试流程：
1. 确保在"关于"页面开启了"自动检查更新"
2. testUpdater.forceLatest()         // 触发真实更新流程
3. 等待静默下载完成（约4秒）
4. 查看更新横幅，点击"立即安装"
    `);
  }

  /**
   * 模拟发现更新
   */
  async simulateUpdate() {
    try {
      const result = await window.electronAPI?.test?.simulateUpdateAvailable();
      console.log('✅ 模拟更新:', result);
      console.log('🔍 现在应该能看到顶部的更新横幅了！');
      return result;
    } catch (error) {
      console.error('❌ 模拟更新失败:', error);
    }
  }

  /**
   * 模拟下载进度（耗时约5秒）
   */
  async simulateDownload() {
    try {
      console.log('📥 开始模拟下载，请打开"关于"页面查看进度条...');
      const result = await window.electronAPI?.test?.simulateDownloadProgress();
      console.log('✅ 下载模拟完成:', result);
      return result;
    } catch (error) {
      console.error('❌ 模拟下载失败:', error);
    }
  }

  /**
   * 模拟下载错误
   */
  async simulateError() {
    try {
      const result = await window.electronAPI?.test?.simulateDownloadError();
      console.log('⚠️ 模拟错误:', result);
      return result;
    } catch (error) {
      console.error('❌ 模拟错误失败:', error);
    }
  }

  /**
   * 模拟真实更新流程（强制本机版本为0.0.9）
   */
  async forceLatest() {
    try {
      console.log('🚀 正在模拟真实更新流程...');
      console.log('📝 说明: 将临时设置本机版本为 v0.0.9，从GitHub获取最新版本');
      const result = await window.electronAPI?.test?.forceDownloadLatest();
      console.log('✅ 模拟更新结果:', result);
      
      if (result?.autoDownload) {
        console.log('🔽 检测到自动更新已开启，将自动静默下载');
        console.log('⏰ 下载完成后才会显示更新横幅，请耐心等待...');
        console.log('💡 提示: 可以打开"关于"页面查看下载进度');
      } else {
        console.log('🔔 自动更新已关闭，立即显示更新横幅');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 模拟更新失败:', error);
    }
  }

  /**
   * 重置更新状态
   */
  async reset() {
    try {
      const result = await window.electronAPI?.test?.resetUpdateState();
      console.log('🔄 重置状态:', result);
      console.log('✨ 现在更新横幅应该消失了');
      return result;
    } catch (error) {
      console.error('❌ 重置失败:', error);
    }
  }

  /**
   * 查看当前更新状态
   */
  async status() {
    try {
      const status = await window.electronAPI?.test?.getStatus();
      console.log('📊 当前状态:', status);
      
      if (status?.updateAvailable) {
        console.log(`🎯 发现更新: v${status.updateInfo?.version}`);
      } else {
        console.log('😴 暂无更新');
      }
      
      if (status?.isDownloading) {
        console.log(`📥 正在下载: ${status.downloadProgress?.percent}%`);
      }
      
      return status;
    } catch (error) {
      console.error('❌ 获取状态失败:', error);
    }
  }

  /**
   * 完整测试流程（自动化）
   */
  async fullTest() {
    console.log('🎬 开始完整测试流程...');
    
    // 1. 重置状态
    await this.reset();
    await this.sleep(1000);
    
    // 2. 模拟发现更新
    console.log('📢 步骤 1: 模拟发现更新');
    await this.simulateUpdate();
    await this.sleep(2000);
    
    // 3. 模拟下载过程
    console.log('📥 步骤 2: 模拟下载过程');
    await this.simulateDownload();
    
    console.log('🎉 完整测试流程完成！');
  }

  /**
   * 工具函数：等待指定毫秒
   */
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建全局实例
const testUpdater = new TestUpdater();

// 暴露到全局
declare global {
  interface Window {
    testUpdater: TestUpdater;
  }
}

window.testUpdater = testUpdater;

// 开发环境下自动显示帮助
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 自动更新测试工具已加载');
  console.log('💡 输入 testUpdater.help() 查看可用命令');
}

export default testUpdater;
