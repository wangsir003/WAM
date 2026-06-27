# WAM 应用启动指南

## ⚠️ 当前问题

由于系统上有多个 Node.js/Vite 进程占用了开发端口，导致应用无法正常启动。

## 🔧 解决方案

### 方案 1：清理占用端口的进程（推荐）

打开 PowerShell 或命令提示符（管理员权限），执行：

```bash
# 找出所有 Node.js 进程
tasklist | findstr node.exe

# 清理所有 Node.js 进程
taskkill /F /IM node.exe

# 清理所有 Electron 进程
taskkill /F /IM electron.exe
```

然后重新启动应用：

```bash
cd D:\AWorkProject\mytools\WAM
npm run electron:dev
```

### 方案 2：使用启动脚本

双击项目根目录下的 `start.bat` 文件即可启动。

### 方案 3：重启电脑

这是最彻底的方式，重启后所有端口都会被释放。

---

## 📋 启动步骤（端口清理后）

1. **进入项目目录**
   ```bash
   cd D:\AWorkProject\mytools\WAM
   ```

2. **启动开发环境**
   ```bash
   npm run electron:dev
   ```
   
   或直接双击 `start.bat`

3. **等待启动**
   - Vite 开发服务器会在 5678 端口启动
   - Electron 窗口会自动打开
   - DevTools 会自动开启

4. **验证启动成功**
   - 看到 Electron 窗口打开
   - 左侧显示"添加项目/APK"按钮
   - 右侧显示空状态提示

---

## 🎯 使用应用

### 1. 添加 Android 项目

- 点击左侧 "添加项目/APK" 按钮
- 选择 "扫描安卓项目文件夹"
- 浏览并选择你的 Android 项目根目录
- 应用会自动解析：
  - Git 远程地址和分支
  - 应用包名（从 build.gradle 或 AndroidManifest.xml）

### 2. 连接设备

- 通过 USB 连接 Android 设备
- 确保设备已开启 USB 调试
- 点击右上角 "刷新" 按钮
- 在设备管理区域勾选要操作的设备

### 3. 编译并安装

- 确保已选择至少一个设备
- 点击 "一键打包并安装" 按钮
- 观察底部日志控制台的实时输出
- 等待编译完成后自动安装到选中的设备

### 4. 应用管理

- 清理缓存：清除应用数据
- 强杀应用：强制停止应用进程
- 卸载应用：从设备上卸载应用

---

## 🛠️ 环境检查

### 检查 ADB 是否正常

```bash
adb version
adb devices
```

如果命令不存在，需要：
1. 安装 Android SDK
2. 将 SDK 的 platform-tools 目录添加到 PATH 环境变量

### 检查 Gradle

确保 Android 项目根目录有 `gradlew.bat` 文件。

---

## 📝 常见问题

### Q: 端口被占用怎么办？

A: 执行 `taskkill /F /IM node.exe` 清理所有 Node.js 进程。

### Q: 设备检测不到？

A: 
1. 检查 USB 线是否连接正常
2. 确保设备已开启 USB 调试
3. 在设备上授权 USB 调试
4. 执行 `adb devices` 验证

### Q: 编译失败？

A: 
1. 确保项目是有效的 Android 项目
2. 检查 Gradle 配置是否正确
3. 查看日志控制台的详细错误信息

### Q: GPU 缓存错误？

A: 这些警告不影响功能，可以忽略。

---

## 🎨 界面说明

### 左侧边栏
- 顶部：应用标题和图标
- 中部：添加项目按钮
- 底部：项目列表（显示名称、分支、包名）

### 右侧主区域
- 顶部：项目详情卡片
- 中部：设备管理卡片
- 底部：实时日志控制台

### 主题切换
点击右上角的太阳/月亮图标切换明亮/暗黑主题。

---

## 📞 技术支持

如遇到其他问题，请查看：
- README.md - 项目说明
- ARCHITECTURE.md - 架构文档
- 日志控制台的详细错误信息

---

**祝使用愉快！** 🎉
