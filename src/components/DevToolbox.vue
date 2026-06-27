<template>
  <a-card title="开发者工具箱" class="dev-tools-card">
    <a-space direction="vertical" size="large" style="width: 100%">
      <!-- Release 编译 -->
      <div class="tool-section">
        <h4>Release 编译</h4>
        <a-button
          type="primary"
          danger
          :icon="h(RocketOutlined)"
          :loading="buildingRelease"
          :disabled="!hasProject"
          @click="buildRelease"
          size="large"
        >
          一键 Release 打包
        </a-button>
        <a-typography-text type="secondary" style="margin-left: 12px">
          编译成功后自动打开 APK 文件夹
        </a-typography-text>
      </div>

      <a-divider />

      <!-- 无线连接 -->
      <div class="tool-section">
        <h4>
          <WifiOutlined /> ADB 无线连接
        </h4>
        <a-space>
          <a-input
            v-model:value="wifiIp"
            placeholder="192.168.1.100:5555"
            style="width: 200px"
            :disabled="connecting"
          >
            <template #prefix>
              <WifiOutlined />
            </template>
          </a-input>
          <a-button
            type="primary"
            :loading="connecting"
            @click="connectWifi"
          >
            连接
          </a-button>
          <a-typography-text type="secondary">
            先在手机上执行: adb tcpip 5555
          </a-typography-text>
        </a-space>
      </div>

      <a-divider />

      <!-- 批量操作 -->
      <div class="tool-section">
        <h4>批量快捷操作</h4>
        <a-typography-text type="secondary" style="display: block; margin-bottom: 12px">
          对所有选中的设备执行操作
        </a-typography-text>
        <a-space wrap>
          <a-button
            :icon="h(CameraOutlined)"
            :disabled="!hasSelectedDevices"
            @click="batchScreenshot"
          >
            批量截屏
          </a-button>
          <a-button
            :icon="h(ClearOutlined)"
            :disabled="!hasSelectedDevicesAndPackage"
            @click="() => batchOperation('clear')"
          >
            清理缓存
          </a-button>
          <a-button
            :icon="h(CloseCircleOutlined)"
            :disabled="!hasSelectedDevicesAndPackage"
            @click="() => batchOperation('stop')"
          >
            强杀应用
          </a-button>
          <a-button
            danger
            :icon="h(DeleteOutlined)"
            :disabled="!hasSelectedDevicesAndPackage"
            @click="() => batchOperation('uninstall')"
          >
            卸载应用
          </a-button>
        </a-space>
      </div>

      <a-divider />

      <!-- Logcat 监控 -->
      <div class="tool-section">
        <h4>
          <BugOutlined /> Logcat 实时监控
        </h4>
        <a-space>
          <a-select
            v-model:value="selectedLogcatDevice"
            placeholder="选择监控设备"
            style="width: 200px"
            :disabled="logcatRunning"
          >
            <a-select-option
              v-for="device in projectStore.devices"
              :key="device.id"
              :value="device.id"
            >
              {{ device.model }} ({{ device.id }})
            </a-select-option>
          </a-select>

          <a-button
            v-if="!logcatRunning"
            type="primary"
            :icon="h(PlayCircleOutlined)"
            :disabled="!selectedLogcatDevice"
            @click="startLogcat"
          >
            开启监控
          </a-button>
          <a-button
            v-else
            danger
            :icon="h(PauseCircleOutlined)"
            @click="stopLogcat"
          >
            停止监控
          </a-button>

          <a-tag v-if="logcatRunning" color="success">
            <span style="display: inline-flex; align-items: center; gap: 4px">
              <span class="blinking-dot"></span>
              监控中
            </span>
          </a-tag>
        </a-space>
        <a-typography-text type="secondary" style="display: block; margin-top: 8px">
          自动高亮 Exception、Crash 等关键错误
        </a-typography-text>
      </div>
    </a-space>
  </a-card>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  RocketOutlined,
  WifiOutlined,
  CameraOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  BugOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();

// 状态
const buildingRelease = ref(false);
const wifiIp = ref('');
const connecting = ref(false);
const selectedLogcatDevice = ref(null);
const logcatRunning = ref(false);

// 计算属性
const hasProject = computed(() => !!projectStore.selectedProject);
const hasSelectedDevices = computed(() => projectStore.selectedDevices.length > 0);
const hasSelectedDevicesAndPackage = computed(() => {
  return hasSelectedDevices.value && projectStore.selectedProject?.packageName;
});

