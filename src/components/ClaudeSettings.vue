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
        <a-space>
          <a-button @click="emit('backToProjects')" type="default">
            返回项目
          </a-button>
          <a-button @click="showSecurityModal = true" :icon="h(LockOutlined)">
            安全设置
          </a-button>
          <a-button type="primary" size="large" @click="saveSettings" :icon="h(SaveOutlined)">
            保存配置
          </a-button>
        </a-space>
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

              <!-- 密钥管理区域 -->
              <a-form-item label="API 密钥管理">
                <div class="api-keys-section">
                  <div
                    v-for="(key, index) in localConfig.apiKeys"
                    :key="index"
                    :class="['api-key-item', { selected: localConfig.selectedKeyIndex === index }]"
                    @click="selectKey(index)"
                  >
                    <a-radio
                      :checked="localConfig.selectedKeyIndex === index"
                      class="key-radio"
                    />

                    <span class="key-alias">{{ key.alias || `密钥 ${index + 1}` }}</span>

                    <span class="key-token-masked">{{ maskToken(key.token) }}</span>

                    <a-space class="key-actions" @click.stop>
                      <a-button
                        type="text"
                        @click="viewKey(index)"
                        :icon="h(EyeOutlined)"
                        title="查看密钥"
                        size="small"
                        class="action-btn"
                      />
                      <a-button
                        type="text"
                        @click="copyKey(index)"
                        :icon="h(CopyOutlined)"
                        title="复制密钥"
                        size="small"
                        class="action-btn"
                      />
                      <a-button
                        v-if="localConfig.apiKeys.length > 1"
                        danger
                        type="text"
                        @click="removeKey(index)"
                        :icon="h(DeleteOutlined)"
                        title="删除密钥"
                        size="small"
                        class="action-btn"
                      />
                    </a-space>
                  </div>

                  <a-button
                    type="dashed"
                    block
                    @click="showAddKeyModal = true"
                    :icon="h(PlusOutlined)"
                    class="add-key-btn"
                  >
                    添加新密钥
                  </a-button>
                </div>
                <template #extra>
                  <span style="color: rgba(0, 0, 0, 0.45);">管理多个 API 密钥，选择一个作为当前使用的密钥</span>
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

    <!-- 安全设置弹窗 -->
    <a-modal
      v-model:open="showSecurityModal"
      title="安全设置"
      @ok="saveSecuritySettings"
      okText="保存"
      cancelText="取消"
      width="500px"
    >
      <a-form layout="vertical">
        <a-alert
          message="密钥保护"
          description="设置后，查看和复制密钥时需要验证提示词和密码"
          type="info"
          show-icon
          style="margin-bottom: 20px;"
        />

        <a-form-item label="提示词">
          <a-input
            v-model:value="securitySettings.hint"
            placeholder="例如：我的生日"
            size="large"
          />
          <template #extra>
            <span style="color: #666; font-size: 13px;">设置一个容易记住的提示词</span>
          </template>
        </a-form-item>

        <a-form-item label="保护密码">
          <a-input-password
            v-model:value="securitySettings.password"
            placeholder="输入保护密码"
            size="large"
            :visibilityToggle="false"
          />
          <template #extra>
            <span style="color: #666; font-size: 13px;">留空则不启用密钥保护</span>
          </template>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 验证弹窗 -->
    <a-modal
      v-model:open="showVerifyModal"
      title="验证身份"
      @ok="handleVerify"
      okText="验证"
      cancelText="取消"
      width="400px"
    >
      <a-form layout="vertical">
        <a-alert
          v-if="claudeStore.security.hint"
          :message="`提示：${claudeStore.security.hint}`"
          type="info"
          show-icon
          style="margin-bottom: 20px;"
        />

        <a-form-item label="请输入保护密码">
          <a-input-password
            v-model:value="verifyPassword"
            placeholder="输入密码"
            size="large"
            :visibilityToggle="false"
            @pressEnter="handleVerify"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看密钥弹窗 -->
    <a-modal
      v-model:open="showKeyModal"
      title="查看密钥"
      :footer="null"
      width="600px"
    >
      <a-form layout="vertical">
        <a-form-item label="API 密钥">
          <a-textarea
            :value="viewedKey"
            :auto-size="{ minRows: 3, maxRows: 5 }"
            readonly
            class="key-display-area"
          />
          <div style="margin-top: 12px;">
            <a-button
              type="primary"
              @click="copyToClipboard(viewedKey)"
              :icon="h(CopyOutlined)"
              block
            >
              复制到剪贴板
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加密钥弹窗 -->
    <a-modal
      v-model:open="showAddKeyModal"
      title="添加 API 密钥"
      @ok="handleAddKey"
      okText="添加"
      cancelText="取消"
      width="500px"
    >
      <a-form layout="vertical">
        <a-form-item label="密钥别名">
          <a-input
            v-model:value="newKey.alias"
            placeholder="例如：生产环境密钥"
            size="large"
          />
          <template #extra>
            <span style="color: #666; font-size: 13px;">为密钥设置一个容易识别的名称</span>
          </template>
        </a-form-item>

        <a-form-item label="API 密钥">
          <a-input-password
            v-model:value="newKey.token"
            placeholder="sk-ant-..."
            size="large"
            :visibilityToggle="false"
          />
          <template #extra>
            <span style="color: #666; font-size: 13px;">从 Claude 控制台获取您的 API 密钥</span>
          </template>
        </a-form-item>
      </a-form>
    </a-modal>
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
  ThunderboltOutlined,
  LockOutlined,
  EyeOutlined,
  CopyOutlined
} from '@ant-design/icons-vue';
import { useClaudeStore } from '@/stores/claude';

