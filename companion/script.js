// DOM 元素 - 将在DOM加载完成后初始化
let chatMessages = null;
let startBtn = null;
let manualInputContainer = null;
let manualInput = null;
let sendBtn = null;
let responseTextarea = null;

// 流式输出相关变量
let isStreaming = false;
let currentStreamingMessage = null;
let abortController = null;

// 语音识别初始化
let recognition = null;
let isRecording = false;
let recognitionTimeout = null; // 添加超时计时器

// 语音合成初始化
let speechSynthesisUtterance = null;
let isSpeaking = false;
let voicesLoaded = false;
let voicesTimeout = null;

// 实时语音播放相关变量
let pendingSpeechText = ''; // 待播放的文本缓冲
let speechQueue = []; // 语音队列
let isPlayingQueue = false; // 是否正在播放队列

// 配置
// 请替换为您的API密钥
const DOBAO_API_KEY = 'bd747896-e89b-46f4-a5ab-0a232d086845'; // 豆包API密钥
const DOBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 豆包API URL
const ENDPOINT_ID = 'ep-20251015101857-wc8xz';
// 角色设定
let characterContent = '';

// 获取性格特质的显示文本
function getPersonalityDisplayText(personality) {
    const personalityMap = {
        'life': '外向活泼',
        'learn': '内向沉思',
        'growth': '理性思考',
        'emotion': '感性体贴'
    };
    return personalityMap[personality] || '未知';
}

// 检测当前访问方式并选择合适的存储策略
function getStorageStrategy() {
    // 始终使用localStorage存储，不再使用服务器存储
    return 'localStorage';
}

// 获取API基础URL
function getApiBaseUrl() {
    // 获取当前协议和主机名
    const protocol = window.location.protocol;
    const host = window.location.host;
    
    // 构建并返回基础URL
    return `${protocol}//${host}`;
}
// 从localStorage获取性格特质
function getPersonalityFromLocalStorage() {
    try {
        // 首先尝试从页面的下拉框获取当前选中的值
        const personalityDisplay = document.getElementById('personality-display');
        if (personalityDisplay && personalityDisplay.value) {
            console.log('从下拉框获取到性格特质:', personalityDisplay.value);
            return personalityDisplay.value;
        }
        
        // 如果下拉框不存在或没有值,则从localStorage读取
        const storedPersonality = localStorage.getItem('userPersonality') || 'life';
        console.log('从localStorage获取到性格特质:', storedPersonality);
        return storedPersonality;
    } catch (error) {
        console.error('从localStorage获取性格特质失败:', error);
        return 'life'; // 出错时也返回默认值
    }
}            

