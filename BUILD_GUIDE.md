# 🚀 Momentum Desktop 构建与发布指南

本项目使用 **GitHub Actions + electron-builder** 实现全自动化的构建和发布流程，无需本地打包。

## 📋 前置准备

### 1. 配置 GitHub Token
1. 登录 GitHub → 点击个人头像 → Settings
2. 选择 Developer Settings → Personal access tokens → Tokens (classic)
3. 点击 "Generate new token" → 选择权限：
   - ✅ `repo` (完整权限)
   - ✅ `write:packages`
4. 复制生成的 token

### 2. 配置仓库 Secret
1. 进入项目仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. Name: `GH_TOKEN`
4. Value: 粘贴刚才复制的 token
5. 点击 "Add secret"

## 🔧 项目结构

```
momentum/
├── .github/workflows/
│   └── release.yml          # GitHub Actions 工作流
├── electron-builder.yml     # electron-builder 配置
├── electron/
│   └── main.js              # Electron 主进程
├── src/                     # React 应用源码
├── public/
│   └── app-icon.ico         # 应用图标
└── package.json
```

## 📦 发布流程

### 自动发布（推荐）

1. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 新功能描述"
   git push origin main
   ```

2. **创建版本标签**
   ```bash
   # 创建标签（格式：v主版本.次版本.修订版本）
   git tag v1.0.0
   
   # 推送标签到 GitHub
   git push origin v1.0.0
   ```

3. **自动构建**
   - GitHub Actions 会自动触发构建
   - 访问 `https://github.com/enshulv/momentum_desktop/actions` 查看构建进度
   - 构建成功后会自动创建 GitHub Release

### 快速发布脚本

使用提供的 PowerShell 脚本快速发布：

```powershell
.\scripts\release.ps1 -Version "1.0.0" -Message "首个正式版本"
```

## 📋 生成的文件

每次发布会自动生成以下文件：

| 文件名 | 说明 | 用途 |
|--------|------|------|
| `Momentum Desktop-Setup-1.0.0.exe` | 标准安装包 | 完整安装体验，写入注册表 |
| `Momentum Desktop-Portable-1.0.0.exe` | 便携版 | 免安装，绿色版本 |
| `latest.yml` | 更新配置 | 自动更新检查 |
| `*.blockmap` | 增量更新 | 差量更新支持 |

## 🎯 安装包特性

### 标准安装包
- ✅ NSIS 安装向导
- ✅ 可选择安装路径
- ✅ 自动创建桌面快捷方式
- ✅ 添加到开始菜单
- ✅ 支持卸载程序
- ✅ 写入 Windows 注册表

### 便携版
- ✅ 免安装运行
- ✅ 不写入注册表
- ✅ 适合 U 盘使用
- ✅ 数据保存在程序目录

## 🔄 自动更新配置

应用内置自动更新功能，基于 GitHub Releases：

```typescript
// electron/main.js 中已配置
import { updateElectronApp } from 'update-electron-app';

// 配置自动更新
updateElectronApp({
  repo: 'enshulv/momentum_desktop',
  updateInterval: '1 hour'
});
```

更新流程：
1. 应用启动时自动检查更新
2. 每小时检查一次更新
3. 发现新版本时提示用户
4. 用户确认后下载更新
5. 下载完成后提示重启安装

### 手动更新检查
```typescript
// 在渲染进程中调用
window.electronAPI.invoke('update:check-manual');
```

## 🛠️ 配置说明

### electron-builder.yml
主要配置项：
- `appId`: 应用唯一标识
- `productName`: 产品名称
- `publish`: GitHub 发布配置
- `nsis`: Windows 安装包配置
- `win.target`: 构建目标（nsis + portable）

### GitHub Actions
工作流触发条件：
- 推送符合 `v*.*.*` 格式的标签
- 自动安装依赖、构建、打包、发布

## 🐛 常见问题

### Q: GitHub Actions 构建失败？
A: 检查以下几点：
1. `GH_TOKEN` 是否正确配置
2. Token 权限是否包含 `repo`
3. 仓库名称是否匹配 `electron-builder.yml` 中的配置

### Q: 安装包无法运行？
A: 可能原因：
1. Windows Defender 误报，添加信任
2. 缺少 Visual C++ 运行库
3. 系统版本过低（需要 Windows 10+）

### Q: 自动更新不工作？
A: 检查：
1. 应用是否通过安装包安装（便携版不支持自动更新）
2. 网络连接是否正常
3. GitHub Releases 是否包含 `latest.yml` 文件

## 🌟 学习 Cherry Studio 的做法

[Cherry Studio](https://github.com/CherryHQ/cherry-studio) 是一个优秀的 Electron 应用案例，值得学习：

### 1. 多平台支持
- **Windows**: NSIS 安装包 + 便携版
- **macOS**: DMG 安装包，支持 Intel 和 Apple Silicon
- **Linux**: AppImage、DEB、RPM 多种格式

### 2. 专业的构建配置
```yaml
# 类似 Cherry Studio 的配置
win:
  target:
    - target: nsis
      arch: [x64, ia32]
    - target: portable
      arch: [x64, ia32]
  icon: public/app-icon.ico
  publisherName: "团队名称"
  
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  category: public.app-category.productivity
  
linux:
  target:
    - AppImage
    - deb
    - rpm
```

### 3. 自动化 CI/CD
- 使用 GitHub Actions 矩阵构建
- 多平台并行构建
- 自动发布到 GitHub Releases
- 支持手动触发构建

### 4. 用户体验优化
- 详细的发布说明
- 多语言安装包
- 自动更新机制
- 代码签名（可选）

### 5. 项目管理
- 规范的版本号管理
- 详细的更新日志
- 完善的文档说明
- 活跃的社区互动

## 📚 参考资料

- [electron-builder 官方文档](https://www.electron.build/)
- [GitHub Actions 文档](https://docs.github.com/actions)
- [Electron 自动更新指南](https://www.electronjs.org/docs/tutorial/updates)
- [Cherry Studio 项目](https://github.com/CherryHQ/cherry-studio) - 优秀的 Electron 应用实践

## 🚀 总结

通过学习 Cherry Studio 等优秀项目，我们可以：

1. **专业打包**: 使用 electron-builder 生成标准安装包
2. **多平台支持**: 一次配置，支持 Windows、macOS、Linux
3. **自动化发布**: GitHub Actions 全自动构建和发布
4. **用户友好**: NSIS 安装向导，便携版选择
5. **持续更新**: 内置自动更新机制

---

🎉 现在您只需要推送代码和标签，剩下的交给 GitHub Actions！就像 Cherry Studio 一样专业！
