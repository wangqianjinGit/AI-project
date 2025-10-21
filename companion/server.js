const http = require('http');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 用户数据存储文件路径
const USER_DATA_FILE = path.join(__dirname, 'user_data.json');

// 确保用户数据文件存在
function ensureUserDataFile() {
    if (!fs.existsSync(USER_DATA_FILE)) {
        fs.writeFileSync(USER_DATA_FILE, JSON.stringify({}), 'utf-8');
    }
}

const server = http.createServer((req, res) => {
    // 解析请求的文件路径
    if (req.url === '/api/user/nickname' && req.method === 'GET') {
        // 获取用户昵称的API端点
        ensureUserDataFile();
        try {
            const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ nickname: userData.nickname || '' }));
        } catch (error) {
            console.error('读取用户数据失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '读取用户数据失败' }));
        }
        return;
    }

    if (req.url === '/api/user/nickname' && req.method === 'POST') {
        // 保存用户昵称的API端点
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.nickname) {
                    ensureUserDataFile();
                    const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
                    userData.nickname = data.nickname;
                    userData.timestamp = new Date().toISOString();
                    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData), 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '昵称不能为空' }));
                }
            } catch (error) {
                console.error('保存用户数据失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '保存用户数据失败' }));
            }
        });
        return;
    }

    // 静态文件处理
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