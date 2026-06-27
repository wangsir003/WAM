# 快速运行指南

## 问题已修复

1. ✅ 批处理文件编码问题已修复（所有中文改为英文）
2. ✅ 端口已更改为 5888（避免冲突）
3. ✅ Vite 配置改为非严格端口模式（自动寻找可用端口）

## 立即运行

### 方式 1：双击运行（推荐）

双击项目根目录下的：
```
start-clean.bat
```

这个脚本会：
- 自动清理占用端口的 Node.js 和 Electron 进程
- 等待 3 秒让端口释放
- 启动应用

### 方式 2：普通启动

如果端口没有被占用，直接双击：
```
start.bat
```

### 方式 3：命令行启动

```bash
cd D:\AWorkProject\mytools\WAM
npm run electron:dev
```

## 启动成功标志

✅ 命令行窗口显示：
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5888/
```

✅ Electron 窗口自动弹出

✅ 看到深色界面，左侧有 WAM 标题和"添加项目/APK"按钮

## 如果还是失败

手动清理所有 Node 进程，打开命令提示符：

```bash
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

然后重新运行 start-clean.bat

## 端口说明

- 当前配置端口：5888
- 如果 5888 被占用，Vite 会自动尝试其他端口（5889, 5890...）

---

**现在去双击 start-clean.bat 试试！**