const emit = defineEmits(['backToProjects']);

const claudeStore = useClaudeStore();

// 本地配置（深拷贝，避免直接修改 store）
const localConfig = ref(JSON.parse(JSON.stringify(claudeStore.config)));

// 确保 apiKeys 结构存在
if (!localConfig.value.apiKeys) {
  // 迁移旧的 authToken 到新结构
  localConfig.value.apiKeys = [
    { token: localConfig.value.authToken || '', alias: '' }
  ];
  localConfig.value.selectedKeyIndex = 0;
} else {
  // 确保每个 key 都有 alias 字段
  localConfig.value.apiKeys = localConfig.value.apiKeys.map(key => ({
    token: key.token || '',
    alias: key.alias || ''
  }));
}

// 安全设置
const showSecurityModal = ref(false);
const securitySettings = ref({
  hint: claudeStore.security?.hint || '',
  password: claudeStore.security?.password || ''
});

// 验证相关
const showVerifyModal = ref(false);
const verifyPassword = ref('');
const pendingAction = ref(null); // { type: 'view' | 'copy', index: number }

// 查看密钥
const showKeyModal = ref(false);
const viewedKey = ref('');

// 添加密钥相关
const showAddKeyModal = ref(false);
const newKey = ref({
  alias: '',
  token: ''
});

// 隐藏密钥显示
function maskToken(token) {
  if (!token || token.length < 12) return '***';
  return token.substring(0, 8) + '...' + token.substring(token.length - 4);
}

