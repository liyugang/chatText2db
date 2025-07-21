<template>
  <div class="chat-container">
    <!-- 第三方API未设置提示 -->
    <div v-if="showApiSettingsAlert" class="api-settings-alert">
      <span>请先在“设置”中配置第三方API，否则无法正常使用聊天功能。</span>
      <button @click="goToSettings">去设置</button>
    </div>
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="createNewChat">
          <span class="icon">+</span> <span v-if="!sidebarCollapsed">新对话</span>
        </button>
        <button class="toggle-sidebar-btn" @click="toggleSidebar">
          {{ sidebarCollapsed ? '›' : '‹' }}
        </button>
      </div>
      
      <div class="conversations-list" v-if="!sidebarCollapsed">
        <div 
          v-for="conversation in chatStore.conversations" 
          :key="conversation.id"
          class="conversation-item"
          :class="{ 'active': conversation.id === chatStore.activeConversationId }"
          @click="selectConversation(conversation.id)"
        >
          <div class="conversation-title">{{ conversation.title }}</div>
          <div class="conversation-actions">
            <button class="action-btn" @click.stop="deleteConversation(conversation.id)">
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="sidebar-footer" v-if="!sidebarCollapsed">
        <button class="settings-btn" @click="goToSettings">
          <span class="icon">⚙️</span> 设置
        </button>
      </div>
    </div>
    
    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-header">
        <h2>{{ currentConversationTitle }}</h2>
        <button class="clear-btn" @click="clearCurrentConversation">
          <span class="icon">🧹</span> 清空对话
        </button>
      </div>
      
      <div class="messages-container" ref="messagesContainer">
        <div v-if="!hasMessages" class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>开始新的对话</h3>
          <p>输入您的问题，AI助手将为您提供回答</p>
        </div>
        
        <template v-else>
          <div 
            v-for="message in currentMessages" 
            :key="message.id"
            class="message"
            :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
          >
            <template v-if="message.role === 'user'">
              <div class="message-content">
                <div class="message-text" v-html="formatMessage(message.content)"></div>
                <div class="message-time" v-if="settingsStore.showTimestamp">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
              <div class="message-avatar">
                {{ message.role === 'user' ? '👤' : '🤖' }}
              </div>
            </template>
            <template v-else>
              <div class="message-avatar">
                {{ message.role === 'user' ? '👤' : '🤖' }}
              </div>
              <div class="message-content">
                <!-- 工具调用结果显示 -->
                <div v-if="isToolCallResult(message.content)" class="tool-call-result">
                  <div class="tool-call-header">
                    <span class="tool-icon">🛠️</span>
                    <span class="tool-title">工具调用结果</span>
                  </div>
                  <div class="tool-call-content">
                    <div v-for="(call, index) in parseToolCallResult(message.content)" :key="index" class="tool-item">
                      <div class="tool-name">{{ call.name }}</div>
                      <div class="tool-params">
                        <pre>{{ JSON.stringify(call.parameters, null, 2) }}</pre>
                      </div>
                      <div class="tool-result" :class="{ 'tool-success': call.result && call.result.status === 'success', 'tool-error': call.result && call.result.status === 'error' }">
                        <div v-if="call.result && call.result.status === 'success'" class="result-content">
                          <pre>{{ JSON.stringify(call.result.result, null, 2) }}</pre>
                        </div>
                        <div v-else-if="call.result && call.result.status === 'error'" class="error-content">
                          <span class="error-icon">⚠️</span>
                          <span>{{ call.result.error }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 普通消息显示 -->
                <div 
                  v-else
                  class="message-text" 
                  :class="{ 'typing-effect': isLatestAiMessage(message) && chatStore.isLoading }"
                  v-html="formatMessage(message.content)"
                ></div>
                <div class="message-time" v-if="settingsStore.showTimestamp">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
            </template>
          </div>
        </template>
        
        <!-- 加载状态 -->
        <div v-if="chatStore.isLoading" class="loading-indicator">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="loading-text">AI正在思考...</div>
        </div>
        
        <!-- 错误信息 -->
        <div v-if="chatStore.error" class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-text">{{ chatStore.error }}</div>
        </div>
      </div>
      
      <!-- MCP开关 -->
      <div class="mcp-toggle-container">
        <div class="mcp-toggle-wrapper">
          <span class="mcp-toggle-label">MCP</span>
          <label class="mcp-toggle">
            <input 
              type="checkbox" 
              v-model="mcpEnabled"
              @change="toggleMcp"
            >
            <span class="mcp-toggle-slider"></span>
          </label>
          <span class="mcp-status">{{ mcpEnabled ? '已启用' : '已禁用' }}</span>
        </div>
        <div class="mcp-config-selector" v-if="mcpEnabled && settingsStore.mcpConfigs.length > 0">
          <select v-model="selectedMcpConfig" @change="changeMcpConfig">
            <option 
              v-for="config in settingsStore.mcpConfigs" 
              :key="config.id" 
              :value="config.id"
            >
              {{ config.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="input-container">
        <textarea 
          ref="inputField"
          v-model="userInput" 
          placeholder="输入您的问题..."
          @keydown.enter.prevent="handleEnterKey"
          @input="adjustTextareaHeight"
          rows="1"
        ></textarea>
        <button 
          v-if="chatStore.isLoading" 
          class="stop-btn" 
          @click="stopGeneration"
        >
          停止
        </button>
        <button 
          v-else
          class="send-btn" 
          @click="sendMessage" 
          :disabled="!userInput.trim() || chatStore.isLoading"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()

// 响应式状态
const userInput = ref('')
const messagesContainer = ref(null)
const inputField = ref(null)
const sidebarCollapsed = ref(false)
const mcpEnabled = ref(false)
const selectedMcpConfig = ref(null)

// 新增：第三方API未设置提示
const showApiSettingsAlert = computed(() => {
  return !settingsStore.thirdPartyApiKey && !settingsStore.thirdPartyApiEndpoint && !settingsStore.thirdPartyApiModel
})

// 计算属性
const currentConversationTitle = computed(() => {
  return chatStore.activeConversation?.title || '新对话'
})

let currentMessages = computed(() => {
  return chatStore.activeConversation?.messages || []
})

const hasMessages = computed(() => {
  return currentMessages.value.length > 0
})

// 方法
function createNewChat() {
  const newChatId = chatStore.createConversation()
  router.push({ name: 'Chat', params: { id: newChatId } })
}

function selectConversation(id) {
  chatStore.activeConversationId = id
  router.push({ name: 'Chat', params: { id } })
}

function deleteConversation(id) {
  chatStore.deleteConversation(id)
}

function clearCurrentConversation() {
  if (chatStore.activeConversationId) {
    chatStore.clearConversation(chatStore.activeConversationId)
  }
}

function sendMessage() {
  const trimmedInput = userInput.value.trim()
  if (!trimmedInput || chatStore.isLoading) return
  
  chatStore.sendMessage(trimmedInput, mcpEnabled.value)
  userInput.value = ''
  
  // 自动调整输入框高度
  nextTick(() => {
    if (inputField.value) {
      inputField.value.style.height = 'auto'
    }
  })
  
  // 滚动到底部
  scrollToBottom()
}

function handleEnterKey(e) {
  if (e.shiftKey) {
    // Shift+Enter 插入换行符
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const value = e.target.value;
    userInput.value = value.substring(0, start) + '\n' + value.substring(end);
    
    // 下一个事件循环中设置光标位置
    nextTick(() => {
      e.target.selectionStart = e.target.selectionEnd = start + 1;
      adjustTextareaHeight();
    });
  } else if (!e.shiftKey) {
    // 普通Enter键发送消息
    sendMessage();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}

function formatMessage(content) {
  // 使用marked将Markdown转换为HTML
  const html = marked(content || '')
  
  // 使用DOMPurify清理HTML，防止XSS攻击
  return DOMPurify.sanitize(html)
}

// 为流式消息添加打字效果
function isLatestAiMessage(message) {
  if (!chatStore.activeConversation || !message || message.role !== 'assistant') return false
  
  const messages = chatStore.activeConversation.messages
  if (messages.length === 0) return false
  
  // 找到最后一条消息
  const lastMessage = messages[messages.length - 1]
  
  // 如果最后一条消息是AI消息，且当前消息就是这条消息
  return lastMessage.role === 'assistant' && lastMessage.id === message.id
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function goToSettings() {
  router.push({ name: 'Settings' })
}

// MCP相关方法
function toggleMcp() {
  // 新增：无MCP配置时提示并关闭开关
  if (mcpEnabled.value && settingsStore.mcpConfigs.length === 0) {
    window.alert('请先在“设置”中添加MCP配置！')
    mcpEnabled.value = false
    return
  }
  if (mcpEnabled.value && settingsStore.mcpConfigs.length > 0) {
    // 如果启用MCP且有配置，选择当前激活的配置或第一个配置
    selectedMcpConfig.value = settingsStore.activeMcpConfigId || settingsStore.mcpConfigs[0].id
    if (selectedMcpConfig.value) {
      settingsStore.activateMcpConfig(selectedMcpConfig.value)
    }
  } else if (!mcpEnabled.value) {
    // 如果禁用MCP，取消激活当前配置
    settingsStore.activateMcpConfig(null)
  }
}

function changeMcpConfig() {
  if (selectedMcpConfig.value) {
    settingsStore.activateMcpConfig(selectedMcpConfig.value)
  }
}

// 自动调整输入框高度
function adjustTextareaHeight() {
  if (!inputField.value) return
  
  inputField.value.style.height = 'auto'
  inputField.value.style.height = `${inputField.value.scrollHeight}px`
}

// 检查消息内容是否为工具调用结果
function isToolCallResult(content) {
  if (!content) return false;
  
  try {
    const data = JSON.parse(content);
    return data && data.type === 'tool_calls' && Array.isArray(data.calls);
  } catch (e) {
    return false;
  }
}

// 解析工具调用结果
function parseToolCallResult(content) {
  try {
    const data = JSON.parse(content);
    if (data && data.type === 'tool_calls' && Array.isArray(data.calls)) {
      return data.calls;
    }
    return [];
  } catch (e) {
    console.error('解析工具调用结果失败:', e);
    return [];
  }
}

// 停止生成
function stopGeneration() {
  chatStore.stopGeneration()
}

// 监听路由变化，更新当前会话
watch(() => route.params.id, (newId) => {
  if (newId) {
    chatStore.activeConversationId = newId
    
    // 尝试加载会话历史
    chatStore.loadChatHistory(newId)
  }
}, { immediate: true })

// 监听消息变化，滚动到底部
watch(currentMessages, () => {
  console.log('消息已更新，滚动到底部')
  scrollToBottom()
}, { deep: true })

// 单独监听最后一条消息的内容变化
watch(() => {
  if (chatStore.activeConversation?.messages?.length > 0) {
    const lastMsg = chatStore.activeConversation.messages[chatStore.activeConversation.messages.length - 1]
    return lastMsg ? lastMsg.content : null
  }
  return null
}, () => {
  console.log('最后一条消息内容已更新，滚动到底部')
  scrollToBottom()
})

// 监听用户输入，自动调整输入框高度
watch(userInput, () => {
  nextTick(adjustTextareaHeight)
})

// 监听MCP配置变化
watch(() => settingsStore.activeMcpConfigId, (newId) => {
  mcpEnabled.value = !!newId
  selectedMcpConfig.value = newId
}, { immediate: true })

onMounted(async () => {
  // 初始化聊天store
  chatStore.init()
  
  // 加载MCP配置
  await settingsStore.loadMcpConfigs()
  
  // 设置初始MCP状态
  mcpEnabled.value = !!settingsStore.activeMcpConfigId
  selectedMcpConfig.value = settingsStore.activeMcpConfigId
  
  // 如果URL中有ID参数，设置当前会话
  if (route.params.id) {
    chatStore.activeConversationId = route.params.id
    
    // 尝试加载会话历史
    chatStore.loadChatHistory(route.params.id)
  }
  
  // 自动聚焦输入框
  if (inputField.value) {
    inputField.value.focus()
  }
  
  // 初始化输入框高度
  adjustTextareaHeight()
})
</script>

<style scoped>
:root {
  --accent-red: #e53935;
}

.chat-container {
  display: flex;
  height: calc(100vh - 70px);
  overflow: hidden;
}

/* 第三方API未设置提示 */
.api-settings-alert {
  background: #fffbe6;
  color: #ad8b00;
  border: 1px solid #ffe58f;
  padding: 12px 20px;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.08);
}
.api-settings-alert button {
  background: #ffe58f;
  color: #ad8b00;
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  margin-left: 16px;
  cursor: pointer;
  font-size: 14px;
}

/* 侧边栏样式 */
.sidebar {
  width: 260px;
  background-color: rgba(0, 0, 0, 0.03);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  z-index: 5;
}

.sidebar-collapsed {
  width: 90px;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.new-chat-btn {
  flex: 1;
  background-color: var(--accent-blue);
  color: white;
  border: none;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 18px;
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 20px;
  padding: 0 8px;
  margin-left: 8px;
  cursor: pointer;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: var(--border-radius-glass);
  cursor: pointer;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.conversation-item:hover {
  background-color: var(--bg-glass-hover);
  transform: translateY(-2px);
}

.conversation-item.active {
  background-color: var(--accent-blue);
  color: var(--text-primary);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.conversation-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  padding: 2px;
  cursor: pointer;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.settings-btn {
  width: 100%;
  background: none;
  border: 1px solid var(--text-primary);
  color: var(--text-primary);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.01);
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.03);
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
}

.clear-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 16px;
  font-size: 14px;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.02);
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.7;
}

.message {
  display: flex;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease-in-out;
  width: 100%;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 12px;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.user-message .message-avatar {
  margin-right: 0;
  margin-left: 12px;
  background-color: rgba(0, 128, 255, 0.1);
}

.message-content {
  flex: 0 1 auto;
  max-width: 70%;
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.user-message {
  justify-content: flex-end;
}

.ai-message {
  justify-content: flex-start;
}

.user-message .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-text {
  line-height: 2.5;
  white-space: normal;
  font-size: 15px;
}

.user-message .message-text {
  text-align: right;
}

/* 添加Markdown样式 */
.message-text :deep(pre) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  text-align: left;
  margin: 8px 0;
  font-size: 14px;
}

.message-text :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(ul), .message-text :deep(ol) {
  padding-left: 20px;
  text-align: left;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  display: block;
  overflow-x: auto;
  max-width: 100%;
  white-space: nowrap;
}

.message-text :deep(th), .message-text :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px;
  text-align: left;
}

.message-time {
  font-size: 12px;
  color: var(--text-dimmed);
  margin-top: 4px;
}

.user-message .message-content {
  background-color: rgba(0, 128, 255, 0.15);
  border: 1px solid rgba(0, 128, 255, 0.2);
}

.ai-message .message-content {
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* MCP开关样式 */
.mcp-toggle-container {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(0, 0, 0, 0.05);
}

.mcp-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mcp-toggle-label {
  font-weight: var(--font-weight-subheading);
  color: var(--accent-blue);
  font-size: 14px;
}

.mcp-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 18px;
}

.mcp-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.mcp-toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  transition: .3s;
  border-radius: 20px;
}

.mcp-toggle-slider:before {
  position: absolute;
  content: "";
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-primary);
  transition: .3s;
  border-radius: 50%;
}

input:checked + .mcp-toggle-slider {
  background-color: var(--accent-blue);
}

input:checked + .mcp-toggle-slider:before {
  transform: translateX(18px);
}

.mcp-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.mcp-config-selector select {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  transition: background 0.2s, border 0.2s;
}

.mcp-config-selector select:focus {
  border-color: var(--accent-blue);
  background-color: var(--bg-glass);
}

/* 输入区域样式 */
.input-container {
  padding: 11px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background-color: rgba(0, 0, 0, 0.03);
}

textarea {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  padding: 12px 16px;
  resize: none;
  min-height: 24px;
  max-height: 200px;
  border-radius: 18px;
  font-family: var(--font-family);
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: border-color 0.3s, box-shadow 0.3s;
}

textarea:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 2px 8px rgba(0, 128, 255, 0.1);
}

