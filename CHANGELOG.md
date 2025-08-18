## [2.0.0](https://github.com/enshulv/momentum_desktop/compare/v1.0.0...v2.0.0) (2025-08-18)

### ⚠ BREAKING CHANGES

* 启用自动版本管理，未来版本号将自动递增

### 🚀 新功能

* **update:** enhance auto-update system with silent download and testing tools ([e590400](https://github.com/enshulv/momentum_desktop/commit/e59040032fcd8ce0d71f1dc6d2cc3cb5011c18bd))
* 简化自动版本发布流程，semantic-release全自动处理 ([57712fe](https://github.com/enshulv/momentum_desktop/commit/57712feca1e241df3257a8f35b36771a9c142def))
* 配置自动版本管理系统 ([ea7478c](https://github.com/enshulv/momentum_desktop/commit/ea7478c3508f1b53cc8efc6cc000a0a09a401c9a))

### 🐛 修复

* **backup:** resolve Date serialization error in DataBackupService ([be6ec0e](https://github.com/enshulv/momentum_desktop/commit/be6ec0e5dd17986a5afcaab872a40390c8621851))
* **ci:** configure semantic-release for new-feature-branch only ([b19c69b](https://github.com/enshulv/momentum_desktop/commit/b19c69bcfa059770be33bfab7a86d270e68d2717))
* **ci:** 更新Node.js版本到20以兼容semantic-release ([86dd41a](https://github.com/enshulv/momentum_desktop/commit/86dd41afd2a5d5572b2cc0394e7f7d1b0e5a72a8))
* 移除App.tsx中对已删除测试文件的引用 ([21880af](https://github.com/enshulv/momentum_desktop/commit/21880af2343c823b60fdf36dd32369dd7abc37a1))

### ⚡ 性能优化

* 优化应用打包体积，减少72.5%的包大小并清理测试文件 ([8186f5e](https://github.com/enshulv/momentum_desktop/commit/8186f5e80b048d937a16c545d34f5fe97a570ed7))
