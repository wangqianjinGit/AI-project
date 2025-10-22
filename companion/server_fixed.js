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

// 确保companion目录下的upload文件夹存在
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Upload directory created');
}

const server = http.createServer((req, res) => {
    // 设置基本响应头（确保CORS支持）
    const setResponseHeaders = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    };
    
    // 确保所有响应都设置CORS头
    setResponseHeaders();
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }
    
    // 处理文件上传请求
    if (req.url === '/upload' && req.method === 'POST') {
        handleFileUpload(req, res);
        return;
    }
    
    // 处理静态文件请求
    if (req.url === '/api/user/nickname' && req.method === 'GET') {
        // 获取用户昵称的API端点
        try {
            ensureUserDataFile();
            const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, nickname: userData.nickname || '' }));
        } catch (error) {
            console.error('读取用户数据失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '读取用户数据失败' }));
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
                // 检查是否为空请求体
                if (!body.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '请求体不能为空' }));
                    return;
                }
                
                console.log('接收到的请求体:', body);
                let data;
                try {
                    data = JSON.parse(body);
                } catch (jsonError) {
                    console.error('JSON解析错误:', jsonError);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '无效的JSON数据格式', details: jsonError.message }));
                    return;
                }
                
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
                    res.end(JSON.stringify({ success: false, error: '昵称不能为空' }));
                }
            } catch (error) {
                console.error('保存用户昵称失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '服务器内部错误', details: error.message }));
            }
        });
        return;
    }

    // 获取用户性格特质的API端点
    if (req.url === '/api/user/personality' && req.method === 'GET') {
        ensureUserDataFile();
        try {
            const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ personality: userData.personality || '' }));
        } catch (error) {
            console.error('读取用户性格特质失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '读取用户性格特质失败' }));
        }
        return;
    }

    // 保存用户性格特质的API端点
    if (req.url === '/api/user/personality' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // 检查是否为空请求体
                if (!body.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '请求体不能为空' }));
                    return;
                }
                
                const data = JSON.parse(body);
                if (data.personality) {
                    ensureUserDataFile();
                    const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
                    userData.personality = data.personality;
                    userData.timestamp = new Date().toISOString();
                    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData), 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '性格特质不能为空' }));
                }
            } catch (error) {
                console.error('保存用户性格特质失败:', error);
                // 更具体的错误信息
                let errorMsg = '保存用户性格特质失败';
                if (error instanceof SyntaxError) {
                    errorMsg = '无效的JSON数据格式';
                }
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: errorMsg }));
            }
        });
        return;
    }

    // 静态文件处理 - 默认指向login.html
    const filePath = path.join(__dirname, req.url === '/' ? 'login.html' : req.url);
    
    // 获取文件扩展名
    const extname = path.extname(filePath);
    
    // 设置内容类型
    const contentType = { 
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
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

// 处理文件上传
function handleFileUpload(req, res) {
    let body = Buffer.from('');
    
    req.on('data', chunk => {
        body = Buffer.concat([body, chunk]);
    });
    
    req.on('end', () => {
        try {
            // 解析multipart/form-data边界
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.includes('multipart/form-data')) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '不支持的内容类型' }));
                return;
            }
            
            const boundary = contentType.split('boundary=')[1];
            
            // 查找文件部分（不使用toString()，避免乱码）
            const boundaryBuffer = Buffer.from(`--${boundary}`);
            let fileStart = -1;
            let fileEnd = -1;
            let fileName = '';
            
            // 查找文件名
            for (let i = 0; i < body.length - boundaryBuffer.length; i++) {
                if (body.compare(boundaryBuffer, 0, boundaryBuffer.length, i, i + boundaryBuffer.length) === 0) {
                    // 查找Content-Disposition头和filename
                    const headerEnd = body.indexOf('\r\n\r\n', i);
                    if (headerEnd !== -1) {
                        const header = body.slice(i, headerEnd).toString();
                        const fileNameMatch = header.match(/filename="([^"]+)"/);
                        if (fileNameMatch && fileNameMatch[1]) {
                            fileName = fileNameMatch[1];
                            fileStart = headerEnd + 4; // 跳过\r\n\r\n
                            // 查找文件内容的结束位置
                            const nextBoundaryStart = body.indexOf(boundaryBuffer, fileStart);
                            if (nextBoundaryStart !== -1) {
                                // 文件内容结束于下一个边界前的\r\n
                                // 检查是否存在\r\n
                                if (body[nextBoundaryStart - 2] === 0x0d && body[nextBoundaryStart - 1] === 0x0a) {
                                    fileEnd = nextBoundaryStart - 2;
                                } else {
                                    fileEnd = nextBoundaryStart;
                                }
                                break;
                            }
                        }
                    }
                }
            }
            
            // 如果找到文件
            if (fileStart !== -1 && fileEnd !== -1 && fileName) {
                // 提取文件内容
                const fileContent = body.slice(fileStart, fileEnd);
                
                // 保存文件到upload文件夹
                const savePath = path.join(uploadDir, fileName);
                fs.writeFile(savePath, fileContent, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, message: '文件保存失败' }));
                    } else {
                        console.log('File saved:', savePath);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: '文件上传成功',
                            fileName: fileName,
                            filePath: '/upload/' + fileName
                        }));
                    }
                });
            } else {
                // 如果没有找到文件
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '未找到文件' }));
            }
        } catch (error) {
            console.error('Error processing file upload:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, message: '文件处理失败' }));
        }
    });
    
    req.on('error', (err) => {
        console.error('Request error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: '请求处理失败' }));
    });
}

// 启动服务器 - 支持环境变量指定端口，默认为8080
const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log(`File upload endpoint available at http://localhost:${port}/upload`);
});