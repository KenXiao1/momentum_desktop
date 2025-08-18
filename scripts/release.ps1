# 自动发布脚本
# 使用方法: .\scripts\release.ps1 [patch|minor|major]

param(
    [Parameter(Position=0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType = "patch"
)

Write-Host "🚀 开始自动发布流程..." -ForegroundColor Green

# 1. 检查git状态
Write-Host "📋 检查Git状态..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "❌ 有未提交的更改，请先提交或暂存：" -ForegroundColor Red
    git status
    exit 1
}

# 2. 更新版本号
Write-Host "🔢 更新版本号 ($VersionType)..." -ForegroundColor Yellow
try {
    $newVersion = npm version $VersionType --no-git-tag-version
    Write-Host "✅ 版本号已更新为: $newVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 版本号更新失败: $_" -ForegroundColor Red
    exit 1
}

# 3. 提交版本更改
Write-Host "📝 提交版本更改..." -ForegroundColor Yellow
git add package.json package-lock.json
git commit -m "chore: bump version to $newVersion"

# 4. 创建并推送标签
Write-Host "🏷️ 创建Git标签..." -ForegroundColor Yellow
$tagName = "v$($newVersion.TrimStart('v'))"
git tag $tagName

Write-Host "📤 推送到远程仓库..." -ForegroundColor Yellow
git push origin main
git push origin $tagName

Write-Host "🎉 发布完成！" -ForegroundColor Green
Write-Host "📦 GitHub Actions将自动构建并发布到: https://github.com/enshulv/momentum_desktop/releases" -ForegroundColor Cyan
Write-Host "⏳ 请等待约5-10分钟查看构建结果..." -ForegroundColor Yellow
