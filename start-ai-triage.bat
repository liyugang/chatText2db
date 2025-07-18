@echo off
cd /d %~dp0

echo 启动AI分诊系统...

echo 启动后端服务（pm2）...
cd AiServer
call npm install
pm2 start src/index.js --name ai-server
cd ..

echo 等待后端服务启动...
timeout /t 3 /nobreak > nul

echo 启动前端服务...
cd vue-project
call npm install
start "Vue Frontend" cmd /k "npm run dev"
cd ..

echo 系统启动完成！
echo 前端地址: http://localhost:5173
echo AI分诊页面: http://localhost:5173/ai-triage
echo 后端API: http://localhost:3009

echo 按 Ctrl+C 可关闭本窗口
pause 