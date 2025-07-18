/**
 * MCP配置模型
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 配置文件路径
const configPath = path.join(process.cwd(), 'data', 'settings.json');

// 确保配置目录存在
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 确保配置文件存在
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({
    mcpConfigs: []
  }, null, 2));
}

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

class McpConfigModel {
  /**
   * 获取所有MCP配置
   * @returns {Promise<Array>} MCP配置列表
   */
  static async find(query = {}) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        settings.mcpConfigs = [];
        await this.saveSettings(settings);
      }
      
      // 如果没有查询条件，返回所有配置
      if (Object.keys(query).length === 0) {
        return settings.mcpConfigs;
      }
      
      // 根据查询条件过滤
      return settings.mcpConfigs.filter(config => {
        for (const key in query) {
          if (config[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    } catch (error) {
      console.error('获取MCP配置失败:', error);
      return [];
    }
  }
  
  /**
   * 根据ID获取MCP配置
   * @param {String} id 配置ID
   * @returns {Promise<Object|null>} MCP配置
   */
  static async findById(id) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        return null;
      }
      
      return settings.mcpConfigs.find(config => config.id === id) || null;
    } catch (error) {
      console.error('获取MCP配置失败:', error);
      return null;
    }
  }
  
  /**
   * 创建MCP配置
   * @param {Object} configData 配置数据
   * @returns {Promise<Object>} 创建的配置
   */
  static async create(configData) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        settings.mcpConfigs = [];
      }
      
      // 生成ID
      const id = Date.now().toString();
      
      // 创建新配置
      const newConfig = {
        id,
        ...configData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 添加到配置列表
      settings.mcpConfigs.push(newConfig);
      
      // 保存配置
      await this.saveSettings(settings);
      
      return newConfig;
    } catch (error) {
      console.error('创建MCP配置失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新MCP配置
   * @param {String} id 配置ID
   * @param {Object} configData 配置数据
   * @returns {Promise<Object|null>} 更新后的配置
   */
  static async findByIdAndUpdate(id, configData) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!settings.mcpConfigs) {
        settings.mcpConfigs = [];
      }
      // 查找配置
      const configIndex = settings.mcpConfigs.findIndex(config => config.id === id);
      if (configIndex === -1) {
        return null;
      }
      // 更新配置
      const updatedConfig = {
        ...settings.mcpConfigs[configIndex],
        ...configData,
        updated_at: new Date().toISOString()
      };
      settings.mcpConfigs[configIndex] = updatedConfig;
      // 保存配置
      await this.saveSettings(settings);
      // 只在active=true时写入.env
      if (updatedConfig.active === true) {
        updateEnvAndRestart(updatedConfig.config_json);
      }
      return updatedConfig;
    } catch (error) {
      console.error('更新MCP配置失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除MCP配置
   * @param {String} id 配置ID
   * @returns {Promise<Boolean>} 是否成功删除
   */
  static async findByIdAndDelete(id) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        return false;
      }
      
      // 查找配置
      const configIndex = settings.mcpConfigs.findIndex(config => config.id === id);
      
      if (configIndex === -1) {
        return false;
      }
      
      // 删除配置
      settings.mcpConfigs.splice(configIndex, 1);
      
      // 保存配置
      await this.saveSettings(settings);
      
      return true;
    } catch (error) {
      console.error('删除MCP配置失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取当前激活的MCP配置
   * @returns {Promise<Object|null>} 激活的配置
   */
  static async getActive() {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs || settings.mcpConfigs.length === 0) {
        return null;
      }
      
      // 查找激活的配置
      const activeConfig = settings.mcpConfigs.find(config => config.active);
      
      // 如果没有激活的配置，返回第一个配置
      return activeConfig || settings.mcpConfigs[0];
    } catch (error) {
      console.error('获取激活的MCP配置失败:', error);
      return null;
    }
  }
  
  /**
   * 激活MCP配置
   * @param {String} id 配置ID
   * @returns {Promise<Boolean>} 是否成功激活
   */
  static async activate(id) {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        return false;
      }
      
      // 取消所有配置的激活状态
      settings.mcpConfigs.forEach(config => {
        config.active = false;
      });
      
      // 查找配置
      const configIndex = settings.mcpConfigs.findIndex(config => config.id === id);
      
      if (configIndex === -1) {
        return false;
      }
      
      // 激活配置
      settings.mcpConfigs[configIndex].active = true;
      
      // 保存配置
      await this.saveSettings(settings);
      
      return true;
    } catch (error) {
      console.error('激活MCP配置失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取所有第三方MCP配置
   * @returns {Promise<Array>} 第三方MCP配置列表
   */
  static async getAllThirdPartyConfigs() {
    try {
      const settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!settings.mcpConfigs) {
        return [];
      }
      
      // 过滤出第三方配置
      return settings.mcpConfigs.filter(config => config.type !== 'mysql');
    } catch (error) {
      console.error('获取第三方MCP配置失败:', error);
      return [];
    }
  }
  
  /**
   * 保存设置
   * @param {Object} settings 设置对象
   * @returns {Promise<void>}
   */
  static async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      fs.writeFile(configPath, JSON.stringify(settings, null, 2), (err) => {
        if (err) {
          console.error('保存设置失败:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = McpConfigModel; 