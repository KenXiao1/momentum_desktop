// 使用ES模块import语法
import { contextBridge, ipcRenderer } from 'electron';

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => 
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    once: (channel, func) => 
      ipcRenderer.once(channel, (event, ...args) => func(...args)),
    removeListener: (channel, func) => ipcRenderer.removeListener(channel, func),
  },
});