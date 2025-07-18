# AI服务器

这是一个基于Node.js的AI服务器，支持聊天功能和MCP服务配置管理。

## 功能特点

- 通过SSE（Server-Sent Events）实现流式聊天响应
- MCP服务配置的创建、修改、查询和删除
- 与MCP服务集成，支持智能对话
- 使用MySQL数据库存储聊天历史和MCP配置

## 安装

1. 安装依赖：

```bash
npm install
```

2. 创建环境配置文件：

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件，设置数据库和MCP服务参数
notepad .env
```

## 配置

在`.env`文件中配置以下参数：

```
# 服务器配置
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ai_server
DB_PORT=3306

# MCP服务配置
MCP_API_URL=http://localhost:8080/api
MCP_API_KEY=your_mcp_api_key
```

## 运行

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

## API文档

### MCP配置API

- `GET /api/v1/mcp-configs` - 获取所有MCP配置
- `GET /api/v1/mcp-configs/active` - 获取当前激活的MCP配置
- `GET /api/v1/mcp-configs/:id` - 获取指定ID的MCP配置
- `POST /api/v1/mcp-configs` - 创建新的MCP配置
- `PUT /api/v1/mcp-configs/:id` - 更新MCP配置
- `POST /api/v1/mcp-configs/:id/activate` - 激活指定的MCP配置
- `DELETE /api/v1/mcp-configs/:id` - 删除MCP配置
- `GET /api/v1/mcp-configs/check-availability` - 检查MCP服务是否可用

### 聊天API

- `POST /api/v1/chat/sse` - 处理聊天请求（SSE）
- `GET /api/v1/chat/history/:session_id` - 获取聊天历史

## 示例

### 创建MCP配置

```bash
curl -X POST http://localhost:3000/api/v1/mcp-configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "默认配置",
    "description": "默认的MCP服务配置",
    "config_json": {
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }'
```

### 激活MCP配置

```bash
curl -X POST http://localhost:3000/api/v1/mcp-configs/1/activate
```

### 发送聊天请求

```javascript
// 前端JavaScript代码示例
const eventSource = new EventSource('/api/v1/chat/sse');

eventSource.addEventListener('init', (event) => {
  const data = JSON.parse(event.data);
  console.log('初始化:', data);
});

eventSource.addEventListener('chunk', (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息块:', data.text);
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('错误:', data.message);
});

eventSource.addEventListener('close', (event) => {
  console.log('连接关闭');
  eventSource.close();
});

// 发送消息
fetch('/api/v1/chat/sse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: 'your-session-id', // 可选，如果不提供会自动生成
    message: '你好，AI助手！'
  })
});
``` 