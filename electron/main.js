import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { readFile, readdir, stat, writeFile, mkdir, unlink } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let logcatProcess = null; // 存储 logcat 进程
let claudeWindows = {}; // 存储 Claude PowerShell 窗口的进程 ID，按项目路径索引

// ==================== ADB 路径管理 ====================
function getBuiltinAdbPath() {
  // 开发环境和打包后环境的 ADB 路径
  const isDev = !app.isPackaged;

  if (isDev) {
    // 开发环境：从项目的 resources 目录
    return join(process.cwd(), 'resources', 'platform-tools', 'adb.exe');
  } else {
    // 打包后：从 resources 目录
    return join(process.resourcesPath, 'platform-tools', 'adb.exe');
  }
}

// 检查系统是否已配置 ADB
async function checkSystemAdb() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('adb version', (error, stdout, stderr) => {
      if (error) {
        console.log('系统未配置 ADB 或 ADB 不可用');
        resolve(false);
      } else {
        console.log('检测到系统已配置 ADB:');
        console.log(stdout.trim());
        resolve(true);
      }
    });
  });
}

// 初始化 ADB 环境
async function initializeAdb() {
  console.log('========== ADB 环境初始化 ==========');

  // 首先检查系统是否已经配置了 ADB
  const hasSystemAdb = await checkSystemAdb();

  if (hasSystemAdb) {
    console.log('✓ 使用系统已配置的 ADB');
    console.log('===================================\n');
    return true;
  }

  // 系统没有 ADB，使用内置的 ADB
  console.log('系统未配置 ADB，使用应用内置的 ADB 工具');

  const adbPath = getBuiltinAdbPath();
  const adbDir = dirname(adbPath);

  console.log('内置 ADB 路径:', adbPath);
  console.log('内置 ADB 目录:', adbDir);

  // 检查内置 ADB 是否存在
  if (!existsSync(adbPath)) {
    console.error('✗ 内置 ADB 不存在于路径:', adbPath);
    console.error('请运行 npm run setup-adb 来设置 ADB 工具');
    console.log('===================================\n');
    return false;
  }

  // 将内置 ADB 目录添加到 PATH 环境变量（仅对当前进程及其子进程有效）
  const currentPath = process.env.PATH || '';
  if (!currentPath.includes(adbDir)) {
    process.env.PATH = `${adbDir};${currentPath}`;
    console.log('✓ 已将内置 ADB 目录添加到 PATH 环境变量');
  }

  console.log('===================================\n');
  return true;
}

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// ==================== 缓存目录管理 ====================
// 缓存根目录：使用用户数据目录（打包后 app.getAppPath() 返回的是 app.asar 文件，不能写入）
const CACHE_ROOT = join(app.getPath('userData'), '.wam-cache');
const CACHE_DIRS = {
  claudeScripts: join(CACHE_ROOT, 'claude-scripts'),
  locks: join(CACHE_ROOT, 'locks'),
  logs: join(CACHE_ROOT, 'logs'),
  temp: join(CACHE_ROOT, 'temp')
};

// 确保缓存目录存在
async function ensureCacheDirs() {
  for (const dir of Object.values(CACHE_DIRS)) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      console.log('创建缓存目录:', dir);
    }
  }
}

