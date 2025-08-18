# Momentum Desktop - 桌面版自控力提升工具 🖥️

<p align="center">
  <img src="public/app-icon.png" alt="Momentum Logo" width="128" height="128">
</p>

<p align="center">
  <strong>基于链式时延协议（CTDP）理论的跨平台桌面应用</strong><br>
  通过"神圣座位原理"、"下必为例原理"和"线性时延原理"帮助用户建立强大的习惯链条
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform Support">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/version-1.0.0-orange" alt="Version">
</p>

---

## 📖 关于本分支

本分支是从主分支分叉而来的**桌面版增强分支**，在保持核心CTDP理论不变的基础上，为用户提供了完整的跨平台桌面应用体验。

### 🔗 核心功能介绍
完整的CTDP理论、三大核心原理和基础功能介绍，请查看：
- **[主分支README](https://github.com/yourusername/momentum/blob/main/README.md)** - 详细的理论介绍和核心功能
- **[知乎文章](https://www.zhihu.com/question/19888447/answer/1930799480401293785)** - CTDP理论原文
- **[理论详解](https://zhuanlan.zhihu.com/p/1932530006774505748)** - 完整的使用指南

---

## 🚀 桌面版新特性

### ✨ 本地化体验
- **🖥️ 原生桌面应用** - 基于Electron构建，支持Windows、macOS、Linux
- **🎯 无边框设计** - 现代化的无边框窗口界面
- **📱 系统托盘** - 支持后台运行，快速访问
- **⚙️ 窗口控制** - 自定义最小化、最大化、关闭按钮

### 💾 数据管理
- **🗂️ 本地文件存储** - 支持本地数据存储，无需依赖网络
- **☁️ 云端同步** - 可选的Supabase云端数据同步
- **💾 数据备份** - 一键备份和恢复功能
- **🔄 自动迁移** - 智能数据迁移和版本兼容

### ⏰ 增强提醒系统
- **🔔 桌面通知** - 预约到期前3分钟桌面提醒
- **📅 智能调度** - 高精度的任务调度系统
- **⚡ 实时反馈** - 即时的任务状态更新

### 🎨 界面优化
- **🌙 深色模式** - 支持系统主题跟随
- **📐 响应式设计** - 适配不同屏幕尺寸
- **🖱️ 优化滚动** - 针对桌面环境优化的滚动体验
- **⌨️ 快捷键支持** - 高效的键盘快捷操作

### 🔄 自动更新系统
- **📦 自动检测更新** - 应用启动时自动检查新版本
- **🔔 更新提醒** - 顶部通知栏显示可用更新
- **⚡ 一键更新** - 用户确认后自动下载和安装
- **🛡️ 增量更新** - 智能增量更新，节省带宽

---

## 📦 下载安装

### 📥 预编译版本
从 [Releases页面](https://github.com/enshulv/momentum_desktop/releases) 下载适合你系统的版本：

- **Windows x64**: `.exe` 安装包 (NSIS) / 便携版
- **macOS x64/ARM64**: `.dmg` 镜像文件 / `.zip` 压缩包 (支持Intel和Apple Silicon)
- **Linux x64**: `.AppImage` 可执行文件 / `.deb` / `.rpm` 安装包

### 🛠️ 从源码构建

#### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Git

#### 构建步骤
```bash
# 克隆仓库
git clone https://github.com/yourusername/momentum.git
cd momentum

# 安装依赖
npm install

# 开发模式运行
npm run electron:dev

# 构建生产版本
npm run electron:build
```

---

## 🔧 开发指南

### 项目结构
```
momentum/
├── electron/              # Electron主进程文件
│   ├── main.js            # 主进程入口
│   ├── preload.js         # 预加载脚本
│   └── preload.mjs        # ES模块预加载脚本
├── src/                   # React源码
│   ├── components/        # React组件
│   ├── services/          # 业务服务
│   ├── utils/            # 工具函数
│   └── styles/           # 样式文件
├── public/               # 静态资源
└── dist/                 # 构建输出目录
```

### 可用脚本
```bash
# 开发模式（Web）
npm run dev

# 开发模式（Electron）
npm run electron:dev

# 构建Web版本
npm run build

# 构建Electron应用
npm run electron:build

# 代码检查
npm run lint
```

### 自动更新配置

应用集成了基于GitHub Releases的自动更新系统：

1. **自动检测**: 应用启动时自动检查更新
2. **用户提示**: 发现新版本时在界面顶部显示通知
3. **确认下载**: 用户点击后显示更新确认对话框
4. **自动安装**: 下载完成后提示重启应用

更新检查基于 [Electron官方文档](https://www.electronjs.org/zh/docs/latest/tutorial/updates) 实现。

---

## 🔒 安全特性

### Electron安全配置
- ✅ **contextIsolation**: 启用上下文隔离
- ✅ **nodeIntegration**: 禁用Node.js集成
- ✅ **enableRemoteModule**: 禁用远程模块
- ✅ **preload脚本**: 安全的主进程-渲染进程通信

### 数据安全
- 🔐 所有用户数据本地加密存储
- 🛡️ 可选的云端数据端到端加密
- 🔍 定期安全漏洞检查和修复

---

## 🤝 贡献指南

欢迎为桌面版Momentum贡献代码！

### 贡献流程
1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 开发规范
- 遵循TypeScript严格模式
- 使用ESLint进行代码检查
- 编写单元测试覆盖新功能
- 更新相关文档

---

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

- **理论基础**: 感谢Edmond提出的链式时延协议（CTDP）理论
- **技术支持**: 基于Electron、React、TypeScript构建
- **社区贡献**: 感谢所有贡献者和用户的反馈

---

## 📞 支持与反馈

- **问题报告**: [GitHub Issues](https://github.com/enshulv/momentum_desktop/issues)
- **功能建议**: [GitHub Discussions](https://github.com/enshulv/momentum_desktop/discussions)
- **文档问题**: 请直接提交PR或创建Issue

---

<p align="center">
  <strong>让我们一起用科学的方法提升自控力！🚀</strong>
</p>