<template>
  <div class="log-console-wrapper">
    <div class="log-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="log-title">实时日志</span>
        <a-badge :count="logs.length" :overflow-count="999" />
      </div>
      <a-space>
        <a-button
          size="small"
          :icon="h(ClearOutlined)"
          @click="clearLogs"
          :disabled="logs.length === 0"
        >
          清空
        </a-button>
        <a-button
          size="small"
          danger
          :icon="h(CloseOutlined)"
          @click="closeLog"
        >
          关闭
        </a-button>
      </a-space>
    </div>

    <div ref="consoleRef" class="log-console" @scroll="handleScroll">
      <div v-if="logs.length === 0" class="empty-logs">
        <CodeOutlined style="font-size: 48px; opacity: 0.3;" />
        <p>等待日志输出...</p>
      </div>
      <div v-else class="log-lines">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-line', `log-${log.type}`]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-content">{{ log.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, h } from 'vue';
import {
  ClearOutlined,
  CodeOutlined,
  CloseOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();
const consoleRef = ref(null);
const logs = ref([]);
const autoscroll = ref(true);
const userScrolling = ref(false);

onMounted(() => {
  // 监听来自主进程的日志输出
  window.electronAPI.onLogOutput((data) => {
    addLog(data);
  });
});

onUnmounted(() => {
  window.electronAPI.removeLogListener();
});

function addLog(data) {
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const lines = data.data.split('\n').filter(line => line.trim());

  lines.forEach(line => {
    // 过滤非核心日志
    if (!isImportantLog(line)) {
      return;
    }

    let type = data.type;

    // 智能识别日志类型
    if (type === 'stdout') {
      if (
        line.includes('BUILD SUCCESSFUL') ||
        line.includes('Success') ||
        line.includes('✓')
      ) {
        type = 'success';
      } else if (
        line.includes('BUILD FAILED') ||
        line.includes('INSTALL_FAILED') ||
        line.includes('Error') ||
        line.includes('error:') ||
        line.includes('✗') ||
        line.includes('FAILURE') ||
        line.includes('Failed')
      ) {
        type = 'error';
      } else if (
        line.includes('warning:') ||
        line.includes('Warning') ||
        line.includes('⚠')
      ) {
        type = 'warning';
      }
    }

    logs.value.push({
      time,
      content: line,
      type
    });
  });

  // 限制日志数量，避免内存溢出
  if (logs.value.length > 500) {
    logs.value = logs.value.slice(-500);
  }

  // 自动滚动到底部
  if (autoscroll.value && !userScrolling.value) {
    scrollToBottom();
  }
}

// 判断是否为重要日志
function isImportantLog(line) {
  // 核心关键词：编译任务、成功、失败、错误、警告、安装、启动
  const importantKeywords = [
    'BUILD',
    'Task :',
    'Success',
    'SUCCESSFUL',
    'Failed',
    'FAILED',
    'Error',
    'ERROR',
    'Warning',
    'WARNING',
    'Exception',
    '安装',
    '启动',
    '✓',
    '✗',
    '⚠',
    'Installing',
    'Installed',
    'Launching',
    'Launched',
    'CRASH',
    'FATAL',
    // Logcat 相关
    'E/',
    'W/',
    'I/',
    'D/',
    'AndroidRuntime',
    'System.err'
  ];

  return importantKeywords.some(keyword => line.includes(keyword));
}

function clearLogs() {
  logs.value = [];
}

function closeLog() {
  projectStore.setRunning(false);
}

function scrollToBottom() {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    }
  });
}

function handleScroll() {
  if (!consoleRef.value) return;

  const { scrollTop, scrollHeight, clientHeight } = consoleRef.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

  if (!isAtBottom) {
    userScrolling.value = true;
    autoscroll.value = false;
  } else {
    userScrolling.value = false;
    if (!autoscroll.value) {
      autoscroll.value = true;
    }
  }
}

function pad(num) {
  return num.toString().padStart(2, '0');
}
</script>

<style scoped>
.log-console-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
}

.log-title {
  color: #fff;
  font-weight: 500;
  font-size: 14px;
}

.log-console {
  flex: 1;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  padding: 16px;
  overflow-y: auto;
  line-height: 1.6;
}

.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.3);
}

.log-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log-line {
  display: flex;
  gap: 12px;
  padding: 2px 0;
}

.log-time {
  color: #858585;
  flex-shrink: 0;
  font-weight: 500;
}

.log-content {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 日志类型样式 */
.log-stdout .log-content {
  color: #d4d4d4;
}

.log-stderr .log-content {
  color: #ffa500;
}

.log-success .log-content {
  color: #4ec9b0;
  font-weight: 500;
}

.log-error .log-content {
  color: #f48771;
  font-weight: 500;
}

.log-warning .log-content {
  color: #dcdcaa;
}

/* 滚动条样式 */
.log-console::-webkit-scrollbar {
  width: 10px;
}

.log-console::-webkit-scrollbar-track {
  background: #252526;
  border-radius: 5px;
}

.log-console::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.log-console::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}
</style>