// 从服务器获取性格特质
async function getPersonalityFromServer() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/user/personality`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('服务器返回的不是有效的JSON数据');
        }
        
        const data = await response.json();
        if (response.ok) {
            // 服务器返回的格式是 { personality: '...' }
            return data.personality || 'life'; // 默认返回'life'
        } else {
            throw new Error(data.error || '获取性格特质失败');
        }
    } catch (error) {
        console.error('从服务器获取性格特质出错:', error);
        return 'life'; // 出错时也返回默认值
    }
}

// 从文件中读取角色设定
async function loadCharacterSetting() {
    try {
        // getStorageStrategy不是异步函数，不需要await
        const strategy = getStorageStrategy();
        let personality = 'life'; // 默认值
        
        if (strategy === 'localStorage') {
            // getPersonalityFromLocalStorage也不是异步函数
            personality = getPersonalityFromLocalStorage();
        } else {
            // getPersonalityFromServer现在是异步函数，需要await
            personality = await getPersonalityFromServer();
        }
        
        console.log('当前性格特质:', personality);
        
        try {
            const response = await fetch('/character/' + personality + '.txt');
            if (!response.ok) {
                throw new Error('Failed to load character setting file');
            }
            characterContent = await response.text();
            console.log('角色设定已成功加载');
        } catch (error) {
            console.error('加载角色设定失败:', error);
            // 使用默认的角色设定作为备用
            characterContent = '#角色定位 你是专为大学生设计的「生活伴」智能体，定位为「全能生活助理+校园向导」。核心使命是通过智能化的生活管理工具和场景化服务，帮助学生高效处理日常琐事，构建健康有序的校园生活。你需要像贴心室友一样熟悉用户的生活习惯，提供及时实用的生活建议，成为用户校园生活的得力帮手。';
        }
    } catch (error) {
        console.error('加载性格特质时发生错误:', error);
        // 确保即使出错也有默认的角色设定
        characterContent = '#角色定位 你是专为大学生设计的「生活伴」智能体，定位为「全能生活助理+校园向导」。核心使命是通过智能化的生活管理工具和场景化服务，帮助学生高效处理日常琐事，构建健康有序的校园生活。你需要像贴心室友一样熟悉用户的生活习惯，提供及时实用的生活建议，成为用户校园生活的得力帮手。';
    }
}

// OpenAI API 配置（作为备选）
const OPENAI_API_KEY = 'your-api-key-here'; // 请替换为您的OpenAI API密钥
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 检查浏览器支持
function checkBrowserSupport() {
    console.log('开始检查浏览器支持...');
    console.log('当前URL:', window.location.href);
    console.log('协议:', window.location.protocol);
    
    // 检测是否是移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('是否是移动设备:', isMobile);
    
    if (isMobile) {
        addMessage('assistant', '检测到您正在使用移动设备。为了获得最佳体验，请确保：\n1. 允许网站访问您的麦克风\n2. 使用HTTPS连接\n3. 如果语音识别不稳定，可以尝试使用下方的文本输入框');
    }
    
    // 检查HTTPS连接状态
    if (window.location.protocol !== 'https:') {
        
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
        setupRecognition(isMobile);
    } else if ('SpeechRecognition' in window) {
        console.log('使用SpeechRecognition');
        recognition = new SpeechRecognition();
        setupRecognition(isMobile);
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
        
        // 初始化语音列表
        setupVoiceList();
    } else {
        addMessage('assistant', '注意：您的浏览器不支持语音合成功能');
    }
}

// 设置语音识别参数
function setupRecognition(isMobile) {
    console.log('开始设置语音识别参数...');
    console.log('移动设备模式:', isMobile);
    
    // 移动设备优化配置
    if (isMobile) {
        // 在移动设备上，continuous设为true通常效果更好
        recognition.continuous = true;
        // 移动设备上启用interimResults可以提高响应速度
        recognition.interimResults = true;
        // 移动设备上设置更短的识别超时时间
        recognition.maxAlternatives = 1;
    } else {
        recognition.continuous = false;
        recognition.interimResults = false;
    }
    
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
        startBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;">
                <defs>
                    <linearGradient id="stopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#ee5a6f;stop-opacity:1" />
                    </linearGradient>
                    <filter id="stopShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.4"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <!-- 停止按钮主体 -->
                <rect x="7" y="7" width="10" height="10" rx="2" fill="url(#stopGradient)" filter="url(#stopShadow)"/>
                <!-- 3D效果 - 顶部高光 -->
                <rect x="8" y="8" width="8" height="2" rx="1" fill="rgba(255,255,255,0.4)"/>
                <!-- 3D效果 - 侧面阴影 -->
                <rect x="15" y="9" width="2" height="8" rx="1" fill="rgba(0,0,0,0.2)"/>
                <rect x="9" y="15" width="8" height="2" rx="1" fill="rgba(0,0,0,0.2)"/>
            </svg>
        `;
        startBtn.disabled = false;
        
        // 清除之前的超时计时器（如果有）
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
        }
        
        // 添加移动设备专用的超时机制（5秒无声音自动停止）
        if (isMobile) {
            recognitionTimeout = setTimeout(function() {
                if (isRecording) {
                    console.log('语音识别超时，自动停止');
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('超时停止录音时出错:', e);
                        // 强制更新状态
                        forceStopRecording();
                    }
                }
            }, 5000); // 5秒无声音自动停止
        }
        
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
        
        // 清除超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        isRecording = false;
        startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><defs><linearGradient id="micGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" /></linearGradient><filter id="shadow"><feGaussianBlur in="SourceAlpha" stdDeviation="1"/><feOffset dx="0" dy="1" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="12" cy="8" rx="4" ry="6" fill="url(#micGradient)" filter="url(#shadow)"/><path d="M 12 14 Q 12 16, 12 16" stroke="url(#micGradient)" stroke-width="2" fill="none" filter="url(#shadow)"/><path d="M 8 12 Q 8 16, 12 16 Q 16 16, 16 12" stroke="url(#micGradient)" stroke-width="1.5" fill="none" filter="url(#shadow)"/><line x1="9" y1="16" x2="15" y2="16" stroke="url(#micGradient)" stroke-width="2" stroke-linecap="round" filter="url(#shadow)"/><rect x="11" y="16" width="2" height="3" fill="url(#micGradient)" filter="url(#shadow)"/><rect x="10" y="19" width="4" height="1.5" rx="0.5" fill="url(#micGradient)" filter="url(#shadow)"/><ellipse cx="10.5" cy="6" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/></svg>';
        startBtn.disabled = false;
        
        // 移除录音指示器
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
        
        // 在移动设备上，当recognition自动结束后，重置状态以便下次使用
        if (recognition.continuous) {
            console.log('重置移动设备上的语音识别状态');
        }
    };

    // 识别结果事件
    recognition.onresult = function(event) {
        console.log('语音识别结果事件触发:', event);
        
        // 清除之前的超时计时器（有声音输入，重新计时）
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
        }
        
        // 添加新的超时计时器
        if (isMobile) {
            recognitionTimeout = setTimeout(function() {
                if (isRecording) {
                    console.log('语音识别超时，自动停止');
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('超时停止录音时出错:', e);
                        // 强制更新状态
                        forceStopRecording();
                    }
                }
            }, 5000); // 5秒无声音自动停止
        }
        
        // 处理interimResults和finalResults
        for (let i = event.resultIndex; i < event.results.length; i++) {
            // 只有当结果是最终结果时才处理
            if (event.results[i].isFinal) {
                const speechResult = event.results[i][0].transcript;
                console.log('识别到的文本:', speechResult);
                addMessage('user', speechResult);
                
                // 在移动设备上，当识别到最终结果后自动停止录音
                if (isMobile) {
                    console.log('在移动设备上检测到最终结果，自动停止录音');
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('识别结果后停止录音时出错:', e);
                        // 强制更新状态
                        forceStopRecording();
                    }
                }
                
                // 调用豆包API获取回复
                getDoubaoResponse(speechResult);
                
                // 如果是连续模式，需要手动停止
                if (recognition.continuous) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('连续模式停止录音时出错:', e);
                        // 强制更新状态
                        forceStopRecording();
                    }
                }
            }
        }
    };

    // 识别错误事件 - 新增
    recognition.onerror = function(event) {
        console.error('语音识别发生错误:', event.error);
        
        // 清除超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        // 错误处理
        let errorMessage = '语音识别出错';
        switch (event.error) {
            case 'no-speech':
                errorMessage = '没有检测到语音输入';
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风，请确保已授予权限';
                break;
            case 'not-allowed':
                errorMessage = '麦克风访问被拒绝';
                break;
            case 'aborted':
                console.log('语音识别被中止');
                break;
            case 'network':
                errorMessage = '网络错误，请稍后再试';
                break;
            case 'service-not-allowed':
                errorMessage = '浏览器不允许语音识别服务';
                break;
            case 'bad-grammar':
                errorMessage = '语音识别语法错误';
                break;
            case 'language-not-supported':
                errorMessage = '不支持的语言';
                break;
            default:
                errorMessage = `未知错误: ${event.error}`;
        }
        
        // 在非中止错误的情况下显示错误消息
        if (event.error !== 'aborted') {
            addMessage('assistant', errorMessage);
        }
        
        // 强制更新状态
        forceStopRecording();
    };
};

