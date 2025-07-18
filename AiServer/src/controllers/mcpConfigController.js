/**
 * MCP配置控制器
 */

const McpConfigModel = require('../models/mcpConfig');
const McpService = require('../services/mcpService');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 工具函数：更新.env并重启服务
function updateEnvAndRestart(configJson) {
  let configObj = configJson;
  if (typeof configJson === 'string') {
    try {
      configObj = JSON.parse(configJson);
    } catch (e) {
      return;
    }
  }
  if (!configObj || typeof configObj !== 'object') return;
  // 只处理MYSQL_相关key
  const envUpdates = Object.entries(configObj)
    .filter(([k]) => k.startsWith('MYSQL_'));
  if (envUpdates.length === 0) return;
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  const envLines = envContent.split(/\r?\n/);
  const envMap = {};
  envLines.forEach(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) envMap[m[1]] = m[2];
  });
  // 覆盖MYSQL_相关key
  envUpdates.forEach(([k, v]) => {
    envMap[k] = v;
  });
  // 重新拼接env内容
  const newEnvContent = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.writeFileSync(envPath, newEnvContent, 'utf-8');
  // pm2重启当前进程
  const pm_id = process.env.pm_id || process.env.pm_id || process.env.PM2_ID || process.env.pm_id;
  const pm2RestartCmd = pm_id ? `pm2 restart ${pm_id}` : 'pm2 restart all';
  exec(pm2RestartCmd, (err, stdout, stderr) => {
    if (err) {
      console.error('pm2重启失败:', err, stderr);
    } else {
      console.log('pm2重启成功:', stdout);
    }
  });
}

