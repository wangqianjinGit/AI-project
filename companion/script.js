// DOM 元素 - 将在DOM加载完成后初始化
let chatMessages = null;
let startBtn = null;
let stopBtn = null;
let manualInputContainer = null;
let manualInput = null;
let sendBtn = null;

// 语音识别初始化
let recognition = null;
let isRecording = false;

// 语音合成初始化
let speechSynthesisUtterance = null;
let isSpeaking = false;

// 配置
// 请替换为您的API密钥
const DOBAO_API_KEY = 'bd747896-e89b-46f4-a5ab-0a232d086845'; // 豆包API密钥
const DOBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 豆包API URL
const ENDPOINT_ID = 'ep-20251015101857-wc8xz';

// OpenAI API 配置（作为备选）
const OPENAI_API_KEY = 'your-api-key-here'; // 请替换为您的OpenAI API密钥
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 检查浏览器支持
function checkBrowserSupport() {
    console.log('开始检查浏览器支持...');
    console.log('当前URL:', window.location.href);
    console.log('协议:', window.location.protocol);
    
    // 检查HTTPS连接状态
    if (window.location.protocol !== 'https:') {
        // HTTP环境提示
        addMessage('assistant', '注意：您正在使用HTTP连接。虽然我们会尝试启用语音识别功能，但根据浏览器安全策略，在HTTP环境下语音识别可能无法正常工作。\n\n建议：\n1. 如果是在本地测试，可以尝试使用localhost访问\n2. 长期使用请生成SSL证书并通过HTTPS访问\n3. 如果语音识别失败，请使用下方的文本输入框');
        
        // 在HTTP环境下显示手动输入框作为备选
        if (manualInputContainer) {
            manualInputContainer.style.display = 'block';
        }
    } else {
        console.log('已在HTTPS环境下运行，语音识别功能应该可以正常工作。');
    }
    
    // 检查语音识别支持
    console.log('检查语音识别支持...');
    console.log('webkitSpeechRecognition in window:', 'webkitSpeechRecognition' in window);
    console.log('SpeechRecognition in window:', 'SpeechRecognition' in window);
    
    if ('webkitSpeechRecognition' in window) {
        console.log('使用webkitSpeechRecognition');
        recognition = new webkitSpeechRecognition();
        setupRecognition();
    } else if ('SpeechRecognition' in window) {
        console.log('使用SpeechRecognition');
        recognition = new SpeechRecognition();
        setupRecognition();
    } else {
        console.error('浏览器不支持语音识别API');
        startBtn.disabled = true;
        stopBtn.disabled = true;
        addMessage('assistant', '抱歉，您的浏览器不支持语音识别功能');
        
        // 显示手动输入框
        if (manualInputContainer) {
            manualInputContainer.style.display = 'block';
        }
    }
    
    // 检查语音合成支持
    if ('speechSynthesis' in window) {
        speechSynthesisUtterance = new SpeechSynthesisUtterance();
        speechSynthesisUtterance.lang = 'zh-CN'; // 设置中文语音
    } else {
        addMessage('assistant', '注意：您的浏览器不支持语音合成功能');
    }
}