// 清理过期的 Claude 脚本缓存（超过24小时的文件）
async function cleanupOldClaudeScripts() {
  try {
    const scriptDir = CACHE_DIRS.claudeScripts;
    if (!existsSync(scriptDir)) return;

    const files = await readdir(scriptDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.startsWith('claude-') || !file.endsWith('.ps1')) continue;

      const filePath = join(scriptDir, file);
      const stats = await stat(filePath);
      if (now - stats.mtimeMs > maxAge) {
        await unlink(filePath);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期的 Claude 脚本缓存`);
    }
  } catch (error) {
    console.error('清理缓存失败:', error);
  }
}

function getClaudeProjectName(projectPath) {
  return basename(projectPath);
}

function getClaudeProjectKey(projectPath) {
  return createHash('sha1')
    .update(projectPath.replace(/\//g, '\\').toLowerCase())
    .digest('hex')
    .slice(0, 12);
}

function getClaudeLockFile(projectPath) {
  const projectName = getClaudeProjectName(projectPath);
  const projectKey = getClaudeProjectKey(projectPath);
  return join(CACHE_DIRS.locks, `${projectName}-${projectKey}.lock`);
}

function getLegacyClaudeLockFile(projectPath) {
  return join(CACHE_DIRS.locks, `${getClaudeProjectName(projectPath)}.lock`);
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function createWindow() {
  // 开发环境：加载 Vite 开发服务器
  const isDev = !app.isPackaged;

  // 配置窗口图标路径（打包后使用 resourcesPath）
  let iconPath;
  if (isDev) {
    iconPath = join(__dirname, '../build/icon.png');
  } else {
    // 打包后，图标由 electron-builder 管理，不需要手动指定
    // 或者使用：join(process.resourcesPath, 'icon.png')
    iconPath = undefined;
  }

  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    backgroundColor: '#1f1f1f'
  };

  // 只在开发环境设置图标
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5888');
    mainWindow.webContents.openDevTools();
  } else {
    // 打包后加载 dist/index.html
    const indexPath = join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }
}

app.whenReady().then(async () => {
  try {
    console.log('App is ready, starting initialization...');
    console.log('App path:', app.getAppPath());
    console.log('Is packaged:', app.isPackaged);

    // 初始化 ADB 环境
    const adbInitialized = await initializeAdb();
    if (!adbInitialized) {
      console.warn('⚠ ADB 初始化失败，ADB 相关功能可能无法使用');
      console.warn('提示：如需使用 ADB 功能，请安装 Android SDK 或运行 npm run setup-adb');
    }

    // 初始化缓存目录
    await ensureCacheDirs();
    // 清理过期缓存
    await cleanupOldClaudeScripts();
    // 创建窗口
    createWindow();
    console.log('Window created successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // 显示错误对话框
    dialog.showErrorBox('启动失败', `应用初始化失败：${error.message}\n\n请查看日志文件获取详细信息。`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ==================== 核心功能实现 ====================

// 1. 选择项目文件夹
ipcMain.handle('select-project-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// 2. 选择 APK 文件
ipcMain.handle('select-apk-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'APK Files', extensions: ['apk'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// 3. 解析项目信息（Git + 包名）
ipcMain.handle('parse-project-info', async (event, projectPath) => {
  const result = {
    path: projectPath,
    name: basename(projectPath),
    gitRemote: null,
    gitBranch: null,
    packageName: null
  };

  try {
    // 解析 Git 信息
    const gitRemote = await executeCommand('git', ['config', '--get', 'remote.origin.url'], projectPath);
    result.gitRemote = gitRemote.trim();

    const gitBranch = await executeCommand('git', ['branch', '--show-current'], projectPath);
    result.gitBranch = gitBranch.trim();
  } catch (error) {
    console.log('Git 信息获取失败（可能不是 Git 仓库）:', error.message);
  }

  try {
    // 解析包名
    result.packageName = await extractPackageName(projectPath);
  } catch (error) {
    console.log('包名提取失败:', error.message);
  }

  return result;
});

// 4. 获取 ADB 设备列表
ipcMain.handle('get-adb-devices', async () => {
  try {
    const output = await executeCommand('adb', ['devices', '-l']);
    const devices = parseAdbDevices(output);
    return { success: true, devices };
  } catch (error) {
    return {
      success: false,
      error: 'ADB 未找到或未正确配置。请确保 Android SDK 已安装并配置环境变量。'
    };
  }
});

// 5. 编译项目（Gradle）
ipcMain.handle('build-project', async (event, projectPath) => {
  const gradlewPath = join(projectPath, 'gradlew.bat');

  return new Promise((resolve) => {
    const process = spawn(gradlewPath, ['assembleDebug'], {
      cwd: projectPath,
      shell: true
    });

    process.stdout.on('data', (data) => {
      mainWindow.webContents.send('log-output', {
        type: 'stdout',
        data: data.toString()
      });
    });

    process.stderr.on('data', (data) => {
      mainWindow.webContents.send('log-output', {
        type: 'stderr',
        data: data.toString()
      });
    });

    process.on('close', async (code) => {
      if (code === 0) {
        mainWindow.webContents.send('log-output', {
          type: 'success',
          data: '\n✓ BUILD SUCCESSFUL\n'
        });

        // 查找生成的 APK
        try {
          const apkPath = await findLatestApk(join(projectPath, 'app/build/outputs/apk/debug'));
          resolve({ success: true, apkPath });
        } catch (error) {
          resolve({ success: false, error: '找不到生成的 APK 文件' });
        }
      } else {
        mainWindow.webContents.send('log-output', {
          type: 'error',
          data: `\n✗ BUILD FAILED (exit code: ${code})\n`
        });
        resolve({ success: false, error: `编译失败 (exit code: ${code})` });
      }
    });

    process.on('error', (error) => {
      mainWindow.webContents.send('log-output', {
        type: 'error',
        data: `\n✗ 执行失败: ${error.message}\n`
      });
      resolve({ success: false, error: error.message });
    });
  });
});

// 6. 安装 APK 到设备
ipcMain.handle('install-apk', async (event, { apkPath, devices, autoLaunch = false, packageName = null }) => {
  const results = [];

  for (const deviceId of devices) {
    mainWindow.webContents.send('log-output', {
      type: 'stdout',
      data: `\n正在安装到设备 ${deviceId}...\n`
    });

    try {
      const output = await executeCommandStreamed('adb', ['-s', deviceId, 'install', '-r', apkPath], null, (data) => {
        mainWindow.webContents.send('log-output', {
          type: 'stdout',
          data: data.toString()
        });
      });

      if (output.includes('Success')) {
        mainWindow.webContents.send('log-output', {
          type: 'success',
          data: `✓ 设备 ${deviceId} 安装成功\n`
        });
        results.push({ deviceId, success: true });

        // 如果启用自动启动且有包名
        if (autoLaunch && packageName) {
          try {
            mainWindow.webContents.send('log-output', {
              type: 'stdout',
              data: `正在启动应用 ${packageName}...\n`
            });

            // 启动应用的主 Activity
            await executeCommand('adb', [
              '-s',
              deviceId,
              'shell',
              'monkey',
              '-p',
              packageName,
              '-c',
              'android.intent.category.LAUNCHER',
              '1'
            ]);

            mainWindow.webContents.send('log-output', {
              type: 'success',
              data: `✓ 设备 ${deviceId} 应用已启动\n`
            });
          } catch (launchError) {
            mainWindow.webContents.send('log-output', {
              type: 'warning',
              data: `⚠ 设备 ${deviceId} 启动应用失败: ${launchError.message}\n`
            });
          }
        }
      } else {
        mainWindow.webContents.send('log-output', {
          type: 'error',
          data: `✗ 设备 ${deviceId} 安装失败\n`
        });
        results.push({ deviceId, success: false, error: output });
      }
    } catch (error) {
      mainWindow.webContents.send('log-output', {
        type: 'error',
        data: `✗ 设备 ${deviceId} 安装失败: ${error.message}\n`
      });
      results.push({ deviceId, success: false, error: error.message });
    }
  }

  return results;
});

// 7. 应用管理操作
ipcMain.handle('app-operation', async (event, { operation, packageName, devices }) => {
  const commands = {
    clear: ['shell', 'pm', 'clear'],
    stop: ['shell', 'am', 'force-stop'],
    uninstall: ['uninstall']
  };

  const cmd = commands[operation];
  if (!cmd) {
    return { success: false, error: '未知操作' };
  }

  const results = [];

  for (const deviceId of devices) {
    const args = ['-s', deviceId, ...cmd, packageName];

    mainWindow.webContents.send('log-output', {
      type: 'stdout',
      data: `\n执行 ${operation} 操作于设备 ${deviceId}...\n`
    });

    try {
      const output = await executeCommand('adb', args);
      mainWindow.webContents.send('log-output', {
        type: 'success',
        data: `✓ 设备 ${deviceId} 操作成功\n${output}\n`
      });
      results.push({ deviceId, success: true });
    } catch (error) {
      mainWindow.webContents.send('log-output', {
        type: 'error',
        data: `✗ 设备 ${deviceId} 操作失败: ${error.message}\n`
      });
      results.push({ deviceId, success: false, error: error.message });
    }
  }

  return results;
});

// 8. 打开文件夹
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = await import('electron');
  shell.openPath(folderPath);
});

// ==================== 工具函数 ====================

// 执行命令并返回输出
function executeCommand(command, args, cwd = null) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd, shell: true });
    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || output));
      }
    });

    process.on('error', reject);
  });
}

// 执行命令并流式传输输出
function executeCommandStreamed(command, args, cwd = null, onData = null) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd, shell: true });
    let output = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
      if (onData) onData(data);
    });

    process.stderr.on('data', (data) => {
      output += data.toString();
      if (onData) onData(data);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        resolve(output); // 即使失败也返回输出，让调用者判断
      }
    });

    process.on('error', reject);
  });
}

// 解析 ADB 设备列表
function parseAdbDevices(output) {
  const lines = output.split('\n').slice(1); // 跳过第一行 "List of devices attached"
  const devices = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('*')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[1] === 'device') {
      const id = parts[0];
      const modelMatch = trimmed.match(/model:(\S+)/);
      const model = modelMatch ? modelMatch[1] : 'Unknown';

      devices.push({
        id,
        model,
        status: 'online'
      });
    }
  }

  return devices;
}

// 提取包名
async function extractPackageName(projectPath) {
  // 尝试从 build.gradle 提取
  const gradlePaths = [
    join(projectPath, 'app/build.gradle'),
    join(projectPath, 'app/build.gradle.kts')
  ];

  for (const gradlePath of gradlePaths) {
    try {
      const content = await readFile(gradlePath, 'utf-8');

      // 匹配 applicationId
      const appIdMatch = content.match(/applicationId\s+["']([^"']+)["']/);
      if (appIdMatch) {
        return appIdMatch[1];
      }

      // 匹配 namespace (Kotlin DSL)
      const namespaceMatch = content.match(/namespace\s*=\s*["']([^"']+)["']/);
      if (namespaceMatch) {
        return namespaceMatch[1];
      }
    } catch (error) {
      // 文件不存在，继续尝试下一个
    }
  }

  // 尝试从 AndroidManifest.xml 提取
  const manifestPath = join(projectPath, 'app/src/main/AndroidManifest.xml');
  try {
    const content = await readFile(manifestPath, 'utf-8');
    const packageMatch = content.match(/package\s*=\s*["']([^"']+)["']/);
    if (packageMatch) {
      return packageMatch[1];
    }
  } catch (error) {
    // 文件不存在
  }

  throw new Error('无法提取包名');
}

// 查找最新的 APK
async function findLatestApk(dirPath) {
  const files = await readdir(dirPath);
  const apkFiles = files.filter(f => f.endsWith('.apk'));

  if (apkFiles.length === 0) {
    throw new Error('未找到 APK 文件');
  }

  // 按修改时间排序，返回最新的
  let latestApk = null;
  let latestTime = 0;

  for (const file of apkFiles) {
    const filePath = join(dirPath, file);
    const stats = await stat(filePath);
    if (stats.mtimeMs > latestTime) {
      latestTime = stats.mtimeMs;
      latestApk = filePath;
    }
  }

  return latestApk;
}

// ==================== V2 新增功能 ====================

// 9. 编译 Release 版本并打开文件夹
ipcMain.handle('build-release', async (event, projectPath) => {
  const gradlewPath = join(projectPath, 'gradlew.bat');

  return new Promise((resolve) => {
    const process = spawn(gradlewPath, ['assembleRelease'], {
      cwd: projectPath,
      shell: true
    });

    process.stdout.on('data', (data) => {
      mainWindow.webContents.send('log-output', {
        type: 'stdout',
        data: data.toString()
      });
    });

    process.stderr.on('data', (data) => {
      mainWindow.webContents.send('log-output', {
        type: 'stderr',
        data: data.toString()
      });
    });

    process.on('close', async (code) => {
      if (code === 0) {
        mainWindow.webContents.send('log-output', {
          type: 'success',
          data: '\n✓ RELEASE BUILD SUCCESSFUL\n'
        });

        try {
          // 查找并打开 Release APK 所在文件夹
          const releasePath = join(projectPath, 'app/build/outputs/apk/release');
          await shell.openPath(releasePath);

          const apkPath = await findLatestApk(releasePath);
          resolve({ success: true, apkPath, releasePath });
        } catch (error) {
          resolve({ success: true, message: '编译成功，但无法打开文件夹' });
        }
      } else {
        mainWindow.webContents.send('log-output', {
          type: 'error',
          data: `\n✗ RELEASE BUILD FAILED (exit code: ${code})\n`
        });
        resolve({ success: false, error: `编译失败 (exit code: ${code})` });
      }
    });

    process.on('error', (error) => {
      mainWindow.webContents.send('log-output', {
        type: 'error',
        data: `\n✗ 执行失败: ${error.message}\n`
      });
      resolve({ success: false, error: error.message });
    });
  });
});

// 10. ADB WiFi 连接
ipcMain.handle('adb-connect-wifi', async (event, ipAddress) => {
  try {
    mainWindow.webContents.send('log-output', {
      type: 'stdout',
      data: `\n正在连接到 ${ipAddress}...\n`
    });

    const output = await executeCommand('adb', ['connect', ipAddress]);

    const success = output.includes('connected');

    mainWindow.webContents.send('log-output', {
      type: success ? 'success' : 'error',
      data: success ? `✓ 连接成功: ${ipAddress}\n` : `✗ 连接失败: ${output}\n`
    });

    return { success, output };
  } catch (error) {
    mainWindow.webContents.send('log-output', {
      type: 'error',
      data: `✗ 连接失败: ${error.message}\n`
    });
    return { success: false, error: error.message };
  }
});

// 11. 截屏并保存到桌面
ipcMain.handle('device-screenshot', async (event, { deviceId, projectName }) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${projectName}_${deviceId}_${timestamp}.png`;
    const desktopPath = join(homedir(), 'Desktop', filename);

    mainWindow.webContents.send('log-output', {
      type: 'stdout',
      data: `\n正在对设备 ${deviceId} 进行截屏...\n`
    });

    // 执行截屏
    await executeCommand('adb', ['-s', deviceId, 'shell', 'screencap', '-p', '/sdcard/screenshot.png']);

    // 拉取到桌面
    await executeCommand('adb', ['-s', deviceId, 'pull', '/sdcard/screenshot.png', desktopPath]);

    // 删除设备上的临时文件
    await executeCommand('adb', ['-s', deviceId, 'shell', 'rm', '/sdcard/screenshot.png']);

    mainWindow.webContents.send('log-output', {
      type: 'success',
      data: `✓ 截屏已保存到: ${desktopPath}\n`
    });

    return { success: true, path: desktopPath };
  } catch (error) {
    mainWindow.webContents.send('log-output', {
      type: 'error',
      data: `✗ 截屏失败: ${error.message}\n`
    });
    return { success: false, error: error.message };
  }
});

