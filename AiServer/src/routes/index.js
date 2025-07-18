const express = require('express');
const chatRoutes = require('./chatRoutes');
const settingsRoutes = require('./settingsRoutes');
const mcpConfigRoutes = require('./mcpConfigRoutes');

const router = express.Router();

// 创建 v1 版本的路由
const v1Router = express.Router();

// 聊天路由
v1Router.use('/chat', chatRoutes);

// 设置路由
v1Router.use('/settings', settingsRoutes);

// MCP配置路由
v1Router.use('/mcp-configs', mcpConfigRoutes);

// 注册 v1 路由
router.use('/v1', v1Router);

// 健康检查路由
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI服务器运行正常' });
});

module.exports = router; 