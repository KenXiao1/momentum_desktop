const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loading...');

try {
  // 向渲染进程暴露安全的API
  contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
      send: (channel, ...data) => {
        console.log('Sending IPC:', channel, data);
        ipcRenderer.send(channel, ...data);
      },
      on: (channel, func) => {
        console.log('Registering IPC listener:', channel);
        return ipcRenderer.on(channel, (event, ...args) => func(...args));
      },
      once: (channel, func) => {
        console.log('Registering IPC once listener:', channel);
        return ipcRenderer.once(channel, (event, ...args) => func(...args));
      },
      removeListener: (channel, func) => {
        console.log('Removing IPC listener:', channel);
        return ipcRenderer.removeListener(channel, func);
      },
    },
  });

  // 暴露存储API
  contextBridge.exposeInMainWorld('electronAPI', {
    storage: {
      getDefaultDataPath: () => ipcRenderer.invoke('storage:get-default-data-path'),
      selectDataDirectory: () => ipcRenderer.invoke('storage:select-data-directory'),
      directoryExists: (path) => ipcRenderer.invoke('storage:directory-exists', path),
      createDirectory: (path) => ipcRenderer.invoke('storage:create-directory', path),
      readFile: (path) => ipcRenderer.invoke('storage:read-file', path),
      writeFile: (path, data) => ipcRenderer.invoke('storage:write-file', path, data),
      deleteFile: (path) => ipcRenderer.invoke('storage:delete-file', path),
      listDirectory: (path) => ipcRenderer.invoke('storage:list-directory', path),
      copyFile: (sourcePath, destPath) => ipcRenderer.invoke('storage:copy-file', sourcePath, destPath),
      getFileStats: (path) => ipcRenderer.invoke('storage:get-file-stats', path),
      removeDirectory: (path) => ipcRenderer.invoke('storage:remove-directory', path),
    },
    backup: {
      createZip: (sourceDir, outputPath, excludeFiles) => ipcRenderer.invoke('backup:create-zip', sourceDir, outputPath, excludeFiles),
      extractZip: (zipPath, outputDir) => ipcRenderer.invoke('backup:extract-zip', zipPath, outputDir),
    }
  });
  
  console.log('Preload script loaded successfully, window.electron and window.electronAPI available');
} catch (error) {
  console.error('Preload script error:', error);
}