// 设置语音识别参数
function setupRecognition() {
    console.log('开始设置语音识别参数...');
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN'; // 设置中文识别
    
    console.log('语音识别参数设置完成:', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang
    });

    // 识别开始事件
    recognition.onstart = function() {
        console.log('语音识别已开始');
        isRecording = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // 停止正在播放的语音（如果有）
        if (isSpeaking) {
            window.speechSynthesis.cancel();
        }
        
        // 添加视觉反馈
        const recordingIndicator = document.createElement('div');
        recordingIndicator.id = 'recording-indicator';
        recordingIndicator.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: red; color: white; padding: 10px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; z-index: 1000;';
        recordingIndicator.textContent = '正在录音...';
        document.body.appendChild(recordingIndicator);
    };

    // 识别结束事件
    recognition.onend = function() {
        console.log('语音识别已结束');
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // 移除录音指示器
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
    };

    // 识别结果事件
    recognition.onresult = function(event) {
        console.log('语音识别结果事件触发:', event);
        if (event.results && event.results.length > 0 && event.results[0].length > 0) {
            const speechResult = event.results[0][0].transcript;
            console.log('识别到的文本:', speechResult);
            addMessage('user', speechResult);
            
            // 调用豆包API获取回复
            getDoubaoResponse(speechResult);
        } else {
            console.warn('未识别到有效结果');
            addMessage('assistant', '抱歉，我没有听清您说的话，请再试一次。');
        }
    };

    // 识别错误事件
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error, event);
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // 移除录音指示器
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
        
        // 根据错误类型提供更具体的提示
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            console.error('麦克风权限被拒绝:', window.location.protocol);
            if (window.location.protocol !== 'https:') {
                addMessage('assistant', '麦克风权限被拒绝。这很可能是由于浏览器在HTTP环境下的安全限制。\n\n解决方案：\n1. 尝试使用 localhost 而非 IP 地址访问本页面（某些浏览器允许localhost的HTTP使用麦克风）\n2. 生成SSL证书并通过HTTPS访问（推荐长期使用）\n3. 使用下方的文本输入框与我交流');
            } else {
                addMessage('assistant', '麦克风权限被拒绝。请在浏览器设置中允许本网站访问您的麦克风。\n\n操作步骤：\n1. 点击浏览器地址栏左侧的"锁"图标\n2. 在弹出的菜单中选择"网站设置"\n3. 找到"麦克风"选项，设置为"允许"\n4. 刷新页面后重试');
            }
            
            // 在权限错误时显示手动输入框
            if (manualInputContainer) {
                manualInputContainer.style.display = 'block';
            }
        } else if (event.error === 'no-speech') {
            console.error('未检测到语音输入');
            addMessage('assistant', '我没有检测到您的语音输入。请确保：\n1. 您的麦克风正常工作\n2. 您说话的声音足够大\n3. 环境噪音不要太大');
        } else if (event.error === 'audio-capture') {
            console.error('无法访问麦克风设备');
            addMessage('assistant', '无法访问您的麦克风设备。请确保：\n1. 麦克风已正确连接\n2. 没有其他程序正在占用麦克风\n3. 您的操作系统没有禁用麦克风');
        } else if (event.error === 'aborted') {
            console.error('语音识别被中止');
            // 通常是用户主动停止，不需要额外提示
        } else {
            console.error('未知的语音识别错误:', event.error);
            addMessage('assistant', '语音识别出现错误: ' + event.error);
            addMessage('assistant', '如果您在HTTP环境下使用，请尝试使用文本输入框，或通过HTTPS访问以获得最佳体验。');
        }
    };
}

// 添加消息到聊天界面
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
    messageDiv.textContent = content;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // 滚动到底部
    
    // 如果是助手的回复，并且不是"正在思考..."，则进行语音合成
    if (role === 'assistant' && content !== '正在思考...') {
        speakText(content);
    }
}

// 将文本转换为语音并播放
function speakText(text) {
    // 检查是否支持语音合成
    if (!('speechSynthesis' in window) || !speechSynthesisUtterance) {
        return;
    }
    
    // 停止之前的语音（如果正在播放）
    if (isSpeaking) {
        window.speechSynthesis.cancel();
    }
    
    try {
        // 设置语音内容和属性
        speechSynthesisUtterance.text = text;
        
        // 设置语音事件监听
        speechSynthesisUtterance.onstart = function() {
            isSpeaking = true;
        };
        
        speechSynthesisUtterance.onend = function() {
            isSpeaking = false;
        };
        
        speechSynthesisUtterance.onerror = function(event) {
            console.error('语音合成错误:', event.error);
            isSpeaking = false;
        };
        
        // 播放语音
        window.speechSynthesis.speak(speechSynthesisUtterance);
    } catch (error) {
        console.error('语音合成失败:', error);
    }
}

// 处理用户输入并生成响应
function processUserInput(input) {
    let response = '';
    
    // 简单的对话逻辑（当API不可用时使用）
    if (input.includes('你好') || input.includes('嗨') || input.includes('哈喽')) {
        response = '你好！有什么我可以帮助你的吗？';
    } else if (input.includes('名字') || input.includes('叫什么')) {
        response = '我是语音对话助手，很高兴认识你！';
    } else if (input.includes('时间') || input.includes('几点')) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        response = `现在是${hours}:${minutes}`;
    } else if (input.includes('再见') || input.includes('拜拜')) {
        response = '再见！祝你有美好的一天！';
    } else if (input.includes('帮助') || input.includes('怎么用')) {
        response = '你可以直接和我对话，我会使用豆包API来回答你的问题。';
    } else {
        response = `我听到你说：${input}`;
    }
    
    // 添加助手响应到聊天界面
    addMessage('assistant', response);
}

