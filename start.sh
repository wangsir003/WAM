#!/bin/bash

echo "========================================"
echo "  WAM - Windows Android-project Manager"
echo "  启动开发环境..."
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "[错误] 未找到 npm"
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "[提示] 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败"
        exit 1
    fi
fi

# 启动应用
echo "[启动] 正在启动 WAM..."
npm run electron:dev
