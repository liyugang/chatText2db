import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '../services/api'

export const useChatStore = defineStore('chat', () => {
  // 聊天会话列表
  const conversations = ref([
    { 
      id: '1', 
      title: '新对话', 
      date: new Date().toISOString(),
      messages: []
    }
  ])
  
  // 当前活跃的会话ID
  const activeConversationId = ref('1')
  
  // 是否正在加载
  const isLoading = ref(false)
  
  // 错误信息
  const error = ref(null)
  
  // 当前的EventSource实例
  const currentEventSource = ref(null)
  
  // 获取当前活跃的会话
  const activeConversation = computed(() => {
    return conversations.value.find(conv => conv.id === activeConversationId.value) || null
  })
  
  // 停止生成
  function stopGeneration() {
    // 关闭当前的EventSource连接
    if (currentEventSource.value && currentEventSource.value.readyState !== 2) { // 2 = CLOSED
      currentEventSource.value.close()
      currentEventSource.value = null
    }
    
    // 更新状态
    isLoading.value = false
    
    // 如果当前对话中有AI消息，添加一个标记表示生成被中断
    if (activeConversation.value && activeConversation.value.messages.length > 0) {
      const lastMessage = activeConversation.value.messages[activeConversation.value.messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        // 在消息末尾添加中断标记，如果消息为空则不添加
        if (lastMessage.content) {
          lastMessage.content += '\n\n[生成已中断]'
        } else {
          lastMessage.content = '[生成已中断]'
        }
        
        // 保存会话到本地存储
        saveConversations()
      }
    }
  }
  
  // 创建新会话
  function createConversation() {
    const newId = Date.now().toString()
    const newConversation = {
      id: newId,
      title: '新对话',
      date: new Date().toISOString(),
      messages: []
    }
    conversations.value.unshift(newConversation)
    activeConversationId.value = newId
    return newId
  }
  
  // 发送消息
  function sendMessage(content, useMcp = false) {
    if (!activeConversation.value) return
    
    // 用户消息
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    
    activeConversation.value.messages.push(userMessage)
    isLoading.value = true
    error.value = null
    
    let aiMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    }
    
    // 添加空的AI消息，稍后会更新内容
    activeConversation.value.messages.push(aiMessage)
    
    // 使用SSE接收流式响应，传递useMcp参数
    const eventSource = chatApi.sendChatMessage(content, activeConversation.value.id, useMcp)
    
    // 保存当前的EventSource实例，以便稍后可以停止它
    currentEventSource.value = eventSource
    
    // 处理SSE事件
    eventSource.addEventListener('init', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('聊天初始化:', data)
      } catch (err) {
        console.error('解析初始化数据失败:', err)
      }
    })
    
    eventSource.addEventListener('chunk', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('收到数据块:', data)
        
        // 确保aiMessage引用的是数组中的对象
        const currentAiMessage = activeConversation.value.messages.find(msg => msg.id === aiMessage.id)
        if (currentAiMessage) {
          // 直接更新数组中的对象
          currentAiMessage.content += data.text
          
          // 触发视图更新
          activeConversation.value.messages = [...activeConversation.value.messages]
        }
      } catch (err) {
        console.error('解析数据块失败:', err)
        error.value = '接收数据失败'
      }
    })
    
    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data)
        error.value = data.message || '未知错误'
      } catch (err) {
        console.error('解析错误数据失败:', err)
        error.value = '服务器错误'
      } finally {
        isLoading.value = false
        eventSource.close()
      }
    })
    
    eventSource.addEventListener('close', () => {
      isLoading.value = false
      eventSource.close()
      
      // 如果是第一条消息，更新对话标题
      if (activeConversation.value.messages.length === 2) {
        activeConversation.value.title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
      }
      
      // 保存会话到本地存储
      saveConversations()
    })
    
    eventSource.addEventListener('end', () => {
      isLoading.value = false
      eventSource.close()
      currentEventSource.value = null
      
      // 如果是第一条消息，更新对话标题
      if (activeConversation.value.messages.length === 2) {
        activeConversation.value.title = content.slice(0, 20) + (content.length > 20 ? '...' : '')
      }
      
      // 保存会话到本地存储
      saveConversations()
    })
    
    eventSource.addEventListener('done', () => {
      isLoading.value = false
      
      // 保存会话到本地存储
      saveConversations()
    })
    
    eventSource.onerror = (err) => {
      console.error('SSE连接错误:', err)
      error.value = '连接服务器失败'
      isLoading.value = false
      eventSource.close()
    }
  }
  
  // 删除会话
  function deleteConversation(id) {
    const index = conversations.value.findIndex(conv => conv.id === id)
    if (index !== -1) {
      conversations.value.splice(index, 1)
      
      // 如果删除的是当前活跃会话，则切换到第一个会话或创建新会话
      if (id === activeConversationId.value) {
        if (conversations.value.length > 0) {
          activeConversationId.value = conversations.value[0].id
        } else {
          createConversation()
        }
      }
      
      // 保存会话到本地存储
      saveConversations()
    }
  }
  
  // 清空会话消息
  function clearConversation(id) {
    const conversation = conversations.value.find(conv => conv.id === id)
    if (conversation) {
      conversation.messages = []
      conversation.title = '新对话'
      
      // 保存会话到本地存储
      saveConversations()
    }
  }
  
  // 加载会话历史
  async function loadChatHistory(sessionId) {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await chatApi.getChatHistory(sessionId)
      
      if (response.data && response.data.success) {
        const history = response.data.data
        
        // 找到对应的会话
        const conversation = conversations.value.find(conv => conv.id === sessionId)
        
        if (conversation) {
          // 转换历史记录格式，确保用户消息和AI回复都被添加
          const messages = [];
          
          history.forEach(msg => {
            // 添加用户消息
            if (msg.user_message) {
              messages.push({
                id: `${msg.id}-user`,
                role: 'user',
                content: msg.user_message,
                timestamp: msg.created_at
              });
            }
            
            // 添加AI回复
            if (msg.ai_response) {
              messages.push({
                id: `${msg.id}-assistant`,
                role: 'assistant',
                content: msg.ai_response,
                timestamp: msg.created_at
              });
            }
          });
          
          conversation.messages = messages;
        }
      }
    } catch (err) {
      console.error('加载聊天历史失败:', err)
      error.value = '加载聊天历史失败'
    } finally {
      isLoading.value = false
    }
  }
  
  // 保存会话到本地存储
  function saveConversations() {
    try {
      localStorage.setItem('chat-conversations', JSON.stringify(conversations.value))
    } catch (err) {
      console.error('保存会话失败:', err)
    }
  }
  
  // 从本地存储加载会话
  function loadConversations() {
    try {
      const saved = localStorage.getItem('chat-conversations')
      if (saved) {
        conversations.value = JSON.parse(saved)
        
        // 如果没有会话，创建一个新的
        if (conversations.value.length === 0) {
          createConversation()
        } else {
          activeConversationId.value = conversations.value[0].id
        }
      }
    } catch (err) {
      console.error('加载会话失败:', err)
    }
  }
  
  // 初始化
  function init() {
    loadConversations()
  }

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isLoading,
    error,
    createConversation,
    sendMessage,
    deleteConversation,
    clearConversation,
    loadChatHistory,
    stopGeneration,
    init
  }
}) 