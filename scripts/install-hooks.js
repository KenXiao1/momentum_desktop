#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const preCommitHook = `#!/bin/sh
# 自动安全检查和代码检查

echo "🔒 运行提交前安全检查..."

# 运行安全检查
npm run security:check
if [ $? -ne 0 ]; then
  echo "❌ 安全检查失败，请修复问题后重新提交"
  exit 1
fi

# 运行代码检查（宽松模式）
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ 代码检查失败，请修复问题后重新提交"
  exit 1
fi

echo "✅ 所有检查通过，准备提交..."
`;

async function installHooks() {
  try {
    const gitHooksDir = path.join(projectRoot, '.git', 'hooks');
    
    // 检查.git目录是否存在
    try {
      await fs.access(gitHooksDir);
    } catch {
      console.log('⚠️  .git/hooks 目录不存在，跳过Git hooks安装');
      return;
    }
    
    // 安装pre-commit hook
    const preCommitPath = path.join(gitHooksDir, 'pre-commit');
    await fs.writeFile(preCommitPath, preCommitHook);
    
    // 在Windows上设置可执行权限（如果支持）
    try {
      await fs.chmod(preCommitPath, 0o755);
    } catch {
      // Windows可能不支持chmod，忽略错误
    }
    
    console.log('✅ Git hooks安装成功！');
    console.log('现在每次git commit前都会自动运行安全检查');
  } catch (error) {
    console.error('❌ Git hooks安装失败:', error.message);
    process.exit(1);
  }
}

installHooks();
