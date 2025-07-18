// SSE（Server-Sent Events）工具函数

/**
 * 初始化SSE响应
 * @param {Object} res - Express响应对象
 */
function initSSE(res) {
  if (!res || res.headersSent) {
    console.warn('SSE初始化失败: 响应对象无效或头部已发送');
    return;
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
  res.flushHeaders(); // 立即发送头部
}

/**
 * 发送SSE消息
 * @param {Object} res - Express响应对象
 * @param {String} event - 事件名称
 * @param {Object} data - 要发送的数据
 */
function sendSSEMessage(res, event, data) {
  if (!res || res.finished) {
    console.warn('发送SSE消息失败: 响应已结束');
    return;
  }
  
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    // 确保数据被立即发送
    if (typeof res.flush === 'function') {
      res.flush(); // 确保数据被发送
    }
  } catch (error) {
    console.error('发送SSE消息失败:', error);
  }
}

/**
 * 发送SSE错误消息
 * @param {Object} res - Express响应对象
 * @param {String} message - 错误消息
 * @param {Number} code - 错误代码
 */
function sendSSEError(res, message, code = 500) {
  if (!res || res.finished) {
    console.warn('发送SSE错误消息失败: 响应已结束');
    return;
  }
  
  try {
    sendSSEMessage(res, 'error', { message, code });
  } catch (error) {
    console.error('发送SSE错误消息失败:', error);
  }
}

/**
 * 结束SSE连接
 * @param {Object} res - Express响应对象
 * @param {String} message - 结束消息
 */
function endSSE(res, message = 'Stream closed') {
  if (!res) {
    console.warn('结束SSE连接失败: 响应对象无效');
    return;
  }
  
  if (res.finished) {
    console.warn('结束SSE连接失败: 响应已结束');
    return;
  }
  
  try {
    sendSSEMessage(res, 'close', { message });
    res.end();
  } catch (error) {
    console.error('结束SSE连接失败:', error);
    try {
      res.end();
    } catch (endError) {
      console.error('强制结束响应失败:', endError);
    }
  }
}

/**
 * 模拟流式响应
 * @param {Object} res - Express响应对象
 * @param {String} text - 要流式发送的文本
 * @param {Number} delay - 每个字符的延迟（毫秒）
 */
async function streamText(res, text, delay = 10) {
  if (!res || res.finished) {
    console.warn('流式发送文本失败: 响应已结束');
    return;
  }
  
  if (!text) {
    console.warn('流式发送文本失败: 文本为空');
    sendSSEMessage(res, 'chunk', { text: '' });
    sendSSEMessage(res, 'done', { message: 'Stream completed' });
    return;
  }
  
  try {
    // 按单词分割，更自然的流式效果
    const chunks = text.split(' ');
    
    for (let i = 0; i < chunks.length; i++) {
      if (res.finished) {
        console.warn('流式发送文本中断: 响应已结束');
        return;
      }
      
      const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
      sendSSEMessage(res, 'chunk', { text: chunk });
      
      // 添加延迟以模拟流式传输
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 发送完成事件
    if (!res.finished) {
      sendSSEMessage(res, 'done', { message: 'Stream completed' });
    }
  } catch (error) {
    console.error('流式发送文本失败:', error);
    if (!res.finished) {
      sendSSEError(res, '流式发送文本失败', 500);
    }
  }
}

module.exports = {
  initSSE,
  sendSSEMessage,
  sendSSEError,
  endSSE,
  streamText
}; 