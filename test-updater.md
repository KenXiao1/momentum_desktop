# 🧪 自动更新测试指南 - 新版本

## ✅ 功能完成

### 🎯 新的自动更新行为

1. **启动检查**: 应用启动时自动检查更新
2. **静默下载**: 开启自动更新时，发现更新后立即静默下载
3. **完成提示**: 下载完成后才显示更新横幅
4. **一键安装**: 点击"立即安装"直接安装新版本

## 🧪 测试命令

启动应用后，打开开发者控制台 (F12)：

```javascript
// 查看帮助（必看！）
testUpdater.help()

// ⭐ 推荐：模拟真实更新流程
testUpdater.forceLatest()    // 强制本机版本→0.0.9，触发真实更新逻辑

// 其他测试命令
testUpdater.simulateUpdate()     // 模拟发现更新
testUpdater.simulateDownload()   // 模拟下载进度
testUpdater.simulateError()      // 模拟下载错误
testUpdater.reset()              // 重置状态
testUpdater.status()             // 查看当前状态
```

## 🎬 推荐测试流程

### 方案一：真实更新测试 ⭐

1. **确保自动更新开启**：
   - 打开"设置 → 关于" 
   - 确认"自动检查更新"已开启

2. **触发真实更新**：
   ```javascript
   testUpdater.forceLatest()
   ```

3. **观察流程**：
   - 控制台显示"模拟本机版本降级到 v0.0.9"
   - 如果自动更新开启，开始静默下载（约4秒）
   - 下载完成后，顶部显示更新横幅
   - 点击"立即安装"按钮

### 方案二：分步测试

1. **模拟发现更新**：
   ```javascript
   testUpdater.simulateUpdate()
   ```

2. **模拟下载进度**：
   ```javascript
   testUpdater.simulateDownload()
   ```
   - 打开"关于"页面查看进度条

3. **重置重新测试**：
   ```javascript
   testUpdater.reset()
   ```

## 🔍 关键观察点

### 开启自动更新时：
- ✅ 发现更新后不立即显示横幅
- ✅ 在"关于"页面可看到下载进度
- ✅ 下载完成后才显示横幅
- ✅ 横幅按钮为"立即安装"

### 关闭自动更新时：
- ✅ 发现更新后立即显示横幅  
- ✅ 横幅按钮为"下载更新"
- ✅ 点击后开始下载并显示进度

## 🚀 启动测试

```bash
npm run electron:dev
```

按F12打开控制台，输入 `testUpdater.help()` 开始测试！

## 🎁 特殊功能

- **版本模拟**: `forceLatest()` 会临时将本机版本改为0.0.9
- **自动恢复**: 5分钟后自动恢复真实版本号
- **真实数据**: 使用GitHub API获取真实的最新版本信息
