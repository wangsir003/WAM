<template>
  <a-card class="project-detail-card">
    <template #title>
      <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;" @click="detailExpanded = !detailExpanded">
        <FolderOutlined v-if="!project.isApkOnly" style="color: #1890ff;" />
        <FileOutlined v-else style="color: #1890ff;" />
        <span style="font-weight: 600;">{{ project.customName }}</span>
        <DownOutlined v-if="!detailExpanded" style="font-size: 12px;" />
        <UpOutlined v-else style="font-size: 12px;" />
        <span style="color: rgba(0, 0, 0, 0.45); font-weight: 400;">- 项目详情</span>
      </div>
    </template>

    <template #extra>
      <a-space>
        <a-button
          v-if="!project.isApkOnly"
          type="primary"
          :icon="h(ThunderboltOutlined)"
          :loading="building"
          @click="buildAndInstall"
          :disabled="!hasSelectedDevices"
        >
          运行
        </a-button>
        <a-button
          :icon="h(PoweroffOutlined)"
          :disabled="!project.packageName || !hasSelectedDevices"
          @click="stopApp"
        >
          停止
        </a-button>
        <a-button
          :icon="h(UploadOutlined)"
          :loading="installing"
          @click="selectAndInstallApk"
          :disabled="!hasSelectedDevices"
        >
          选择 APK 安装
        </a-button>
        <a-button
          type="default"
          :icon="h(RobotOutlined)"
          @click="openClaude"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;"
        >
          Claude AI
        </a-button>
      </a-space>
    </template>

    <!-- 可展开/收起的详情内容 -->
    <div v-show="detailExpanded">
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item label="项目路径">
          <a-space>
            <span>{{ project.path }}</span>
            <a-tooltip title="复制路径">
              <a-button
                type="text"
                size="small"
                :icon="h(CopyOutlined)"
                @click="copyToClipboard(project.path)"
              />
            </a-tooltip>
            <a-tooltip title="打开文件夹">
              <a-button
                type="text"
                size="small"
                :icon="h(FolderOpenOutlined)"
                @click="openFolder"
              />
            </a-tooltip>
          </a-space>
        </a-descriptions-item>

        <a-descriptions-item label="包名">
          <a-space v-if="project.packageName">
            <span>{{ project.packageName }}</span>
            <a-tooltip title="复制包名">
              <a-button
                type="text"
                size="small"
                :icon="h(CopyOutlined)"
                @click="copyToClipboard(project.packageName)"
              />
            </a-tooltip>
          </a-space>
          <a-tag v-else color="warning">未识别</a-tag>
        </a-descriptions-item>

        <a-descriptions-item v-if="project.gitBranch" label="当前分支">
          <a-tag color="blue">
            <BranchesOutlined />
            {{ project.gitBranch }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item v-if="project.gitRemote" label="Git 远程地址" :span="2">
          <a-space>
            <span class="git-remote">{{ project.gitRemote }}</span>
            <a-tooltip title="复制地址">
              <a-button
                type="text"
                size="small"
                :icon="h(CopyOutlined)"
                @click="copyToClipboard(project.gitRemote)"
              />
            </a-tooltip>
          </a-space>
        </a-descriptions-item>
      </a-descriptions>

      <a-divider>应用管理</a-divider>
    </div>

    <!-- 应用管理按钮始终显示 -->
    <a-space>
      <a-button
        :icon="h(ClearOutlined)"
        :disabled="!project.packageName || !hasSelectedDevices"
        @click="performAppOperation('clear')"
      >
        清理缓存
      </a-button>
      <a-button
        :icon="h(CloseCircleOutlined)"
        :disabled="!project.packageName || !hasSelectedDevices"
        @click="performAppOperation('stop')"
      >
        强杀应用
      </a-button>
      <a-button
        danger
        :icon="h(DeleteOutlined)"
        :disabled="!project.packageName || !hasSelectedDevices"
        @click="performAppOperation('uninstall')"
      >
        卸载应用
      </a-button>
    </a-space>
  </a-card>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  ThunderboltOutlined,
  UploadOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  FileOutlined,
  BranchesOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
  PoweroffOutlined,
  RobotOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();
const building = ref(false);
const installing = ref(false);
const detailExpanded = ref(false); // 默认收起

const project = computed(() => projectStore.selectedProject);
const hasSelectedDevices = computed(() => projectStore.selectedDevices.length > 0);

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制到剪贴板');
  });
}

// 打开文件夹
function openFolder() {
  window.electronAPI.openFolder(project.value.path);
}

