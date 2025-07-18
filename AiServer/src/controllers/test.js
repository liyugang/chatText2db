const { spawn } = require('child_process');

// 启动模型服务（假设是一个可执行文件 ./model 或 python 脚本）
const modelProcess = spawn('./model'); // 或 ['python3', 'my_model.py']

// 接收模型输出
modelProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('模型返回：', response.output);
      } catch (e) {
        console.error('JSON 解析错误：', line);
      }
    }
  }
});

// 发送请求
function sendToModel(inputText) {
  const request = JSON.stringify({ input: inputText }) + '\n';
  modelProcess.stdin.write(request);
}

// 示例调用
sendToModel("你好，介绍一下你自己？");

// 捕获错误
modelProcess.stderr.on('data', (data) => {
  console.error('模型错误：', data.toString());
});

modelProcess.on('exit', (code) => {
  console.log(`模型进程退出，代码 ${code}`);
});