// 强制停止录音并更新状态 - 新增函数
function forceStopRecording() {
    console.log('强制停止录音并更新状态');
    
    isRecording = false;
    startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><defs><linearGradient id="micGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" /></linearGradient><filter id="shadow"><feGaussianBlur in="SourceAlpha" stdDeviation="1"/><feOffset dx="0" dy="1" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="12" cy="8" rx="4" ry="6" fill="url(#micGradient)" filter="url(#shadow)"/><path d="M 12 14 Q 12 16, 12 16" stroke="url(#micGradient)" stroke-width="2" fill="none" filter="url(#shadow)"/><path d="M 8 12 Q 8 16, 12 16 Q 16 16, 16 12" stroke="url(#micGradient)" stroke-width="1.5" fill="none" filter="url(#shadow)"/><line x1="9" y1="16" x2="15" y2="16" stroke="url(#micGradient)" stroke-width="2" stroke-linecap="round" filter="url(#shadow)"/><rect x="11" y="16" width="2" height="3" fill="url(#micGradient)" filter="url(#shadow)"/><rect x="10" y="19" width="4" height="1.5" rx="0.5" fill="url(#micGradient)" filter="url(#shadow)"/><ellipse cx="10.5" cy="6" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/></svg>';
    startBtn.disabled = false;
    
    // 移除录音指示器
    const recordingIndicator = document.getElementById('recording-indicator');
    if (recordingIndicator) {
        document.body.removeChild(recordingIndicator);
    }
    
    // 清除超时计时器
    if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        recognitionTimeout = null;
    }
    
    // 确保recognition停止
    try {
        if (recognition) {
            // 对于vivo手机的特殊处理：尝试重置recognition对象
            if (/vivo/i.test(navigator.userAgent)) {
                console.log('vivo手机特殊处理：重新初始化recognition对象');
                const tempIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // 先尝试停止，然后重新设置recognition
                try {
                    recognition.stop();
                } catch (e) {
                    console.log('重新停止recognition时出错:', e);
                }
                
                // 重新初始化recognition对象
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                } else if ('SpeechRecognition' in window) {
                    recognition = new SpeechRecognition();
                }
                
                // 重新设置参数
                setupRecognition(tempIsMobile);
            } else {
                recognition.stop();
            }
        }
    } catch (e) {
        console.log('强制停止recognition时出错:', e);
    }
}

// 增强的滚动到底部函数
function scrollToBottom() {
    // 确保chatMessages元素存在
    if (!chatMessages) {
        console.error('chatMessages元素未找到');
        return;
    }
    
    // 保存当前尝试次数
    let attemptCount = 0;
    const maxAttempts = 3;
    
    // 核心滚动函数
    const tryScroll = () => {
        attemptCount++;
        
        try {
            const currentScrollTop = chatMessages.scrollTop;
            const targetScrollTop = chatMessages.scrollHeight - chatMessages.clientHeight;
            
            // 记录滚动前的状态
            console.log(`滚动尝试 #${attemptCount}:`, {
                currentScrollTop: currentScrollTop,
                targetScrollTop: targetScrollTop,
                scrollHeight: chatMessages.scrollHeight,
                clientHeight: chatMessages.clientHeight
            });
            
            // 尝试直接滚动
            chatMessages.scrollTop = targetScrollTop;
            
            // 检查滚动是否成功（允许1px的误差）
            if (Math.abs(chatMessages.scrollTop - targetScrollTop) <= 1) {
                console.log(`滚动到底部成功 (尝试 #${attemptCount})`);
                return true;
            } else {
                console.warn(`滚动不完全成功 (尝试 #${attemptCount}): 从 ${currentScrollTop} 到 ${chatMessages.scrollTop}, 目标 ${targetScrollTop}`);
                
                // 如果还未达到最大尝试次数，继续尝试
                if (attemptCount < maxAttempts) {
                    // 尝试使用scrollIntoView作为备选
                    if (chatMessages.lastChild && chatMessages.lastChild.scrollIntoView) {
                        console.log('尝试使用lastChild.scrollIntoView作为备选');
                        chatMessages.lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                    return false;
                } else {
                    console.error('已达到最大滚动尝试次数，仍然无法完全滚动到底部');
                    return false;
                }
            }
        } catch (e) {
            console.error(`滚动尝试 #${attemptCount} 失败:`, e);
            return attemptCount >= maxAttempts;
        }
    };
    
    // 立即尝试第一次滚动
    if (tryScroll()) {
        return;
    }
    
    // 第一次延时尝试（0ms后，确保DOM更新）
    setTimeout(() => {
        if (tryScroll()) {
            return;
        }
        
        // 第二次延时尝试（100ms后）
        setTimeout(() => {
            tryScroll();
            
            // 最终保障：无论之前是否成功，200ms后再尝试一次
            setTimeout(() => {
                try {
                    console.log('最终滚动保障尝试');
                    chatMessages.scrollTop = chatMessages.scrollHeight - chatMessages.clientHeight;
                } catch (e) {
                    console.error('最终滚动保障尝试失败:', e);
                }
            }, 200);
        }, 100);
    }, 0);
}

// 添加消息到聊天界面
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
    messageDiv.textContent = content;
    
    chatMessages.appendChild(messageDiv);
    
    // 调用滚动到底部函数
    scrollToBottom();
    
    // 如果是助手的回复，并且不是"正在思考..."，则进行语音合成
    if (role === 'assistant' && content !== '正在思考...') {
        speakText(content);
    }
}