// Release 编译
async function buildRelease() {
  if (!projectStore.selectedProject) {
    message.warning('请先选择一个项目');
    return;
  }

  buildingRelease.value = true;
  projectStore.setRunning(true); // 显示日志区

  try {
    message.info('开始 Release 编译...');
    const result = await window.electronAPI.buildRelease(projectStore.selectedProject.path);

    if (result.success) {
      message.success('Release 编译成功！APK 文件夹已打开');
    } else {
      message.error('Release 编译失败: ' + result.error);
    }
  } catch (error) {
    message.error('操作失败: ' + error.message);
  } finally {
    buildingRelease.value = false;
    // 编译完成后保持日志区显示，用户可手动关闭
  }
}

// WiFi 连接
async function connectWifi() {
  if (!wifiIp.value.trim()) {
    message.warning('请输入 IP 地址和端口');
    return;
  }

  connecting.value = true;
  try {
    const result = await window.electronAPI.adbConnectWifi(wifiIp.value);

    if (result.success) {
      message.success('WiFi 连接成功！');
      // 刷新设备列表
      setTimeout(async () => {
        const devicesResult = await window.electronAPI.getAdbDevices();
        if (devicesResult.success) {
          projectStore.setDevices(devicesResult.devices);
        }
      }, 1000);
    } else {
      message.error('WiFi 连接失败: ' + (result.error || result.output));
    }
  } catch (error) {
    message.error('操作失败: ' + error.message);
  } finally {
    connecting.value = false;
  }
}

// 批量截屏
async function batchScreenshot() {
  if (!hasSelectedDevices.value) {
    message.warning('请先选择至少一个设备');
    return;
  }

  const projectName = projectStore.selectedProject?.customName || 'screenshot';
  const devices = projectStore.selectedDevices;

  message.loading({ content: `正在对 ${devices.length} 个设备截屏...`, key: 'screenshot' });

  let successCount = 0;

  for (const deviceId of devices) {
    try {
      const result = await window.electronAPI.deviceScreenshot(deviceId, projectName);
      if (result.success) {
        successCount++;
      }
    } catch (error) {
      console.error('截屏失败:', error);
    }
  }

  message.success({
    content: `截屏完成！成功 ${successCount}/${devices.length} 个设备，已保存到桌面`,
    key: 'screenshot',
    duration: 3
  });
}

// 批量操作
function batchOperation(operation) {
  const operationNames = {
    clear: '清理缓存',
    stop: '强杀应用',
    uninstall: '卸载应用'
  };

  Modal.confirm({
    title: `确认${operationNames[operation]}`,
    content: `确定要对选中的 ${projectStore.selectedDevices.length} 个设备执行"${operationNames[operation]}"操作吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        const result = await window.electronAPI.appOperation(
          operation,
          projectStore.selectedProject.packageName,
          projectStore.selectedDevices
        );

        const successCount = result.filter(r => r.success).length;
        message.success(`操作完成，${successCount} 个设备成功`);
      } catch (error) {
        message.error('操作失败: ' + error.message);
      }
    }
  });
}

// 开启 Logcat
async function startLogcat() {
  if (!selectedLogcatDevice.value) {
    message.warning('请先选择监控设备');
    return;
  }

  if (!projectStore.selectedProject?.packageName) {
    message.warning('当前项目未识别包名，无法过滤应用日志');
    return;
  }

  projectStore.setRunning(true); // 显示日志区

  try {
    const result = await window.electronAPI.startLogcat(
      selectedLogcatDevice.value,
      projectStore.selectedProject.packageName
    );

    if (result.success) {
      logcatRunning.value = true;
      message.success('Logcat 监控已开启');
    } else {
      message.error('启动失败: ' + result.error);
      projectStore.setRunning(false);
    }
  } catch (error) {
    message.error('操作失败: ' + error.message);
    projectStore.setRunning(false);
  }
}

// 停止 Logcat
async function stopLogcat() {
  try {
    await window.electronAPI.stopLogcat();
    logcatRunning.value = false;
    message.info('Logcat 监控已停止');
  } catch (error) {
    message.error('操作失败: ' + error.message);
  }
}
</script>

<style scoped>
.dev-tools-card {
  margin-bottom: 16px;
}

.tool-section h4 {
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  font-size: 14px;
}

:global(.ant-theme-dark) .tool-section h4 {
  color: rgba(255, 255, 255, 0.95);
}

.blinking-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
