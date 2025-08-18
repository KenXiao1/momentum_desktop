# 🚀 自动版本发布指南

## 📋 概述

本项目已配置完全自动化的版本发布流程，基于 **Conventional Commits** 和 **Semantic Release**。

### ✨ 特性
- 🤖 **全自动**：推送代码即可自动检测、构建、发布
- 📝 **智能版本**：根据提交类型自动确定版本号
- 📦 **自动构建**：自动构建 Electron 应用
- 📖 **自动更新日志**：自动生成 CHANGELOG.md
- 🏷️ **自动标签**：自动创建 Git 标签
- 📢 **自动发布**：自动创建 GitHub Release

## 🔧 工作原理

### 提交类型 → 版本类型映射

| 提交类型 | 版本影响 | 示例 |
|---------|---------|------|
| `feat:` | **Minor** (1.0.0 → 1.1.0) | `feat: 添加新的专注模式` |
| `fix:` | **Patch** (1.0.0 → 1.0.1) | `fix: 修复定时器显示问题` |
| `perf:` | **Patch** (1.0.0 → 1.0.1) | `perf: 优化应用启动速度` |
| `refactor:` | **Patch** (1.0.0 → 1.0.1) | `refactor: 重构存储模块` |
| `revert:` | **Patch** (1.0.0 → 1.0.1) | `revert: 回滚上次更改` |
| `BREAKING CHANGE:` | **Major** (1.0.0 → 2.0.0) | 任何包含 `BREAKING CHANGE:` 的提交 |

### 不触发发布的提交类型

| 提交类型 | 说明 |
|---------|------|
| `docs:` | 仅文档更改 |
| `style:` | 代码格式、不影响功能 |
| `test:` | 添加或修改测试 |
| `chore:` | 构建工具、辅助工具等 |
| `ci:` | CI/CD 配置更改 |
| `build:` | 构建系统更改 |

## 🚀 使用方法

### 1. 标准工作流

```bash
# 1. 开发功能
git checkout new-feature-branch
# ... 编写代码 ...

# 2. 使用规范提交格式
git add .
git commit -m "feat: 添加任务群时间限制功能"

# 3. 推送到远程
git push origin new-feature-branch

# 🎉 完成！GitHub Actions 会自动：
# - 检测提交类型
# - 确定新版本号 (例如 1.1.0)
# - 构建 Electron 应用
# - 创建 Git 标签 (v1.1.0)
# - 生成 CHANGELOG.md
# - 创建 GitHub Release
```

### 2. 提交消息格式

#### 基本格式
```
<类型>: <描述>

[可选的正文]

[可选的脚注]
```

#### 示例

**新功能：**
```bash
git commit -m "feat: 添加暗黑模式支持"
```

**修复问题：**
```bash
git commit -m "fix: 修复专注模式计时器不准确的问题"
```

**性能优化：**
```bash
git commit -m "perf: 优化应用启动时间，减少50%的加载时间"
```

**重大更改：**
```bash
git commit -m "feat!: 重新设计用户界面

BREAKING CHANGE: 旧版本的配置文件不再兼容"
```

**带作用域：**
```bash
git commit -m "fix(timer): 修复倒计时显示错误"
git commit -m "feat(ui): 添加新的主题选择器"
```

## 📦 发布流程

### 自动发布触发条件
- ✅ Push 到 `new-feature-branch` 分支
- ✅ 包含触发发布的提交类型 (`feat`, `fix`, `perf` 等)
- ✅ 代码检查通过 (lint)

### 发布过程

1. **🔍 分析提交**：semantic-release 分析自上次发布以来的所有提交
2. **📊 确定版本**：根据提交类型确定新版本号
3. **🏗️ 构建应用**：自动执行 `npm run electron:build-only`
4. **📝 生成日志**：自动更新 CHANGELOG.md
5. **🏷️ 创建标签**：创建新的 Git 标签
6. **📦 创建发布**：在 GitHub 创建新的 Release
7. **📎 上传文件**：上传构建的安装包

### 生成的文件

每次发布会自动生成：
- `Momentum Desktop-Setup-x.x.x.exe` - NSIS 安装包
- `Momentum Desktop-Portable-x.x.x.exe` - 便携版
- `Momentum Desktop-Setup-x.x.x.zip` - 压缩包版本

## 📋 查看发布

### GitHub Release 页面
访问：`https://github.com/enshulv/momentum_desktop/releases`

### 最新版本下载
访问：`https://github.com/enshulv/momentum_desktop/releases/latest`

### Actions 执行状态
访问：`https://github.com/enshulv/momentum_desktop/actions`

## 🔧 配置文件

| 文件 | 作用 |
|-----|------|
| `.releaserc.json` | semantic-release 主配置 |
| `.github/workflows/release.yml` | GitHub Actions 工作流 |
| `electron-builder.yml` | Electron 构建配置 |
| `commitlint.config.js` | 提交消息规范检查 |

## 🎯 最佳实践

### ✅ 推荐做法

1. **清晰的提交消息**：描述具体做了什么
   ```bash
   # ✅ 好的例子
   git commit -m "feat: 添加任务完成音效提醒功能"
   git commit -m "fix: 修复在Windows 11上窗口大小异常的问题"
   
   # ❌ 避免的例子  
   git commit -m "update"
   git commit -m "fix bug"
   ```

2. **合理的提交频率**：每个功能或修复一个提交

3. **使用作用域**：明确影响范围
   ```bash
   git commit -m "feat(timer): 添加番茄钟休息提醒"
   git commit -m "fix(storage): 修复数据同步问题"
   ```

### ⚠️ 注意事项

1. **避免无意义提交**：使用 `chore:` 或 `docs:` 类型的提交不会触发发布
2. **重大更改谨慎**：使用 `BREAKING CHANGE:` 会触发主版本更新
3. **测试充分**：确保代码质量，因为发布是自动的

## 🔍 故障排除

### 发布失败常见原因

1. **代码检查失败**：修复 ESLint 错误
2. **构建失败**：检查 TypeScript 类型错误
3. **权限问题**：确保 GitHub token 配置正确

### 查看详细日志

1. 访问 [GitHub Actions](https://github.com/enshulv/momentum_desktop/actions)
2. 点击最新的 "🚀 Auto Release" 工作流
3. 查看失败步骤的详细输出

## 📞 支持

如有问题或建议，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Actions 的执行日志
3. 提交 Issue 到项目仓库
