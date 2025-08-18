// 使用ES模块import语法替换require
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url'; // 添加url模块导入
import fs from 'fs/promises';
import os from 'os';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import StreamZip from 'node-stream-zip';

// 定义__dirname变量（ES模块中没有内置）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 自动更新配置
let updateAvailable = false;
let updateInfo = null;

// 保持对主窗口和系统托盘的全局引用
let mainWindow;
let tray = null;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,  // 设置默认宽度
    height: 800,  // 设置默认高度
    frame: false, // 无边框窗口
    icon: path.join(__dirname, '../public/app-icon.png'), // 窗口图标
    titleBarStyle: 'hiddenInset', // 隐藏标题栏但保留窗口控制按钮
    trafficLightPosition: { x: 15, y: 15 }, // macOS窗口按钮位置
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 使用 CommonJS 版本
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // 判断是否处于开发模式
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // 开发模式下加载Vite服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下加载本地HTML文件
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  // 窗口关闭时触发（防止程序完全退出，除非明确要求退出）
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 将窗口状态变化通知渲染进程（用于切换最大化图标等）
  mainWindow.on('maximize', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:state', { isMaximized: true });
    }
  });
  mainWindow.on('unmaximize', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:state', { isMaximized: false });
    }
  });

  // 完全禁用右键上下文菜单
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });
}

// 创建系统托盘
function createTray() {
  // 创建托盘图标
  let trayIconPath = path.join(__dirname, '../public/app-icon.png');

  tray = new Tray(trayIconPath);
  
  // 设置托盘提示文本
  tray.setToolTip('Momentum - 自控力提升工具');
  
  // 创建右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '设置',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          // 通知渲染进程打开设置
          mainWindow.webContents.send('open-window-settings');
        } else {
          createWindow();
          // 延迟发送消息，确保窗口完全加载
          setTimeout(() => {
            if (mainWindow) {
              mainWindow.webContents.send('open-window-settings');
            }
          }, 1000);
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  // 设置右键菜单
  tray.setContextMenu(contextMenu);
  
  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// 自动更新相关函数
async function checkForUpdates() {
  try {
    // 检查是否为生产环境
    if (process.env.NODE_ENV === 'development') {
      console.log('开发环境，跳过自动更新检查');
      return;
    }

    const currentVersion = app.getVersion();
    console.log('当前版本:', currentVersion);
    
    // 从GitHub API获取最新版本信息
    const response = await fetch('https://api.github.com/repos/enshulv/momentum_desktop/releases/latest');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const releaseData = await response.json();
    const latestVersion = releaseData.tag_name.replace('v', '');
    
    console.log('最新版本:', latestVersion);
    
    // 比较版本号
    if (isNewerVersion(latestVersion, currentVersion)) {
      updateAvailable = true;
      updateInfo = {
        version: latestVersion,
        releaseNotes: releaseData.body || '新版本可用',
        downloadUrl: releaseData.html_url,
        assets: releaseData.assets
      };
      
      // 通知渲染进程有更新可用
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
      
      console.log('发现新版本:', latestVersion);
    } else {
      console.log('当前已是最新版本');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

function isNewerVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (latestPart > currentPart) {
      return true;
    } else if (latestPart < currentPart) {
      return false;
    }
  }
  
  return false;
}

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.on('ready', () => {
  createWindow();
  createTray();
  
  // 延迟3秒后检查更新（等待应用完全加载）
  setTimeout(() => {
    checkForUpdates();
  }, 3000);
});

// 所有窗口关闭时的处理（因为有系统托盘，所以不自动退出）
app.on('window-all-closed', () => {
  // 除非明确要求退出，否则保持应用运行（因为有系统托盘）
  if (app.isQuiting) {
    app.quit();
  }
  // 在macOS上保持应用活动，在其他平台上也保持运行（托盘模式）
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标且没有其他窗口打开时，通常会再创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 可以在这里添加IPC通信处理
ipcMain.on('message', (event, arg) => {
  console.log(arg);
  event.reply('reply', 'Message received');
});

// 添加窗口控制IPC事件处理
ipcMain.on('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) {
    app.isQuiting = true;
    mainWindow.close();
  }
});

// 隐藏到系统托盘
ipcMain.on('window:hide-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// 查询窗口当前状态（渲染进程启动时请求一次）
ipcMain.on('window:query-state', (event) => {
  if (mainWindow) {
    event.sender.send('window:state', { isMaximized: mainWindow.isMaximized() });
  }
});

// 本地数据存储相关IPC处理程序

// 获取默认数据目录路径
ipcMain.handle('storage:get-default-data-path', async () => {
  const documentsPath = path.join(os.homedir(), 'Documents');
  return path.join(documentsPath, 'momentum_data');
});

// 选择数据存储目录
ipcMain.handle('storage:select-data-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择数据存储目录'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 检查目录是否存在
ipcMain.handle('storage:directory-exists', async (event, dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
});

// 创建目录
ipcMain.handle('storage:create-directory', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('创建目录失败:', error);
    return false;
  }
});

// 读取文件
ipcMain.handle('storage:read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // 文件不存在
    }
    throw error;
  }
});

