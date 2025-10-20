# H5语音对话项目

这是一个基于Web Speech API和豆包API的H5语音对话项目，使用原生HTML、CSS和JavaScript开发。项目支持调用豆包API获取智能回复，并提供OpenAI API作为备选方案。

## 功能特性

- **语音识别**：通过Web Speech API的SpeechRecognition接口识别用户的语音输入
- **语音合成**：通过Web Speech API的SpeechSynthesis接口将文本回复转换为语音并播放
- **智能对话**：通过豆包API（doubao-seed-1-6-250615）获取智能回复，提供更自然、更准确的对话体验
- **API备选机制**：当豆包API调用失败时，自动尝试使用OpenAI API作为备选
- **本地备选方案**：当所有API都不可用时，使用本地简单对话逻辑
- **实时交互**：用户可以通过语音与系统进行流畅对话
- **响应式设计**：适配不同屏幕尺寸的设备
- **现代UI**：简洁美观的界面设计
- **局域网访问**：支持通过局域网IP地址访问应用

## 技术栈

- HTML5
- CSS3
- JavaScript (原生)
- Web Speech API
- 豆包API (doubao-seed-1-6-250615)
- OpenAI API (作为备选)

## 文件结构

```
companion/
├── index.html       # 主页面
├── style.css        # 样式文件
├── script.js        # 核心功能实现
└── README.md        # 项目说明
```

## 使用方法

### 前提条件
- 您需要拥有豆包API密钥。如果没有，请获取相关API访问权限。
- 可选：您也可以准备OpenAI API密钥作为备选。
- 使用支持Web Speech API的现代浏览器（如Chrome、Edge等）
- 建议使用HTTPS环境以获得完整的语音识别功能

### 配置步骤
1. 打开`script.js`文件，找到以下行并替换为您的API密钥：
   ```javascript
   // 请替换为您的API密钥
   const DOBAO_API_KEY = 'your-api-key-here'; // 豆包API密钥
   const DOBAO_API_URL = 'https://api.doubao.com/v1/chat/completions'; // 豆包API URL
   
   // OpenAI API 配置（作为备选）
   const OPENAI_API_KEY = 'your-api-key-here'; // 请替换为您的OpenAI API密钥
   ```

2. 保存文件后，使用Node.js启动服务器：
   
   **使用HTTP服务器（简单方式）：**
   ```bash
   node server.js
   ```
   然后在浏览器中访问`http://localhost:8000/`，或通过局域网IP地址访问（如`http://192.168.x.x:8000/`）
   
   **使用HTTPS服务器（推荐方式）：**
   
   首先，生成SSL证书（需要安装OpenSSL）：
   ```bash
   # Windows用户可以使用Git Bash或WSL运行以下命令
   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
   ```
   
   然后启动HTTPS服务器：
   ```bash
   node server-https.js
   ```
   这样会同时启动HTTP服务（http://localhost:8000/）和HTTPS服务（https://localhost:8443/）

   > 注意：自签名证书在浏览器中可能会显示安全警告，您可以选择信任该证书以继续使用。

### 对话步骤
1. 点击"开始录音"按钮，说出您的问题或指令
2. 系统会自动识别您的语音并优先通过豆包API获取智能回复
3. 回复内容将显示在聊天界面中，同时系统会自动将回复文本转换为语音并播放

### 语音合成说明
- 系统会自动将所有助手回复（除了"正在思考..."状态消息）转换为语音并播放
- 当开始新的录音时，系统会自动停止正在播放的语音
- 如果浏览器不支持语音合成功能，系统会显示提示信息但不影响其他功能正常使用

### 注意事项
- 系统采用三级回复机制：首先尝试豆包API，失败则尝试OpenAI API，最后使用本地简单对话逻辑
- 系统会在聊天界面显示"正在思考..."状态，直到获取到回复
- 当使用备选方案时，系统会在回复中显示相应提示信息
- 为了获得完整功能和更好的用户体验，建议在HTTPS环境下使用该应用

## 支持的对话类型

由于集成了OpenAI API，系统可以回答各种类型的问题，包括但不限于：

- 日常对话：问候、聊天、告别等
- 信息查询：时间、日期、常识问题等
- 学习帮助：解释概念、提供建议等
- 创意生成：写作、诗歌、故事创作等
- 技术支持：编程问题、技术解释等

系统会根据您的具体问题生成相应的智能回复。

## 浏览器兼容性

Web Speech API在不同浏览器中的支持情况有所不同：

- **Chrome**：完全支持
- **Edge**：支持
- **Firefox**：部分支持
- **Safari**：支持
- **iOS Safari**：支持
- **Android Browser**：支持

请注意，使用语音识别功能可能需要用户授权麦克风访问权限。

## 注意事项
1. 使用前请确保您的设备已连接麦克风和扬声器
2. 在安静的环境中使用可以获得更好的识别效果
3. 某些浏览器可能需要在HTTPS环境下才能使用全部功能
4. 语音合成的效果可能因浏览器、操作系统和设备而异

## 扩展建议

1. 添加对话历史管理功能，让OpenAI能够基于上下文理解多轮对话
2. 优化API调用错误处理和重试机制
3. 添加语音识别的置信度显示
4. 实现本地缓存机制，减少API调用频率
5. 添加多语言支持，扩展应用范围
6. 考虑使用其他AI服务提供商作为备选或补充