// 12. 开启 Logcat 监控
ipcMain.handle('start-logcat', async (event, { deviceId, packageName }) => {
  // 如果已有进程在运行，先停止
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;
  }

  try {
    let pid = null;

    mainWindow.webContents.send('log-output', {
      type: 'success',
      data: `\n✓ 开启 Logcat 监控 (设备: ${deviceId}, 应用: ${packageName})\n`
    });

    // 尝试获取应用的 PID
    if (packageName) {
      try {
        const pidOutput = await executeCommand('adb', ['-s', deviceId, 'shell', 'pidof', packageName]);
        pid = pidOutput.trim();

        if (pid) {
          mainWindow.webContents.send('log-output', {
            type: 'success',
            data: `✓ 已找到应用进程 PID: ${pid}\n`
          });
        }
      } catch (error) {
        mainWindow.webContents.send('log-output', {
          type: 'warning',
          data: `⚠ 无法获取应用 PID，可能应用未运行。将监控所有包含 "${packageName}" 的日志\n`
        });
      }
    }

    // 构建 logcat 命令
    let args = ['-s', deviceId, 'logcat', '-v', 'time'];

    if (pid) {
      // 如果有 PID，只显示该进程的日志
      args.push('--pid=' + pid);
    } else if (packageName) {
      // 没有 PID，通过 grep 过滤包名相关日志
      args = ['-s', deviceId, 'shell', `logcat -v time | grep -i "${packageName}"`];
    }

    logcatProcess = spawn('adb', args, { shell: true });

    logcatProcess.stdout.on('data', (data) => {
      const log = data.toString();
      let type = 'stdout';

      // 高亮关键错误
      if (log.match(/E\/|Exception|NullPointerException|CRASH|FATAL|ERROR|AndroidRuntime/i)) {
        type = 'error';
      } else if (log.match(/W\/|WARN/i)) {
        type = 'warning';
      } else if (log.match(/I\/|INFO/i)) {
        type = 'stdout';
      }

      mainWindow.webContents.send('log-output', { type, data: log });
    });

    logcatProcess.stderr.on('data', (data) => {
      mainWindow.webContents.send('log-output', {
        type: 'stderr',
        data: data.toString()
      });
    });

    logcatProcess.on('close', (code) => {
      mainWindow.webContents.send('log-output', {
        type: 'warning',
        data: `\n⚠ Logcat 监控已停止 (exit code: ${code})\n`
      });
      logcatProcess = null;
    });

    logcatProcess.on('error', (error) => {
      mainWindow.webContents.send('log-output', {
        type: 'error',
        data: `\n✗ Logcat 启动失败: ${error.message}\n`
      });
      logcatProcess = null;
    });

    return { success: true };
  } catch (error) {
    mainWindow.webContents.send('log-output', {
      type: 'error',
      data: `✗ 启动 Logcat 失败: ${error.message}\n`
    });
    return { success: false, error: error.message };
  }
});