// 写入文件
ipcMain.handle('storage:write-file', async (event, filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入文件失败:', error);
    return false;
  }
});

// 删除文件
ipcMain.handle('storage:delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true; // 文件不存在，视为删除成功
    }
    console.error('删除文件失败:', error);
    return false;
  }
});

// 列出目录内容
ipcMain.handle('storage:list-directory', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modifiedAt: stats.mtime
        };
      })
    );
    return fileDetails;
  } catch (error) {
    console.error('读取目录失败:', error);
    return [];
  }
});

// 复制文件
ipcMain.handle('storage:copy-file', async (event, sourcePath, destPath) => {
  try {
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error('复制文件失败:', error);
    return false;
  }
});

// 获取文件统计信息
ipcMain.handle('storage:get-file-stats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
});

// 备份和压缩相关IPC处理程序

// 创建ZIP压缩文件
ipcMain.handle('backup:create-zip', async (event, sourceDir, outputPath, excludeFiles = []) => {
  return new Promise((resolve, reject) => {
    try {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
      });

      output.on('close', () => {
        console.log(`ZIP创建完成: ${archive.pointer()} bytes`);
        resolve(true);
      });

      archive.on('error', (err) => {
        console.error('ZIP创建失败:', err);
        reject(false);
      });

      archive.pipe(output);

      // 添加整个目录，但排除指定文件
      archive.glob('**/*', {
        cwd: sourceDir,
        ignore: excludeFiles
      });

      archive.finalize();
    } catch (error) {
      console.error('ZIP创建异常:', error);
      resolve(false);
    }
  });
});

// 解压ZIP文件
ipcMain.handle('backup:extract-zip', async (event, zipPath, outputDir) => {
  try {
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const zip = new StreamZip.async({ file: zipPath });

      zip.extract(null, outputDir)
        .then(() => {
          console.log('ZIP解压完成');
          zip.close();
          resolve(true);
        })
        .catch((err) => {
          console.error('ZIP解压失败:', err);
          zip.close();
          resolve(false);
        });
    });
  } catch (error) {
    console.error('ZIP解压异常:', error);
    return false;
  }
});

// 递归删除目录
async function removeDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        await removeDirectory(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
    
    await fs.rmdir(dirPath);
    return true;
  } catch (error) {
    console.error('删除目录失败:', error);
    return false;
  }
}

// 删除目录及其内容
ipcMain.handle('storage:remove-directory', async (event, dirPath) => {
  return await removeDirectory(dirPath);
});

// 更新相关IPC处理程序

// 检查更新状态
ipcMain.handle('update:check-status', () => {
  return {
    updateAvailable,
    updateInfo
  };
});

// 手动检查更新
ipcMain.handle('update:check-manual', async () => {
  await checkForUpdates();
  return {
    updateAvailable,
    updateInfo
  };
});

// 开始下载更新
ipcMain.handle('update:download', async () => {
  if (!updateInfo) {
    return { success: false, error: '没有可用的更新' };
  }
  
  try {
    // 在实际应用中，这里会使用electron-updater来下载
    // 现在我们只是打开下载页面
    const { shell } = await import('electron');
    await shell.openExternal(updateInfo.downloadUrl);
    
    return { success: true };
  } catch (error) {
    console.error('打开下载页面失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取应用版本
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});