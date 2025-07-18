# AI 急诊分诊系统

## 项目简介

本项目为一套基于 Node.js + Vue3 的智能急诊分诊系统，包含前端（vue-project）和后端（AiServer），支持 AI 智能分诊、数据库结构自动读取、MCP配置管理等功能。

---

## 技术栈

- **前端**：Vue3 + Element Plus + Vite
- **后端**：Node.js (20+) + Express + pm2 + Mongoose/MongoDB
- **AI服务**：支持 OpenAI/DeepSeek 等兼容 OpenAI API 的大模型
- **数据库**：MySQL（通过 MCP 连接）

---

## 环境要求

- Node.js **v20 及以上**
- npm / pnpm / yarn
- pm2（全局安装，后端用 pm2 启动）
- MySQL 数据库（用于 MCP 连接）
- 推荐操作系统：Windows 10+ 或 Linux

---

## 目录结构

```
AIDbClient/
  ├── AiServer/           # 后端服务
  │   ├── src/
  │   ├── data/
  │   └── ...
  └── vue-project/        # 前端项目
      ├── src/
      └── ...
```

---

## 安装与启动

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd AIDbClient
```

### 2. 安装依赖

#### 后端

```bash
cd AiServer
npm install
```

#### 前端

```bash
cd ../vue-project
npm install
```

### 3. 配置后端环境

- 修改 `AiServer/data/settings.json`，配置 AI 接口、数据库等参数。
- 如需自定义数据库连接，编辑 `.env` 或通过 MCP 配置管理界面设置。

### 4. 启动后端（用 pm2）

```bash
cd AiServer
pm run build # 如有构建步骤
pm run migrate # 如有数据库迁移
pm2 start src/index.js --name ai-server
# 查看状态
pm2 logs ai-server
```

### 5. 启动前端

```bash
cd vue-project
npm run dev
```

### 6. 访问系统

- 前端地址: [http://localhost:5173](http://localhost:5173)
- AI分诊页面: [http://localhost:5173/ai-triage](http://localhost:5173/ai-triage)
- 后端API: [http://localhost:3009](http://localhost:3009)

---

## 一键部署脚本

### Windows

根目录下有 `start-ai-triage.bat`，双击即可自动启动后端和前端。

### Linux/Mac

根目录下有 `start-ai-triage.sh`，使用如下命令：

```bash
chmod +x start-ai-triage.sh
./start-ai-triage.sh
```

---

## 主要功能

- **AI分诊**：根据患者信息自动生成分级、分科建议及概率
- **MCP配置管理**：支持多套数据库配置，激活后自动同步到 `.env` 并重启服务
- **表结构自动读取**：自动获取MySQL表结构，辅助AI生成SQL
- **聊天与历史记录**：支持与AI对话、历史消息管理

---

## 常见问题

1. **Node版本不兼容？**
   - 请确保 Node.js 版本为 20 及以上，可用 `node -v` 检查。

2. **pm2 未安装？**
   - 全局安装：`npm install -g pm2`

3. **端口冲突？**
   - 默认后端 3009，前端 5173，如有冲突请在相关配置文件中修改。

4. **AI接口无响应？**
   - 检查 `settings.json` 里的 `thirdPartyApiKey`、`thirdPartyApiEndpoint` 是否正确，网络是否可达。

5. **MCP配置激活后无效？**
   - 激活配置后会自动写入 `.env` 并重启服务，若无效请检查 pm2 日志。

---

## 其它说明

- **后端建议用 pm2 管理，支持热重启、日志查看等。**
- **如需批量测试AI分诊接口，可用 `AiServer/test-ai-triage.js` 脚本。**
- **如需自定义AI模型或数据库，可在 `settings.json` 或 MCP配置中调整。**

---

## 联系与支持

如有问题请联系项目维护者，或提交 issue。 