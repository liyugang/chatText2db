import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://192.168.126.58:3009/api/v1',
  headers: {
    'Content-Type': 'application/json',
  }
});

export const chatApi = {
  /**
   * 发送聊天消息并获取SSE流式响应
   * @param {string} message - 用户消息
   * @param {string} sessionId - 会话ID
   * @param {boolean} useMcp - 是否使用MCP
   * @returns {EventSource} - SSE事件源
   */
  sendChatMessage(message, sessionId, useMcp = false) {
    // 创建GET请求参数
    const params = new URLSearchParams();
    params.append('message', message);
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    // 添加useMcp参数
    params.append('use_mcp', useMcp.toString());
    
    // 关闭任何可能存在的旧连接
    if (window.activeEventSource && window.activeEventSource.readyState !== EventSource.CLOSED) {
      window.activeEventSource.close();
    }
    
    // 创建EventSource（使用GET请求）
    const url = `${api.defaults.baseURL}/chat/sse`;
    const eventSource = new EventSource(`${url}?${params.toString()}`);
    
    // 保存当前的EventSource实例
    window.activeEventSource = eventSource;
    
    // 设置重连时间
    eventSource.reconnectInterval = 1000;
    
    // 添加通用错误处理
    eventSource.onerror = (err) => {
      console.error('SSE连接错误:', err);
      
      // 如果连接已关闭，不要尝试重新连接
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('SSE连接已关闭');
      }
    };
    
    return eventSource;
  },
  
  /**
   * 获取聊天历史
   * @param {string} sessionId - 会话ID
   * @returns {Promise} - 包含聊天历史的Promise
   */
  getChatHistory(sessionId) {
    return api.get(`/chat/history/${sessionId}`);
  },

  /**
   * AI分诊接口
   * @param {Object} params - 分诊参数
   * @param {Object} params.data - 表单数据
   * @param {number} params.flag - 标志位
   * @param {number} params.skip_check - 是否跳过检查
   * @returns {Promise} - 包含分诊结果的Promise
   */
  aiTriage(params) {
    return api.post('/chat/ai-triage', params);
  }
};

export const mcpConfigApi = {
  /**
   * 获取所有MCP配置
   * @returns {Promise} - 包含所有MCP配置的Promise
   */
  getAllConfigs() {
    return api.get('/mcp-configs');
  },
  
  /**
   * 获取当前激活的MCP配置
   * @returns {Promise} - 包含激活的MCP配置的Promise
   */
  getActiveConfig() {
    return api.get('/mcp-configs/active');
  },
  
  /**
   * 创建新的MCP配置
   * @param {Object} config - MCP配置对象
   * @returns {Promise} - 创建结果的Promise
   */
  createConfig(config) {
    return api.post('/mcp-configs', config);
  },
  
  /**
   * 更新MCP配置
   * @param {string} id - 配置ID
   * @param {Object} config - 更新的配置对象
   * @returns {Promise} - 更新结果的Promise
   */
  updateConfig(id, config) {
    return api.put(`/mcp-configs/${id}`, config);
  },
  
  /**
   * 激活MCP配置
   * @param {string} id - 配置ID
   * @returns {Promise} - 激活结果的Promise
   */
  activateConfig(id) {
    return api.post(`/mcp-configs/${id}/activate`);
  },
  
  /**
   * 删除MCP配置
   * @param {string} id - 配置ID
   * @returns {Promise} - 删除结果的Promise
   */
  deleteConfig(id) {
    return api.delete(`/mcp-configs/${id}`);
  },
  
  /**
   * 检查MCP服务是否可用
   * @returns {Promise} - 检查结果的Promise
   */
  checkAvailability() {
    return api.get('/mcp-configs/check-availability');
  }
};

export const settingsApi = {
  /**
   * 获取设置
   * @returns {Promise} - 包含设置的Promise
   */
  getSettings() {
    return api.get('/settings');
  },
  
  /**
   * 更新设置
   * @param {Object} settings - 设置对象
   * @returns {Promise} - 更新结果的Promise
   */
  updateSettings(settings) {
    return api.post('/settings', settings);
  }
};

export default api; 