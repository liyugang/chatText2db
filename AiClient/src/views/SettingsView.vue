<template>
  <div class="settings-container">
    <div class="settings-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">‹</span> 返回
      </button>
      <h1>设置</h1>
    </div>
    
    <div class="settings-content">
      <div class="settings-section">
        <h2>外观</h2>
        <div class="setting-item">
          <span class="setting-label">主题</span>
          <div class="theme-toggle">
            <button 
              class="theme-btn" 
              :class="{ 'active': !settingsStore.isDarkMode }"
              @click="settingsStore.isDarkMode = false; saveSettings()"
            >
              亮色
            </button>
            <button 
              class="theme-btn" 
              :class="{ 'active': settingsStore.isDarkMode }"
              @click="settingsStore.isDarkMode = true; saveSettings()"
            >
              暗色
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <span class="setting-label">字体大小</span>
          <div class="font-size-selector">
            <button 
              class="font-size-btn" 
              :class="{ 'active': settingsStore.fontSize === 'small' }"
              @click="updateFontSize('small')"
            >
              小
            </button>
            <button 
              class="font-size-btn" 
              :class="{ 'active': settingsStore.fontSize === 'normal' }"
              @click="updateFontSize('normal')"
            >
              中
            </button>
            <button 
              class="font-size-btn" 
              :class="{ 'active': settingsStore.fontSize === 'large' }"
              @click="updateFontSize('large')"
            >
              大
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <span class="setting-label">显示时间戳</span>
          <label class="toggle">
            <input 
              type="checkbox" 
              v-model="settingsStore.showTimestamp"
              @change="saveSettings"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- MCP配置管理 -->
      <div class="settings-section">
        <h2>mcp-mysql数据库配置</h2>
        
        <div v-if="settingsStore.isLoadingMcp" class="loading-indicator">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="loading-text">加载中...</div>
        </div>
        
        <div v-else-if="settingsStore.mcpError" class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-text">{{ settingsStore.mcpError }}</div>
        </div>
        
        <div v-else>
          <div v-if="settingsStore.mcpConfigs.length === 0" class="empty-state">
            <p>暂无MCP配置</p>
            <button class="action-btn" @click="showNewConfigForm = true">
              <span class="icon">+</span> 添加配置
            </button>
          </div>
          
          <div v-else>
            <div class="mcp-config-list">
              <div 
                v-for="config in settingsStore.mcpConfigs" 
                :key="config.id"
                class="mcp-config-item"
              >
                <div class="config-info">
                  <div class="config-name">
                    {{ config.name }}
                    <span v-if="config.active" class="active-tag">激活</span>
                  </div>
                  <div class="config-description">{{ config.description }}</div>
                </div>
                
                <div class="config-actions">
                  <button 
                    v-if="config.id !== settingsStore.activeMcpConfigId"
                    class="action-btn activate-btn" 
                    @click="activateConfig(config.id)"
                  >
                    激活
                  </button>
                  <button class="action-btn edit-btn" @click="editConfig(config)">
                    编辑
                  </button>
                  <button class="action-btn delete-btn" @click="deleteConfig(config.id)">
                    删除
                  </button>
                </div>
              </div>
            </div>
            
            <div class="add-config">
              <button class="action-btn" @click="showNewConfigForm = true">
                <span class="icon">+</span> 添加配置
              </button>
            </div>
          </div>
          
        </div>
      </div>
      
      
      <div class="settings-section">
        <h2>第三方AI设置</h2>
        <div class="setting-item">
          <span class="setting-label">使用第三方API</span>
          <label class="toggle">
            <input 
              type="checkbox" 
              v-model="settingsStore.useThirdPartyApi"
              @change="saveSettings"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div v-if="settingsStore.useThirdPartyApi">
          <div class="setting-item">
            <span class="setting-label">第三方API密钥</span>
            <input 
              type="password" 
              v-model="settingsStore.thirdPartyApiKey" 
              placeholder="输入第三方API密钥"
            >
          </div>
          
          <div class="setting-item">
            <span class="setting-label">第三方API端点</span>
            <input 
              type="text" 
              v-model="settingsStore.thirdPartyApiEndpoint" 
              placeholder="https://api.deepseek.com/v1"
            >
          </div>
          
          <div class="setting-item">
            <span class="setting-label">第三方API模型</span>
            <select v-model="settingsStore.thirdPartyApiModel">
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="deepseek-coder">DeepSeek Coder</option>
              <option value="qwen-max">Qwen Max</option>
              <option value="qwen-plus">Qwen Plus</option>
              <option value="baichuan-turbo">Baichuan Turbo</option>
            </select>
          </div>
        </div>
        
        <div class="api-actions">
          <button class="save-api-btn" @click="saveSettings">保存设置</button>
        </div>
      </div>
      
      <div class="settings-section">
        <h2>关于</h2>
        <div class="about-content">
          <p>AI聊天助手</p>
          <p>版本: 1.0.0</p>
          <p>基于Vue 3开发</p>
          <p>© 2023 AI聊天助手</p>
        </div>
      </div>
    </div>
    <!-- 新建/编辑配置表单 -->
    <div v-if="showNewConfigForm || editingConfig" class="config-form-overlay">
      <div class="config-form">
        <h3>{{ editingConfig ? '编辑配置' : '新建配置' }}</h3>
        
        <div class="form-group">
          <label>名称</label>
          <input type="text" v-model="configForm.name" placeholder="配置名称">
        </div>
        
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="configForm.description" placeholder="配置描述"></textarea>
        </div>
        
        <div class="form-group">
          <label>配置JSON</label>
          <textarea 
            v-model="configForm.config_json" 
            placeholder='{"MYSQL_HOST": "127.0.0.1", "MYSQL_PORT": "3306", "MYSQL_USER": "root", "MYSQL_PASS": "", "MYSQL_DB": ""}'
            class="json-input"
          ></textarea>
          <div class="template-buttons">
            <button class="template-btn" @click="applyMySqlMcpTemplate">应用MySQL MCP模板</button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="configForm.is_active">
            设为激活状态
          </label>
        </div>
        
        <div class="form-actions">
          <button class="cancel-btn" @click="cancelConfigForm">取消</button>
          <button class="save-btn" @click="saveConfigForm">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()