// 将文本转换为语音并播放
// 实时语音播放函数 - 处理流式文本并分句播放
function speakTextRealtime(content) {
    // 将内容添加到待播放缓冲区
    pendingSpeechText += content;
    
    // 定义句子结束符号
    const sentenceEndings = /[。!?!?;；\n]/;
    
    // 检查是否有完整的句子
    const match = pendingSpeechText.match(sentenceEndings);
    if (match) {
        // 找到句子结束位置
        const endIndex = match.index + 1;
        const completeSentence = pendingSpeechText.substring(0, endIndex).trim();
        
        // 如果句子不为空,添加到语音队列
        if (completeSentence) {
            speechQueue.push(completeSentence);
            console.log('添加句子到语音队列:', completeSentence);
            
            // 如果当前没有在播放队列,开始播放
            if (!isPlayingQueue) {
                playSpeechQueue();
            }
        }
        
        // 更新待播放文本,移除已处理的句子
        pendingSpeechText = pendingSpeechText.substring(endIndex);
    }
}

// 播放语音队列
function playSpeechQueue() {
    if (speechQueue.length === 0) {
        isPlayingQueue = false;
        return;
    }
    
    isPlayingQueue = true;
    const text = speechQueue.shift();
    
    // 使用修改后的speakText播放,并在播放完成后继续队列
    speakTextWithCallback(text, () => {
        // 播放完成后,继续播放队列中的下一个
        playSpeechQueue();
    });
}

// 带回调的语音播放函数
function speakTextWithCallback(text, callback) {
    if (!('speechSynthesis' in window) || !speechSynthesisUtterance) {
        console.log('设备不支持语音合成');
        if (callback) callback();
        return;
    }
    
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        utterance.lang = 'zh-CN';
        utterance.rate = isMobile ? 0.9 : 1;
        utterance.pitch = isMobile ? 1.1 : 1;
        utterance.volume = 1;
        
        // 选择中文语音
        const voices = window.speechSynthesis.getVoices();
        const chineseVoices = voices.filter(voice => 
            voice.lang === 'zh-CN' || voice.lang === 'zh' || voice.name.includes('Chinese')
        );
        
        if (chineseVoices.length > 0) {
            const femaleVoice = chineseVoices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') || 
                voice.name.toLowerCase().includes('girl') ||
                voice.name.includes('女')
            );
            utterance.voice = femaleVoice || chineseVoices[0];
        }
        
        utterance.onend = function() {
            console.log('语音播放完成:', text.substring(0, 20) + '...');
            if (callback) callback();
        };
        
        utterance.onerror = function(event) {
            console.error('语音播放错误:', event.error);
            if (callback) callback();
        };
        
        window.speechSynthesis.speak(utterance);
        
    } catch (error) {
        console.error('语音播放失败:', error);
        if (callback) callback();
    }
}

