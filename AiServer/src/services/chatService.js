/**
 * 聊天服务
 * 提供与各种AI API的集成
 */
const axios = require('axios');
const { sendSSEMessage, streamText } = require('../utils/sseUtils');
const settings = require('../../data/settings.json');

class ChatService {
  /**
   * 发送消息到第三方API
   * @param {String} message - 用户消息
   * @param {Object} settings - 设置
   * @param {Object} res - Express响应对象，用于SSE
   * @returns {Promise<String>} - 处理结果
   */
  static async sendToThirdPartyAPI(message, res) {
    try {
      // 创建API客户端
      const apiClient = axios.create({
        baseURL: settings.thirdPartyApiEndpoint,
        headers: {
          'Authorization': `Bearer ${settings.thirdPartyApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 是否使用流式返回
      const isStreaming = !!res;
      
      // 准备请求体
      const requestBody = {
        model: settings.thirdPartyApiModel || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: isStreaming // 启用流式返回
      };
      
      if (isStreaming) {
        // 流式处理
        const responseStream = await apiClient.post('/chat/completions', requestBody, { 
          responseType: 'stream' 
        });
        
        let fullResponse = '';
        
        responseStream.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsedData = JSON.parse(data);
                  if (parsedData.choices && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                    const content = parsedData.choices[0].delta.content;
                    fullResponse += content;
                    sendSSEMessage(res, 'chunk', { text: content });
                  }
                } catch (e) {
                  console.error('解析流式数据失败:', e);
                }
              }
            }
          } catch (e) {
            console.error('处理流式数据失败:', e);
          }
        });
        
        await new Promise((resolve) => {
          responseStream.data.on('end', resolve);
        });
        
        return fullResponse;
      } else {
        // 非流式处理
        const response = await apiClient.post('/chat/completions', requestBody);
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.error('使用第三方API失败:', error);
      throw new Error(`第三方API请求失败: ${error.message || '未知错误'}`);
    }
  }
  
}

module.exports = ChatService; 