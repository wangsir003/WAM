# WAM 项目完整结构

```
WAM/
├── electron/                      # Electron 主进程
│   ├── main.js                   # 主进程入口（核心逻辑）
│   └── preload.js                # 预加载脚本（安全桥接）
│
├── src/                          # Vue 前端源码
│   ├── components/               # 组件目录
│   │   ├── ProjectList.vue      # 左侧项目列表（支持右键菜单）
│   │   ├── ProjectDetail.vue    # 项目详情与操作按钮
│   │   ├── DeviceManager.vue    # 设备管理（多选支持）
│   │   └── LogConsole.vue       # 实时日志控制台
│   │
│   ├── stores/                   # Pinia 状态管理
│   │   └── project.js           # 项目状态、设备状态
│   │
│   ├── App.vue                   # 主应用布局组件
│   └── main.js                   # Vue 应用入口
│
├── .vscode/                      # VS Code 配置
│   └── extensions.json          # 推荐扩展
│
├── node_modules/                 # 依赖包（已安装）
│
├── .gitignore                    # Git 忽略规则
├── index.html                    # HTML 入口
├── package.json                  # 项目配置与依赖
├── vite.config.js               # Vite 构建配置
├── README.md                     # 项目说明文档
├── start.bat                     # Windows 启动脚本
└── start.sh                      # Unix/Linux 启动脚本

```

## 核心文件说明

### electron/main.js（主进程核心）
- **IPC 通信处理**：处理所有来自渲染进程的请求
- **文件系统操作**：解析 Gradle、Git、AndroidManifest.xml
- **进程管理**：执行 adb、gradle 命令并流式传输输出
- **设备管理**：解析 `adb devices` 输出

### electron/preload.js（安全桥接）
- 通过 `contextBridge` 暴露安全的 API
- 隔离主进程和渲染进程
- 定义所有可调用的 Electron 功能

### src/App.vue（主布局）
- Ant Design Layout 左右分栏
- 左侧：项目列表 + 添加按钮
- 右侧：详情 + 设备 + 日志
- 主题切换（明亮/暗黑）

### src/components/ProjectList.vue
- 项目列表展示
- 右键菜单（重命名、打开文件夹、删除）
- 支持折叠模式

### src/components/ProjectDetail.vue
- 项目信息展示（路径、Git、包名）
- 一键打包并安装
- 选择 APK 安装
- 应用管理（清理缓存、强杀、卸载）

### src/components/DeviceManager.vue
- ADB 设备列表
- 多设备选择（Checkbox）
- 刷新设备
- 全选/清空功能

### src/components/LogConsole.vue
- 实时日志流式输出
- 智能高亮（成功=绿色、失败=红色）
- 自动滚动/暂停
- 清空日志

### src/stores/project.js
- Pinia 全局状态管理
- 项目列表、设备列表
- localStorage 持久化

## 技术特性

### 1. 流式日志传输
- 使用 `child_process.spawn` 执行命令
- 通过 IPC 实时推送 stdout/stderr
- 前端 xterm 风格展示

### 2. 智能项目解析
- 自动提取 applicationId（Gradle）
- 自动提取 Git 信息
- 支持 Groovy 和 Kotlin DSL

### 3. 多设备并发安装
- 支持同时向多个设备安装
- 每个设备独立显示安装结果
- 友好的错误提示

### 4. 安全架构
- contextIsolation 启用
- nodeIntegration 禁用
- preload 脚本白名单 API

## 依赖关系

### 生产依赖
- `vue@^3.4.0` - 前端框架
- `pinia@^2.1.7` - 状态管理
- `ant-design-vue@^4.1.0` - UI 组件库
- `@ant-design/icons-vue@^7.0.1` - 图标库
- `xterm@^5.3.0` - 终端模拟器
- `xterm-addon-fit@^0.8.0` - 终端自适应

### 开发依赖
- `electron@^28.0.0` - 桌面应用框架
- `vite@^5.0.0` - 构建工具
- `@vitejs/plugin-vue@^5.0.0` - Vue 插件
- `electron-builder@^24.9.0` - 打包工具
- `concurrently@^8.2.2` - 并发运行
- `wait-on@^7.2.0` - 等待服务启动

## 运行流程

1. **启动开发环境**
   ```
   npm run electron:dev
   ```
   - Vite 启动开发服务器（http://localhost:5173）
   - Electron 启动并加载开发服务器
   - 开启 DevTools 方便调试

2. **用户添加项目**
   - 选择项目文件夹
   - 主进程解析 Gradle、Git 信息
   - 存储到 localStorage

3. **刷新设备列表**
   - 执行 `adb devices -l`
   - 解析输出并返回设备数组
   - 更新 Pinia store

4. **一键编译安装**
   - 执行 `gradlew.bat assembleDebug`
   - 流式输出日志到前端
   - 查找生成的 APK
   - 依次安装到选中设备

5. **日志实时显示**
   - 主进程监听子进程 stdout/stderr
   - 通过 IPC 发送到渲染进程
   - 前端智能识别日志类型并高亮
   - 自动滚动到底部

## 构建部署

```bash
# 构建生产版本
npm run electron:build

# 输出目录
dist-electron/
├── WAM Setup 1.0.0.exe    # Windows 安装程序
└── win-unpacked/          # 未打包版本
```

## 注意事项

1. **ADB 环境要求**
   - 需要 Android SDK 已安装
   - adb 命令在 PATH 环境变量中
   - 设备已开启 USB 调试

2. **Gradle 要求**
   - 项目根目录需有 `gradlew.bat`
   - 首次编译可能需要下载 Gradle 依赖

3. **网络问题**
   - Electron 下载可能需要镜像
   - 已配置 npm 镜像源（registry.npmmirror.com）

4. **权限问题**
   - 某些操作需要管理员权限
   - USB 调试授权需要在设备上确认