function speakText(text) {
    // 检查是否支持语音合成
    if (!('speechSynthesis' in window) || !speechSynthesisUtterance) {
        console.log('设备不支持语音合成');
        return;
    }
    
    // 停止之前的语音（如果正在播放）
    if (isSpeaking) {
        window.speechSynthesis.cancel();
    }
    
    try {
        // 检测是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('语音合成 - 移动设备模式:', isMobile);
        
        // 创建新的utterance实例，避免状态冲突
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = text;
        utterance.lang = 'zh-CN'; // 设置中文语音
        
        // 移动设备特定优化
        if (isMobile) {
            // 在移动设备上，使用更低的语速以提高清晰度
            utterance.rate = 0.9;
            // 移动设备上使用稍高的音调以提高可辨识度
            utterance.pitch = 1.1;
        } else {
            utterance.rate = 1;
            utterance.pitch = 1;
        }
        
        // 设置音量
        utterance.volume = 1; // 0到1之间的值
        
        // 尝试为移动设备选择合适的语音
        const voices = window.speechSynthesis.getVoices();
        const chineseVoices = voices.filter(voice => 
            voice.lang === 'zh-CN' || voice.lang === 'zh' || voice.name.includes('Chinese')
        );
        
        if (chineseVoices.length > 0) {
            // 优先选择女性声音（通常更清晰）
            const femaleVoice = chineseVoices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') || 
                voice.name.toLowerCase().includes('girl') ||
                voice.name.includes('女')
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
                console.log('选择了女性中文语音:', femaleVoice.name);
            } else {
                utterance.voice = chineseVoices[0];
                console.log('选择了默认中文语音:', chineseVoices[0].name);
            }
        } else {
            console.log('没有找到中文语音，使用默认语音');
        }
        
        // 设置语音事件监听
        utterance.onstart = function() {
            console.log('语音合成开始播放');
            isSpeaking = true;
        };
        
        utterance.onend = function() {
            console.log('语音合成播放完成');
            isSpeaking = false;
        };
        
        utterance.onerror = function(event) {
            console.error('语音合成错误:', event.error);
            isSpeaking = false;
            
            // 根据不同的错误类型提供具体提示
            if (event.error === 'canceled') {
                console.log('语音播放被取消');
            } else if (event.error === 'interrupted') {
                console.log('语音播放被中断');
            } else if (event.error === 'not-allowed') {
                console.error('语音播放权限被拒绝');
            } else if (event.error === 'service-not-available') {
                console.error('语音服务不可用');
            }
        };
        
        // 播放语音
        // 在移动设备上，我们使用setTimeout来确保异步执行
        setTimeout(() => {
            // 移动设备上的特殊处理：如果第一次播放失败，尝试第二次
            const playVoice = () => {
                try {
                    console.log('尝试播放语音');
                    window.speechSynthesis.speak(utterance);
                    console.log('语音合成请求已发送');
                } catch (error) {
                    console.error('第一次语音播放失败:', error);
                    // 移动设备上尝试第二次
                    if (isMobile) {
                        console.log('移动设备上尝试第二次播放语音');
                        setTimeout(() => {
                            try {
                                window.speechSynthesis.speak(utterance);
                            } catch (secondError) {
                                console.error('第二次语音播放也失败:', secondError);
                                isSpeaking = false;
                                // 可选：在UI上显示语音播放失败的提示
                            }
                        }, 300);
                    } else {
                        isSpeaking = false;
                    }
                }
            };
            
            // 检查语音合成是否准备就绪
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setTimeout(playVoice, 100);
            } else {
                playVoice();
            }
        }, 0);
        
    } catch (error) {
        console.error('语音合成失败:', error);
        isSpeaking = false;
    }
}

// 添加语音加载完成事件监听（确保获取可用语音列表）
function setupVoiceList() {
    if ('speechSynthesis' in window) {
        // 移动设备上添加特殊的语音加载处理
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 主动触发一次获取语音列表的操作
        const getVoicesWithTimeout = () => {
            const voices = window.speechSynthesis.getVoices();
            
            if (voices.length > 0 && !voicesLoaded) {
                voicesLoaded = true;
                console.log('找到可用语音:', voices.length, '种');
                
                // 移动设备上可能需要更多语音初始化操作
                if (isMobile) {
                    console.log('移动设备上完成语音列表加载');
                }
            }
        };
        
        // 立即尝试获取一次
        getVoicesWithTimeout();
        
        // 添加事件监听
        window.speechSynthesis.onvoiceschanged = function() {
            console.log('可用语音列表已更新');
            getVoicesWithTimeout();
        };
        
        // 设置超时，确保即使onvoiceschanged没有触发，也能获取语音列表
        voicesTimeout = setTimeout(() => {
            if (!voicesLoaded) {
                console.log('语音列表加载超时，强制获取一次');
                getVoicesWithTimeout();
            }
        }, 3000); // 3秒超时
        
        // 在移动设备上，我们可以尝试先播放一个非常短的无声语音来"预热"语音合成引擎
        if (isMobile) {
            console.log('移动设备上预热语音合成引擎');
            const warmupUtterance = new SpeechSynthesisUtterance('');
            warmupUtterance.volume = 0;
            try {
                window.speechSynthesis.speak(warmupUtterance);
            } catch (e) {
                console.log('预热语音合成引擎失败:', e);
            }
        }
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

// 调用豆包API获取回复（流式输出）
async function getDoubaoResponse(userMessage) {
    // 检查是否已经在流式输出中
    if (isStreaming) {
        console.log('已有流式输出正在进行中');
        return;
    }
    
    // 每次调用API前重新加载角色设定
    await loadCharacterSetting();
    console.log('已重新加载角色设定，当前characterContent长度:', characterContent.length);
    
    // 创建新的AbortController用于终止请求
    abortController = new AbortController();
    isStreaming = true;
    
    // 重置语音相关变量
    pendingSpeechText = '';
    speechQueue = [];
    isPlayingQueue = false;
    // 停止之前的语音播放
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // 更新发送按钮为终止按钮
    if (sendBtn) {
        sendBtn.textContent = '终止';
        sendBtn.style.backgroundColor = '#dc3545';
        sendBtn.onclick = stopStreamingOutput;
    }
    
    // 创建助手消息容器，显示"思考中......"
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'assistant-message');
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = '思考中......';  // 初始显示思考中
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    currentStreamingMessage = contentDiv;
    scrollToBottom();
    
    let fullResponse = '';
    let isFirstContent = true;  // 标记是否是第一次收到内容
    
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
                    { role: 'system', content: characterContent },
                    { role: 'user', content: userMessage }
                ],
                // max_tokens: 500,
                temperature: 0.7,
                stream: true  // 启用流式输出
            }),
            signal: abortController.signal  // 添加终止信号
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('流式输出完成');
                break;
            }
            
            // 解码数据块
            buffer += decoder.decode(value, { stream: true });
            
            // 处理SSE格式的数据
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    
                    if (data === '[DONE]') {
                        console.log('收到结束标记');
                        continue;
                    }
                    
                    try {
                        const json = JSON.parse(data);
                        if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                            const content = json.choices[0].delta.content;
                            
                            // 第一次收到内容时，清除"思考中......"提示
                            if (isFirstContent) {
                                fullResponse = content;
                                isFirstContent = false;
                            } else {
                                fullResponse += content;
                            }
                            
                            // 实时更新显示
                            if (currentStreamingMessage) {
                                currentStreamingMessage.textContent = fullResponse;
                                
                                // 同时更新文本区域
                                if (responseTextarea) {
                                    responseTextarea.value = fullResponse;
                                }
                                
                                scrollToBottom();
                            }
                            
                            // 实时语音播放:检查是否有完整的句子
                            speakTextRealtime(content);
                        }
                    } catch (e) {
                        console.error('解析SSE数据错误:', e, '数据:', data);
                    }
                }
            }
        }
        
        // 流式输出完成后，播放剩余的文本
        if (pendingSpeechText && pendingSpeechText.trim()) {
            speakText(pendingSpeechText);
            pendingSpeechText = '';
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('流式输出已被用户终止');
            if (currentStreamingMessage) {
                currentStreamingMessage.textContent += '\n\n[已终止]';
            }
        } else {
            console.error('豆包API流式调用错误:', error);
            if (currentStreamingMessage) {
                currentStreamingMessage.textContent = '抱歉，获取回复时出错了。';
            }
        }
    } finally {
        // 重置状态
        isStreaming = false;
        currentStreamingMessage = null;
        abortController = null;
        
        // 恢复发送按钮
        if (sendBtn) {
            sendBtn.textContent = '发送';
            sendBtn.style.backgroundColor = '#007bff';
            sendBtn.onclick = sendManualMessage;
        }
    }
}