// 调用豆包API获取回复
async function getDoubaoResponse(userMessage) {
    // 显示正在思考的状态
    addMessage('assistant', '正在思考...');
    
    try {
        const response = await fetch(DOBAO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOBAO_API_KEY}`
            },
            body: JSON.stringify({
                model: ENDPOINT_ID,
                messages: [
                    { role: 'system', content: '你是一个有用的中文助手，回答要简洁明了。' },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 150,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        // 移除正在思考的消息
        chatMessages.removeChild(chatMessages.lastChild);
        
        if (data.choices && data.choices.length > 0) {
            const assistantResponse = data.choices[0].message.content;
            addMessage('assistant', assistantResponse);
        } else {
            addMessage('assistant', '抱歉，我无法生成回复。请稍后再试。');
        }
    } catch (error) {
        console.error('豆包API 调用错误:', error);
        // 移除正在思考的消息
        chatMessages.removeChild(chatMessages.lastChild);
        
        // 使用本地响应作为最终备选
        processUserInput(userMessage);
        addMessage('assistant', '（注意：API调用失败）');
    }
}

// 调用OpenAI API获取回复（作为备选）
async function getOpenAIResponse(userMessage) {
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // 或 'gpt-4' 如果你有访问权限
                messages: [
                    { role: 'system', content: '你是一个有用的中文助手，回答要简洁明了。' },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 150,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            const assistantResponse = data.choices[0].message.content;
            addMessage('assistant', assistantResponse);
        } else {
            throw new Error('OpenAI API 没有返回有效的回复');
        }
    } catch (error) {
        console.error('OpenAI API 调用错误:', error);
        throw error;
    }
}

// 发送手动输入的消息
function sendManualMessage() {
    const message = manualInput.value.trim();
    if (message) {
        addMessage('user', message);
        getDoubaoResponse(message);
        manualInput.value = '';
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 初始化DOM元素
    chatMessages = document.getElementById('chat-messages');
    startBtn = document.getElementById('start-btn');
    stopBtn = document.getElementById('stop-btn');
    manualInputContainer = document.getElementById('manual-input-container');
    manualInput = document.getElementById('manual-input');
    sendBtn = document.getElementById('send-btn');
    
    // 验证必要的DOM元素是否存在
    if (!chatMessages || !startBtn || !stopBtn) {
        console.error('关键DOM元素未找到，应用程序可能无法正常工作');
        // 尝试显示错误信息（如果可能）
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: red; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
        errorDiv.textContent = '应用程序初始化失败：关键UI元素未找到';
        document.body.appendChild(errorDiv);
        return;
    }
    
    // 初始化事件监听和功能
    initializeEventListeners();
    checkBrowserSupport();
    
    // 添加欢迎消息
    addMessage('assistant', '欢迎使用语音对话助手！您可以点击"开始录音"按钮进行语音对话，或者在下方的输入框中输入文字进行交流。');
});

// 初始化事件监听器
function initializeEventListeners() {
    // 开始录音按钮事件监听
    startBtn.addEventListener('click', function() {
        console.log('开始录音按钮被点击');
        console.log('recognition对象:', recognition);
        console.log('isRecording状态:', isRecording);
        console.log('当前URL协议:', window.location.protocol);
        
        if (!recognition) {
            console.error('recognition对象未初始化');
            addMessage('assistant', '抱歉，语音识别功能未初始化。请检查控制台了解详细信息。');
            return;
        }
        
        if (isRecording) {
            console.warn('录音已经在进行中');
            return;
        }
        
        // 在HTTP环境下给予用户提示，但仍允许尝试
        if (window.location.protocol !== 'https:') {
            // 创建一个临时的提示消息
            const tempMessage = document.createElement('div');
            tempMessage.classList.add('message');
            tempMessage.classList.add('assistant-message');
            tempMessage.textContent = '正在尝试启动语音识别...（在HTTP环境下可能需要特别授权）';
            tempMessage.style.opacity = '0.7';
            
            chatMessages.appendChild(tempMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // 2秒后自动移除这个临时提示
            setTimeout(() => {
                if (chatMessages.contains(tempMessage)) {
                    chatMessages.removeChild(tempMessage);
                }
            }, 2000);
        }
        
        try {
            console.log('尝试开始语音识别...');
            recognition.start();
            console.log('语音识别开始命令已发送');
        } catch (error) {
            console.error('开始语音识别时发生异常:', error);
            addMessage('assistant', '无法开启麦克风: ' + error.message);
        }
    });
    
    // 停止录音按钮事件监听
    stopBtn.addEventListener('click', function() {
        if (recognition && isRecording) {
            recognition.stop();
        }
    });
    
    // 手动输入功能
    if (manualInputContainer && manualInput && sendBtn) {
        // 发送按钮点击事件
        sendBtn.addEventListener('click', function() {
            sendManualMessage();
        });
        
        // 回车键发送
        manualInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendManualMessage();
            }
        });
    }
}