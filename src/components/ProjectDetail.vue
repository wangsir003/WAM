<template>
  <a-card class="project-detail-card">
    <template #title>
      <div v-if="project" style="display: flex; align-items: center; gap: 8px; cursor: pointer;" @click="detailExpanded = !detailExpanded">
        <FolderOutlined v-if="!project.isApkOnly" style="color: #1890ff;" />
        <FileOutlined v-else style="color: #1890ff;" />
        <span style="font-weight: 600;">{{ project.customName }}</span>
        <DownOutlined v-if="!detailExpanded" style="font-size: 12px;" />
        <UpOutlined v-else style="font-size: 12px;" />
        <span style="color: rgba(0, 0, 0, 0.45); font-weight: 400;">- 项目详情</span>
      </div>
      <div v-else style="display: flex; align-items: center; gap: 8px;">
        <AppstoreOutlined style="color: #1890ff;" />
        <span style="font-weight: 600;">项目功能</span>
        <span style="color: rgba(0, 0, 0, 0.45); font-weight: 400;">- 未选择项目</span>
      </div>
    </template>

    <template #extra>
      <a-space>
        <a-button
          v-if="project && !project.isApkOnly"
          type="primary"
          :icon="h(ThunderboltOutlined)"
          :loading="building"
          @click="buildAndInstall"
          :disabled="!project || !hasSelectedDevices"
        >
          运行
        </a-button>
        <a-button
          :icon="h(PoweroffOutlined)"
          :disabled="!project || !project.packageName || !hasSelectedDevices"
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
          :icon="h(FileTextOutlined)"
          :loading="capturingLog"
          @click="captureLog"
          :disabled="!hasSelectedDevices"
        >
          抓取日志
        </a-button>
        <a-tooltip title="打开 Claude AI">
          <div class="claude-ai-btn" @click="openClaude" :class="{ 'disabled': !project }">
            <img src="@/assets/claude-icon.png" alt="Claude AI" class="claude-ai-icon" />
          </div>
        </a-tooltip>
      </a-space>
    </template>

    <!-- 可展开/收起的详情内容 -->
    <div v-if="project" v-show="detailExpanded">
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

    <!-- 未选择项目时的提示 -->
    <div v-else class="no-project-tip">
      <a-empty
        description="请从左侧选择一个项目以查看详情和使用项目相关功能"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>

    <!-- 应用管理按钮始终显示 -->
    <a-space v-if="project">
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
import { message, Modal, Empty } from 'ant-design-vue';
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
  RobotOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  FolderOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();
const building = ref(false);
const installing = ref(false);
const capturingLog = ref(false);
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
            [...projectStore.selectedDevices] // 转换为普通数组
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
      [...projectStore.selectedDevices] // 转换为普通数组
    );

    const successCount = results.filter(r => r.success).length;
    message.success(`已停止应用，${successCount} 个设备成功`);
  } catch (error) {
    message.error('停止应用失败: ' + error.message);
  }
}

