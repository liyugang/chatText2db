const express = require('express');
const router = express.Router();
const mcpConfigController = require('../controllers/mcpConfigController');

// 获取所有MCP配置
router.get('/', mcpConfigController.getAllConfigs);

// 检查MCP服务可用性
router.get('/check-availability', mcpConfigController.checkAvailability);

// 获取激活的MCP配置
router.get('/active', mcpConfigController.getActiveConfig);

// MySQL MCP服务相关路由
router.get('/mysql/instances', mcpConfigController.getMySqlInstances);
router.delete('/mysql/instances/:id', mcpConfigController.stopMySqlInstance);

// 获取单个MCP配置
router.get('/:id', mcpConfigController.getConfigById);

// 创建MCP配置
router.post('/', mcpConfigController.createConfig);

// 更新MCP配置
router.put('/:id', mcpConfigController.updateConfig);

// 删除MCP配置
router.delete('/:id', mcpConfigController.deleteConfig);

// 激活MCP配置
router.post('/:id/activate', mcpConfigController.activateConfig);

module.exports = router; 