// 终止流式输出
function stopStreamingOutput() {
    if (abortController) {
        abortController.abort();
        console.log('流式输出已终止');
    }
    
    // 停止语音播放
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log('语音播放已停止');
    }
    
    // 清空语音相关变量
    pendingSpeechText = '';
    speechQueue = [];
    isPlayingQueue = false;
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
window.addEventListener('DOMContentLoaded', async function() {
    // 初始化DOM元素
    chatMessages = document.getElementById('chat-messages');
    startBtn = document.getElementById('start-btn');
    manualInputContainer = document.getElementById('manual-input-container');
    manualInput = document.getElementById('manual-input');
    sendBtn = document.getElementById('send-btn');
    responseTextarea = document.getElementById('response-textarea');
    
    // 验证必要的DOM元素是否存在
    if (!chatMessages || !startBtn) {
        console.error('关键DOM元素未找到，应用程序可能无法正常工作');
        // 尝试显示错误信息（如果可能）
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: red; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
        errorDiv.textContent = '应用程序初始化失败：关键UI元素未找到';
        document.body.appendChild(errorDiv);
        return;
    }
    
    // 加载角色设定文件
    await loadCharacterSetting();
    
    
    // 初始化事件监听和功能
    initializeEventListeners();
    checkBrowserSupport();
    
    // 初始化5分钟无输入自动推送课程表功能
    initAutoCourseSchedule();
});

// 5分钟无输入自动推送课程表功能
let userActivityTimer;

function initAutoCourseSchedule() {
    // 开始计时
    resetActivityTimer();
    
    // 监听用户输入事件，重置计时器
    document.addEventListener('keydown', resetActivityTimer);
    document.addEventListener('click', resetActivityTimer);
    document.addEventListener('touchstart', resetActivityTimer);
    
    // 如果有发送按钮，监听其点击事件
    if (sendBtn) {
        sendBtn.addEventListener('click', resetActivityTimer);
    }
    
    // 如果有手动输入框，监听其输入事件
    if (manualInput) {
        manualInput.addEventListener('input', resetActivityTimer);
    }
}

function resetActivityTimer() {
    // 清除现有的计时器
    if (userActivityTimer) {
        clearTimeout(userActivityTimer);
    }
    
    // 设置新的计时器（2分钟 = 120,000毫秒）
    userActivityTimer = setTimeout(pushCourseSchedule, 120000);
}