// 抓取日志
async function captureLog() {
  if (!hasSelectedDevices.value) {
    message.warning('请先选择至少一个设备');
    return;
  }

  let packageName = null;
  let appName = null;

  // 如果有选中的项目，使用项目的包名
  if (project.value && project.value.packageName) {
    packageName = project.value.packageName;
    appName = project.value.customName;
  } else {
    // 未选择项目或项目没有包名，让用户从已安装应用中选择
    try {
      const loadingMsg = message.loading('正在获取已安装应用列表...', 0);

      const result = await window.electronAPI.getInstalledApps(projectStore.selectedDevices[0]);

      loadingMsg();

      if (!result.success || !result.apps || result.apps.length === 0) {
        message.error('获取已安装应用失败: ' + (result.error || '未找到应用'));
        return;
      }

      // 显示应用选择对话框
      let selectedPackage = result.apps[0]?.packageName; // 默认选中第一个

      const selectedApp = await new Promise((resolve) => {
        const radioGroupRef = ref(selectedPackage);

        Modal.confirm({
          title: '选择要抓取日志的应用',
          width: 700,
          content: h('div', { style: 'max-height: 500px; overflow-y: auto;' }, [
            h('p', { style: 'margin-bottom: 16px; color: #666; font-size: 13px;' },
              `在设备上找到 ${result.apps.length} 个第三方应用，请选择一个进行日志抓取：`
            ),
            h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
              result.apps.map(app =>
                h('div', {
                  key: app.packageName,
                  style: {
                    padding: '12px 16px',
                    border: selectedPackage === app.packageName ? '2px solid #1890ff' : '1px solid #e8e8e8',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: selectedPackage === app.packageName ? '#e6f7ff' : '#fff',
                  },
                  onClick: () => {
                    radioGroupRef.value = app.packageName;
                    selectedPackage = app.packageName;
                  }
                }, [
                  h('div', { style: 'display: flex; align-items: center; gap: 12px;' }, [
                    h('input', {
                      type: 'radio',
                      name: 'app-select',
                      checked: selectedPackage === app.packageName,
                      style: 'cursor: pointer; flex-shrink: 0;'
                    }),
                    h('div', {
                      style: 'flex: 1; font-size: 14px; color: #262626; font-family: monospace; word-break: break-all;'
                    }, app.packageName)
                  ])
                ])
              )
            )
          ]),
          okText: '确定抓取',
          cancelText: '取消',
          onOk: () => {
            if (selectedPackage) {
              const selected = result.apps.find(app => app.packageName === selectedPackage);
              resolve(selected);
            } else {
              message.warning('请选择一个应用');
              resolve(null);
            }
          },
          onCancel: () => {
            resolve(null);
          }
        });
      });

      if (!selectedApp) {
        return;
      }

      packageName = selectedApp.packageName;
      appName = selectedApp.appName || selectedApp.packageName;
    } catch (error) {
      message.error('获取应用列表失败: ' + error.message);
      return;
    }
  }

  try {
    // 让用户选择保存路径和文件名
    const savePath = await window.electronAPI.selectLogSavePath(appName || packageName);

    if (!savePath) {
      return;
    }

    capturingLog.value = true;

    // 开始抓取日志
    const result = await window.electronAPI.startCaptureLog(
      packageName,
      projectStore.selectedDevices[0], // 使用第一个选中的设备
      savePath
    );

    if (result.success) {
      // 显示抓取进度对话框
      let elapsedSeconds = 0;
      const maxSeconds = 180; // 3分钟

      const modal = Modal.info({
        title: '日志抓取中',
        content: h('div', [
          h('p', `正在抓取应用日志: ${appName || packageName}`),
          h('p', { style: 'font-size: 24px; font-weight: bold; color: #1890ff; margin: 20px 0;' }, '00:00 / 03:00'),
          h('p', { style: 'color: #666; font-size: 12px;' }, '最多支持抓取 3 分钟日志')
        ]),
        okText: '停止抓取',
        onOk: async () => {
          // 用户点击停止
          await window.electronAPI.stopCaptureLog();
          capturingLog.value = false;
          message.success('日志抓取已停止');
        }
      });

      // 更新计时器
      const timer = setInterval(() => {
        elapsedSeconds++;

        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        const totalMinutes = Math.floor(maxSeconds / 60);
        const totalSeconds = maxSeconds % 60;

        const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} / ${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;

        // 更新对话框内容
        modal.update({
          content: h('div', [
            h('p', `正在抓取应用日志: ${appName || packageName}`),
            h('p', { style: 'font-size: 24px; font-weight: bold; color: #1890ff; margin: 20px 0;' }, timeText),
            h('p', { style: 'color: #666; font-size: 12px;' }, '最多支持抓取 3 分钟日志')
          ])
        });

        // 到达3分钟自动停止
        if (elapsedSeconds >= maxSeconds) {
          clearInterval(timer);
          window.electronAPI.stopCaptureLog();
          modal.destroy();
          capturingLog.value = false;

          message.success('日志抓取完成（已达到3分钟上限）');

          // 询问是否打开日志文件
          Modal.confirm({
            title: '日志抓取完成',
            content: `日志文件已保存到:\n${savePath}`,
            okText: '打开查看',
            cancelText: '关闭',
            onOk: () => {
              window.electronAPI.openLogFile(savePath);
            }
          });
        }
      }, 1000);

      // 监听抓取完成事件（用户手动停止或出错）
      window.electronAPI.onCaptureLogComplete((result) => {
        clearInterval(timer);
        modal.destroy();
        capturingLog.value = false;

        if (result.stopped) {
          // 用户手动停止
          Modal.confirm({
            title: '日志抓取已停止',
            content: `日志文件已保存到:\n${savePath}`,
            okText: '打开查看',
            cancelText: '关闭',
            onOk: () => {
              window.electronAPI.openLogFile(savePath);
            }
          });
        }
      });

    } else {
      capturingLog.value = false;
      message.error('启动日志抓取失败: ' + result.error);
    }
  } catch (error) {
    capturingLog.value = false;
    message.error('抓取日志失败: ' + error.message);
  }
}

// 打开 Claude AI
async function openClaude() {
  if (!project.value) {
    message.warning('请先选择一个项目');
    return;
  }

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

.claude-ai-btn {
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.claude-ai-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: scale(1.05);
  border-color: rgba(102, 126, 234, 0.3);
}

.claude-ai-btn.disabled {
  cursor: not-allowed;
  opacity: 0.4;
  background: rgba(102, 126, 234, 0.05);
  border-color: rgba(102, 126, 234, 0.1);
}

.claude-ai-btn.disabled:hover {
  background: rgba(102, 126, 234, 0.05);
  transform: none;
  border-color: rgba(102, 126, 234, 0.1);
}

.claude-ai-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.no-project-tip {
  padding: 40px 20px;
}
</style>