// MCP配置表单状态
const showNewConfigForm = ref(false)
const editingConfig = ref(null)
const configForm = reactive({
  name: '',
  description: '',
  config_json: '',
  is_active: false
})

function goBack() {
  router.back()
}

function updateFontSize(size) {
  settingsStore.fontSize = size
  saveSettings()
}

function saveSettings() {
  settingsStore.saveSettings()
  settingsStore.applyTheme()
}

// MCP配置相关方法
function activateConfig(id) {
  settingsStore.activateMcpConfig(id)
}

function editConfig(config) {
  editingConfig.value = config
  configForm.name = config.name
  configForm.description = config.description || ''
  
  // 处理config_json，确保它是字符串形式的JSON
  if (typeof config.config_json === 'string') {
    try {
      const parsedJson = JSON.parse(config.config_json)
      configForm.config_json = JSON.stringify(parsedJson, null, 2)
    } catch (e) {
      configForm.config_json = config.config_json
    }
  } else {
    configForm.config_json = JSON.stringify(config.config_json || {}, null, 2)
  }
  
  configForm.is_active = config.is_active
}

async function deleteConfig(id) {
  if (confirm('确定要删除此配置吗？')) {
    await settingsStore.deleteMcpConfig(id)
    await settingsStore.loadMcpConfigs()
  }
}

function cancelConfigForm() {
  showNewConfigForm.value = false
  editingConfig.value = null
  resetConfigForm()
}

async function saveConfigForm() {
  try {
    // 验证JSON格式
    let configJson = configForm.config_json
    if (typeof configJson === 'string') {
      configJson = JSON.parse(configJson)
    }
    
    const configData = {
      name: configForm.name,
      description: configForm.description,
      config_json: configJson,
      is_active: configForm.is_active
    }
    
    if (editingConfig.value) {
      // 更新配置
      await settingsStore.updateMcpConfig(editingConfig.value.id, configData)
    } else {
      // 创建新配置
      await settingsStore.createMcpConfig(configData)
    }
    
    // 关闭表单
    cancelConfigForm()
    // 新增：保存后刷新配置列表
    await settingsStore.loadMcpConfigs()
  } catch (e) {
    alert('配置JSON格式无效: ' + e.message)
  }
}

function resetConfigForm() {
  configForm.name = ''
  configForm.description = ''
  configForm.config_json = ''
  configForm.is_active = false
}

function applyMySqlMcpTemplate() {
  const mysqlMcpTemplate = {
    "MYSQL_HOST": "127.0.0.1",
    "MYSQL_PORT": "3306",
    "MYSQL_USER": "root",
    "MYSQL_PASS": "",
    "MYSQL_DB": ""
  };
  
  configForm.config_json = JSON.stringify(mysqlMcpTemplate, null, 2);
}

onMounted(async () => {
  // 加载MCP配置
  await settingsStore.loadMcpConfigs()
})
</script>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--padding);
}

.settings-header {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: var(--glass-border);
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: var(--glass-border);
  color: var(--text-primary);
  padding: 8px 16px;
  margin-right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.settings-header h1 {
  margin: 0;
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-heading);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.settings-section {
  background-color: var(--bg-glass);
  border: var(--glass-border);
  padding: 24px;
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}

.settings-section:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
}