.send-btn {
  background-color: var(--accent-blue);
  color: white;
  border: none;
  padding: 8px 16px;
  height: 40px;
  border-radius: 18px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background-color: var(--accent-red);
  color: white;
  border: none;
  padding: 8px 16px;
  height: 40px;
  border-radius: 18px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.stop-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.stop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载指示器样式 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
  animation: fadeIn 0.3s ease-in-out;
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
  font-size: 14px;
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

.error-text {
  font-size: 14px;
}

/* 打字效果 */
.typing-effect::after {
  content: '▌';
  display: inline-block;
  animation: blink 0.7s infinite;
  vertical-align: middle;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

/* 工具调用结果样式 */
.tool-call-result {
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tool-call-header {
  background-color: #f0f0f0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.tool-icon {
  margin-right: 8px;
  font-size: 16px;
}

.tool-title {
  font-weight: 600;
  font-size: 14px;
}

.tool-call-content {
  padding: 12px;
}

.tool-item {
  margin-bottom: 12px;
}

.tool-item:last-child {
  margin-bottom: 0;
}

.tool-name {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--accent-blue);
}

.tool-params {
  background-color: rgba(0, 0, 0, 0.03);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-family: monospace;
  font-size: 12px;
}

.tool-result {
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.tool-success {
  background-color: rgba(0, 128, 0, 0.1);
  border-left: 3px solid green;
}

.tool-error {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid red;
}

.result-content, .error-content {
  white-space: pre-wrap;
  word-break: break-all;
}

.error-icon {
  margin-right: 6px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
  }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 80vw;
    max-width: 320px;
    z-index: 100;
    background: #fff;
    transform: translateX(-100%);
    transition: transform 0.3s;
    box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  }
  .sidebar-collapsed {
    transform: translateX(0);
  }
  .main-content {
    flex: 1;
    width: 100vw;
    min-width: 0;
    padding: 0;
    overflow-x: hidden;
  }
  .chat-header {
    padding: 12px 8px;
    font-size: 16px;
  }
  .messages-container {
    padding: 12px 4px;
    padding-bottom: 130px; /* 留出底部空间，避免被MCP和输入区遮挡 */
  }
  .message-content {
    max-width: 80vw;
    font-size: 14px;
    padding: 8px 10px;
  }
  .message-avatar {
    width: 28px;
    height: 28px;
    font-size: 14px;
    margin-right: 6px;
    margin-left: 6px;
  }
  .input-container {
    padding: 8px 4px 12px 4px;
    gap: 6px;
    border-radius: 0 0 12px 12px;
    background: #171b1f;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 102;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
  }
  .mcp-toggle-container {
    padding: 6px 4px;
    font-size: 13px;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 4px;
    background: #171b1f;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 60px; /* 输入区高度+margin */
    z-index: 101;
    box-shadow: 0 -1px 6px rgba(0,0,0,0.04);
  }
  .mcp-config-selector select {
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 8px;
  }
  .empty-state {
    font-size: 15px;
    padding: 30px 0;
  }
  .message-text {
    font-size: 14px;
    word-break: break-all;
    overflow-x: auto;
  }
  .message-text :deep(table),
  .message-text :deep(pre),
  .message-text :deep(code) {
    font-size: 13px;
    max-width: 88vw;
    overflow-x: auto;
    display: block;
  }
  .tool-call-result {
    font-size: 13px;
    padding: 4px;
    overflow-x: auto;
  }
  .sidebar-footer, .sidebar-header {
    padding: 10px 8px;
  }
  .conversations-list {
    padding: 4px;
  }
}
</style> 