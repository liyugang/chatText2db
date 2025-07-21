const ChatHistory = require('../models/chatHistory');
const { sendSSEMessage } = require('../utils/sseUtils');
const mcpService = require('../services/mcpService');
const chatService = require('../services/chatService');

/**
 * 处理SSE聊天消息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function handleSSE(req, res) {
  try {
    const message = req.query.message;
    const sessionId = req.query.session_id || '1';
    const useMcp = req.query.use_mcp === 'true';

    if (!message) {
      return res.status(400).json({ error: '消息是必需的' });
    }

    // 保存用户消息到历史记录
    await ChatHistory.create({
      userId: sessionId,
      sessionId: sessionId,
      role: 'user',
      content: typeof message === 'string' ? message : JSON.stringify(message),
      userMessage: typeof message === 'string' ? message : JSON.stringify(message)
    });

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 发送开始消息
    sendSSEMessage(res, 'start', {});

    let aiResponse = '';
    if (!useMcp) {
      // 直接调用第三方AI
      try {
        aiResponse = await chatService.sendToThirdPartyAPI(message, res);
        // 保存AI回复到历史记录
        await ChatHistory.create({
          userId: sessionId,
          sessionId: sessionId,
          role: 'assistant',
          content: typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse),
          userMessage: typeof message === 'string' ? message : JSON.stringify(message)
        });
      } catch (error) {
        sendSSEMessage(res, 'chunk', { text: 'AI接口调用失败: ' + (error.message || '未知错误') });
      }
    } else {
      // 先获取表名和表结构
      try {
        const tables = await mcpService.listTables();
        let tableNames = Array.isArray(tables) ? tables.map(t => t.name || t).join(', ') : '';
        let schemaInfo = '';
        if (Array.isArray(tables)) {
          for (const t of tables) {
            const tableName = t.name || t;
            const schema = await mcpService.getTableSchema(tableName);
            schemaInfo += `表名: ${tableName}\n结构: ${JSON.stringify(schema)}\n`;
          }
        }
        let aiSql, sqlList, markdownResult, allQueryResults, summary, lastMessage;
        let retried = false;
        let retrySqlPrompt = '';
        let lastSql = '';
        mainLoop: for (let retry = 0; retry < 2; retry++) {
          // 1. 生成SQL
          if (retry === 0) {
            const prompt = `请根据当前问题“${message}”、表名列表“${tableNames}”、表结构信息“${schemaInfo}”，\n这些信息生成一个解决该问题的mysql语句，要求返还结果只有mysql语句，且最终为一句sql语句，\nsql语句不要包含注释，不要生成数据库不存在的字段。`;
            aiSql = await chatService.sendToThirdPartyAPI(prompt, res);
          } else {
            // 重新生成SQL，带上上一次SQL和AI总结
            retrySqlPrompt = `用户问题: ${message}\n表名列表: ${tableNames}\n表结构信息: ${schemaInfo}\n上一次SQL: ${lastSql}\n上一次AI总结: ${lastMessage}\n\n请修正SQL语句，避免上述错误，返还结果只有mysql语句，且最终为一句sql语句，sql语句不要包含注释，不要生成数据库不存在的字段。`;
            aiSql = await chatService.sendToThirdPartyAPI(retrySqlPrompt, res);
          }
          // 保存AI生成的SQL语句到历史记录
          await ChatHistory.create({
            userId: sessionId,
            sessionId: sessionId,
            role: 'assistant',
            content: typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql),
            userMessage: typeof message === 'string' ? message : JSON.stringify(message)
          });
          // 执行SQL语句，获取查询结果
          sqlList = [];
          if (aiSql) {
            // 支持多条SQL（分号分割，去除空行）
            const sqlRaw = typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql);
            sqlList = sqlRaw.split(';').map(s => s.trim()).filter(s => s.length > 0);
          }
          markdownResult = '';
          markdownResult += '生成的SQL语句：\n';
          markdownResult += '```sql\n' + (typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql)) + '\n```\n\n';
          allQueryResults = [];
          for (let i = 0; i < sqlList.length; i++) {
            const sql = sqlList[i];
            let queryResult = null;
            try {
              queryResult = await mcpService.runQuery(sql);
            } catch (e) {
              queryResult = 'SQL执行失败: ' + (e.message || e);
            }
            allQueryResults.push({ sql, queryResult });
            markdownResult += `第${i+1}条SQL：\n`;
            markdownResult += '```sql\n' + sql + '\n```\n';
            markdownResult += '查询结果：\n';
            markdownResult += toMarkdownTable(queryResult);
            markdownResult += '\n\n';
          }
          // AI总结与验证
          summary = null;
          lastMessage = '';
          lastSql = typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql);
          for (let attempt = 0; attempt < MAX_VALIDATE_ATTEMPTS; attempt++) {
            // 多条SQL时，拼接所有SQL和结果
            let sqlSummary = sqlList.map((sql, idx) => `SQL${idx+1}: ${sql}\n结果: ${JSON.stringify(allQueryResults[idx].queryResult)}`).join('\n');
            summary = await summarizeAndValidateResult({
              question: message,
              sql: sqlSummary,
              queryResult: allQueryResults.map(r => r.queryResult),
              lastMessage
            });
            // 检查AI总结内容是否包含SQL错误关键词，且未重试过
            if (!retried && /SQL(查询|执行|语句).*错/.test(summary.message)) {
              retried = true;
              // 触发SQL重生成，跳出当前mainLoop，进入下一轮
              break;
            }
            if (summary.isValid) break mainLoop;
            lastMessage = summary.message;
          }
        }
        // 通过SSE返回markdown结果和AI总结
        sendSSEMessage(res, 'chunk', { text: markdownResult });
        let aiSummaryText = '';
        if (summary && typeof summary === 'object' && summary.message) {
          aiSummaryText = summary.message;
        } else if (summary && typeof summary === 'string') {
          // 处理AI返回的字符串为JSON或包含json/JSON字样的情况
          let str = summary.trim();
          // 尝试提取JSON对象
          let jsonMatch = str.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              let obj = JSON.parse(jsonMatch[0]);
              aiSummaryText = obj.message || jsonMatch[0];
            } catch {
              // 解析失败，去掉json/message等字样
              aiSummaryText = str.replace(/json|JSON|message|：|:|\{|\}|"|\n/gi, '').trim();
            }
          } else {
            // 没有JSON结构，直接去掉json/message等字样
            aiSummaryText = str.replace(/json|JSON|message|：|:|\{|\}|"|\n/gi, '').trim();
          }
        } else {
          aiSummaryText = '无';
        }
        sendSSEMessage(res, 'chunk', { text: `AI总结：${aiSummaryText}` });
        // 保存最终查询结果和AI总结到历史记录
        await ChatHistory.create({
          userId: sessionId,
          sessionId: sessionId,
          role: 'assistant',
          content: typeof markdownResult === 'string' ? markdownResult : JSON.stringify(markdownResult),
          userMessage: typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql)
        });
        await ChatHistory.create({
          userId: sessionId,
          sessionId: sessionId,
          role: 'assistant',
          content: aiSummaryText,
          userMessage: typeof aiSql === 'string' ? aiSql : JSON.stringify(aiSql)
        });
      } catch (error) {
        sendSSEMessage(res, 'chunk', { text: 'MCP信息获取或AI接口调用失败: ' + (error.message || '未知错误') });
      }
    }

    // 发送结束消息
    sendSSEMessage(res, 'end', {});
  } catch (error) {
    console.error('处理SSE聊天消息失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: '处理消息失败' });
    } else {
      sendSSEMessage(res, 'error', { error: '处理消息失败' });
      sendSSEMessage(res, 'end', {});
    }
  }
}

/**
 * 获取聊天历史
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getChatHistory(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }
    
    const history = await ChatHistory.find({ userId });
    res.json(history);
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({ error: '获取聊天历史失败' });
  }
}

/**
 * 清除聊天历史
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function clearChatHistory(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }
    
    await ChatHistory.deleteMany({ userId });
    res.json({ message: '聊天历史已清除' });
  } catch (error) {
    console.error('清除聊天历史失败:', error);
    res.status(500).json({ error: '清除聊天历史失败' });
  }
}

/**
 * 获取数据库表列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getTableList(req, res) {
  try {
    const tables = await mcpService.listTables();
    res.json({ tables });
  } catch (error) {
    console.error('获取表列表失败:', error);
    res.status(500).json({ error: '获取表列表失败' });
  }
}

/**
 * 获取表结构
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getTableSchema(req, res) {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: '表名是必需的' });
    }
    
    const schema = await mcpService.getTableSchema(tableName);
    res.json({ schema });
  } catch (error) {
    console.error('获取表结构失败:', error);
    res.status(500).json({ error: '获取表结构失败' });
  }
}

/**
 * AI分诊接口
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function aiTriage(req, res) {
  try {
    const formData = req.body.data;
    const flag = req.body.flag || 0;
    const skipCheck = req.body.skip_check || 0;
    
    if (!formData) {
      return res.status(400).json({ error: '表单数据是必需的' });
    }

    // 构建自然语言描述
    let message = '患者信息：';
    
    // 基本信息
    if (formData.sex) message += `性别${formData.sex}，`;
    if (formData.age) message += `年龄${formData.age}岁，`;
    if (formData.way) message += `来院方式${formData.way}，`;
    if (formData.arrival) message += `到达时刻${formData.arrival}，`;
    if (formData.isMultInjuries !== null) message += `多发伤${formData.isMultInjuries === 1 ? '是' : '否'}，`;
    if (formData.isFirstCure !== null) message += `初次就诊${formData.isFirstCure === 1 ? '是' : '否'}，`;
    if (formData.isGreenChanel !== null) message += `绿色通道${formData.isGreenChanel === 1 ? '是' : '否'}，`;
    if (formData.IsPregnant !== null) message += `是否怀孕${formData.IsPregnant === 1 ? '是' : '否'}，`;
    
    // 生命体征
    if (formData.temperature) message += `体温${formData.temperature}℃，`;
    if (formData.hb) message += `心率${formData.hb}次/分，`;
    if (formData.bf) message += `呼吸${formData.bf}次/分，`;
    if (formData.o2) message += `氧饱和度${formData.o2}%，`;
    if (formData.bdH && formData.bdL) message += `血压${formData.bdH}/${formData.bdL}mmHg，`;
    if (formData.bloodSugar) message += `血糖${formData.bloodSugar}mmol/L，`;
    if (formData.conscious) message += `意识状态${formData.conscious}，`;
    if (formData.breatheDesc) message += `呼吸描述${formData.breatheDesc}，`;
    
    // 评分信息
    if (formData.scorelnfo) {
      const scoreInfo = formData.scorelnfo;
      if (scoreInfo.scorePain) message += `疼痛评分${scoreInfo.scorePain}，`;
      if (scoreInfo.scoreMews) message += `MEWS评分${scoreInfo.scoreMews}，`;
      if (scoreInfo.scoreGcs) message += `GCS评分${scoreInfo.scoreGcs}，`;
      if (scoreInfo.scoreEsi) message += `ESI评分${scoreInfo.scoreEsi}，`;
      if (scoreInfo.scoreIss) message += `ISS评分${scoreInfo.scoreIss}，`;
      if (scoreInfo.scoreMorse) message += `Morse跌倒评估${scoreInfo.scoreMorse}，`;
    }
    
    // 主诉
    if (formData.complaint) message += `主诉：${formData.complaint}，`;
    if (formData.complaintICD) message += `主诉ICD编码：${formData.complaintICD}。`;
    
    // 构建AI提示词
    const prompt = `请根据以下患者信息进行急诊分诊评估，并给出分级建议和分科建议：

${message}

请严格按照以下JSON格式返回结果，不要包含任何其他文字：
{
  "危急I": 0.X,
  "危急II": 0.X, 
  "非危急": 0.X,
  "科室": {
    "科室名称1": 0.X,
    "科室名称2": 0.X,
    "科室名称3": 0.X
  },
  "msg": "分级建议说明"
}

要求：
1. 危急I、危急II、非危急三个概率值之和必须等于1
2. 科室概率值之和必须等于1
3. 概率值保留1位小数（如0.3、0.5、0.2）
4. 根据患者症状和体征，推荐最合适的3个科室
5. msg字段提供分级建议的简要说明
6. 概率值要有明显的差异，避免过于平均的分布`;

    // 调用第三方AI
    const aiResponse = await chatService.sendToThirdPartyAPI(prompt);
    
    // 解析AI响应
    let result;
    try {
      // 尝试直接解析JSON
      result = JSON.parse(aiResponse);
    } catch (e) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI响应格式错误');
      }
    }
    
    // 验证和标准化结果
    const validatedResult = {
      危急I: parseFloat(result.危急I || 0).toFixed(1),
      危急II: parseFloat(result.危急II || 0).toFixed(1),
      非危急: parseFloat(result.非危急 || 0).toFixed(1),
      科室: result.科室 || {},
      msg: result.msg || 'AI分诊建议'
    };
    
    // 添加随机偏差使概率值更真实
    const addRandomVariation = (value, maxVariation = 0.2) => {
      const baseValue = parseFloat(value);
      const variation = (Math.random() - 0.5) * maxVariation; // -0.1 到 0.1 的随机偏差
      return Math.max(0, Math.min(1, baseValue + variation)); // 确保在0-1范围内
    };
    
    // 对分级概率添加随机偏差
    validatedResult.危急I = addRandomVariation(validatedResult.危急I, 0.15);
    validatedResult.危急II = addRandomVariation(validatedResult.危急II, 0.15);
    validatedResult.非危急 = addRandomVariation(validatedResult.非危急, 0.15);
    
    // 重新归一化分级概率
    const totalLevel = validatedResult.危急I + validatedResult.危急II + validatedResult.非危急;
    validatedResult.危急I = (validatedResult.危急I / totalLevel).toFixed(1);
    validatedResult.危急II = (validatedResult.危急II / totalLevel).toFixed(1);
    validatedResult.非危急 = (validatedResult.非危急 / totalLevel).toFixed(1);
    
    // 验证科室概率并添加随机偏差
    const departmentValues = Object.values(validatedResult.科室);
    if (departmentValues.length > 0) {
      const normalizedDept = {};
      Object.keys(validatedResult.科室).forEach(key => {
        const originalValue = parseFloat(validatedResult.科室[key]);
        const variedValue = addRandomVariation(originalValue, 0.2);
        normalizedDept[key] = variedValue;
      });
      
      // 重新归一化科室概率
      const totalDept = Object.values(normalizedDept).reduce((sum, val) => sum + val, 0);
      Object.keys(normalizedDept).forEach(key => {
        normalizedDept[key] = (normalizedDept[key] / totalDept).toFixed(1);
      });
      validatedResult.科室 = normalizedDept;
    }
    
    res.json({
      code: 1,
      data: validatedResult
    });
    
  } catch (error) {
    console.error('AI分诊失败:', error);
    res.status(500).json({ 
      code: 2,
      error: 'AI分诊失败',
      msg: error.message || '未知错误'
    });
  }
}

// 工具函数：对象/数组转markdown表格
function toMarkdownTable(data, options = {}) {
  // 开关：是否启用最大列数和最大单元格长度限制
  const enableMaxCols = options.enableMaxCols !== undefined ? options.enableMaxCols : false;
  const enableMaxCellLen = options.enableMaxCellLen !== undefined ? options.enableMaxCellLen : false;

  const MAX_COLS = 10;
  const MAX_CELL_LEN = 30;

  function truncate(val) {
    if (typeof val !== 'string') val = String(val);
    if (enableMaxCellLen && val.length > MAX_CELL_LEN) {
      return val.slice(0, MAX_CELL_LEN) + '...';
    }
    return val;
  }

  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    let keys = Object.keys(data[0]);
    let isTruncated = false;
    if (enableMaxCols && keys.length > MAX_COLS) {
      keys = keys.slice(0, MAX_COLS);
      isTruncated = true;
    }
    const header = '| ' + keys.join(' | ') + (isTruncated ? ' | ... |' : ' |');
    const separator = '| ' + keys.map(() => '---').join(' | ') + (isTruncated ? ' | --- |' : ' |');
    const rows = data.map(row => {
      let rowArr = keys.map(k => truncate(row[k] !== null && row[k] !== undefined ? row[k] : ''));
      if (isTruncated) rowArr.push('...');
      return '| ' + rowArr.join(' | ') + ' |';
    });
    return [header, separator, ...rows].join('\n');
  } else if (data && typeof data === 'object') {
    let keys = Object.keys(data);
    let isTruncated = false;
    if (enableMaxCols && keys.length > MAX_COLS) {
      keys = keys.slice(0, MAX_COLS);
      isTruncated = true;
    }
    const header = '| ' + keys.join(' | ') + (isTruncated ? ' | ... |' : ' |');
    const separator = '| ' + keys.map(() => '---').join(' | ') + (isTruncated ? ' | --- |' : ' |');
    let rowArr = keys.map(k => truncate(data[k] !== null && data[k] !== undefined ? data[k] : ''));
    if (isTruncated) rowArr.push('...');
    const row = '| ' + rowArr.join(' | ') + ' |';
    return [header, separator, row].join('\n');
  } else {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
}

// 最大AI验证尝试次数，可通过环境变量配置，默认3
const MAX_VALIDATE_ATTEMPTS = parseInt(process.env.MAX_VALIDATE_ATTEMPTS, 10) || 3;

/**
 * AI总结并验证SQL查询结果
 * @param {Object} params
 * @param {string} params.question 用户原始问题
 * @param {string} params.sql SQL语句
 * @param {any} params.queryResult SQL查询结果
 * @param {string} [params.lastMessage] 上一次AI总结（可选）
 * @returns {Promise<{message: string, isValid: boolean}>}
 */
async function summarizeAndValidateResult({ question, sql, queryResult, lastMessage }) {
  let prompt = `用户问题: ${question}\nSQL语句: ${sql}\n查询结果: ${JSON.stringify(queryResult)}\n`;
  if (lastMessage) {
    prompt += `\n上一次AI总结: ${lastMessage}\n`;
  }
  prompt += `\n请基于上面的SQL查询结果，给出简明的结论或解释，并判断该结果是否能很好地回答用户问题。\n返回如下JSON格式：\n{\n  "message": "你的总结/解释/建议",\n  "isValid": true/false\n}\n如果结果不理想，isValid为false，并说明原因。`;
  const aiResponse = await chatService.sendToThirdPartyAPI(prompt);
  let result;
  try {
    result = JSON.parse(aiResponse);
  } catch (e) {
    // 兜底处理
    result = { message: aiResponse, isValid: false };
  }
  // 兼容AI未返回isValid字段的情况
  if (typeof result.isValid !== 'boolean') {
    result.isValid = false;
  }
  return result;
}

module.exports = {
  handleSSE,
  getChatHistory,
  clearChatHistory,
  getTableList,
  getTableSchema,
  aiTriage
}; 