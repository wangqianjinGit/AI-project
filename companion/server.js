const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // 解析请求的文件路径
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // 获取文件扩展名
    const extname = path.extname(filePath);
    
    // 设置内容类型
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json'
    }[extname] || 'application/octet-stream';
    
    // 读取并发送文件
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 启动服务器
server.listen(8000, () => {
    console.log('Server running at http://localhost:8000/');
});