function pushCourseSchedule() {
    // 检查是否在index.html页面
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        console.log('用户5分钟未活动，自动推送课程表');
        
        // 定义课程表内容
        const schedule = `📚 本周课程表：

周一：
08:00-09:40 高等数学（教学楼A101）
10:00-11:40 大学英语（语音楼B202）
14:00-15:40 程序设计基础（计算机楼C303）

周二：
08:00-09:40 线性代数（教学楼A102）
10:00-11:40 物理实验（实验楼D401）
14:00-15:40 体育（操场）

周三：
08:00-09:40 数据库原理（计算机楼C304）
10:00-11:40 马克思主义原理（教学楼A201）

周四：
08:00-09:40 概率论与数理统计（教学楼A103）
10:00-11:40 数据结构（计算机楼C305）
14:00-15:40 大学物理（教学楼A202）

周五：
08:00-09:40 软件工程导论（计算机楼C306）
10:00-11:40 操作系统（计算机楼C307）

✨ 温馨提示：
- 记得提前5-10分钟到达教室
- 带好相关教材和笔记本
- 关注天气变化，合理安排出行时间`;
        
        // 调用全局的addMessage函数添加消息
        if (window.addMessage) {
            window.addMessage('assistant', schedule);
            // 添加课程表图片
            setTimeout(() => {
                const messageContainer = document.createElement('div');
                messageContainer.className = 'message assistant-message';
                messageContainer.innerHTML = `
                    <div class="message-content">
                        <p>课程表图示：</p>
                        <img src="schedule.svg" alt="课程表" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;">
                    </div>
                `;
                const messagesContainer = document.querySelector('#chat-messages');
                if (messagesContainer) {
                    messagesContainer.appendChild(messageContainer);
                    // 滚动到底部
                    if (typeof window.scrollToBottom === 'function') {
                        window.scrollToBottom();
                    } else {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                }
            }, 100);
        }
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    // invite按钮事件监听
    const inviteBtn = document.getElementById('invite');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', function() {
            console.log('邀请按钮被点击');
            
            // 生成二维码URL（使用在线二维码API）
            const shareUrl = 'https://xiaoban.gaodun.com/';
            const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
            
            // 创建二维码显示容器
            const qrcodeContainer = document.createElement('div');
            qrcodeContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%); padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1); z-index: 10000; text-align: center; max-width: 90%; animation: fadeInScale 0.3s ease-out;';
            
            // 添加标题
            const title = document.createElement('div');
            title.innerHTML = '邀请好友即可获得100积分用于<strong style="color: #667eea; font-weight: 900;">会员充值</strong>';
            title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #333; line-height: 1.5;';
            qrcodeContainer.appendChild(title);
            
            // 添加二维码容器（带装饰边框）
            const qrcodeWrapper = document.createElement('div');
            qrcodeWrapper.style.cssText = 'display: inline-block; padding: 15px; background: white; border-radius: 15px; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15); margin: 10px 0;';
            
            // 添加二维码图片
            const qrcodeImg = document.createElement('img');
            qrcodeImg.src = qrcodeUrl;
            qrcodeImg.style.cssText = 'width: 280px; height: 280px; border-radius: 10px; display: block;';
            qrcodeWrapper.appendChild(qrcodeImg);
            qrcodeContainer.appendChild(qrcodeWrapper);
            
            // 添加提示文字
            const hint = document.createElement('div');
            hint.innerHTML = '📱 使用微信扫描二维码分享';
            hint.style.cssText = 'margin-top: 20px; color: #666; font-size: 15px; font-weight: 500;';
            qrcodeContainer.appendChild(hint);
            
            // 添加积分提示
            const rewardHint = document.createElement('div');
            rewardHint.innerHTML = '🎁 每成功邀请1位好友，立得 <strong style="color: #667eea;">100积分</strong>';
            rewardHint.style.cssText = 'margin-top: 15px; padding: 12px 20px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 10px; color: #555; font-size: 14px; border: 1px solid rgba(102, 126, 234, 0.2);';
            qrcodeContainer.appendChild(rewardHint);
            
            // 添加链接
            const linkDiv = document.createElement('div');
            linkDiv.textContent = shareUrl;
            linkDiv.style.cssText = 'margin-top: 15px; color: #999; font-size: 12px; word-break: break-all;';
            qrcodeContainer.appendChild(linkDiv);
            
            // 添加关闭按钮
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '关闭';
            closeBtn.style.cssText = 'margin-top: 25px; padding: 12px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 15px; font-weight: 500; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;';
            closeBtn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            };
            closeBtn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            };
            closeBtn.onclick = function() {
                document.body.removeChild(overlay);
                document.body.removeChild(qrcodeContainer);
            };
            qrcodeContainer.appendChild(closeBtn);
            
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;';
            overlay.onclick = function() {
                document.body.removeChild(overlay);
                document.body.removeChild(qrcodeContainer);
            };
            
            // 添加到页面
            document.body.appendChild(overlay);
            document.body.appendChild(qrcodeContainer);
        });
    }
    
    // 录音按钮事件监听（单按钮切换录音状态）
    startBtn.addEventListener('click', function() {
        console.log('录音按钮被点击，当前录音状态:', isRecording);
        console.log('recognition对象:', recognition);
        console.log('当前URL协议:', window.location.protocol);
        
        // 如果正在录音，则停止录音
        if (isRecording) {
            console.log('停止录音');
            if (recognition) {
                try {
                    recognition.stop();
                    // 立即更新UI状态
                    setTimeout(() => {
                        if (isRecording) {
                            console.log('强制更新录音状态');
                            isRecording = false;
                            startBtn.textContent = '🎤 ';
                            startBtn.disabled = false;
                            
                            // 移除录音指示器
                            const recordingIndicator = document.getElementById('recording-indicator');
                            if (recordingIndicator) {
                                document.body.removeChild(recordingIndicator);
                            }
                        }
                    }, 500);
                } catch (error) {
                    console.error('停止录音时发生错误:', error);
                    isRecording = false;
                    startBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><defs><linearGradient id="micGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" /></linearGradient><filter id="shadow"><feGaussianBlur in="SourceAlpha" stdDeviation="1"/><feOffset dx="0" dy="1" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="12" cy="8" rx="4" ry="6" fill="url(#micGradient)" filter="url(#shadow)"/><path d="M 12 14 Q 12 16, 12 16" stroke="url(#micGradient)" stroke-width="2" fill="none" filter="url(#shadow)"/><path d="M 8 12 Q 8 16, 12 16 Q 16 16, 16 12" stroke="url(#micGradient)" stroke-width="1.5" fill="none" filter="url(#shadow)"/><line x1="9" y1="16" x2="15" y2="16" stroke="url(#micGradient)" stroke-width="2" stroke-linecap="round" filter="url(#shadow)"/><rect x="11" y="16" width="2" height="3" fill="url(#micGradient)" filter="url(#shadow)"/><rect x="10" y="19" width="4" height="1.5" rx="0.5" fill="url(#micGradient)" filter="url(#shadow)"/><ellipse cx="10.5" cy="6" rx="1.5" ry="2" fill="rgba(255,255,255,0.4)"/></svg>';
                    startBtn.disabled = false;
                    
                    // 移除录音指示器
                    const recordingIndicator = document.getElementById('recording-indicator');
                    if (recordingIndicator) {
                        document.body.removeChild(recordingIndicator);
                    }
                }
            }
            return;
        }
        
        // 开始录音
        console.log('');
        
        // 检测是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 在移动设备上，首次点击按钮时触发一个空的语音合成请求
        if ('speechSynthesis' in window) {
            const dummyUtterance = new SpeechSynthesisUtterance('');
            dummyUtterance.volume = 0;
            try {
                window.speechSynthesis.speak(dummyUtterance);
                console.log('移动设备语音合成初始化请求已发送');
            } catch (e) {
                console.log('移动设备语音合成初始化尝试失败:', e);
            }
        }
        
        if (!recognition) {
            console.error('recognition对象未初始化');
            addMessage('assistant', '抱歉，语音识别功能未初始化。请检查控制台了解详细信息。');
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
            
            // 移动设备上的特殊处理：尝试多次启动识别
            const startRecognitionWithRetry = (retryCount = 0) => {
                try {
                    recognition.start();
                    console.log('语音识别开始命令已发送');
                } catch (error) {
                    console.error('开始语音识别时发生异常:', error);
                    
                    // 在移动设备上，如果是首次失败，尝试第二次
                    if (isMobile && retryCount < 1) {
                        console.log('移动设备上尝试第二次启动语音识别');
                        setTimeout(() => {
                            startRecognitionWithRetry(retryCount + 1);
                        }, 100);
                    } else {
                        addMessage('assistant', '无法开启麦克风: ' + error.message);
                    }
                }
            };
            
            startRecognitionWithRetry();
        } catch (error) {
            console.error('开始语音识别时发生异常:', error);
            addMessage('assistant', '无法开启麦克风: ' + error.message);
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
            if (event.key === 'Enter' && !isStreaming) {
                sendManualMessage();
            }
        });
    }
}

