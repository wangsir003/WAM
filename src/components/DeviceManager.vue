<template>
  <a-card class="device-manager-card">
    <template #title>
      <div style="display: flex; align-items: center; gap: 8px;">
        <MobileOutlined style="color: #1890ff;" />
        <span style="font-weight: 600;">设备管理</span>
        <a-tag v-if="projectStore.devices.length > 0" color="success" style="margin-left: 8px;">
          在线 {{ projectStore.devices.length }}
        </a-tag>
        <a-tag v-else color="default">无设备</a-tag>
      </div>
    </template>

    <template #extra>
      <a-button
        type="primary"
        size="small"
        :icon="h(ReloadOutlined)"
        :loading="refreshing"
        @click="refreshDevices"
      >
        刷新
      </a-button>
    </template>

    <div v-if="projectStore.devices.length === 0" class="no-devices">
      <a-empty
        description="未检测到设备"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      >
        <template #description>
          <div>
            <p>请确保：</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Android 设备已通过 USB 连接</li>
              <li>设备已开启 USB 调试</li>
              <li>ADB 驱动已正确安装</li>
            </ul>
          </div>
        </template>
        <a-button type="primary" @click="refreshDevices">
          <ReloadOutlined /> 重新检测
        </a-button>
      </a-empty>
    </div>

    <div v-else>
      <a-checkbox-group
        v-model:value="projectStore.selectedDevices"
        class="device-list"
      >
        <div class="device-grid">
          <div
            v-for="device in projectStore.devices"
            :key="device.id"
            :class="['device-card', { selected: isDeviceSelected(device.id) }]"
            @click="toggleDevice(device.id)"
          >
            <a-tag size="small" :color="getStatusColor(device.status)" class="status-tag-top">
              {{ device.status }}
            </a-tag>
            <a-checkbox :value="device.id" class="device-checkbox">
              <div class="device-content">
                <div class="device-info">
                  <div class="device-model">{{ device.model }}</div>
                  <div class="device-id">{{ device.id }}</div>
                </div>
              </div>
            </a-checkbox>
          </div>
        </div>
      </a-checkbox-group>

      <div class="device-actions">
        <a-space>
          <a-button
            size="small"
            @click="selectAllDevices"
            :disabled="projectStore.selectedDevices.length === projectStore.devices.length"
          >
            全选
          </a-button>
          <a-button
            size="small"
            @click="clearSelectedDevices"
            :disabled="projectStore.selectedDevices.length === 0"
          >
            清空
          </a-button>
        </a-space>
        <a-tag v-if="projectStore.selectedDevices.length > 0" color="blue">
          已选择 {{ projectStore.selectedDevices.length }} 台
        </a-tag>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { ref, h } from 'vue';
import { message, Empty } from 'ant-design-vue';
import { ReloadOutlined, MobileOutlined } from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();
const refreshing = ref(false);

function isDeviceSelected(deviceId) {
  return projectStore.selectedDevices.includes(deviceId);
}

function getStatusColor(status) {
  const colorMap = {
    online: 'success',
    offline: 'error',
    unauthorized: 'warning'
  };
  return colorMap[status] || 'default';
}

async function refreshDevices() {
  refreshing.value = true;
  try {
    const result = await window.electronAPI.getAdbDevices();

    if (result.success) {
      projectStore.setDevices(result.devices);

      // 自动恢复当前项目的设备选择
      if (projectStore.selectedProjectId && projectStore.projectDeviceHistory[projectStore.selectedProjectId]) {
        const savedDeviceIds = projectStore.projectDeviceHistory[projectStore.selectedProjectId];
        const availableDeviceIds = result.devices.map(d => d.id);

        // 只恢复仍然在线的设备
        projectStore.selectedDevices = savedDeviceIds.filter(id => availableDeviceIds.includes(id));
      }

      if (result.devices.length > 0) {
        message.success(`发现 ${result.devices.length} 个设备`);
      } else {
        message.warning('未检测到设备');
      }
    } else {
      message.error(result.error);
      projectStore.setDevices([]);
    }
  } catch (error) {
    message.error('刷新设备失败: ' + error.message);
    projectStore.setDevices([]);
  } finally {
    refreshing.value = false;
  }
}

function selectAllDevices() {
  projectStore.selectedDevices = projectStore.devices.map(d => d.id);

  // 保存当前项目的设备选择
  if (projectStore.selectedProjectId) {
    projectStore.projectDeviceHistory[projectStore.selectedProjectId] = [...projectStore.selectedDevices];
    localStorage.setItem('wam_device_history', JSON.stringify(projectStore.projectDeviceHistory));
  }
}

function clearSelectedDevices() {
  projectStore.clearSelectedDevices();

  // 清空当前项目的设备选择历史
  if (projectStore.selectedProjectId) {
    projectStore.projectDeviceHistory[projectStore.selectedProjectId] = [];
    localStorage.setItem('wam_device_history', JSON.stringify(projectStore.projectDeviceHistory));
  }
}

function toggleDevice(deviceId) {
  projectStore.toggleDevice(deviceId);
}
</script>

<style scoped>
.device-manager-card {
  margin-bottom: 16px;
}

.no-devices {
  padding: 40px 20px;
}

.device-list {
  width: 100%;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
}

.device-card {
  position: relative;
  padding: 12px;
  border: 2px solid #434343;
  border-radius: 8px;
  transition: all 0.3s;
  cursor: pointer;
  background: #141414;
  min-height: 90px;
  display: flex;
  align-items: center;
}

.device-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.25);
  background: #1f1f1f;
}

.device-card.selected {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.15);
  box-shadow: 0 2px 12px rgba(24, 144, 255, 0.3);
}

.device-checkbox {
  width: 100%;
}

.device-checkbox :deep(.ant-checkbox) {
  position: absolute;
  top: 5px;
  right: 5px;
}

.status-tag-top {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 11px;
  z-index: 1;
  border-top-left-radius: 4px;
  border-bottom-right-radius: 4px;
  border-top-right-radius: 0;
  border-bottom-left-radius: 0;
}

.device-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 18px;
  padding-left: 0;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  padding-right: 20px;
}

.device-model {
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-id {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #434343;
}

/* 暗黑模式适配 */
:global(.ant-theme-dark) .device-card {
  background: #141414;
  border-color: #434343;
}

:global(.ant-theme-dark) .device-card:hover {
  border-color: #1890ff;
  background: #1f1f1f;
}

:global(.ant-theme-dark) .device-card.selected {
  background: rgba(24, 144, 255, 0.15);
}

:global(.ant-theme-dark) .device-model {
  color: rgba(255, 255, 255, 0.85);
}

:global(.ant-theme-dark) .device-id {
  color: rgba(255, 255, 255, 0.45);
}

:global(.ant-theme-dark) .device-actions {
  border-top-color: #434343;
}
</style>
