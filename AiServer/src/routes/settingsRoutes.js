const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 数据目录
const dataDir = path.join(__dirname, '..', '..', 'data');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 设置文件路径
const settingsPath = path.join(dataDir, 'settings.json');

// 获取设置
router.get('/', (req, res) => {
  try {
    // 如果文件不存在，返回默认设置
    if (!fs.existsSync(settingsPath)) {
      return res.json({
        success: true,
        data: {
          useThirdPartyApi: false,
          thirdPartyApiKey: '',
          thirdPartyApiEndpoint: '',
          thirdPartyApiModel: 'deepseek-chat'
        }
      });
    }
    
    // 读取设置文件
    const settingsData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(settingsData);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败',
      error: error.message || '未知错误'
    });
  }
});

// 更新设置
router.post('/', (req, res) => {
  try {
    const settings = req.body;
    
    // 验证设置
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: '设置数据不能为空'
      });
    }
    
    // 保存设置到文件
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    res.json({
      success: true,
      message: '设置已更新'
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新设置失败',
      error: error.message || '未知错误'
    });
  }
});

module.exports = router; 