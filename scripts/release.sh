#!/bin/bash
# 自动发布脚本
# 使用方法: ./scripts/release.sh [patch|minor|major]

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ 无效的版本类型: $VERSION_TYPE"
    echo "使用方法: ./scripts/release.sh [patch|minor|major]"
    exit 1
fi

echo "🚀 开始自动发布流程..."

# 1. 检查git状态
echo "📋 检查Git状态..."
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 有未提交的更改，请先提交或暂存："
    git status
    exit 1
fi

# 2. 更新版本号
echo "🔢 更新版本号 ($VERSION_TYPE)..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
if [[ $? -ne 0 ]]; then
    echo "❌ 版本号更新失败"
    exit 1
fi
echo "✅ 版本号已更新为: $NEW_VERSION"

# 3. 提交版本更改
echo "📝 提交版本更改..."
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# 4. 创建并推送标签
echo "🏷️ 创建Git标签..."
TAG_NAME="v${NEW_VERSION#v}"
git tag $TAG_NAME

echo "📤 推送到远程仓库..."
git push origin main
git push origin $TAG_NAME

echo "🎉 发布完成！"
echo "📦 GitHub Actions将自动构建并发布到: https://github.com/enshulv/momentum_desktop/releases"
echo "⏳ 请等待约5-10分钟查看构建结果..."