// 保存设置
function saveSettings() {
  if (!localConfig.value.baseUrl.trim()) {
    message.warning('请填写 API 地址');
    return;
  }

  if (localConfig.value.apiKeys.length === 0 || !localConfig.value.apiKeys[localConfig.value.selectedKeyIndex]?.token.trim()) {
    message.warning('请至少配置一个有效的 API 密钥');
    return;
  }

  if (localConfig.value.models.length === 0) {
    message.warning('至少需要配置一个模型');
    return;
  }

  // 更新 authToken 为当前选中的密钥（保持向后兼容）
  localConfig.value.authToken = localConfig.value.apiKeys[localConfig.value.selectedKeyIndex].token;

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

// 添加新密钥
function handleAddKey() {
  if (!newKey.value.token.trim()) {
    message.warning('请输入 API 密钥');
    return;
  }

  localConfig.value.apiKeys.push({
    token: newKey.value.token.trim(),
    alias: newKey.value.alias.trim()
  });

  message.success('密钥已添加');
  showAddKeyModal.value = false;

  // 重置表单
  newKey.value = {
    alias: '',
    token: ''
  };
}

// 删除密钥
function removeKey(index) {
  if (localConfig.value.apiKeys.length === 1) {
    message.warning('至少需要保留一个密钥');
    return;
  }

  localConfig.value.apiKeys.splice(index, 1);

  // 调整选中索引
  if (localConfig.value.selectedKeyIndex >= localConfig.value.apiKeys.length) {
    localConfig.value.selectedKeyIndex = localConfig.value.apiKeys.length - 1;
  }
}

// 选择密钥
function selectKey(index) {
  localConfig.value.selectedKeyIndex = index;
}

// 查看密钥
function viewKey(index) {
  if (needsVerification()) {
    pendingAction.value = { type: 'view', index };
    verifyPassword.value = '';
    showVerifyModal.value = true;
  } else {
    doViewKey(index);
  }
}

// 复制密钥
function copyKey(index) {
  if (needsVerification()) {
    pendingAction.value = { type: 'copy', index };
    verifyPassword.value = '';
    showVerifyModal.value = true;
  } else {
    doCopyKey(index);
  }
}

// 检查是否需要验证
function needsVerification() {
  return claudeStore.security?.password && claudeStore.security.password.trim() !== '';
}

// 执行查看密钥
function doViewKey(index) {
  viewedKey.value = localConfig.value.apiKeys[index].token;
  showKeyModal.value = true;
}

// 执行复制密钥
function doCopyKey(index) {
  const key = localConfig.value.apiKeys[index].token;
  copyToClipboard(key);
}

// 复制到剪贴板
function copyToClipboard(text) {
  if (!text || text.trim() === '') {
    message.warning('密钥为空');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    message.success('密钥已复制到剪贴板');
  }).catch(() => {
    message.error('复制失败');
  });
}

// 验证密码
function handleVerify() {
  if (verifyPassword.value !== claudeStore.security.password) {
    message.error('密码错误');
    return;
  }

  showVerifyModal.value = false;

  if (pendingAction.value) {
    if (pendingAction.value.type === 'view') {
      doViewKey(pendingAction.value.index);
    } else if (pendingAction.value.type === 'copy') {
      doCopyKey(pendingAction.value.index);
    }
    pendingAction.value = null;
  }
}

// 保存安全设置
function saveSecuritySettings() {
  claudeStore.updateSecurity({
    hint: securitySettings.value.hint,
    password: securitySettings.value.password
  });

  message.success('安全设置已保存');
  showSecurityModal.value = false;
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

/* API Keys Section */
.api-keys-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-key-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
  cursor: pointer;
}

.api-key-item:hover {
  background: #f0f0f0;
  border-color: #d9d9d9;
}

.api-key-item.selected {
  background: #e6f0ff;
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.api-key-item.selected .key-alias {
  color: #667eea;
  font-weight: 600;
}

.key-radio {
  flex-shrink: 0;
  pointer-events: none;
}

.key-alias {
  min-width: 120px;
  font-weight: 500;
  color: #262626;
}

.key-token-masked {
  flex: 1;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #8c8c8c;
}

.key-actions {
  flex-shrink: 0;
}

.action-btn {
  color: #595959 !important;
}

.action-btn:hover {
  color: #667eea !important;
  background: rgba(102, 126, 234, 0.1) !important;
}

.key-radio {
  flex-shrink: 0;
}

.add-key-btn {
  margin-top: 8px;
  height: 40px;
  border: 2px dashed #d9d9d9;
  transition: all 0.3s ease;
}

.add-key-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

/* 查看密钥显示区域 */
.key-display-area {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  color: #262626;
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 12px;
  line-height: 1.6;
}

.key-display-area:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

/* Models Section */
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
