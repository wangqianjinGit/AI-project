const http = require('http');
const fs = require('fs');
const path = require('path');

// 确保companion目录下的upload文件夹存在
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Upload directory created');
}

const server = http.createServer((req, res) => {
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
    
    // 处理静态文件请求
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
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

// 启动服务器
server.listen(8000, () => {
    console.log('Server running at http://localhost:8000/');
    console.log('File upload endpoint available at http://localhost:8000/upload');
});