<template>
  <div class="claude-settings-wrapper">
    <a-card class="claude-settings-card" :bordered="false">
      <template #title>
        <div class="card-title">
          <RobotOutlined class="title-icon" />
          <span>Claude AI 配置</span>
        </div>
      </template>

      <template #extra>
        <a-button type="primary" size="large" @click="saveSettings" :icon="h(SaveOutlined)">
          保存配置
        </a-button>
      </template>

      <a-form :model="localConfig" layout="vertical" class="settings-form">
        <a-row :gutter="24">
          <a-col :span="24">
            <a-card title="基础配置" size="small" class="section-card">
              <a-form-item label="Claude API 中转站地址">
                <a-input
                  v-model:value="localConfig.baseUrl"
                  placeholder="https://api.anthropic.com"
                  size="large"
                  :prefix="h(LinkOutlined)"
                />
                <template #extra>
                  <span style="color: rgba(0, 0, 0, 0.45);">Claude API 的基础 URL（支持中转站）</span>
                </template>
              </a-form-item>

              <a-form-item label="API 密钥">
                <a-input-password
                  v-model:value="localConfig.authToken"
                  placeholder="sk-ant-..."
                  size="large"
                  :prefix="h(KeyOutlined)"
                />
                <template #extra>
                  <span style="color: rgba(0, 0, 0, 0.45);">您的 Claude API 密钥</span>
                </template>
              </a-form-item>
            </a-card>
          </a-col>

          <a-col :span="24">
            <a-card title="模型配置" size="small" class="section-card">
              <div class="models-grid">
                <a-card
                  v-for="(model, index) in localConfig.models"
                  :key="index"
                  size="small"
                  class="model-card"
                  :class="`model-${model.color}`"
                  :bordered="true"
                >
                  <template #title>
                    <div class="model-header">
                      <ThunderboltOutlined />
                      <span>模型 {{ index + 1 }}</span>
                      <a-button
                        v-if="localConfig.models.length > 1"
                        danger
                        type="text"
                        size="small"
                        @click="removeModel(index)"
                        :icon="h(DeleteOutlined)"
                        class="delete-btn"
                      >
                        删除
                      </a-button>
                    </div>
                  </template>

                  <a-form-item label="模型 ID" class="compact-form-item">
                    <a-input v-model:value="model.id" placeholder="claude-opus-4-8" />
                  </a-form-item>

                  <a-form-item label="显示名称" class="compact-form-item">
                    <a-input v-model:value="model.name" placeholder="Opus 4.8 (Ultimate)" />
                  </a-form-item>

                  <a-form-item label="描述" class="compact-form-item">
                    <a-input v-model:value="model.description" placeholder="Max Autonomous Agent" />
                  </a-form-item>

                  <a-row :gutter="12">
                    <a-col :span="12">
                      <a-form-item label="推理强度" class="compact-form-item">
                        <a-select v-model:value="model.effort" style="width: 100%">
                          <a-select-option value="low">Low</a-select-option>
                          <a-select-option value="medium">Medium</a-select-option>
                          <a-select-option value="high">High</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>

                    <a-col :span="12">
                      <a-form-item label="标签颜色" class="compact-form-item">
                        <a-select v-model:value="model.color" style="width: 100%">
                          <a-select-option value="green">
                            <span class="color-option">
                              <span class="color-dot" style="background: #52c41a;"></span>
                              绿色
                            </span>
                          </a-select-option>
                          <a-select-option value="gold">
                            <span class="color-option">
                              <span class="color-dot" style="background: #faad14;"></span>
                              金色
                            </span>
                          </a-select-option>
                          <a-select-option value="purple">
                            <span class="color-option">
                              <span class="color-dot" style="background: #722ed1;"></span>
                              紫色
                            </span>
                          </a-select-option>
                          <a-select-option value="red">
                            <span class="color-option">
                              <span class="color-dot" style="background: #f5222d;"></span>
                              红色
                            </span>
                          </a-select-option>
                          <a-select-option value="blue">
                            <span class="color-option">
                              <span class="color-dot" style="background: #1890ff;"></span>
                              蓝色
                            </span>
                          </a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                  </a-row>
                </a-card>
              </div>

              <a-button
                type="dashed"
                block
                size="large"
                @click="addModel"
                :icon="h(PlusOutlined)"
                class="add-model-btn"
              >
                添加新模型
              </a-button>
            </a-card>
          </a-col>
        </a-row>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, h } from 'vue';
import { message } from 'ant-design-vue';
import {
  SaveOutlined,
  LinkOutlined,
  KeyOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue';
import { useClaudeStore } from '@/stores/claude';

const claudeStore = useClaudeStore();

// 本地配置（深拷贝，避免直接修改 store）
const localConfig = ref(JSON.parse(JSON.stringify(claudeStore.config)));

// 保存设置
function saveSettings() {
  if (!localConfig.value.baseUrl.trim()) {
    message.warning('请填写 API 地址');
    return;
  }

  if (!localConfig.value.authToken.trim()) {
    message.warning('请填写 API 密钥');
    return;
  }

  if (localConfig.value.models.length === 0) {
    message.warning('至少需要配置一个模型');
    return;
  }

  claudeStore.updateConfig(localConfig.value);
  message.success('配置已保存');
}

// 添加新模型
function addModel() {
  localConfig.value.models.push({
    id: '',
    name: '',
    description: '',
    effort: 'medium',
    color: 'blue'
  });
}

// 删除模型
function removeModel(index) {
  localConfig.value.models.splice(index, 1);
}
</script>

<style scoped>
.claude-settings-wrapper {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0;
}

.claude-settings-card {
  margin: 0;
  height: 100%;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
}

.title-icon {
  font-size: 24px;
  color: #667eea;
}

.settings-form {
  max-width: 100%;
}

.section-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.section-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-bottom: 2px solid #667eea;
  font-weight: 600;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.model-card {
  border-left: 4px solid #1890ff;
  transition: all 0.3s ease;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.model-card.model-green {
  border-left-color: #52c41a;
}

.model-card.model-gold {
  border-left-color: #faad14;
}

.model-card.model-purple {
  border-left-color: #722ed1;
}

.model-card.model-red {
  border-left-color: #f5222d;
}

.model-card.model-blue {
  border-left-color: #1890ff;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-btn {
  margin-left: auto;
}

.compact-form-item {
  margin-bottom: 16px;
}

.compact-form-item :deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.add-model-btn {
  height: 48px;
  font-size: 16px;
  border: 2px dashed #d9d9d9;
  transition: all 0.3s ease;
}

.add-model-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
}

:deep(.ant-input-affix-wrapper),
:deep(.ant-input),
:deep(.ant-input-password) {
  border-radius: 6px;
}
</style>
