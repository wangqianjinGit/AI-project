const http = require('http');

// 测试POST请求保存昵称
const postData = JSON.stringify({ nickname: 'TestUser' });

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/user/nickname',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`响应体: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 写入数据并结束请求
req.write(postData);
req.end();