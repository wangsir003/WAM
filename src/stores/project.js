import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref([]);
  const selectedProjectId = ref(null);
  const devices = ref([]);
  const selectedDevices = ref([]);
  const isRunning = ref(false); // 是否正在运行（编译/安装/Logcat）
  const projectDeviceHistory = ref({}); // 每个项目的设备选择历史 { projectId: [deviceIds] }

  // 计算属性
  const selectedProject = computed(() => {
    return projects.value.find(p => p.id === selectedProjectId.value);
  });

  // 操作方法
  function addProject(projectInfo) {
    const project = {
      id: Date.now().toString(),
      ...projectInfo,
      customName: projectInfo.name,
      addedAt: new Date().toISOString()
    };
    projects.value.push(project);
    saveToStorage();
    return project;
  }

  function removeProject(projectId) {
    projects.value = projects.value.filter(p => p.id !== projectId);
    if (selectedProjectId.value === projectId) {
      selectedProjectId.value = null;
    }
    saveToStorage();
  }

  function updateProject(projectId, updates) {
    const project = projects.value.find(p => p.id === projectId);
    if (project) {
      Object.assign(project, updates);
      saveToStorage();
    }
  }

  function selectProject(projectId) {
    // 保存当前项目的设备选择
    if (selectedProjectId.value && selectedDevices.value.length > 0) {
      projectDeviceHistory.value[selectedProjectId.value] = [...selectedDevices.value];
      saveToStorage();
    }

    // 切换项目
    selectedProjectId.value = projectId;

    // 恢复新项目的设备选择历史
    if (projectId && projectDeviceHistory.value[projectId]) {
      selectedDevices.value = [...projectDeviceHistory.value[projectId]];
    } else {
      selectedDevices.value = [];
    }
  }

  function setDevices(deviceList) {
    devices.value = deviceList;
  }

  function toggleDevice(deviceId) {
    const index = selectedDevices.value.indexOf(deviceId);
    if (index > -1) {
      selectedDevices.value.splice(index, 1);
    } else {
      selectedDevices.value.push(deviceId);
    }

    // 保存当前项目的设备选择
    if (selectedProjectId.value) {
      projectDeviceHistory.value[selectedProjectId.value] = [...selectedDevices.value];
      saveToStorage();
    }
  }

  function clearSelectedDevices() {
    selectedDevices.value = [];
  }

  function setRunning(running) {
    isRunning.value = running;
  }

  // 持久化
  function saveToStorage() {
    localStorage.setItem('wam_projects', JSON.stringify(projects.value));
    localStorage.setItem('wam_device_history', JSON.stringify(projectDeviceHistory.value));
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('wam_projects');
    if (stored) {
      projects.value = JSON.parse(stored);
    }

    const historyStored = localStorage.getItem('wam_device_history');
    if (historyStored) {
      projectDeviceHistory.value = JSON.parse(historyStored);
    }
  }

  // 初始化时加载
  loadFromStorage();

  return {
    projects,
    selectedProjectId,
    devices,
    selectedDevices,
    selectedProject,
    isRunning,
    projectDeviceHistory,
    addProject,
    removeProject,
    updateProject,
    selectProject,
    setDevices,
    toggleDevice,
    clearSelectedDevices,
    setRunning
  };
});