// 13. 停止 Logcat 监控
ipcMain.handle('stop-logcat', async () => {
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;

    mainWindow.webContents.send('log-output', {
      type: 'warning',
      data: '\n⚠ Logcat 监控已手动停止\n'
    });

    return { success: true };
  }

  return { success: false, message: '没有正在运行的 Logcat 进程' };
});

// 应用退出时清理 logcat 进程
app.on('before-quit', () => {
  if (logcatProcess) {
    logcatProcess.kill();
  }
  // 清理所有 Claude 窗口进程
  for (const pid of Object.values(claudeWindows)) {
    try {
      process.kill(pid);
    } catch (error) {
      // 进程可能已经不存在
    }
  }
});

// ==================== Claude AI 集成 ====================

// 14. 打开 Claude AI（复用现有窗口）
function parseClaudeLockContent(lockContent) {
  const parts = lockContent.trim().replace(/^\uFEFF/, '').split('|');
  return {
    pidStr: parts[0] || '',
    scriptPath: parts[1] || '',
    hwnd: parts[2] || '0',
    windowPid: parts[3] || '0'
  };
}

function buildClaudeActivateScript(pid, hwnd, windowPid, projectName, uniqueClassName) {
  const windowTitle = `Claude - ${projectName}`;
  const escapedWindowTitle = escapePowerShellSingleQuoted(windowTitle);
  const hwndValue = /^\d+$/.test(String(hwnd || '')) ? String(hwnd) : '0';
  const windowPidValue = /^\d+$/.test(String(windowPid || '')) ? String(windowPid) : '0';

  return `$targetPid = ${pid}
$targetHwndValue = [Int64]${hwndValue}
$targetWindowPid = [Int]${windowPidValue}
$windowTitle = '${escapedWindowTitle}'

try {
  $typeDefinition = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class ${uniqueClassName} {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@
  Add-Type -TypeDefinition $typeDefinition -ErrorAction Stop
} catch {
  exit 1
}

function Activate-Window([IntPtr]$hwnd) {
  if ($hwnd -eq [IntPtr]::Zero) { return $false }
  if (-not [${uniqueClassName}]::IsWindow($hwnd)) { return $false }
  if (-not [${uniqueClassName}]::IsWindowVisible($hwnd)) { return $false }

  $showResult = $false
  if ([${uniqueClassName}]::IsIconic($hwnd)) {
    $showResult = [${uniqueClassName}]::ShowWindow($hwnd, 9)
  } else {
    $showResult = [${uniqueClassName}]::ShowWindow($hwnd, 5)
  }

  Start-Sleep -Milliseconds 120
  $topResult = [${uniqueClassName}]::BringWindowToTop($hwnd)
  $foregroundResult = [${uniqueClassName}]::SetForegroundWindow($hwnd)
  return ($showResult -or $topResult -or $foregroundResult)
}

function Get-RelatedPids([int]$pid) {
  $set = New-Object 'System.Collections.Generic.HashSet[int]'
  $null = $set.Add($pid)

  try {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)

    for ($round = 0; $round -lt 8; $round++) {
      $added = $false

      foreach ($processInfo in $processes) {
        $candidatePid = [int]$processInfo.ProcessId
        $candidateParentPid = [int]$processInfo.ParentProcessId

        if ($set.Contains($candidateParentPid) -and -not $set.Contains($candidatePid)) {
          $null = $set.Add($candidatePid)
          $added = $true
        }
      }

      if (-not $added) { break }
    }
  } catch {
  }

  return ,$set
}

function Find-RelatedProcessWindow {
  $relatedPids = Get-RelatedPids $targetPid
  $script:relatedHwnd = [IntPtr]::Zero

  [${uniqueClassName}]::EnumWindows({
      param([IntPtr]$hwnd, [IntPtr]$lParam)

      if (-not [${uniqueClassName}]::IsWindowVisible($hwnd)) {
        return $true
      }

      [UInt32]$ownerPid = 0
      [${uniqueClassName}]::GetWindowThreadProcessId($hwnd, [ref]$ownerPid) | Out-Null

      if (-not $relatedPids.Contains([int]$ownerPid)) {
        return $true
      }

      if ($script:relatedHwnd -eq [IntPtr]::Zero) {
        $script:relatedHwnd = $hwnd
        return $false
      }

      return $true
  }, [IntPtr]::Zero) | Out-Null

  return $script:relatedHwnd
}

if ($targetHwndValue -gt 0) {
  $targetHwnd = [IntPtr]$targetHwndValue
  if ([${uniqueClassName}]::IsWindow($targetHwnd) -and [${uniqueClassName}]::IsWindowVisible($targetHwnd)) {
    [UInt32]$targetOwnerPid = 0
    [${uniqueClassName}]::GetWindowThreadProcessId($targetHwnd, [ref]$targetOwnerPid) | Out-Null
    $relatedPidsForHandle = Get-RelatedPids $targetPid
    $ownerMatchesLock = $targetWindowPid -gt 0 -and [int]$targetOwnerPid -eq $targetWindowPid
    $ownerMatchesProcessTree = $targetWindowPid -eq 0 -and $relatedPidsForHandle.Contains([int]$targetOwnerPid)

    if (($ownerMatchesLock -or $ownerMatchesProcessTree) -and (Activate-Window $targetHwnd)) {
      exit 0
    }
  }
}

$relatedHwnd = Find-RelatedProcessWindow
if (Activate-Window $relatedHwnd) {
  exit 0
}

exit 1
`;
}

