<template>
  <div class="project-list">
    <a-list
      v-if="projectStore.projects.length > 0"
      :data-source="projectStore.projects"
      size="small"
    >
      <template #renderItem="{ item }">
        <a-list-item
          :class="['project-item', { active: item.id === projectStore.selectedProjectId }]"
          @click="selectProject(item.id)"
          @contextmenu.prevent="(e) => showContextMenu(e, item)"
        >
          <div v-if="!collapsed" class="project-info">
            <div class="project-name">
              <FolderOutlined v-if="!item.isApkOnly" />
              <FileOutlined v-else />
              {{ item.customName }}
            </div>
            <div class="project-meta">
              <a-tag v-if="item.gitBranch" size="small" color="blue">
                <BranchesOutlined />
                {{ item.gitBranch }}
              </a-tag>
              <div v-if="item.packageName" class="package-name">
                {{ item.packageName }}
              </div>
            </div>
          </div>
          <a-tooltip v-else :title="`${item.customName}${item.packageName ? '\n' + item.packageName : ''}`" placement="right">
            <div class="project-collapsed">
              <div class="project-icon">
                <FolderOutlined v-if="!item.isApkOnly" />
                <FileOutlined v-else />
              </div>
              <div class="project-folder-name">
                {{ item.name }}
              </div>
            </div>
          </a-tooltip>
        </a-list-item>
      </template>
    </a-list>

    <a-empty
      v-else
      description="暂无项目"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      class="empty-list"
    />

    <!-- 右键菜单 -->
    <a-dropdown
      v-model:open="contextMenuVisible"
      :trigger="['contextmenu']"
      :overlay-style="{ position: 'fixed', left: contextMenuX + 'px', top: contextMenuY + 'px' }"
    >
      <div style="position: fixed; left: 0; top: 0; width: 0; height: 0;" />
      <template #overlay>
        <a-menu @click="handleContextMenuClick">
          <a-menu-item key="rename">
            <EditOutlined /> 重命名
          </a-menu-item>
          <a-menu-item key="open">
            <FolderOpenOutlined /> 打开所在文件夹
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="delete" danger>
            <DeleteOutlined /> 删除项目
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <!-- 重命名对话框 -->
    <a-modal
      v-model:open="renameModalVisible"
      title="重命名项目"
      @ok="handleRename"
    >
      <a-input
        v-model:value="newProjectName"
        placeholder="请输入新的项目名称"
        @pressEnter="handleRename"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { message, Modal, Empty } from 'ant-design-vue';
import {
  FolderOutlined,
  FileOutlined,
  BranchesOutlined,
  EditOutlined,
  FolderOpenOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';

defineProps({
  collapsed: Boolean
});

const projectStore = useProjectStore();

// 右键菜单相关
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const selectedContextProject = ref(null);

// 重命名相关
const renameModalVisible = ref(false);
const newProjectName = ref('');

function selectProject(projectId) {
  projectStore.selectProject(projectId);
}

function showContextMenu(e, project) {
  e.preventDefault();
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
  selectedContextProject.value = project;
  contextMenuVisible.value = true;
}

function handleContextMenuClick({ key }) {
  const project = selectedContextProject.value;
  if (!project) return;

  switch (key) {
    case 'rename':
      newProjectName.value = project.customName;
      renameModalVisible.value = true;
      break;
    case 'open':
      window.electronAPI.openFolder(project.path);
      break;
    case 'delete':
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除项目 "${project.customName}" 吗？`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          projectStore.removeProject(project.id);
          message.success('项目已删除');
        }
      });
      break;
  }

  contextMenuVisible.value = false;
}

function handleRename() {
  if (!newProjectName.value.trim()) {
    message.warning('项目名称不能为空');
    return;
  }

  projectStore.updateProject(selectedContextProject.value.id, {
    customName: newProjectName.value.trim()
  });

  renameModalVisible.value = false;
  message.success('重命名成功');
}

// 获取项目名称缩写（用于收起状态）
function getShortName(name) {
  if (!name) return '?';

  // 如果是英文，取首字母大写
  if (/^[a-zA-Z]/.test(name)) {
    const words = name.split(/[-_\s]+/).filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // 如果是中文或其他，取前2个字符
  return name.substring(0, 2);
}
</script>

<style scoped>
.project-list {
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.project-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.project-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.project-item.active {
  background: rgba(24, 144, 255, 0.15);
  border-left-color: #1890ff;
}

.project-info {
  width: 100%;
}

.project-name {
  color: #fff;
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.package-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-icon {
  font-size: 24px;
  color: #1890ff;
}

.project-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.project-collapsed .project-icon {
  font-size: 20px;
  color: #1890ff;
}

.project-folder-name {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.3;
  max-width: 56px;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.project-item.active .project-folder-name {
  color: #1890ff;
  font-weight: 600;
}

.empty-list {
  padding: 40px 20px;
}

/* 滚动条样式 */
.project-list::-webkit-scrollbar {
  width: 6px;
}

.project-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.project-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
