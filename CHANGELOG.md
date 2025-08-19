## [1.2.1](https://github.com/enshulv/momentum_desktop/compare/v1.2.0...v1.2.1) (2025-08-19)

### ⚠ BREAKING CHANGES

* **App.tsx**: 修复变量名错误，将 `updatedActiveChains` 更正为 `cleanActiveChains`
* **storage.ts**: 修复循环引用导致的序列化失败问题，添加数据清理逻辑
* - 添加循环引用检测和清理机制
* - 跳过不可序列化的属性（如window、document、element）
* - 增强错误处理和日志记录
* - 特殊处理Date对象的序列化

### 🐛 修复

* 修正了一些bug ([41a132c](https://github.com/enshulv/momentum_desktop/commit/41a132c13745e0fc3318fe86d7e745a65882cea5))

## [1.2.0](https://github.com/enshulv/momentum_desktop/compare/v1.1.0...v1.2.0) (2025-08-19)

### 🚀 新功能

* 新增预约提醒功能和对话框系统重构 ([5e560bf](https://github.com/enshulv/momentum_desktop/commit/5e560bf4dab8a88dd55e4b6fd76b3b47c417f67f))
>>>>>>> 358471a7ad8adc95077ac13ae5a41b0a190ba4e5

## [1.1.0](https://github.com/enshulv/momentum_desktop/compare/v1.0.0...v1.1.0) (2025-08-19)

### 🚀 新功能

* 重新触发版本发布系统 ([f3a3cf7](https://github.com/enshulv/momentum_desktop/commit/f3a3cf7257f9742f9bf10e83d3491b84809aec38))

# Changelog

All notable changes to this project will be documented in this file.
