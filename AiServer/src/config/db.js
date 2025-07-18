const mysql = require('mysql2/promise');

// 创建数据库连接池
let pool = null;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_server',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('数据库连接池创建成功');
} catch (error) {
  console.error('数据库连接池创建失败:', error);
}

// 内存存储（当数据库不可用时使用）
const memoryStore = {
  chat_history: [],
  nextChatId: 1
};

// 初始化数据库表
async function initDatabase() {
  try {
    if (!pool) {
      console.log('使用内存存储代替数据库');
      return;
    }
    
    const connection = await pool.getConnection();
    
    // 检查聊天记录表是否存在
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'chat_history'
    `);
    
    if (tables.length === 0) {
      // 表不存在，创建新表
      await connection.query(`
        CREATE TABLE chat_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) DEFAULT '1',
          role ENUM('user', 'assistant') NOT NULL,
          content TEXT NOT NULL,
          user_message TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('聊天记录表创建成功');
    } else {
      // 表已存在，检查列
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM chat_history
      `);
      
      // 检查是否有user_id列
      const hasUserIdColumn = columns.some(column => column.Field === 'user_id');
      
      if (!hasUserIdColumn) {
        // 添加user_id列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN user_id VARCHAR(255) NOT NULL AFTER id
        `);
        console.log('聊天记录表添加user_id列成功');
      }
      
      // 检查是否有session_id列
      const hasSessionIdColumn = columns.some(column => column.Field === 'session_id');
      
      if (hasSessionIdColumn) {
        // session_id列存在，但可能没有默认值，添加默认值
        await connection.query(`
          ALTER TABLE chat_history MODIFY session_id VARCHAR(255) DEFAULT '1'
        `);
        console.log('聊天记录表修改session_id列添加默认值成功');
      } else {
        // 添加session_id列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN session_id VARCHAR(255) DEFAULT '1' AFTER user_id
        `);
        console.log('聊天记录表添加session_id列成功');
      }
      
      // 检查是否有user_message列
      const hasUserMessageColumn = columns.some(column => column.Field === 'user_message');
      
      if (hasUserMessageColumn) {
        // user_message列存在，但可能没有默认值，修改为允许NULL
        await connection.query(`
          ALTER TABLE chat_history MODIFY user_message TEXT DEFAULT NULL
        `);
        console.log('聊天记录表修改user_message列添加默认值成功');
      } else {
        // 添加user_message列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN user_message TEXT DEFAULT NULL AFTER content
        `);
        console.log('聊天记录表添加user_message列成功');
      }
      
      // 检查是否有role列
      const hasRoleColumn = columns.some(column => column.Field === 'role');
      
      if (!hasRoleColumn) {
        // 添加role列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN role ENUM('user', 'assistant') NOT NULL AFTER session_id
        `);
        console.log('聊天记录表添加role列成功');
      }
      
      // 检查是否有content列
      const hasContentColumn = columns.some(column => column.Field === 'content');
      
      if (!hasContentColumn) {
        // 添加content列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN content TEXT NOT NULL AFTER role
        `);
        console.log('聊天记录表添加content列成功');
      }
      
      // 检查是否有created_at列
      const hasCreatedAtColumn = columns.some(column => column.Field === 'created_at');
      
      if (!hasCreatedAtColumn) {
        // 添加created_at列
        await connection.query(`
          ALTER TABLE chat_history ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('聊天记录表添加created_at列成功');
      }
    }
    
    connection.release();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    console.log('将使用内存存储代替数据库');
  }
}

// 执行数据库查询的包装函数
async function executeQuery(query, params = []) {
  if (!pool) {
    throw new Error('数据库未连接，使用内存存储');
  }
  
  try {
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw error;
  }
}

module.exports = {
  pool,
  memoryStore,
  initDatabase,
  executeQuery
}; 