async function activateClaudeWindow(projectName, pid, hwnd, windowPid) {
  const activateScriptPath = join(CACHE_DIRS.temp, `activate-${projectName}-${Date.now()}.ps1`);
  const uniqueClassName = `Win32Activator${Date.now()}`;
  const activateScriptContent = buildClaudeActivateScript(pid, hwnd, windowPid, projectName, uniqueClassName);

  await writeFile(activateScriptPath, activateScriptContent, 'utf-8');
  console.log('Claude activation script created:', activateScriptPath);

  try {
    console.log('Running Claude activation script...');
    await executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', activateScriptPath]);
    console.log('Claude activation script completed');
  } finally {
    try {
      await unlink(activateScriptPath);
    } catch (e) {
      // Ignore cleanup failures for temporary activation scripts.
    }
  }
}

async function isClaudeProcessForLock(pid, scriptPath) {
  if (!Number.isInteger(pid) || pid <= 0 || !scriptPath) {
    return false;
  }

  const validateScriptPath = join(CACHE_DIRS.temp, `validate-claude-${pid}-${Date.now()}.ps1`);
  const escapedScriptPath = escapePowerShellSingleQuoted(scriptPath);
  const validateScriptContent = `$targetPid = ${pid}
$scriptPath = '${escapedScriptPath}'

$processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
if (-not $processInfo) {
  exit 1
}

$commandLine = [string]$processInfo.CommandLine
if ([string]::IsNullOrWhiteSpace($commandLine)) {
  exit 1
}

if ($commandLine.IndexOf($scriptPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
  exit 0
}

exit 1
`;

  await writeFile(validateScriptPath, validateScriptContent, 'utf-8');

  try {
    await executeCommand('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', validateScriptPath]);
    return true;
  } catch (error) {
    console.log('Claude lock process validation failed:', error.message);
    return false;
  } finally {
    try {
      await unlink(validateScriptPath);
    } catch (e) {
      // Ignore cleanup failures for temporary validation scripts.
    }
  }
}

