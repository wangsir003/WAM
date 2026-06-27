# WAM 功能更新：一键编译并运行

## 更新内容

### ✅ 已修复
1. **克隆错误问题**：修复了 "An object could not be cloned" 错误
   - 原因：直接传递响应式对象给 IPC
   - 解决：先创建普通数组副本

2. **自动启动功能**：新增安装后自动启动应用
   - 类似 Android Studio 的 Run 功能
   - 安装成功后自动启动应用

## 功能说明

### 一键打包并安装（现在等同于 Run App）

**工作流程：**
1. 执行 `gradlew.bat assembleDebug` 编译项目
2. 自动查找生成的 APK
3. 安装到所有选中的设备
4. **自动启动应用**（新增）

**使用步骤：**
1. 选择 Android 项目
2. 勾选要安装的设备
3. 点击"一键打包并安装"按钮
4. 等待编译完成
5. **应用自动安装并启动**

**日志输出示例：**
```
开始编译项目...
> Task :app:assembleDebug
BUILD SUCCESSFUL

✓ BUILD SUCCESSFUL

正在安装到设备 ABC123...
Performing Streamed Install
Success
✓ 设备 ABC123 安装成功

正在启动应用 com.example.app...
✓ 设备 ABC123 应用已启动

成功安装并启动到 1 个设备
```

## 技术实现

### 后端修改（electron/main.js）
```javascript
// 安装成功后自动启动
if (autoLaunch && packageName) {
  await executeCommand('adb', [
    '-s', deviceId,
    'shell', 'monkey',
    '-p', packageName,
    '-c', 'android.intent.category.LAUNCHER',
    '1'
  ]);
}
```

### 前端修改
- **ProjectDetail.vue**：`buildAndInstall()` 函数传入 `autoLaunch=true`
- **preload.js**：新增 `autoLaunch` 和 `packageName` 参数

## 测试方法

1. **关闭当前应用**
2. **重新启动：** `start-clean.bat`
3. **测试步骤：**
   - 添加一个 Android 项目
   - 连接设备并勾选
   - 点击"一键打包并安装"
   - **预期结果：**
     - 编译成功
     - 安装成功
     - **应用自动在设备上启动**

## 注意事项

- 需要项目包名已正确识别
- 应用必须有可启动的 MainActivity
- 如果启动失败，会显示警告但不影响安装结果

---

**现在"一键打包并安装"等同于 Android Studio 的 Run 功能！** ▶️
