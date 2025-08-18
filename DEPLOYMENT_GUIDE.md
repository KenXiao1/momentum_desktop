# Momentum Desktop 部署和发布指南 🚀

本指南介绍如何部署Momentum Desktop应用并使用自动更新功能。

## 📦 自动化部署流程

### GitHub Actions自动构建

项目已配置GitHub Actions工作流，会在以下情况自动触发构建：

1. **推送标签（Tag）时** - 自动发布新版本
2. **推送到主分支或新功能分支** - 构建测试版本
3. **创建Pull Request** - 验证构建

### 发布新版本步骤

```bash
# 1. 更新package.json中的版本号
npm version patch  # 或 minor, major

# 2. 创建并推送标签
git tag v1.0.1
git push origin v1.0.1

# 3. GitHub Actions会自动:
#    - 构建Windows、macOS、Linux版本
#    - 创建GitHub Release
#    - 上传安装包到Release页面
```

### 支持的平台和格式

- **Windows**: `.exe` 安装包（NSIS）
- **macOS**: `.dmg` 镜像文件（x64 + ARM64）
- **Linux**: `.AppImage` 可执行文件和 `.deb` 包

## 🔄 自动更新系统

### 更新检测机制

应用集成了基于GitHub Releases的自动更新系统：

1. **启动检测**: 应用启动3秒后自动检查更新
2. **版本比较**: 使用语义化版本号比较算法
3. **API调用**: 通过GitHub API获取最新发布信息

### 用户体验流程

```
应用启动 → 后台检查更新 → 发现新版本 → 顶部通知栏提示 → 用户点击更新 → 打开下载页面
```

### 更新通知界面

- **顶部通知栏**: 蓝紫渐变背景，显眼但不干扰
- **版本信息**: 显示当前版本和最新版本对比
- **更新详情**: 可展开查看发布说明
- **一键更新**: 直接打开GitHub Release下载页面

## 🛠️ 开发和测试

### 本地开发

```bash
# 开发模式（Web）
npm run dev

# 开发模式（Electron）
npm run electron:dev

# 构建测试
npm run build
npm run electron:build
```

### 更新功能测试

```bash
# 1. 修改package.json中的版本号（降低版本）
# 2. 运行应用
npm run electron:dev

# 3. 检查控制台输出，确认更新检测工作正常
# 4. 测试UI组件的显示和交互
```

## 🔧 配置说明

### GitHub Actions配置

文件位置: `.github/workflows/build-and-release.yml`

关键配置项：
- **触发条件**: tags、branches、pull_requests
- **构建矩阵**: Windows、macOS、Linux
- **环境变量**: `GH_TOKEN`自动提供
- **代码签名**: macOS需要配置证书（可选）

### Electron Builder配置

文件位置: `package.json` → `build` 字段

```json
{
  "build": {
    "appId": "com.momentum.desktop",
    "productName": "Momentum Desktop",
    "publish": {
      "provider": "github",
      "owner": "yourusername",
      "repo": "momentum"
    }
  }
}
```

### 更新服务配置

主进程文件: `electron/main.js`

- **API端点**: `https://api.github.com/repos/yourusername/momentum/releases/latest`
- **版本比较**: 语义化版本号算法
- **检查频率**: 启动时 + 手动检查

## 📋 发布检查清单

### 发布前检查

- [ ] 更新版本号（package.json）
- [ ] 更新CHANGELOG（如果有）
- [ ] 运行所有测试
- [ ] 执行安全审计 `npm audit`
- [ ] 验证构建无错误

### 发布步骤

- [ ] 创建版本标签
- [ ] 推送到GitHub
- [ ] 等待Actions完成构建
- [ ] 验证Release页面
- [ ] 测试下载和安装

### 发布后验证

- [ ] 下载各平台安装包测试
- [ ] 验证自动更新检测
- [ ] 检查用户反馈
- [ ] 监控错误日志

## 🔒 安全注意事项

### 代码签名

- **Windows**: 需要代码签名证书（可选）
- **macOS**: 需要开发者证书和公证（推荐）
- **Linux**: AppImage可以自签名（可选）

### 更新安全

- **HTTPS**: 所有更新检查使用HTTPS
- **源验证**: 仅从GitHub官方API获取更新信息
- **用户确认**: 需要用户主动确认更新

## 📞 故障排除

### 常见问题

1. **构建失败**
   - 检查Node.js版本（需要18+）
   - 验证package.json语法
   - 查看Actions日志

2. **更新检测失败**
   - 检查网络连接
   - 验证GitHub API访问
   - 查看控制台错误信息

3. **安装包问题**
   - 验证文件完整性
   - 检查系统兼容性
   - 查看安装日志

### 调试技巧

```bash
# 启用详细日志
export DEBUG=electron-builder

# 查看构建详情
npm run electron:build --verbose

# 检查更新状态
# 在应用中打开开发者工具查看控制台
```

## 📚 参考资源

- [Electron官方文档](https://www.electronjs.org/zh/docs/latest/)
- [Electron Builder文档](https://www.electron.build/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [语义化版本规范](https://semver.org/lang/zh-CN/)

---

## 🎯 快速开始

### 首次部署

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/momentum.git
cd momentum

# 2. 安装依赖
npm install

# 3. 构建第一个版本
npm version 1.0.0
git tag v1.0.0
git push origin v1.0.0

# 4. 等待GitHub Actions完成构建
# 5. 在Release页面查看构建结果
```

### 日常更新

```bash
# 1. 开发新功能
git checkout -b feature/new-feature
# ... 开发和测试 ...

# 2. 合并到主分支
git checkout main
git merge feature/new-feature

# 3. 发布新版本
npm version patch
git push origin main
git push --tags
```

恭喜！🎉 现在你已经有了一个完整的自动更新系统！
