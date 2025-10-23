const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

// 创建HTTP服务器（保留原有功能）
const httpServer = http.createServer((req, res) => {
    // 添加CORS支持
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 处理文件上传请求
    if (req.url === '/upload' && req.method === 'POST') {
        handleFileUpload(req, res);
        return;
    }
    
    // 处理用户昵称的API端点 - GET
    if (req.url === '/api/user/nickname' && req.method === 'GET') {
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

    // 处理用户昵称的API端点 - POST
    if (req.url === '/api/user/nickname' && req.method === 'POST') {
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

    // 处理用户性格特质的API端点 - GET
    if (req.url === '/api/user/personality' && req.method === 'GET') {
        ensureUserDataFile();
        try {
            const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, personality: userData.personality || null }));
        } catch (error) {
            console.error('读取用户数据失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '读取用户数据失败' }));
        }
        return;
    }

    // 处理用户性格特质的API端点 - POST
    if (req.url === '/api/user/personality' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
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
                console.error('保存用户数据失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '保存用户数据失败' }));
            }
        });
        return;
    }

    // 处理静态文件请求
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

// 启动HTTP服务器 - 监听所有接口
httpServer.listen(8080, '0.0.0.0', () => {
    console.log('HTTP Server running at http://localhost:8080/');
    console.log('也可以通过局域网IP访问：http://<your-ip>:8080/');
    console.log('提示：在HTTP环境下，某些浏览器可能限制语音识别功能');
    console.log('尝试方案：');
    console.log('1. 使用 localhost 而非IP地址访问（大多数浏览器允许localhost的HTTP使用麦克风）');
    console.log('2. 如果语音识别失败，可以使用页面上的文本输入框');
    console.log('3. 长期稳定使用请按照下方说明生成SSL证书并通过HTTPS访问');
});

// 尝试启动HTTPS服务器
function startHttpsServer() {
    try {
        // 检查SSL证书文件是否存在
        const privateKeyPath = path.join(__dirname, 'key.pem');
        const certificatePath = path.join(__dirname, 'cert.pem');
        
        console.log(`Checking for SSL certificates at:`);
        console.log(`- Private key: ${privateKeyPath}`);
        console.log(`- Certificate: ${certificatePath}`);
        
        // 检查文件是否存在
        const keyExists = fs.existsSync(privateKeyPath);
        const certExists = fs.existsSync(certificatePath);
        
        console.log(`Certificate files existence check:`);
        console.log(`- key.pem: ${keyExists}`);
        console.log(`- cert.pem: ${certExists}`);
        
        if (keyExists && certExists) {
            // 读取SSL证书
            console.log('Attempting to read SSL certificate files...');
            
            let privateKey, certificate;
            try {
                privateKey = fs.readFileSync(privateKeyPath, 'utf8');
                certificate = fs.readFileSync(certificatePath, 'utf8');
                console.log('SSL certificates loaded successfully.');
            } catch (readError) {
                console.error('Failed to read SSL certificate files:', readError.message);
                console.log('HTTPS Server not started due to certificate read error.');
                console.log('You can still access the application via HTTP at http://localhost:8080/');
                return;
            }
            
            const credentials = {
                key: privateKey,
                cert: certificate
            };
            
            // 创建HTTPS服务器
            const httpsServer = https.createServer(credentials, (req, res) => {
                // 添加CORS支持
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                
                // 处理OPTIONS预检请求
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }
                
                // 处理文件上传请求
                if (req.url === '/upload' && req.method === 'POST') {
                    handleFileUpload(req, res);
                    return;
                }
                
                // 处理用户昵称的API端点 - GET
                if (req.url === '/api/user/nickname' && req.method === 'GET') {
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

                // 处理用户昵称的API端点 - POST
                if (req.url === '/api/user/nickname' && req.method === 'POST') {
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

                // 处理用户性格特质的API端点 - GET
                if (req.url === '/api/user/personality' && req.method === 'GET') {
                    ensureUserDataFile();
                    try {
                        const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, personality: userData.personality || null }));
                    } catch (error) {
                        console.error('读取用户数据失败:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: '读取用户数据失败' }));
                    }
                    return;
                }

                // 处理用户性格特质的API端点 - POST
                if (req.url === '/api/user/personality' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', () => {
                        try {
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
                            console.error('保存用户数据失败:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: '保存用户数据失败' }));
                        }
                    });
                    return;
                }

                // 处理静态文件请求
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
            
            // 启动HTTPS服务器 - 监听所有接口
            httpsServer.listen(8443, '0.0.0.0', () => {
                console.log('HTTPS Server running at https://localhost:8443/');
                console.log('也可以通过局域网IP访问：https://<your-ip>:8443/');
                console.log('注意：使用自签名证书时，浏览器可能会显示安全警告，需要手动信任证书');
                console.log('只有在HTTPS环境下，语音识别功能才能正常工作');
                console.log('File upload endpoint available at https://localhost:8443/upload');
            });
        } else {
            console.log('HTTPS Server not started: SSL certificate files (key.pem and cert.pem) not found.');
            console.log('提示：您仍可以使用HTTP访问，但语音识别功能可能受到浏览器安全限制');
            console.log('在HTTP环境下使用语音识别的技巧：');
            console.log('1. 使用 localhost 而非IP地址访问（大多数浏览器允许localhost的HTTP使用麦克风）');
            console.log('2. 应用已优化，即使在HTTP环境下也会尝试启用语音识别功能');
            console.log('3. 如果语音识别失败，可以使用页面上的文本输入框');
            console.log('');
            console.log('启用完整HTTPS功能的方法：');
            console.log('1. Install OpenSSL (if not already installed)');
            console.log('2. Run: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes');
            console.log('3. Restart the server');
            console.log('Windows用户请参考OPENSSL-WINDOWS-GUIDE.md文件获取详细指南');
        }
    } catch (error) {
        console.error('Error starting HTTPS server:', error.message);
    }
}

// 启动HTTPS服务器（如果有证书）
startHttpsServer();