.settings-section h2 {
  margin-top: 0;
  margin-bottom: 24px;
  font-size: var(--font-size-section);
  font-weight: var(--font-weight-subheading);
  color: var(--accent-blue);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.setting-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.setting-label {
  font-weight: var(--font-weight-subheading);
}

/* 主题切换按钮 */
.theme-toggle, .font-size-selector {
  display: flex;
  gap: 8px;
}

.theme-btn, .font-size-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: var(--glass-border);
  padding: 6px 12px;
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: all 0.3s ease;
}

.theme-btn.active, .font-size-btn.active {
  background-color: var(--accent-blue);
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

/* 开关样式 */
.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  transition: .4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 3px;
  background-color: var(--text-primary);
  transition: .4s;
}

input:checked + .toggle-slider {
  background-color: var(--accent-blue);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* 输入框样式 */
input[type="text"], input[type="password"], select, textarea {
  background-color: rgba(255, 255, 255, 0.05);
  border: var(--glass-border);
  color: var(--text-primary);
  padding: 8px 12px;
  width: 300px;
  max-width: 100%;
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

select {
  appearance: auto;
  background-color: var(--bg-glass);
  color: var(--text-primary);
}

select option {
  background-color: var(--bg-glass);
  color: var(--text-primary);
}

textarea {
  min-height: 80px;
  resize: vertical;
}

.json-input {
  font-family: monospace;
  min-height: 120px;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--accent-blue);
}

/* MCP配置列表样式 */
.mcp-config-list {
  margin-bottom: 16px;
}

.mcp-config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: var(--border-radius-glass);
  background-color: rgba(255, 255, 255, 0.05);
  border: var(--glass-border);
  transition: all 0.3s ease;
}

.mcp-config-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.mcp-config-item.active {
  background-color: var(--accent-blue);
  color: var(--text-primary);
}

.config-info {
  flex: 1;
}

.config-name {
  font-weight: var(--font-weight-subheading);
  margin-bottom: 4px;
}

.config-description {
  font-size: 14px;
  color: var(--text-secondary);
}

.config-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background-color: rgba(255, 255, 255, 0.1);
  border: var(--glass-border);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: var(--border-radius-glass);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.activate-btn {
  background-color: rgba(0, 255, 0, 0.1);
}

.edit-btn {
  background-color: rgba(0, 0, 255, 0.1);
}

.delete-btn {
  background-color: rgba(255, 0, 0, 0.1);
}

.add-config {
  margin-top: 16px;
  text-align: center;
}

/* 配置表单样式 */
.config-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}

.config-form {
  background-color: var(--bg-glass);
  border: var(--glass-border);
  padding: 24px;
  border-radius: var(--border-radius-glass);
  width: 500px;
  max-width: 90%;
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.config-form h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--accent-blue);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--font-weight-subheading);
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn, .save-btn {
  padding: 8px 16px;
  border-radius: var(--border-radius-glass);
  border: var(--glass-border);
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.save-btn {
  background-color: var(--accent-blue);
  color: var(--text-primary);
}

.cancel-btn:hover, .save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

/* 加载指示器样式 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--accent-blue);
  opacity: 0.7;
}

.loading-dots span:nth-child(1) {
  animation: pulse 1s infinite ease-in-out;
}

.loading-dots span:nth-child(2) {
  animation: pulse 1s infinite ease-in-out 0.2s;
}

.loading-dots span:nth-child(3) {
  animation: pulse 1s infinite ease-in-out 0.4s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.loading-text {
  margin-top: 8px;
  color: var(--text-secondary);
}

/* 错误信息样式 */
.error-message {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 16px 0;
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: var(--border-radius-glass);
  color: #d32f2f;
}

.error-icon {
  font-size: 20px;
  margin-right: 10px;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

/* 关于部分 */
.about-content {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  input[type="text"], input[type="password"], select, textarea {
    width: 100%;
  }
  
  .mcp-config-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .config-actions {
    margin-top: 12px;
    width: 100%;
    justify-content: flex-end;
  }
}

.api-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.save-api-btn {
  background-color: var(--accent-blue);
  color: var(--text-primary);
  border: var(--glass-border);
  padding: 8px 16px;
  border-radius: var(--border-radius-glass);
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-api-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.template-buttons {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.template-btn {
  background-color: rgba(0, 128, 255, 0.1);
  border: var(--glass-border);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: var(--border-radius-glass);
  font-size: 14px;
  transition: all 0.3s ease;
}

.template-btn:hover {
  background-color: rgba(0, 128, 255, 0.2);
  transform: translateY(-2px);
}

.active-tag {
  display: inline-block;
  background: #52c41a;
  color: #fff;
  font-size: 12px;
  border-radius: 8px;
  padding: 2px 8px;
  margin-left: 8px;
  vertical-align: middle;
}
</style> 