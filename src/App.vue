<template>
  <a-config-provider :theme="themeConfig">
    <a-layout class="app-layout">
      <!-- 左侧边栏 -->
      <a-layout-sider
        v-model:collapsed="collapsed"
        :width="300"
        :collapsed-width="64"
        class="app-sider"
        theme="dark"
        collapsible
        :trigger="null"
        style="display: flex; flex-direction: column;"
      >
        <div class="sider-header">
          <div v-if="!collapsed" class="header-left">
            <!-- Claude Logo -->
            <div class="claude-logo" @click="showClaudeSettings = !showClaudeSettings">
              <img src="@/assets/claude-icon.png" alt="Claude AI" class="logo-image" />
            </div>

            <h1 class="app-title">
              <AndroidOutlined /> WAM
            </h1>
          </div>

          <div v-if="!collapsed" class="header-right">
            <a-tooltip :title="isDark ? '切换到亮色模式' : '切换到暗黑模式'" placement="bottom">
              <a-button
                type="text"
                class="theme-btn"
                :icon="h(isDark ? BulbOutlined : BulbFilled)"
                @click="toggleTheme"
              />
            </a-tooltip>

            <a-button
              type="text"
              class="collapse-btn"
              :icon="h(MenuFoldOutlined)"
              @click="collapsed = !collapsed"
            />
          </div>

          <a-button
            v-else
            type="text"
            class="collapse-btn-only"
            :icon="h(MenuUnfoldOutlined)"
            @click="collapsed = !collapsed"
          />
        </div>

        <div v-if="!collapsed" class="add-project-btn">
          <a-dropdown :trigger="['click']">
            <a-button type="primary" size="large" block :icon="h(PlusOutlined)">
              <span>添加项目/APK</span>
            </a-button>
            <template #overlay>
              <a-menu @click="handleAddProject">
                <a-menu-item key="folder">
                  <FolderOpenOutlined /> 扫描安卓项目文件夹
                </a-menu-item>
                <a-menu-item key="apk">
                  <FileOutlined /> 导入单体 APK
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>

        <ProjectList :collapsed="collapsed" />
      </a-layout-sider>

      <!-- 右侧主面板 -->
      <a-layout class="main-layout">
        <a-layout-content class="app-content">
          <!-- Claude 设置页面（全局，不依赖项目选择） -->
          <div v-if="showClaudeSettings" class="content-wrapper">
            <div class="function-area full-width">
              <ClaudeSettings @backToProjects="showClaudeSettings = false" />
            </div>
          </div>

          <!-- 功能区始终显示 -->
          <div v-else class="content-wrapper">
            <div :class="['function-area', { 'full-width': !projectStore.isRunning }]">
              <ProjectDetail />
              <DeviceManager />
              <DevToolbox />
            </div>

            <div v-if="projectStore.isRunning" class="log-area">
              <LogConsole />
            </div>
          </div>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { message, Empty, theme } from 'ant-design-vue';
import {
  AndroidOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  FileOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  BulbOutlined,
  BulbFilled,
  RobotOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';
import ProjectList from '@/components/ProjectList.vue';
import ProjectDetail from '@/components/ProjectDetail.vue';
import DeviceManager from '@/components/DeviceManager.vue';
import DevToolbox from '@/components/DevToolbox.vue';
import LogConsole from '@/components/LogConsole.vue';
import ClaudeSettings from '@/components/ClaudeSettings.vue';

const projectStore = useProjectStore();
const collapsed = ref(false);
const refreshingDevices = ref(false);
const isDark = ref(true);
const showClaudeSettings = ref(false);

// 主题配置
const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6
  }
}));

// 切换主题
function toggleTheme() {
  isDark.value = !isDark.value;
}

// 添加项目
async function handleAddProject({ key }) {
  if (key === 'claude-settings') {
    showClaudeSettings.value = !showClaudeSettings.value;
    return;
  }

  if (key === 'folder') {
    try {
      const folderPath = await window.electronAPI.selectProjectFolder();
      if (!folderPath) return;

      const loadingMsg = message.loading('正在解析项目信息...', 0);

      const projectInfo = await window.electronAPI.parseProjectInfo(folderPath);

      loadingMsg();

      if (!projectInfo.packageName) {
        message.warning('未能自动提取包名，请稍后手动设置');
      }

      projectStore.addProject(projectInfo);
      message.success('项目添加成功！');
    } catch (error) {
      message.error('添加项目失败: ' + error.message);
    }
  } else if (key === 'apk') {
    try {
      const apkPath = await window.electronAPI.selectApkFile();
      if (!apkPath) return;

      // 导入单体 APK（简化处理）
      const projectInfo = {
        path: apkPath,
        name: apkPath.split('\\').pop(),
        packageName: null,
        gitRemote: null,
        gitBranch: null,
        isApkOnly: true
      };

      projectStore.addProject(projectInfo);
      message.success('APK 添加成功！');
    } catch (error) {
      message.error('添加 APK 失败: ' + error.message);
    }
  }
}

// 刷新设备列表
async function refreshDevices() {
  refreshingDevices.value = true;
  try {
    const result = await window.electronAPI.getAdbDevices();

    if (result.success) {
      projectStore.setDevices(result.devices);
      message.success(`发现 ${result.devices.length} 个设备`);
    } else {
      message.error(result.error);
    }
  } catch (error) {
    message.error('刷新设备失败: ' + error.message);
  } finally {
    refreshingDevices.value = false;
  }
}

// 初始化时刷新设备
refreshDevices();
</script>

<style scoped>
.app-layout {
  height: 100vh;
  overflow: hidden;
}

.app-sider {
  background: #001529;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sider-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.claude-logo {
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

.claude-logo:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.logo-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.collapse-btn-only {
  color: rgba(255, 255, 255, 0.65);
  font-size: 18px;
  padding: 8px;
  margin: 0 auto;
  display: block;
}

.collapse-btn-only:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.collapse-btn {
  color: rgba(255, 255, 255, 0.65);
  font-size: 16px;
  padding: 4px 8px;
  height: auto;
}

.collapse-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.theme-btn {
  color: rgba(255, 255, 255, 0.65);
  font-size: 16px;
  padding: 4px 8px;
  height: auto;
}

.theme-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.app-title {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-project-btn {
  padding: 16px;
}

.add-project-btn :deep(.ant-btn) {
  justify-content: center;
}

.main-layout {
  background: #f0f2f5;
}

.app-content {
  padding: 0;
  overflow: hidden;
  height: 100vh;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.content-wrapper {
  display: flex;
  height: 100%;
}

.function-area {
  flex: 0 0 50%;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.function-area.full-width {
  flex: 1;
}

.log-area {
  flex: 0 0 50%;
  border-left: 1px solid #e8e8e8;
  overflow: hidden;
}

:global(.ant-theme-dark) .log-area {
  border-left-color: #434343;
}

/* 暗黑模式下的样式调整 */
:deep(.ant-layout) {
  background: var(--ant-color-bg-layout);
}
</style>