// 在页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    // 清理语音识别资源
    if (recognition) {
        recognition.stop();
    }
    
    // 清理语音合成资源
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // 清除超时
    if (voicesTimeout) {
        clearTimeout(voicesTimeout);
    }
});

// 页面加载完成后自动显示开场白
window.addEventListener('load', function() {
    // 等待一小段时间确保DOM完全加载和personality-display已设置
    setTimeout(function() {
        const personalityDisplay = document.getElementById('personality-display');
        if (personalityDisplay) {
            const personality = personalityDisplay.value;
            console.log('当前personality值:', personality);
            
            // 定义开场白映射
            const greetingMap = {
                'life': '嘿，同学！校园生活大管家时刻准备着~可以让我建立日程、记录账单、推荐校园美味以及问我任何校内生活有关的问题哦~',
                'learn': '你的同桌已上线，专注一下还是聊点学习那些事？可以试试问我“查看我的课程表”“高数好难学怎么办”“开始番茄钟”',
                'growth': '欢迎回到成长星球，今天打算解锁哪些新技能？试试问我”财会专业未来应该找什么样的工作呢“”如何提升表达能力“',
                'emotion': '嗨，我一直都在哦，想到什么就跟我说吧。可以尽情跟我畅聊发生的愉快或郁闷的事呢~'
            };
            
            // 获取对应的开场白
            const greeting = greetingMap[personality] || greetingMap['life'];
            
            // 显示开场白
            addMessage('assistant', greeting);
            console.log('已显示开场白:', greeting);
        }
    }, 500); // 延迟500ms确保personality值已设置
});

// 监听下拉框选项变化,动态更新开场白
window.addEventListener('load', function() {
    const personalityDisplay = document.getElementById('personality-display');
    if (personalityDisplay) {
        personalityDisplay.addEventListener('change', function() {
            const personality = this.value;
            console.log('personality下拉框值已改变为:', personality);
            
            // 定义开场白映射
            const greetingMap = {
                'life': '嘿，同学！校园生活大管家时刻准备着~可以让我建立日程、记录账单、推荐校园美味以及问我任何校内生活有关的问题哦~',
                'learn': '你的同桌已上线，专注一下还是聊点学习那些事？可以试试问我“查看我的课程表”“高数好难学怎么办”“开始番茄钟”',
                'growth': '欢迎回到成长星球，今天打算解锁哪些新技能？试试问我”财会专业未来应该找什么样的工作呢“”如何提升表达能力“',
                'emotion': '嗨，我一直都在哦，想到什么就跟我说吧。可以尽情跟我畅聊发生的愉快或郁闷的事呢~'
            };
            
            // 获取对应的开场白
            const greeting = greetingMap[personality] || greetingMap['life'];
            
            // 清空聊天记录
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            // 显示新的开场白
            addMessage('assistant', greeting);
            console.log('已更新开场白为:', greeting);
            
            // 保存到localStorage
            localStorage.setItem('userPersonality', personality);
            console.log('已保存personality到localStorage:', personality);
        });
    }
});