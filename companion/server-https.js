const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 创建HTTP服务器（保留原有功能）
const httpServer = http.createServer((req, res) => {
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

// 启动HTTP服务器 - 监听所有接口
httpServer.listen(8000, '0.0.0.0', () => {
    console.log('HTTP Server running at http://localhost:8000/');
    console.log('也可以通过局域网IP访问：http://<your-ip>:8000/');
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
                console.log('You can still access the application via HTTP at http://localhost:8000/');
                return;
            }
            
            const credentials = {
                key: privateKey,
                cert: certificate
            };
            
            // 创建HTTPS服务器
            const httpsServer = https.createServer(credentials, (req, res) => {
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
            
            // 启动HTTPS服务器 - 监听所有接口
            httpsServer.listen(8443, '0.0.0.0', () => {
                console.log('HTTPS Server running at https://localhost:8443/');
                console.log('也可以通过局域网IP访问：https://<your-ip>:8443/');
                console.log('注意：使用自签名证书时，浏览器可能会显示安全警告，需要手动信任证书');
                console.log('只有在HTTPS环境下，语音识别功能才能正常工作');
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