class McpConfigController {
  /**
   * 获取所有MCP配置
   */
  static async getAllConfigs(req, res) {
    try {
      const configs = await McpConfigModel.find();
      res.json({
        status: 'success',
        data: configs
      });
    } catch (error) {
      console.error('获取MCP配置失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取当前激活的MCP配置
   */
  static async getActiveConfig(req, res) {
    try {
      const activeConfig = await McpConfigModel.getActive();
      
      if (!activeConfig) {
        return res.status(404).json({
          status: 'error',
          message: '未找到激活的MCP配置'
        });
      }
      
      res.json({
        status: 'success',
        data: activeConfig
      });
    } catch (error) {
      console.error('获取激活的MCP配置失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取激活的MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取指定ID的MCP配置
   */
  static async getConfigById(req, res) {
    try {
      const { id } = req.params;
      const config = await McpConfigModel.findById(id);
      
      if (!config) {
        return res.status(404).json({
          status: 'error',
          message: `未找到ID为${id}的MCP配置`
        });
      }
      
      res.json({
        status: 'success',
        data: config
      });
    } catch (error) {
      console.error(`获取ID为${req.params.id}的MCP配置失败:`, error);
      res.status(500).json({
        status: 'error',
        message: '获取MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 创建MCP配置
   */
  static async createConfig(req, res) {
    try {
      const { name, description, config_json } = req.body;
      
      // 验证必要字段
      if (!name) {
        return res.status(400).json({
          status: 'error',
          message: '名称和类型为必填项'
        });
      }
      
      // 创建配置
      const newConfig = await McpConfigModel.create({
        name,
        description,
        config_json: typeof config_json === 'string' ? config_json : JSON.stringify(config_json),
        active: false
      });
      
      // 新增：写入.env并重启
      updateEnvAndRestart(config_json);
      
      res.status(201).json({
        status: 'success',
        message: 'MCP配置创建成功',
        data: newConfig
      });
    } catch (error) {
      console.error('创建MCP配置失败:', error);
      res.status(500).json({
        status: 'error',
        message: '创建MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 更新MCP配置
   */
  static async updateConfig(req, res) {
    try {
      const { id } = req.params;
      const { name, description, type, config_json, active } = req.body;
      
      // 检查配置是否存在
      const existingConfig = await McpConfigModel.findById(id);
      if (!existingConfig) {
        return res.status(404).json({
          status: 'error',
          message: `未找到ID为${id}的MCP配置`
        });
      }
      
      // 更新配置
      const updatedConfig = await McpConfigModel.findByIdAndUpdate(id, {
        name,
        description,
        type,
        config_json: config_json ? (typeof config_json === 'string' ? config_json : JSON.stringify(config_json)) : undefined,
        active
      });
      
      // 新增：写入.env并重启
      updateEnvAndRestart(config_json);
      
      res.json({
        status: 'success',
        message: 'MCP配置更新成功',
        data: updatedConfig
      });
    } catch (error) {
      console.error(`更新ID为${req.params.id}的MCP配置失败:`, error);
      res.status(500).json({
        status: 'error',
        message: '更新MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 删除MCP配置
   */
  static async deleteConfig(req, res) {
    try {
      const { id } = req.params;
      
      // 检查配置是否存在
      const existingConfig = await McpConfigModel.findById(id);
      if (!existingConfig) {
        return res.status(404).json({
          status: 'error',
          message: `未找到ID为${id}的MCP配置`
        });
      }
      
      // 删除配置
      const result = await McpConfigModel.findByIdAndDelete(id);
      
      if (!result) {
        return res.status(500).json({
          status: 'error',
          message: '删除MCP配置失败'
        });
      }
      
      res.json({
        status: 'success',
        message: 'MCP配置删除成功'
      });
    } catch (error) {
      console.error(`删除ID为${req.params.id}的MCP配置失败:`, error);
      res.status(500).json({
        status: 'error',
        message: '删除MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 激活MCP配置
   */
  static async activateConfig(req, res) {
    try {
      const { id } = req.params;
      
      // 检查配置是否存在
      const existingConfig = await McpConfigModel.findById(id);
      if (!existingConfig) {
        return res.status(404).json({
          status: 'error',
          message: `未找到ID为${id}的MCP配置`
        });
      }
      
      // 激活配置
      const result = await McpConfigModel.activate(id);

      // 更新.env并重启服务
      updateEnvAndRestart(existingConfig.config_json);
      
      if (!result) {
        return res.status(500).json({
          status: 'error',
          message: '激活MCP配置失败'
        });
      }
      
      res.json({
        status: 'success',
        message: 'MCP配置激活成功'
      });
    } catch (error) {
      console.error(`激活ID为${req.params.id}的MCP配置失败:`, error);
      res.status(500).json({
        status: 'error',
        message: '激活MCP配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 检查MCP服务可用性
   */
  static async checkAvailability(req, res) {
    try {
      const result = await McpService.checkAvailability();
      
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('检查MCP服务可用性失败:', error);
      res.status(500).json({
        status: 'error',
        message: '检查MCP服务可用性失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取所有MySQL MCP实例
   */
  static async getMySqlInstances(req, res) {
    try {
      const instances = await McpService.getMySqlMcpInstances();
      
      res.json({
        status: 'success',
        data: instances
      });
    } catch (error) {
      console.error('获取MySQL MCP实例失败:', error);
      res.status(500).json({
        status: 'error',
        message: '获取MySQL MCP实例失败',
        error: error.message
      });
    }
  }
  
  /**
   * 停止指定的MySQL MCP实例
   */
  static async stopMySqlInstance(req, res) {
    try {
      const { id } = req.params;
      
      const result = await McpService.stopMySqlMcpInstance(id);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: `未找到ID为${id}的MySQL MCP实例或停止失败`
        });
      }
      
      res.json({
        status: 'success',
        message: 'MySQL MCP实例已停止'
      });
    } catch (error) {
      console.error(`停止ID为${req.params.id}的MySQL MCP实例失败:`, error);
      res.status(500).json({
        status: 'error',
        message: '停止MySQL MCP实例失败',
        error: error.message
      });
    }
  }
}

module.exports = McpConfigController; 