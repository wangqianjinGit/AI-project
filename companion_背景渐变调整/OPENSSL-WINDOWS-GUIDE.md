# Windows环境下OpenSSL安装和使用指南

从终端日志中我们注意到，您在尝试使用OpenSSL生成SSL证书时遇到了问题。这是因为Windows系统默认没有安装OpenSSL工具。本指南将帮助您在Windows环境下安装和使用OpenSSL来生成SSL证书，以便启用HTTPS支持。

## 方法一：使用Git Bash（推荐）

如果您已经安装了Git for Windows，最简单的方法是使用Git Bash来运行OpenSSL命令：

1. 安装Git for Windows（如果尚未安装）
   - 访问 [Git官网](https://git-scm.com/download/win) 下载最新版本的Git
   - 按照安装向导完成安装

2. 打开Git Bash
   - 在开始菜单中搜索并打开"Git Bash"

3. 生成SSL证书
   - 在Git Bash中，导航到您的项目目录：
     ```bash
     cd /d/trae/companion
     ```
   - 运行以下命令生成自签名证书：
     ```bash
     openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
     ```
   - 按照提示填写证书信息（可以全部按回车使用默认值）

4. 完成后，您将在项目目录中看到生成的`key.pem`和`cert.pem`文件

## 方法二：安装独立的OpenSSL

如果您需要在命令提示符(cmd)或PowerShell中使用OpenSSL，可以安装独立的OpenSSL版本：

1. 下载Win32/Win64 OpenSSL
   - 访问 [Win32/Win64 OpenSSL下载页面](https://slproweb.com/products/Win32OpenSSL.html)
   - 下载适合您系统的版本（通常选择"Win64 OpenSSL v3.1.x Light"）

2. 安装OpenSSL
   - 运行下载的安装程序
   - 在安装过程中，选择"The OpenSSL binaries (/bin) directory"选项
   - 完成安装

3. 配置环境变量
   - 右键点击"此电脑" > "属性" > "高级系统设置" > "环境变量"
   - 在"系统变量"中找到"Path"，点击"编辑"
   - 点击"新建"，添加OpenSSL的bin目录路径（通常是`C:\Program Files\OpenSSL-Win64\bin`）
   - 点击"确定"保存所有更改

4. 验证安装
   - 打开新的命令提示符或PowerShell窗口
   - 运行以下命令验证OpenSSL安装：
     ```cmd
     openssl version
     ```
   - 如果显示版本信息，则表示安装成功

5. 生成SSL证书
   - 导航到您的项目目录：
     ```cmd
     cd d:\trae\companion
     ```
   - 运行以下命令生成自签名证书：
     ```cmd
     openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
     ```
   - 按照提示填写证书信息

## 启动HTTPS服务器

生成证书后，您可以使用以下命令启动支持HTTPS的服务器：

```bash
node server-https.js
```

这将同时启动：
- HTTP服务器：http://localhost:8000/
- HTTPS服务器：https://localhost:8443/

## 浏览器安全警告

由于使用的是自签名证书，当您首次访问HTTPS网站时，浏览器会显示安全警告。这是正常现象，您可以选择"继续前往"或"高级" > "继续访问"来信任该证书。

## 注意事项

1. 自签名证书仅适用于开发和测试环境，不应用于生产环境
2. 证书有效期为365天，过期后需要重新生成
3. 请妥善保管生成的`key.pem`文件，不要泄露给他人
4. 如果您在使用过程中遇到问题，可以随时回退到使用HTTP服务器：
   ```bash
   node server.js
   ```

如果您有任何疑问或需要进一步的帮助，请随时参考OpenSSL的官方文档。