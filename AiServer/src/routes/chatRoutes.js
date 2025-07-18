const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// SSE聊天消息处理
router.get('/sse', chatController.handleSSE);


// 获取聊天历史
router.get('/history/:userId', chatController.getChatHistory);

// 清除聊天历史
router.delete('/history/:userId', chatController.clearChatHistory);

// 获取数据库表列表
router.get('/tables', chatController.getTableList);

// 获取表结构
router.get('/tables/:tableName/schema', chatController.getTableSchema);

// AI分诊接口
router.post('/ai-triage', chatController.aiTriage);

module.exports = router; 