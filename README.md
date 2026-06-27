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
- Android SDK（已配置 ADB 环境变量）
- Windows 10/11

### 安装依赖

```bash
cd WAM
npm install
```

### 开发模式运行

```bash
npm run electron:dev
```

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

- 确保 Android SDK 已正确安装并配置环境变量
- 设备需开启 USB 调试模式
- 首次连接设备需在设备上授权 USB 调试
- 项目需包含 `gradlew.bat` 才能使用一键编译功能

## 许可证

MIT License