async function getExistingClaudeLockFile(lockFile, legacyLockFile, projectPath) {
  if (existsSync(lockFile)) {
    return lockFile;
  }

  if (!existsSync(legacyLockFile)) {
    return null;
  }

  try {
    const lockContent = await readFile(legacyLockFile, 'utf-8');
    const { scriptPath } = parseClaudeLockContent(lockContent);

    if (!scriptPath || !existsSync(scriptPath)) {
      return null;
    }

    const scriptContent = await readFile(scriptPath, 'utf-8');
    return scriptContent.includes(`Set-Location "${projectPath}"`) ? legacyLockFile : null;
  } catch (error) {
    console.log('Legacy Claude lock validation failed:', error.message);
    return null;
  }
}

ipcMain.handle('open-claude', async (event, projectPath) => {
  try {
    // 从渲染进程获取 Claude 配置
    const claudeConfig = await mainWindow.webContents.executeJavaScript(`
      (() => {
        const stored = localStorage.getItem('wam_claude_config');
        if (!stored) return null;

        const config = JSON.parse(stored);

        // 获取当前选中的密钥
        if (config.apiKeys && config.apiKeys.length > 0) {
          const selectedIndex = config.selectedKeyIndex || 0;
          config.authToken = config.apiKeys[selectedIndex]?.token || config.authToken;
        }

        return config;
      })()
    `);

    if (!claudeConfig || !claudeConfig.authToken) {
      return {
        success: false,
        error: '请先在设置中配置 Claude API 密钥'
      };
    }

    // 检查是否已经有该项目的 Claude 窗口在运行
    const projectName = getClaudeProjectName(projectPath);
    const lockFile = getClaudeLockFile(projectPath);
    const legacyLockFile = getLegacyClaudeLockFile(projectPath);
    const existingLockFile = await getExistingClaudeLockFile(lockFile, legacyLockFile, projectPath);

    console.log('检查窗口复用，项目名称:', projectName);
    console.log('锁文件路径:', lockFile);

    if (existingLockFile) {
      console.log('找到锁文件，尝试激活窗口');
      try {
        // 从锁文件读取信息 (格式: PID|ScriptPath|WindowHandle 或 PENDING|ScriptPath)
        const lockContent = await readFile(existingLockFile, 'utf-8');
        let { pidStr, scriptPath, hwnd, windowPid } = parseClaudeLockContent(lockContent);
        let pid = null;

        // 如果是 PENDING 状态，说明窗口正在启动中，等待一下
        if (pidStr === 'PENDING') {
          console.log('窗口正在启动中，等待2秒后重试...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 重新读取锁文件，看是否已更新为实际PID
          const updatedContent = await readFile(existingLockFile, 'utf-8');
          const updatedInfo = parseClaudeLockContent(updatedContent);
          const updatedPid = updatedInfo.pidStr;

          if (updatedPid === 'PENDING') {
            const lockStats = await stat(existingLockFile);
            if (Date.now() - lockStats.mtimeMs > 15000) {
              throw new Error('Claude 窗口启动锁已过期');
            }

            console.log('窗口仍在启动中，激活现有窗口');
            // 直接返回成功，不创建新窗口
            mainWindow.webContents.send('log-output', {
              type: 'success',
              data: `✓ Claude 窗口正在启动中，请稍候...\n`
            });
            return { success: true, reused: true };
          }

          // 已更新为实际PID，更新变量以便后续使用
          pidStr = updatedPid;
          scriptPath = updatedInfo.scriptPath;
          hwnd = updatedInfo.hwnd;
          windowPid = updatedInfo.windowPid;
          console.log('获取到实际PID:', updatedPid);
        }

        // 解析 PID
        pid = parseInt(pidStr);

        if (isNaN(pid)) {
          throw new Error('无效的PID');
        }

        console.log('锁文件中的PID:', pid);
        console.log('脚本路径:', scriptPath);

        const isValidClaudeProcess = await isClaudeProcessForLock(pid, scriptPath);
        if (!isValidClaudeProcess) {
          throw new Error('Claude 进程已退出或 PID 已被其他进程复用');
        }

          try {
            // 优先按锁文件中的窗口句柄激活，标题变化后仍能精准对应。
            await activateClaudeWindow(projectName, pid, hwnd, windowPid);
            console.log('激活窗口成功');

            mainWindow.webContents.send('log-output', {
              type: 'success',
              data: `✓ 已激活现有的 Claude 窗口\n`
            });

            return { success: true, reused: true };
          } catch (activateError) {
            console.log('激活窗口失败（执行脚本失败）:', activateError.message);
            console.log('激活错误详情:', activateError);

            // 检查进程是否还存在
            try {
              process.kill(pid, 0); // 发送信号0只检查进程是否存在，不杀死它
              console.log('进程仍然存在，使用备用方法激活窗口');

              // 使用备用方法：继续按进程关系查找并激活
              const psScript = join(CACHE_DIRS.temp, `restore-${projectName}-${Date.now()}.ps1`);
              const psContent = `
$targetPid = ${pid}

$code = @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
[DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
[DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
'@

Add-Type -MemberDefinition $code -Name WinAPI2 -Namespace Win32 -ErrorAction SilentlyContinue

function Get-RelatedPids([int]$pid) {
    $set = New-Object 'System.Collections.Generic.HashSet[int]'
    $null = $set.Add($pid)

    try {
        $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)

        for ($round = 0; $round -lt 8; $round++) {
            $added = $false
            foreach ($processInfo in $processes) {
                $candidatePid = [int]$processInfo.ProcessId
                $candidateParentPid = [int]$processInfo.ParentProcessId
                if ($set.Contains($candidateParentPid) -and -not $set.Contains($candidatePid)) {
                    $null = $set.Add($candidatePid)
                    $added = $true
                }
            }
            if (-not $added) { break }
        }
    } catch {
    }

    return ,$set
}

function Activate-Window([IntPtr]$hwnd) {
    if ($hwnd -eq [IntPtr]::Zero) { return $false }
    if (-not [Win32.WinAPI2]::IsWindowVisible($hwnd)) { return $false }

    $showResult = $false
    if ([Win32.WinAPI2]::IsIconic($hwnd)) {
        $showResult = [Win32.WinAPI2]::ShowWindow($hwnd, 9)
    } else {
        $showResult = [Win32.WinAPI2]::ShowWindow($hwnd, 5)
    }
    Start-Sleep -Milliseconds 100
    $topResult = [Win32.WinAPI2]::BringWindowToTop($hwnd)
    $foregroundResult = [Win32.WinAPI2]::SetForegroundWindow($hwnd)
    return ($showResult -or $topResult -or $foregroundResult)
}

$relatedPids = Get-RelatedPids $targetPid
$targetHwnd = [IntPtr]::Zero

[Win32.WinAPI2]::EnumWindows({
    param([IntPtr]$hwnd, [IntPtr]$lParam)

    if (-not [Win32.WinAPI2]::IsWindowVisible($hwnd)) {
        return $true
    }

    [UInt32]$ownerPid = 0
    [Win32.WinAPI2]::GetWindowThreadProcessId($hwnd, [ref]$ownerPid) | Out-Null

    if ($relatedPids.Contains([int]$ownerPid)) {
        $script:targetHwnd = $hwnd
        return $false
    }

    return $true
}, [IntPtr]::Zero) | Out-Null

if (Activate-Window $targetHwnd) {
    exit 0
}

exit 1
`;

              try {
                await writeFile(psScript, psContent, 'utf-8');
                await executeCommand('powershell', ['-ExecutionPolicy', 'Bypass', '-File', psScript]);
                console.log('PowerShell 激活成功');

                // 清理脚本
                try {
                  await unlink(psScript);
                } catch (e) {}
              } catch (psError) {
                console.log('PowerShell 激活失败:', psError.message);
                try {
                  await unlink(psScript);
                } catch (e) {}
                throw psError;
              }

              // 无论激活是否成功，都返回成功并提示用户
              mainWindow.webContents.send('log-output', {
                type: 'success',
                data: `✓ Claude 窗口已激活\n`
              });
              return { success: true, reused: true };
            } catch (e) {
              console.log('进程已不存在，将删除锁文件并创建新窗口');
              throw activateError;
            }
          }
      } catch (error) {
        console.log('激活窗口失败（外层catch）:', error.message);
        console.log('错误详情:', error);
        // 窗口已关闭，清除锁文件
        try {
          await unlink(existingLockFile);
          console.log('已清除过期锁文件，将继续创建新窗口');
        } catch (e) {
          console.log('清除锁文件失败:', e.message);
        }
      }
    } else {
      console.log('没有找到锁文件，创建新窗口');
    }

    // 创建 Claude PowerShell 脚本到缓存目录
    const timestamp = Date.now();
    const scriptFileName = `claude-${projectName}-${timestamp}.ps1`;
    const scriptPath = join(CACHE_DIRS.claudeScripts, scriptFileName);
    const scriptContent = generateClaudeScript(claudeConfig, projectPath, lockFile);

    await writeFile(scriptPath, scriptContent, 'utf-8');

    // 调试：打印脚本内容和路径
    console.log('生成的脚本路径:', scriptPath);

    mainWindow.webContents.send('log-output', {
      type: 'stdout',
      data: `\n正在启动 Claude AI...\n项目路径: ${projectPath}\n`
    });

    // 先预创建锁文件，避免新窗口脚本写入真实 PID 后被 PENDING 覆盖。
    await writeFile(lockFile, `PENDING|${scriptPath}`, 'utf-8');
    console.log('预创建锁文件:', lockFile);

    // 优先使用 Windows Terminal，每次打开独立的新窗口
    let psProcess;

    try {
      // 尝试使用 Windows Terminal 打开独立新窗口
      psProcess = spawn('wt.exe', [
        '-w', '-1',  // -1 表示创建新窗口（而不是新标签页）
        'powershell.exe',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ], {
        detached: true,
        stdio: 'ignore'
      });

    } catch (error) {
      // 如果 Windows Terminal 不可用，降级到传统 PowerShell
      console.log('Windows Terminal 不可用，使用传统 PowerShell');
      psProcess = spawn('cmd.exe', [
        '/c',
        'start',
        'Claude',  // cmd start 的第一个参数是窗口标题
        'powershell.exe',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
    }

    // 分离进程，让它独立运行
    psProcess.unref();

    mainWindow.webContents.send('log-output', {
      type: 'success',
      data: `✓ Claude AI 已启动\n`
    });

    return { success: true };
  } catch (error) {
    mainWindow.webContents.send('log-output', {
      type: 'error',
      data: `✗ 启动 Claude 失败: ${error.message}\n`
    });
    return { success: false, error: error.message };
  }
});

// 生成 Claude PowerShell 脚本
function generateClaudeScript(config, projectPath, lockFilePath) {
  const projectName = getClaudeProjectName(projectPath);
  const startupWindowTitle = `WAM-Claude-${getClaudeProjectKey(projectPath)}-${Date.now()}`;

  const modelsScript = config.models.map((model, index) => {
    const num = index + 1;
    const colorMap = {
      green: 'Green',
      gold: 'Yellow',
      purple: 'Magenta',
      red: 'Red',
      blue: 'Cyan'
    };
    const color = colorMap[model.color] || 'White';
    return `Write-Host " [${num}] ${model.name.padEnd(40)} - ${model.description}" -ForegroundColor ${color}`;
  }).join('\n');

  const modelChoices = config.models.map((_, i) => `'${i + 1}'`).join(', ');

  const modelSelection = config.models.map((model, index) => {
    const num = index + 1;
    if (index === 0) {
      return `if ($choice -eq '${num}') {
    $model = "${model.id}"
    $effort = "${model.effort}"
    Write-Host "\n🚀 Starting [${model.name}]..." -ForegroundColor Green
}`;
    } else {
      return `elseif ($choice -eq '${num}') {
    $model = "${model.id}"
    $effort = "${model.effort}"
    Write-Host "\n🚀 Starting [${model.name}]..." -ForegroundColor ${model.color === 'gold' ? 'Yellow' : model.color === 'purple' ? 'Magenta' : model.color === 'red' ? 'Red' : 'Cyan'}
}`;
    }
  }).join(' ');

  return `# WAM - Claude AI Startup Script
# Generated at ${new Date().toLocaleString()}
# Project: ${projectName}

# Write PID, script path, window handle, and window owner PID for reuse detection
$lockFile = "${lockFilePath.replace(/\\/g, '/')}"
$scriptPath = $MyInvocation.MyCommand.Path
$wamWindowTitle = "${startupWindowTitle}"
$host.UI.RawUI.WindowTitle = $wamWindowTitle
$windowHandle = 0
$windowPid = 0

try {
  $typeDefinition = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WamClaudeWindow {
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@
  Add-Type -TypeDefinition $typeDefinition -ErrorAction SilentlyContinue

  for ($attempt = 0; $attempt -lt 20 -and $windowHandle -eq 0; $attempt++) {
    Start-Sleep -Milliseconds 100

    [WamClaudeWindow]::EnumWindows({
        param([IntPtr]$hwnd, [IntPtr]$lParam)

        if (-not [WamClaudeWindow]::IsWindowVisible($hwnd)) {
          return $true
        }

        $sb = New-Object System.Text.StringBuilder 512
        [WamClaudeWindow]::GetWindowText($hwnd, $sb, 512) | Out-Null

        if ($sb.ToString() -eq $script:wamWindowTitle) {
          [UInt32]$ownerPid = 0
          [WamClaudeWindow]::GetWindowThreadProcessId($hwnd, [ref]$ownerPid) | Out-Null
          $script:windowHandle = $hwnd.ToInt64()
          $script:windowPid = [int]$ownerPid
          return $false
        }

        return $true
    }, [IntPtr]::Zero) | Out-Null
  }
} catch {
  $windowHandle = 0
  $windowPid = 0
}

"$PID|$scriptPath|$windowHandle|$windowPid" | Out-File -FilePath $lockFile -Encoding UTF8

# Register cleanup on exit
$cleanupScript = {
  $lockFile = "${lockFilePath.replace(/\\/g, '/')}"
  if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
  }
}
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanupScript | Out-Null

# Set window title - must be done before claude command
$host.UI.RawUI.WindowTitle = "Claude - ${projectName}"

# Set environment variables
$env:ANTHROPIC_BASE_URL = "${config.baseUrl}"
$env:ANTHROPIC_AUTH_TOKEN = "${config.authToken}"

# Change to project directory
Set-Location "${projectPath}"

# Display model selection menu
Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "         Please Select Claude Mode            " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
${modelsScript}
Write-Host "==============================================" -ForegroundColor Cyan

# Loop for user input
do {
    Write-Host "Enter your choice [1-${config.models.length}]: " -NoNewline -ForegroundColor Yellow
    $choice = [Console]::ReadLine().Trim()
} while ($choice -notin @(${modelChoices}))

# Set model based on choice
${modelSelection}

# Execute Claude command
claude --model $model --effort $effort --permission-mode acceptEdits

# Cleanup lock file on exit
if (Test-Path $lockFile) {
  Remove-Item $lockFile -Force
}
`;
}

// ==================== 日志抓取功能 ====================

// 15. 选择日志保存路径
ipcMain.handle('select-log-save-path', async (event, projectName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存日志文件',
    defaultPath: `${projectName || 'app'}_log_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  return result.canceled ? null : result.filePath;
});

// 16. 抓取日志
ipcMain.handle('capture-log', async (event, { packageName, deviceId, savePath }) => {
  try {
    console.log('开始抓取日志:', { packageName, deviceId, savePath });

    mainWindow.webContents.send('log-output', {
      type: 'info',
      data: `正在抓取设备 ${deviceId} 的日志...\n`
    });

    // 首先获取应用的 PID
    let pid = null;
    try {
      const pidResult = await executeCommand('adb', ['-s', deviceId, 'shell', 'pidof', packageName]);
      pid = pidResult.trim();
      console.log('应用 PID:', pid);
    } catch (error) {
      console.log('无法获取应用 PID，将抓取所有日志并按包名过滤');
    }

    // 抓取日志
    let logContent = '';
    if (pid) {
      // 如果有 PID，只抓取该进程的日志
      mainWindow.webContents.send('log-output', {
        type: 'info',
        data: `找到应用进程 PID: ${pid}\n`
      });

      logContent = await executeCommand('adb', [
        '-s',
        deviceId,
        'logcat',
        '-d',
        '-v',
        'time',
        '--pid=' + pid
      ]);
    } else {
      // 没有 PID，抓取所有日志并按包名过滤
      mainWindow.webContents.send('log-output', {
        type: 'info',
        data: `应用未运行，将抓取包含 "${packageName}" 的所有日志\n`
      });

      const allLogs = await executeCommand('adb', [
        '-s',
        deviceId,
        'logcat',
        '-d',
        '-v',
        'time'
      ]);

      // 过滤包含包名的日志行
      logContent = allLogs
        .split('\n')
        .filter(line => line.includes(packageName))
        .join('\n');
    }

    if (!logContent || logContent.trim().length === 0) {
      mainWindow.webContents.send('log-output', {
        type: 'warning',
        data: '未找到相关日志\n'
      });

      return {
        success: false,
        error: '未找到相关日志，请确保应用正在运行或曾经运行过'
      };
    }

    // 写入文件
    await writeFile(savePath, logContent, 'utf-8');

    const lineCount = logContent.split('\n').length;
    console.log('日志已保存到:', savePath, '行数:', lineCount);

    mainWindow.webContents.send('log-output', {
      type: 'success',
      data: `日志已成功保存到: ${savePath}\n共 ${lineCount} 行\n`
    });

    return {
      success: true,
      path: savePath,
      lineCount: lineCount
    };
  } catch (error) {
    console.error('抓取日志失败:', error);

    mainWindow.webContents.send('log-output', {
      type: 'error',
      data: `抓取日志失败: ${error.message}\n`
    });

    return {
      success: false,
      error: error.message
    };
  }
});

// 17. 打开日志文件
ipcMain.handle('open-log-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('打开日志文件失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
