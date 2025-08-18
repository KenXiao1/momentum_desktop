# 🚀 快速发布指南

## 完成配置！

您的项目现在已配置为使用 **GitHub Actions** 自动构建和发布，无需本地打包！

## 📦 如何发布新版本

### 方法一：使用发布脚本（推荐）

```powershell
.\scripts\release.ps1 -Version "1.0.0" -Message "首个正式版本"
```

### 方法二：手动操作

```bash
# 1. 提交代码
git add .
git commit -m "feat: 新功能"

# 2. 创建版本标签
git tag v1.0.0

# 3. 推送到 GitHub
git push origin main --tags
```

## 🎯 自动化流程

推送标签后，GitHub Actions 会自动：

1. ✅ 安装依赖
2. ✅ 构建 React 应用  
3. ✅ 打包 Electron 应用
4. ✅ 生成安装包（NSIS）
5. ✅ 生成便携版
6. ✅ 创建 GitHub Release
7. ✅ 上传所有文件

## 📋 生成的文件

- `Momentum Desktop-Setup-1.0.0.exe` - 标准安装包
- `Momentum Desktop-Portable-1.0.0.exe` - 便携版  
- `latest.yml` - 自动更新配置
- `*.blockmap` - 增量更新文件

## 🔗 监控地址

- **构建状态**: https://github.com/enshulv/momentum_desktop/actions
- **发布页面**: https://github.com/enshulv/momentum_desktop/releases

## ⏱️ 构建时间

预计 5-10 分钟完成整个构建和发布流程。

---

🎉 **就是这么简单！推送标签，坐等安装包！**
