/**
 * MCP服务
 * 通过标准输入/输出与mcp-server-mysql对接
 */
const mcpModule = require('@benborla29/mcp-server-mysql');
const net = require('net');
const { EventEmitter } = require('events');

// 创建自定义事件发射器
const mcpEmitter = new EventEmitter();
let requestId = 1;
const pending = new Map();

// 设置环境变量
process.env.MYSQL_HOST = process.env.MYSQL_HOST || '192.168.126.247';
process.env.MYSQL_PORT = process.env.MYSQL_PORT || '3306';
process.env.MYSQL_USER = process.env.MYSQL_USER || 'root';
process.env.MYSQL_PASS = process.env.MYSQL_PASS || 'aimsn.cn';
process.env.MYSQL_DB = process.env.MYSQL_DB || 'aed_edu';
process.env.ALLOW_INSERT_OPERATION = process.env.ALLOW_INSERT_OPERATION || 'false';
process.env.ALLOW_UPDATE_OPERATION = process.env.ALLOW_UPDATE_OPERATION || 'false';
process.env.ALLOW_DELETE_OPERATION = process.env.ALLOW_DELETE_OPERATION || 'false';

/**
 * 解析mcpModule返回的结构
 * @param {any} result
 * @returns {any}
 */
function parseMcpResult(result) {
  // 判断是否为标准mcpModule结构
  if (result && Array.isArray(result.content) && result.content.length > 0 && typeof result.content[0].text === 'string') {
    const text = result.content[0].text;
    try {
      // 尝试解析为JSON
      return JSON.parse(text);
    } catch (e) {
      // 解析失败，返回原始字符串
      return text;
    }
  }
  // 不是标准结构，直接返回
  return result;
}

/**
 * 执行 SQL 查询
 * @param {string} sql SQL 查询语句
 * @returns {Promise<any>} 查询结果
 */
async function runQuery(sql) {
  try {
    const result = await mcpModule.executeReadOnlyQuery(sql);
    return parseMcpResult(result);
  } catch (error) {
    console.error('[SQL 查询错误]', error);
    throw error;
  }
}

/**
 * 获取数据库表列表
 * @returns {Promise<string[]>} 表名列表
 */
async function listTables() {
  try {
    const result = await mcpModule.executeReadOnlyQuery('SHOW TABLES');
    const parsed = parseMcpResult(result);
    // 提取表名列表
    return parsed.map(row => {
      // 获取第一个属性的值
      const firstKey = Object.keys(row)[0];
      return row[firstKey];
    });
  } catch (error) {
    console.error('[获取表列表错误]', error);
    throw error;
  }
}

/**
 * 获取表结构信息
 * @param {string} tableName 表名
 * @returns {Promise<any>} 表结构信息
 */
async function getTableSchema(tableName) {
  try {
    const result = await mcpModule.executeReadOnlyQuery(`DESCRIBE ${tableName}`);
    return parseMcpResult(result);
  } catch (error) {
    console.error(`[获取表 ${tableName} 结构错误]`, error);
    throw error;
  }
}

/**
 * 关闭 MCP 服务
 */
function closeMcpService() {
  // 由于模块没有提供关闭方法，这里不需要做任何事情
  console.log('[MCP 服务] 将在程序退出时自动关闭');
}

module.exports = {
  runQuery,
  listTables,
  getTableSchema,
  closeMcpService
}; 