// 一键打包并安装
async function buildAndInstall() {
  if (!hasSelectedDevices.value) {
    message.warning('请先选择至少一个设备');
    return;
  }

  building.value = true;
  projectStore.setRunning(true); // 开始运行

  try {
    message.info('开始编译项目...');
    const projectPath = project.value.path;
    const result = await window.electronAPI.buildProject(projectPath);

    if (result.success) {
      message.success('编译成功，开始安装并运行...');
      const apkPath = result.apkPath;
      const selectedDeviceIds = [...projectStore.selectedDevices];
      const packageName = project.value.packageName;

      // 自动启动模式：传入 autoLaunch=true 和 packageName
      await installApkToDevices(apkPath, selectedDeviceIds, true, packageName);
    } else {
      message.error('编译失败: ' + result.error);
    }
  } catch (error) {
    message.error('操作失败: ' + error.message);
  } finally {
    building.value = false;
    // 3秒后自动关闭日志区（可选）
    // setTimeout(() => projectStore.setRunning(false), 3000);
  }
}

// 选择并安装 APK
async function selectAndInstallApk() {
  if (!hasSelectedDevices.value) {
    message.warning('请先选择至少一个设备');
    return;
  }

  try {
    const apkPath = project.value.isApkOnly
      ? project.value.path
      : await window.electronAPI.selectApkFile();

    if (!apkPath) return;

    const selectedDeviceIds = [...projectStore.selectedDevices];
    await installApkToDevices(apkPath, selectedDeviceIds);
  } catch (error) {
    message.error('安装失败: ' + error.message);
  }
}

// 安装 APK 到设备
async function installApkToDevices(apkPath, deviceIds = null, autoLaunch = false, packageName = null) {
  installing.value = true;
  try {
    const devices = deviceIds || [...projectStore.selectedDevices];
    const pkgName = packageName || project.value.packageName;
    const results = await window.electronAPI.installApk(apkPath, devices, autoLaunch, pkgName);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (failCount === 0) {
      if (autoLaunch) {
        message.success(`成功安装并启动到 ${successCount} 个设备`);
      } else {
        message.success(`成功安装到 ${successCount} 个设备`);
      }
    } else {
      message.warning(`${successCount} 个设备安装成功，${failCount} 个设备失败`);
    }
  } finally {
    installing.value = false;
  }
}

// 应用管理操作
function performAppOperation(operation) {
  const operationNames = {
    clear: '清理缓存',
    stop: '强杀应用',
    uninstall: '卸载应用'
  };

  const confirmOperation = () => {
    Modal.confirm({
      title: `确认${operationNames[operation]}`,
      content: `确定要对选中的 ${projectStore.selectedDevices.length} 个设备执行"${operationNames[operation]}"操作吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const results = await window.electronAPI.appOperation(
            operation,
            project.value.packageName,
            projectStore.selectedDevices
          );

          const successCount = results.filter(r => r.success).length;
          message.success(`操作完成，${successCount} 个设备成功`);
        } catch (error) {
          message.error('操作失败: ' + error.message);
        }
      }
    });
  };

  if (operation === 'uninstall') {
    confirmOperation();
  } else {
    confirmOperation();
  }
}

// 停止应用（不需要二次确认）
async function stopApp() {
  try {
    const results = await window.electronAPI.appOperation(
      'stop',
      project.value.packageName,
      projectStore.selectedDevices
    );

    const successCount = results.filter(r => r.success).length;
    message.success(`已停止应用，${successCount} 个设备成功`);
  } catch (error) {
    message.error('停止应用失败: ' + error.message);
  }
}

// 打开 Claude AI
async function openClaude() {
  console.log('openClaude 被调用');
  console.log('项目路径:', project.value.path);
  console.log('electronAPI:', window.electronAPI);
  console.log('electronAPI.openClaude:', window.electronAPI?.openClaude);

  try {
    if (!window.electronAPI || !window.electronAPI.openClaude) {
      message.error('Claude API 未正确加载，请重启应用');
      return;
    }

    const result = await window.electronAPI.openClaude(project.value.path);
    console.log('openClaude 返回结果:', result);

    if (result && result.success) {
      message.success(result.reused ? 'Claude 窗口已激活' : 'Claude 已启动');
    } else if (result && result.error) {
      message.error(result.error);
    }
  } catch (error) {
    console.error('启动 Claude 错误:', error);
    message.error('启动 Claude 失败: ' + error.message);
  }
}
</script>

<style scoped>
.project-detail-card {
  margin-bottom: 16px;
}

.git-remote {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #1890ff;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
}
</style>
