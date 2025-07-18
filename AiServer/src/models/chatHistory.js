const { pool, memoryStore, executeQuery } = require('../config/db');

class ChatHistory {
  /**
   * 创建新的聊天记录
   * @param {Object} data - 聊天数据
   * @returns {Promise<Object>} - 创建的聊天记录
   */
  static async create(data) {
    try {
      const { userId, role, content, sessionId = '1', userMessage = null } = data;
      
      if (!pool) {
        const newChat = {
          id: memoryStore.nextChatId++,
          user_id: userId,
          session_id: sessionId,
          role,
          content,
          user_message: userMessage,
          created_at: new Date().toISOString()
        };
        memoryStore.chat_history.push(newChat);
        return newChat;
      }
      
      // 检查数据库表结构
      try {
        // 先尝试查询表结构
        const tableInfo = await executeQuery('SHOW COLUMNS FROM chat_history');
        const columns = {
          hasUserId: tableInfo.some(column => column.Field === 'user_id'),
          hasSessionId: tableInfo.some(column => column.Field === 'session_id'),
          hasRole: tableInfo.some(column => column.Field === 'role'),
          hasContent: tableInfo.some(column => column.Field === 'content'),
          hasUserMessage: tableInfo.some(column => column.Field === 'user_message')
        };
        
        // 检查所需列是否都存在
        if (!columns.hasUserId || !columns.hasRole || !columns.hasContent) {
          console.error('chat_history 表结构不完整，使用内存存储');
          // 使用内存存储作为备选
          const newChat = {
            id: memoryStore.nextChatId++,
            user_id: userId,
            session_id: sessionId,
            role,
            content,
            user_message: userMessage,
            created_at: new Date().toISOString()
          };
          memoryStore.chat_history.push(newChat);
          return newChat;
        }
        
        // 所有列都存在，执行插入
        let query, params;
        
        if (columns.hasSessionId && columns.hasUserMessage) {
          query = 'INSERT INTO chat_history (user_id, session_id, role, content, user_message) VALUES (?, ?, ?, ?, ?)';
          params = [userId, sessionId, role, content, userMessage];
        } else if (columns.hasSessionId) {
          query = 'INSERT INTO chat_history (user_id, session_id, role, content) VALUES (?, ?, ?, ?)';
          params = [userId, sessionId, role, content];
        } else if (columns.hasUserMessage) {
          query = 'INSERT INTO chat_history (user_id, role, content, user_message) VALUES (?, ?, ?, ?)';
          params = [userId, role, content, userMessage];
        } else {
          query = 'INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)';
          params = [userId, role, content];
        }
        
        const result = await executeQuery(query, params);
        return { id: result.insertId, ...data };
      } catch (error) {
        console.error('检查表结构失败，使用内存存储:', error);
        // 使用内存存储作为备选
        const newChat = {
          id: memoryStore.nextChatId++,
          user_id: userId,
          session_id: sessionId,
          role,
          content,
          user_message: userMessage,
          created_at: new Date().toISOString()
        };
        memoryStore.chat_history.push(newChat);
        return newChat;
      }
    } catch (error) {
      console.error('创建聊天记录失败:', error);
      // 出错时也使用内存存储
      try {
        const { userId, role, content, sessionId = '1', userMessage = null } = data;
        const newChat = {
          id: memoryStore.nextChatId++,
          user_id: userId,
          session_id: sessionId,
          role,
          content,
          user_message: userMessage,
          created_at: new Date().toISOString()
        };
        memoryStore.chat_history.push(newChat);
        return newChat;
      } catch (fallbackError) {
        console.error('备选内存存储也失败:', fallbackError);
        throw error; // 抛出原始错误
      }
    }
  }

  /**
   * 获取用户的聊天历史
   * @param {String} userId - 用户ID
   * @returns {Promise<Array>} - 聊天历史记录
   */
  static async find(query = {}) {
    try {
      const { userId } = query;
      
      if (!pool) {
        return memoryStore.chat_history
          .filter(chat => chat.user_id === userId)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }
      
      // 检查数据库表结构
      try {
        // 先尝试查询表结构
        const tableInfo = await executeQuery('SHOW COLUMNS FROM chat_history');
        const hasUserIdColumn = tableInfo.some(column => column.Field === 'user_id');
        
        if (hasUserIdColumn) {
          const rows = await executeQuery(
            'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
          );
          return rows;
        } else {
          console.error('chat_history 表中缺少 user_id 列');
          return [];
        }
      } catch (error) {
        console.error('查询表结构失败:', error);
        return [];
      }
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      if (query.userId) {
        return memoryStore.chat_history
          .filter(chat => chat.user_id === query.userId)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }
      return [];
    }
  }

  /**
   * 删除用户的所有聊天历史
   * @param {Object} query - 查询条件
   * @returns {Promise<Boolean>} - 是否成功
   */
  static async deleteMany(query = {}) {
    try {
      const { userId } = query;
      
      if (!pool) {
        const initialLength = memoryStore.chat_history.length;
        memoryStore.chat_history = memoryStore.chat_history.filter(chat => chat.user_id !== userId);
        return initialLength > memoryStore.chat_history.length;
      }
      
      const result = await executeQuery('DELETE FROM chat_history WHERE user_id = ?', [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除聊天历史失败:', error);
      throw error;
    }
  }
}

module.exports = ChatHistory; 