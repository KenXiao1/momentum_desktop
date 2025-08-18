# Momentum Desktop Release Script
# 用于快速创建和发布新版本（纯 GitHub Actions 方式）

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$Message = "Release version $Version"
)

Write-Host "🚀 Momentum Desktop Release Script" -ForegroundColor Green
Write-Host "版本: $Version" -ForegroundColor Yellow
Write-Host "描述: $Message" -ForegroundColor Yellow
Write-Host ""

# 检查版本格式
if ($Version -notmatch '^v?\d+\.\d+\.\d+$') {
    Write-Error "版本格式错误！请使用格式: v1.0.0 或 1.0.0"
    exit 1
}

# 确保版本以 v 开头
if (-not $Version.StartsWith('v')) {
    $Version = "v$Version"
}

try {
    Write-Host "📋 本次发布使用 GitHub Actions 云端构建" -ForegroundColor Blue
    Write-Host "✨ 无需本地打包，推送标签后自动构建" -ForegroundColor Blue
    Write-Host ""
    
    # 检查 Git 状态
    Write-Host "🔍 检查 Git 状态..." -ForegroundColor Blue
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "📝 发现未提交的更改：" -ForegroundColor Yellow
        git status --short
        Write-Host ""
        
        $response = Read-Host "是否提交这些更改？(y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            git add .
            git commit -m $Message
            Write-Host "✅ 更改已提交" -ForegroundColor Green
        } else {
            Write-Host "⚠️ 跳过提交，仅创建标签" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ 工作区干净，无需提交" -ForegroundColor Green
    }
    
    # 检查标签是否已存在
    $existingTag = git tag -l $Version
    if ($existingTag) {
        Write-Error "标签 $Version 已存在！请选择不同的版本号。"
        exit 1
    }
    
    Write-Host ""
    Write-Host "🏷️ 创建标签 $Version..." -ForegroundColor Blue
    git tag -a $Version -m $Message
    
    Write-Host "📤 推送到 GitHub..." -ForegroundColor Blue
    git push origin main
    git push origin $Version
    
    Write-Host ""
    Write-Host "🎉 发布流程已启动！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 接下来会发生什么：" -ForegroundColor Blue
    Write-Host "1. GitHub Actions 开始自动构建" -ForegroundColor White
    Write-Host "2. 构建 React 应用" -ForegroundColor White
    Write-Host "3. 打包 Electron 应用" -ForegroundColor White
    Write-Host "4. 生成安装包和便携版" -ForegroundColor White
    Write-Host "5. 自动创建 GitHub Release" -ForegroundColor White
    Write-Host "6. 上传构建产物到 Release" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 监控链接：" -ForegroundColor Yellow
    Write-Host "   Actions: https://github.com/enshulv/momentum_desktop/actions" -ForegroundColor Cyan
    Write-Host "   Releases: https://github.com/enshulv/momentum_desktop/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⏱️ 预计构建时间：5-10 分钟" -ForegroundColor Blue
    Write-Host "📦 构建完成后会包含：" -ForegroundColor Blue
    Write-Host "   • Windows 安装包 (.exe)" -ForegroundColor White
    Write-Host "   • 便携版 (.exe)" -ForegroundColor White
    Write-Host "   • 自动更新配置文件" -ForegroundColor White

} catch {
    Write-Error "发布失败: $_"
    exit 1
}