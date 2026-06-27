import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useClaudeStore = defineStore('claude', () => {
  // Claude 配置状态
  const config = ref({
    baseUrl: 'https://ccxx.com',
    authToken: '',
    models: [
      {
        id: 'claude-sonnet-4-6',
        name: 'Sonnet 4.6 (Daily Mode)',
        description: 'Fast / Save Token',
        effort: 'low',
        color: 'green'
      },
      {
        id: 'claude-opus-4-6',
        name: 'Opus 4.6 (Expert)',
        description: 'Deep Reasoning',
        effort: 'high',
        color: 'gold'
      },
      {
        id: 'claude-opus-4-7',
        name: 'Opus 4.7 (Advanced)',
        description: 'Advanced Coding',
        effort: 'high',
        color: 'purple'
      },
      {
        id: 'claude-opus-4-8',
        name: 'Opus 4.8 (Ultimate)',
        description: 'Max Autonomous Agent',
        effort: 'high',
        color: 'red'
      }
    ]
  });

  // 更新配置
  function updateConfig(newConfig) {
    config.value = { ...config.value, ...newConfig };
    saveToStorage();
  }

  // 更新基础 URL
  function updateBaseUrl(url) {
    config.value.baseUrl = url;
    saveToStorage();
  }

  // 更新认证令牌
  function updateAuthToken(token) {
    config.value.authToken = token;
    saveToStorage();
  }

  // 更新模型列表
  function updateModels(models) {
    config.value.models = models;
    saveToStorage();
  }

  // 持久化
  function saveToStorage() {
    localStorage.setItem('wam_claude_config', JSON.stringify(config.value));
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('wam_claude_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并配置，保留默认模型列表如果没有存储的模型
      config.value = {
        ...config.value,
        ...parsed,
        models: parsed.models && parsed.models.length > 0 ? parsed.models : config.value.models
      };
    }
  }

  // 初始化时加载
  loadFromStorage();

  return {
    config,
    updateConfig,
    updateBaseUrl,
    updateAuthToken,
    updateModels,
    saveToStorage,
    loadFromStorage
  };
});
