const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件/文件夹选择
  selectProjectFolder: () => ipcRenderer.invoke('select-project-folder'),
  selectApkFile: () => ipcRenderer.invoke('select-apk-file'),

  // 项目管理
  parseProjectInfo: (projectPath) => ipcRenderer.invoke('parse-project-info', projectPath),

  // 设备管理
  getAdbDevices: () => ipcRenderer.invoke('get-adb-devices'),

  // 编译与安装
  buildProject: (projectPath) => ipcRenderer.invoke('build-project', projectPath),
  buildRelease: (projectPath) => ipcRenderer.invoke('build-release', projectPath),
  installApk: (apkPath, devices, autoLaunch, packageName) =>
    ipcRenderer.invoke('install-apk', { apkPath, devices, autoLaunch, packageName }),

  // 应用操作
  appOperation: (operation, packageName, devices) =>
    ipcRenderer.invoke('app-operation', { operation, packageName, devices }),

  // 系统操作
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // V2 新增功能
  adbConnectWifi: (ipAddress) => ipcRenderer.invoke('adb-connect-wifi', ipAddress),
  deviceScreenshot: (deviceId, projectName) =>
    ipcRenderer.invoke('device-screenshot', { deviceId, projectName }),
  startLogcat: (deviceId, packageName) =>
    ipcRenderer.invoke('start-logcat', { deviceId, packageName }),
  stopLogcat: () => ipcRenderer.invoke('stop-logcat'),

  // Claude AI
  openClaude: (projectPath) => ipcRenderer.invoke('open-claude', projectPath),

  // 抓取日志
  selectLogSavePath: (projectName) => ipcRenderer.invoke('select-log-save-path', projectName),
  getInstalledApps: (deviceId) => ipcRenderer.invoke('get-installed-apps', deviceId),
  startCaptureLog: (packageName, deviceId, savePath) =>
    ipcRenderer.invoke('start-capture-log', { packageName, deviceId, savePath }),
  stopCaptureLog: () => ipcRenderer.invoke('stop-capture-log'),
  openLogFile: (filePath) => ipcRenderer.invoke('open-log-file', filePath),
  onCaptureLogComplete: (callback) => {
    ipcRenderer.on('capture-log-complete', (event, data) => callback(data));
  },

  // 日志监听
  onLogOutput: (callback) => {
    ipcRenderer.on('log-output', (event, data) => callback(data));
  },

  removeLogListener: () => {
    ipcRenderer.removeAllListeners('log-output');
  }
});
