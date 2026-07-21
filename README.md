# WAM - Windows Android-project Manager

> 专为 Android 开发者设计的桌面端应用

## 技术栈

- **Electron** - 桌面应用框架
- **Vue 3** - 前端框架 (Composition API)
- **Vite** - 构建工具
- **Ant Design Vue** - UI 组件库
- **Pinia** - 状态管理

## 核心功能

### 1. 项目管理
- 扫描并解析 Android 项目（自动提取包名、Git 信息）
- 导入单体 APK 文件
- 项目列表管理（重命名、删除、打开文件夹）

### 2. 设备管理
- 自动检测 ADB 连接的设备
- 多设备选择支持
- 实时设备状态显示

### 3. 一键编译与安装
- Gradle 自动编译（assembleDebug）
- 编译成功后自动安装到选中设备
- 支持选择任意 APK 文件安装

### 4. 应用管理
- 一键清理应用缓存
- 一键强杀应用进程
- 一键卸载应用

### 5. 实时日志控制台
- 流式显示编译/安装日志
- 智能日志高亮（成功/失败/警告）
- 自动滚动与暂停功能

## 快速开始

### 环境要求

- Node.js >= 16
- Windows 10/11

**注意：** 应用已内置 ADB 工具，无需单独安装 Android SDK！

### 安装依赖

```bash
cd WAM
npm install
```

### 开发模式运行

```bash
npm run electron:dev
```

应用启动时会自动将内置的 ADB 添加到环境变量中，无需手动配置。

### 构建应用

```bash
npm run electron:build
```

生成的安装包位于 `dist-electron` 目录。

## 项目结构

```
WAM/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── preload.js       # 预加载脚本
├── src/
│   ├── components/
│   │   ├── ProjectList.vue      # 项目列表
│   │   ├── ProjectDetail.vue    # 项目详情
│   │   ├── DeviceManager.vue    # 设备管理
│   │   └── LogConsole.vue       # 日志控制台
│   ├── stores/
│   │   └── project.js           # Pinia 状态管理
│   ├── App.vue                  # 主应用组件
│   └── main.js                  # Vue 入口
├── package.json
├── vite.config.js
└── index.html
```

## 使用说明

1. **添加项目**
   - 点击左侧"添加项目/APK"按钮
   - 选择"扫描安卓项目文件夹"或"导入单体 APK"

2. **选择设备**
   - 在设备管理区域勾选要操作的设备
   - 支持多设备同时操作

3. **编译安装**
   - 点击"一键打包并安装"自动编译并安装
   - 或点击"选择 APK 安装"直接安装已有的 APK

4. **查看日志**
   - 底部日志控制台实时显示操作进度
   - 支持清空日志和暂停滚动

## 注意事项

- ✅ **应用已内置 ADB 工具**，无需安装 Android SDK
- ✅ **自动配置环境变量**，启动应用时自动设置 ADB 路径
- 设备需开启 USB 调试模式
- 首次连接设备需在设备上授权 USB 调试
- 项目需包含 `gradlew.bat` 才能使用一键编译功能

## ADB 工具说明

本项目已内置 Android Platform Tools（包含 ADB、Fastboot 等工具），解决了以下问题：

1. **无需安装 Android SDK** - 应用自带完整的 ADB 工具
2. **自动环境配置** - 应用启动时自动将 ADB 添加到 PATH
3. **跨电脑部署** - 复制项目到新电脑即可直接使用，无需额外配置

### 在新电脑上使用

1. 克隆或复制项目到新电脑
2. 运行 `npm install` 安装依赖
3. 确保 `resources/platform-tools/` 目录存在且包含 ADB 工具
   - 如果该目录不存在，运行 `npm run setup-adb` 自动设置
4. 运行 `npm run electron:dev` 或打包后的应用

**注意：** `resources/platform-tools/` 目录已被 `.gitignore` 忽略（约 20MB 二进制文件）。在新环境中首次使用时，需要运行 `npm run setup-adb` 来解压 ADB 工具，或手动将 ADB 工具复制到该目录。

## 许可证

MIT License
