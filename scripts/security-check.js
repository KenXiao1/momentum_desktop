#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// 安全检查配置
const SECURITY_CONFIG = {
  // 敏感信息模式
  sensitivePatterns: [
    // API密钥和令牌
    /(?:api[_-]?key|apikey)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    /(?:secret[_-]?key|secretkey)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    /(?:access[_-]?token|accesstoken)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    /(?:auth[_-]?token|authtoken)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    /(?:bearer[_-]?token|bearertoken)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    
    // 数据库连接字符串
    /(?:database[_-]?url|databaseurl)['"]*\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    /(?:db[_-]?url|dburl)['"]*\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    /(?:connection[_-]?string|connectionstring)['"]*\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    
    // 密码
    /(?:password|passwd|pwd)['"]*\s*[:=]\s*['"][^'"]{3,}['"]/gi,
    
    // 私钥
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
    /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/gi,
    
    // AWS相关
    /AKIA[0-9A-Z]{16}/gi,
    /(?:aws[_-]?secret[_-]?access[_-]?key|awssecretaccesskey)['"]*\s*[:=]\s*['"][a-z0-9/+=]{40}['"]/gi,
    
    // GitHub相关
    /gh[pousr]_[A-Za-z0-9_]{36}/gi,
    /github[_-]?token['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    
    // Supabase相关
    /(?:supabase[_-]?(?:url|key|secret))['"]*\s*[:=]\s*['"][^'"]{10,}['"]/gi,
    
    // 其他常见敏感信息
    /(?:client[_-]?secret|clientsecret)['"]*\s*[:=]\s*['"][a-z0-9_-]{8,}['"]/gi,
    /(?:private[_-]?key|privatekey)['"]*\s*[:=]\s*['"][^'"]{10,}['"]/gi,
  ],
  
  // 需要检查的文件扩展名
  fileExtensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.yml', '.yaml', '.md'],
  
  // 排除的目录
  excludeDirs: ['node_modules', 'dist', 'dist_electron', '.git', 'coverage'],
  
  // 排除的文件
  excludeFiles: ['package-lock.json', '.gitignore'],
  
  // 危险的依赖包
  dangerousPackages: [
    'eval',
    'exec',
    'shell-quote',
    'node-uuid',  // 使用uuid替代
  ],
  
  // 检查文件大小限制 (MB)
  maxFileSize: 10,
};

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.checkedFiles = 0;
  }

  async run() {
    console.log('🔒 开始安全检查...\n');
    
    try {
      await this.checkSensitiveData();
      await this.checkDependencies();
      await this.checkFilePermissions();
      await this.checkConfiguration();
      
      this.printResults();
      
      if (this.issues.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 安全检查失败:', error.message);
      process.exit(1);
    }
  }

  async checkSensitiveData() {
    console.log('📄 检查敏感数据泄露...');
    
    const files = await this.getAllFiles(projectRoot);
    
    for (const file of files) {
      await this.checkFileForSensitiveData(file);
    }
    
    console.log(`✅ 已检查 ${this.checkedFiles} 个文件\n`);
  }

  async getAllFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!SECURITY_CONFIG.excludeDirs.includes(entry.name)) {
            files.push(...await this.getAllFiles(fullPath));
          }
        } else {
          const ext = path.extname(entry.name);
          if (SECURITY_CONFIG.fileExtensions.includes(ext) && 
              !SECURITY_CONFIG.excludeFiles.includes(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 忽略无权限访问的目录
    }
    
    return files;
  }

  async checkFileForSensitiveData(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // 检查文件大小
      if (stats.size > SECURITY_CONFIG.maxFileSize * 1024 * 1024) {
        this.warnings.push({
          type: 'large_file',
          file: path.relative(projectRoot, filePath),
          message: `文件过大 (${Math.round(stats.size / 1024 / 1024)}MB)`
        });
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      this.checkedFiles++;
      
      // 检查敏感信息
      for (const pattern of SECURITY_CONFIG.sensitivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            // 过滤掉明显的示例和注释
            if (!this.isExampleOrComment(match, content)) {
              this.issues.push({
                type: 'sensitive_data',
                file: path.relative(projectRoot, filePath),
                line: this.getLineNumber(content, match),
                message: `检测到潜在敏感信息: ${this.maskSensitiveData(match)}`
              });
            }
          }
        }
      }
      
      // 检查硬编码的URL和IP
      this.checkHardcodedUrls(content, filePath);
      
    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  isExampleOrComment(match, content) {
    const lines = content.split('\n');
    const matchLine = lines.find(line => line.includes(match));
    
    if (!matchLine) return false;
    
    // 检查是否为注释
    const trimmed = matchLine.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || 
        trimmed.startsWith('*') || trimmed.includes('example') ||
        trimmed.includes('示例') || trimmed.includes('测试')) {
      return true;
    }
    
    // 检查是否包含占位符
    if (match.includes('xxx') || match.includes('placeholder') || 
        match.includes('your_') || match.includes('YOUR_')) {
      return true;
    }
    
    return false;
  }

  checkHardcodedUrls(content, filePath) {
    const urlPattern = /https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s'"<>]+/gi;
    const matches = content.match(urlPattern);
    
    if (matches) {
      for (const url of matches) {
        // 排除常见的公共API和文档链接
        if (!this.isPublicUrl(url)) {
          this.warnings.push({
            type: 'hardcoded_url',
            file: path.relative(projectRoot, filePath),
            line: this.getLineNumber(content, url),
            message: `硬编码URL: ${url}`
          });
        }
      }
    }
  }

  isPublicUrl(url) {
    const publicDomains = [
      'github.com', 'githubusercontent.com',
      'npmjs.org', 'npmjs.com',
      'electronjs.org',
      'supabase.com', 'supabase.io',
      'zhihu.com', 'zhimg.com',
      'api.github.com',
      'img.shields.io',
      'vitejs.dev',
      'w3.org',
      'netlify.app',
      'electron.build',
      'semver.org'
    ];
    
    return publicDomains.some(domain => url.includes(domain));
  }

  getLineNumber(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
  }

  maskSensitiveData(data) {
    if (data.length <= 8) return '***';
    return data.substring(0, 4) + '***' + data.substring(data.length - 2);
  }

  async checkDependencies() {
    console.log('📦 检查依赖包安全性...');
    
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      for (const [pkg, version] of Object.entries(allDeps)) {
        if (SECURITY_CONFIG.dangerousPackages.includes(pkg)) {
          this.issues.push({
            type: 'dangerous_dependency',
            file: 'package.json',
            message: `危险依赖包: ${pkg}@${version}`
          });
        }
        
        // 检查过时版本
        if (version.includes('^0.') || version.includes('~0.')) {
          this.warnings.push({
            type: 'outdated_dependency',
            file: 'package.json',
            message: `可能过时的依赖: ${pkg}@${version}`
          });
        }
      }
      
      console.log('✅ 依赖包检查完成\n');
    } catch (error) {
      this.warnings.push({
        type: 'dependency_check_failed',
        file: 'package.json',
        message: '无法检查依赖包'
      });
    }
  }

  async checkFilePermissions() {
    console.log('🔐 检查文件权限...');
    
    const sensitiveFiles = [
      'package.json',
      'package-lock.json',
      '.env',
      '.env.local',
      '.env.production',
      'electron/main.js',
      'electron/preload.js'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(projectRoot, file);
      try {
        const stats = await fs.stat(filePath);
        // 在Windows上权限检查有限，主要检查文件是否存在
        if (stats.isFile()) {
          console.log(`  ✓ ${file}`);
        }
      } catch (error) {
        // 文件不存在，跳过
      }
    }
    
    console.log('✅ 文件权限检查完成\n');
  }

  async checkConfiguration() {
    console.log('⚙️ 检查配置安全性...');
    
    // 检查Electron安全配置
    await this.checkElectronSecurity();
    
    // 检查环境变量文件
    await this.checkEnvFiles();
    
    console.log('✅ 配置检查完成\n');
  }

  async checkElectronSecurity() {
    const mainJsPath = path.join(projectRoot, 'electron/main.js');
    try {
      const content = await fs.readFile(mainJsPath, 'utf-8');
      
      // 检查关键安全配置
      const securityChecks = [
        {
          pattern: /nodeIntegration:\s*false/,
          message: 'nodeIntegration应设为false'
        },
        {
          pattern: /contextIsolation:\s*true/,
          message: 'contextIsolation应设为true'
        },
        {
          pattern: /enableRemoteModule:\s*false/,
          message: 'enableRemoteModule应设为false'
        }
      ];
      
      for (const check of securityChecks) {
        if (!check.pattern.test(content)) {
          this.issues.push({
            type: 'electron_security',
            file: 'electron/main.js',
            message: check.message
          });
        }
      }
    } catch (error) {
      this.warnings.push({
        type: 'electron_check_failed',
        file: 'electron/main.js',
        message: '无法检查Electron安全配置'
      });
    }
  }

  async checkEnvFiles() {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.example'];
    
    for (const envFile of envFiles) {
      const filePath = path.join(projectRoot, envFile);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // 检查是否包含实际值
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=', 2);
            if (value && value.trim() && 
                !value.includes('your_') && !value.includes('YOUR_') &&
                !value.includes('xxx') && value.length > 5) {
              this.warnings.push({
                type: 'env_real_value',
                file: envFile,
                message: `环境变量可能包含真实值: ${key}`
              });
            }
          }
        }
      } catch (error) {
        // 文件不存在，跳过
      }
    }
  }

  printResults() {
    console.log('📊 安全检查结果:\n');
    
    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 恭喜！未发现安全问题！\n');
      return;
    }
    
    // 打印严重问题
    if (this.issues.length > 0) {
      console.log('❌ 发现严重安全问题:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type}] ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   ${issue.message}\n`);
      });
    }
    
    // 打印警告
    if (this.warnings.length > 0) {
      console.log('⚠️ 发现潜在问题:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.type}] ${warning.file}${warning.line ? `:${warning.line}` : ''}`);
        console.log(`   ${warning.message}\n`);
      });
    }
    
    console.log(`总计: ${this.issues.length} 个严重问题, ${this.warnings.length} 个警告\n`);
    
    if (this.issues.length > 0) {
      console.log('🚫 请修复所有严重问题后再提交代码！');
    }
  }
}

// 运行安全检查
const checker = new SecurityChecker();
checker.run();
