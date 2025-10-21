// DOM 元素 - 将在DOM加载完成后初始化
let chatMessages = null;
let startBtn = null;
let stopBtn = null;
let manualInputContainer = null;
let manualInput = null;
let sendBtn = null;
let fileInput = null;
let uploadBtn = null;
let fileUploadContainer = null;

// 用户信息
let userNickname = '';

// 语音识别初始化 - 增强版
let recognition = null;
let isRecording = false;
let recognitionTimeout = null;
let recognitionInitialized = false; // 标记recognition是否完全初始化
let lastRecognitionError = null; // 记录上次错误信息
let recognitionAttempts = 0; // 记录识别尝试次数
const MAX_RECOGNITION_ATTEMPTS = 3; // 最大尝试次数

// 语音合成初始化
let speechSynthesisUtterance = null;
let isSpeaking = false;
let voicesLoaded = false;
let voicesTimeout = null;

// 配置
// 请替换为您的API密钥
const DOBAO_API_KEY = 'bd747896-e89b-46f4-a5ab-0a232d086845'; // 豆包API密钥
const DOBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 豆包API URL
const ENDPOINT_ID = 'ep-20251015101857-wc8xz';

// OpenAI API 配置（作为备选）
const OPENAI_API_KEY = 'your-api-key-here'; // 请替换为您的OpenAI API密钥
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 检测当前访问方式并选择合适的存储策略
function getStorageStrategy() {
    const protocol = window.location.protocol;
    // 如果是通过文件协议(file://)访问，使用localStorage
    // 如果是通过HTTP/HTTPS协议访问，使用服务器存储
    return protocol === 'file:' ? 'localStorage' : 'server';
}

// 获取用户昵称（智能选择存储方式）
async function getUserNickname() {
    const strategy = getStorageStrategy();
    
    if (strategy === 'localStorage') {
        // 从localStorage获取
        try {
            return localStorage.getItem('userNickname') || '';
        } catch (error) {
            console.error('从localStorage获取昵称失败:', error);
            return '';
        }
    } else {
        // 从服务器获取
        return await getNicknameFromServer();
    }
}

// 获取完整的API基础URL
function getApiBaseUrl() {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https:' ? 443 : 8000);
    return `${protocol}//${host}:${port}`;
}

// 从服务器获取昵称
async function getNicknameFromServer() {
    try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/user/nickname`, {
            credentials: 'include'
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return '';
        }
        
        const data = await response.json();
        return data.nickname || '';
    } catch (error) {
        console.error('从服务器获取昵称出错:', error);
        return '';
    }
}

// 检查浏览器支持 - 增强版
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
    
    // 重置recognition状态
    recognition = null;
    recognitionInitialized = false;
    
    // 创建一个初始化recognition对象的函数，支持重试
    const initRecognition = (retryCount = 0) => {
        try {
            if ('webkitSpeechRecognition' in window) {
                console.log(`尝试初始化webkitSpeechRecognition (第${retryCount + 1}次尝试)`);
                recognition = new webkitSpeechRecognition();
            } else if ('SpeechRecognition' in window) {
                console.log(`尝试初始化SpeechRecognition (第${retryCount + 1}次尝试)`);
                recognition = new SpeechRecognition();
            }
            
            if (recognition) {
                // 添加初始化完成事件
                recognition.onstart = function() {
                    console.log('语音识别初始化完成事件触发');
                    recognitionInitialized = true;
                };
                
                setupRecognition(isMobile);
                console.log('recognition对象已成功创建并配置');
                
                // 测试性地开始和停止识别，以确保初始化完全成功
                if (retryCount === 0) {
                    console.log('进行初始化测试...');
                    try {
                        // 短暂启动然后立即停止，确保recognition对象正常工作
                        recognition.start();
                        setTimeout(() => {
                            try {
                                recognition.stop();
                                console.log('初始化测试完成');
                            } catch (e) {
                                console.log('测试停止时出错:', e);
                            }
                        }, 100);
                    } catch (e) {
                        console.log('测试启动时出错:', e);
                    }
                }
            } else {
                console.error('无法创建recognition对象');
                handleRecognitionError('无法创建语音识别对象');
            }
        } catch (error) {
            console.error('初始化recognition对象时出错:', error);
            
            // 如果是首次失败，尝试第二次初始化
            if (retryCount < 2) {
                console.log(`初始化失败，${1000 * (retryCount + 1)}ms后重试...`);
                setTimeout(() => {
                    initRecognition(retryCount + 1);
                }, 1000 * (retryCount + 1));
            } else {
                handleRecognitionError('语音识别初始化失败：' + error.message);
            }
        }
    };
    
    // 开始初始化
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        initRecognition();
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
        try {
            speechSynthesisUtterance = new SpeechSynthesisUtterance();
            speechSynthesisUtterance.lang = 'zh-CN'; // 设置中文语音
            
            // 初始化语音列表
            setupVoiceList();
        } catch (error) {
            console.error('初始化语音合成时出错:', error);
            addMessage('assistant', '注意：语音合成功能初始化失败');
        }
    } else {
        addMessage('assistant', '注意：您的浏览器不支持语音合成功能');
    }
    
    // 添加定期状态检查
    setInterval(() => {
        if (recognition && !isRecording && lastRecognitionError) {
            console.log('检测到recognition处于错误状态，尝试自动恢复');
            forceStopRecording();
        }
    }, 5000); // 每5秒检查一次
}

// 重置recognition对象的封装函数
function resetRecognition() {
    console.log('开始重置recognition对象...');
    
    // 保存当前的错误信息，用于判断是否需要重建
    const currentError = lastRecognitionError;
    
    // 清除当前recognition对象的所有事件监听器和引用
    try {
        if (recognition) {
            // 尝试停止可能正在进行的识别
            try {
                recognition.stop();
            } catch (e) {
                console.log('停止当前识别时出错:', e);
            }
            
            // 清除所有事件监听器
            const newRecognition = recognition.constructor ? 
                new recognition.constructor() : null;
            recognition = null;
            
            // 创建新的recognition对象
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
            } else if ('SpeechRecognition' in window) {
                recognition = new SpeechRecognition();
            } else {
                console.error('浏览器不支持语音识别API，无法重置recognition对象');
                recognitionInitialized = false;
                return;
            }
            
            if (recognition) {
                // 设置参数
                setupRecognition(isMobile);
                
                // 双重保障：设置超时检查recognition状态
                setTimeout(() => {
                    checkRecognitionStatus();
                }, 1000);
                
                console.log('recognition对象重置成功');
            } else {
                console.error('无法创建新的recognition对象');
                recognitionInitialized = false;
                handleRecognitionError('无法重新初始化语音识别系统，请刷新页面后再试');
            }
        } else {
            // 如果recognition对象为空，直接重新初始化
            initRecognition();
        }
    } catch (error) {
        console.error('重置recognition对象时发生严重错误:', error);
        recognition = null;
        recognitionInitialized = false;
        handleRecognitionError('语音识别系统重置失败: ' + error.message);
    }
}

// 处理recognition初始化和运行时错误
function handleRecognitionError(errorMessage) {
    console.error('语音识别错误处理:', errorMessage);
    
    // 更新状态
    isRecording = false;
    recognitionInitialized = false;
    
    // 更新UI
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    // 显示错误信息
    addMessage('assistant', '语音识别系统遇到问题：' + errorMessage + '\n\n建议：\n1. 刷新页面后再试\n2. 使用下方的文本输入框进行交流\n3. 检查浏览器麦克风权限设置');
    
    // 显示手动输入框作为备选
    if (manualInputContainer) {
        manualInputContainer.style.display = 'block';
    }
    
    // 尝试重置recognition对象
    setTimeout(() => {
        resetRecognition();
    }, 2000);
}

// 设置语音识别参数 - 增强版
function setupRecognition(isMobile) {
    console.log('开始设置语音识别参数...');
    console.log('移动设备模式:', isMobile);
    
    if (!recognition) return;
    
    // 设置语音识别参数
    recognition.continuous = isMobile ? false : true; // 移动设备上使用非连续模式以节省资源
    recognition.interimResults = true; // 启用中间结果
    recognition.lang = 'zh-CN'; // 设置为中文识别
    recognition.maxAlternatives = 1; // 最大备选结果数
    
    // 设置事件监听器
    recognition.onstart = function() {
        console.log('语音识别已启动');
        isRecording = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // 创建录音指示器
        let recordingIndicator = document.getElementById('recording-indicator');
        if (!recordingIndicator) {
            recordingIndicator = document.createElement('div');
            recordingIndicator.id = 'recording-indicator';
            recordingIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(255, 0, 0, 0.9); color: white; padding: 10px 15px; border-radius: 20px; z-index: 1000; display: flex; align-items: center;';
            
            const microphoneIcon = document.createElement('div');
            microphoneIcon.style.cssText = 'width: 12px; height: 12px; background: white; border-radius: 50%; margin-right: 8px; animation: pulse 1.5s infinite;';
            
            const styleSheet = document.createElement('style');
            styleSheet.textContent = '@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }';
            document.head.appendChild(styleSheet);
            
            const text = document.createElement('span');
            text.textContent = '正在录音...';
            
            recordingIndicator.appendChild(microphoneIcon);
            recordingIndicator.appendChild(text);
            document.body.appendChild(recordingIndicator);
        } else {
            recordingIndicator.style.display = 'flex';
        }
        
        // 设置超时计时器，防止录音时间过长
        recognitionTimeout = setTimeout(() => {
            console.log('录音超时，自动停止');
            forceStopRecording();
        }, 60000); // 60秒超时
    };
    
    recognition.onresult = function(event) {
        console.log('语音识别结果:', event.results);
        
        // 清除之前的超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        // 获取最后一个结果
        const lastResult = event.results[event.results.length - 1];
        
        if (lastResult.isFinal) {
            const userMessage = lastResult[0].transcript.trim();
            console.log('最终识别结果:', userMessage);
            
            if (userMessage) {
                addMessage('user', userMessage);
                // 在移动设备上自动停止录音
                if (isMobile) {
                    forceStopRecording();
                }
                // 获取AI回复
                getDoubaoResponse(userMessage);
            }
        }
        
        // 重置超时计时器
        recognitionTimeout = setTimeout(() => {
            console.log('录音超时，自动停止');
            forceStopRecording();
        }, 60000); // 60秒超时
    };
    
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        
        // 清除超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        let errorMessage = '语音识别出错';
        switch (event.error) {
            case 'no-speech':
                errorMessage = '没有检测到语音，请尝试重新录音';
                break;
            case 'audio-capture':
                errorMessage = '没有找到麦克风，请确保麦克风已连接并授权';
                break;
            case 'not-allowed':
                errorMessage = '麦克风访问被拒绝，请在浏览器设置中授权';
                break;
            case 'aborted':
                console.log('语音识别被中止（用户操作或系统干预）');
                return; // 中止错误不需要显示消息
            default:
                errorMessage = '无法开启麦克风: ' + event.error;
        }
        
        addMessage('assistant', errorMessage);
        
        // 重置状态
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // 移除录音指示器
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
    };
    
    recognition.onend = function() {
        console.log('语音识别已结束');
        
        // 清除超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        // 在非连续模式下，自动重新启动（用于移动设备）
        if (isMobile && isRecording && recognition.continuous === false) {
            console.log('移动设备上自动重启语音识别');
            setTimeout(() => {
                try {
                    if (isRecording) {
                        recognition.start();
                    }
                } catch (e) {
                    console.error('自动重启语音识别失败:', e);
                    isRecording = false;
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                }
            }, 100);
            return;
        }
        
        // 重置状态
        isRecording = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // 移除录音指示器
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
    };
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async function() {
    // 从服务器获取用户昵称
    userNickname = await getUserNickname();
    
    // 如果没有昵称并且不是登录页面，则跳转到登录页面
    if (!userNickname && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }
    
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
    
    // 初始化语音识别对象
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setupRecognition(isMobile);
    
    // 初始化事件监听和功能
    initializeEventListeners();
    checkBrowserSupport();
    
    // 添加欢迎消息，包含用户昵称
    addMessage('assistant', `欢迎回来，${userNickname}！您可以点击"开始录音"按钮进行语音对话，或者在下方的输入框中输入文字进行交流。`);
});

// 强制停止录音并更新状态 - 新增函数
function forceStopRecording() {
    console.log('强制停止录音并更新状态');
    
    // 立即更新状态标志
    isRecording = false;
    recognitionInitialized = false;
    
    // 立即更新UI状态
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
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
    
    // 检测是否是移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 确保recognition停止 - 增强版处理
    try {
        if (recognition) {
            // 先尝试标准停止方法
            try {
                recognition.stop();
                console.log('recognition.stop() 调用成功');
            } catch (e) {
                console.log('标准停止recognition时出错:', e);
            }
            
            // 特殊设备处理：对于已知有兼容性问题的设备，直接重新创建recognition对象
            const problematicDevices = ['vivo', 'honor', 'xiaomi', 'redmi', 'huawei', 'oppo'];
            const userAgent = navigator.userAgent.toLowerCase();
            const isProblematicDevice = problematicDevices.some(device => userAgent.includes(device));
            
            // 检查是否需要重置recognition对象
            const shouldResetRecognition = isProblematicDevice || 
                                         window.location.protocol !== 'https:' || 
                                         lastRecognitionError === 'recognition has already started';
            
            // 对于问题设备、非HTTPS环境或识别错误，直接重新初始化recognition
            if (shouldResetRecognition) {
                console.log(`设备兼容性处理: ${isProblematicDevice ? '已知问题设备' : (window.location.protocol !== 'https:' ? '非HTTPS环境' : '识别错误')}`);
                
                // 创建一个全新的recognition对象
                const recreateRecognition = () => {
                    console.log('重新初始化recognition对象');
                    
                    // 先完全清除当前recognition对象
                    recognition = null;
                    
                    // 重新初始化recognition对象
                    if ('webkitSpeechRecognition' in window) {
                        recognition = new webkitSpeechRecognition();
                    } else if ('SpeechRecognition' in window) {
                        recognition = new SpeechRecognition();
                    }
                    
                    // 重新设置参数
                    if (recognition) {
                        setupRecognition(isMobile);
                        console.log('recognition对象重新初始化完成');
                    }
                };
                
                // 延迟200ms后重新创建recognition对象，确保完全清理
                setTimeout(() => {
                    try {
                        recreateRecognition();
                    } catch (e) {
                        console.error('重新创建recognition时出错:', e);
                        // 再次尝试作为最后的兜底
                        setTimeout(() => {
                            try {
                                recreateRecognition();
                            } catch (e2) {
                                console.error('最终尝试重新创建recognition失败:', e2);
                            }
                        }, 300);
                    }
                }, 200);
            }
        }
    } catch (e) {
        console.log('强制停止recognition时出错:', e);
        
        // 增强版兜底方案：重置recognition对象
        const resetRecognition = () => {
            console.log('错误后重置recognition对象');
            recognition = null;
            recognitionInitialized = false;
            
            // 检测设备类型
            const tempIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            try {
                // 重新初始化
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                } else if ('SpeechRecognition' in window) {
                    recognition = new SpeechRecognition();
                }
                
                if (recognition) {
                    setupRecognition(tempIsMobile);
                    console.log('错误后recognition重置完成');
                }
            } catch (e2) {
                console.error('重置recognition对象失败:', e2);
            }
        };
        
        // 延迟100ms后尝试重置
        setTimeout(() => {
            resetRecognition();
        }, 100);
    }
    
    // 重置错误状态
    lastRecognitionError = null;
    recognitionAttempts = 0;
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
                    { role: 'system', content: `你是一个有用的中文助手，回答要简洁明了。用户的昵称是${userNickname}，请在回答中适当称呼用户。` },
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


// 初始化事件监听器
function initializeEventListeners() {
    // 文件上传按钮事件监听
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleFileUpload);
    }
    
    // 文件输入框变化事件监听（可选，用户选择文件后自动上传）
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                // 用户选择文件后，可以提示用户点击上传按钮
                console.log('用户选择了文件:', this.files[0].name);
            }
        });
    }
    
    // 开始录音按钮事件监听
    startBtn.addEventListener('click', function() {
        console.log('开始录音按钮被点击');
        console.log('recognition对象:', recognition);
        console.log('isRecording状态:', isRecording);
        console.log('recognitionInitialized状态:', recognitionInitialized);
        console.log('当前URL协议:', window.location.protocol);
        
        // 检测是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 在移动设备上，首次点击按钮时触发一个空的语音合成请求
        // 这可以帮助在后续语音合成时绕过一些浏览器限制
        if ('speechSynthesis' in window) {
            // 创建一个无声的语音请求
            const dummyUtterance = new SpeechSynthesisUtterance('');
            dummyUtterance.volume = 0; // 音量设置为0
            try {
                window.speechSynthesis.speak(dummyUtterance);
                console.log('移动设备语音合成初始化请求已发送');
            } catch (e) {
                console.log('移动设备语音合成初始化尝试失败:', e);
            }
        }
        
        // 检查recognition对象是否存在
        if (!recognition) {
            console.error('recognition对象未初始化');
            handleRecognitionError('语音识别功能未初始化');
            return;
        }
        
        // 检查是否正在录音
        if (isRecording) {
            console.warn('录音已经在进行中');
            return;
        }
        
        // 如果recognition未完全初始化，尝试重新初始化
        if (!recognitionInitialized) {
            console.log('recognition对象未完全初始化，尝试重新初始化...');
            addMessage('assistant', '正在准备语音识别功能，请稍候...');
            
            // 重置recognition对象
            try {
                // 先清除当前recognition对象
                recognition = null;
                
                // 创建新的recognition对象
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                } else if ('SpeechRecognition' in window) {
                    recognition = new SpeechRecognition();
                }
                
                if (recognition) {
                    // 设置参数
                    setupRecognition(isMobile);
                    
                    // 短暂延迟后再尝试启动
                    setTimeout(() => {
                        console.log('recognition对象重新初始化完成，尝试启动录音');
                        // 移除之前的提示消息
                        chatMessages.removeChild(chatMessages.lastChild);
                        // 继续尝试启动录音
                        attemptStartRecording();
                    }, 500);
                    
                    return;
                } else {
                    handleRecognitionError('无法重新初始化语音识别功能');
                }
            } catch (error) {
                console.error('重新初始化recognition对象失败:', error);
                handleRecognitionError('重新初始化语音识别功能失败');
            }
            
            return;
        }
        
        // 尝试启动录音
        attemptStartRecording();
        
        // 尝试启动录音的封装函数
        function attemptStartRecording() {
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
                
                // 确保recognition处于非活动状态再调用start()
                if (recognition && !isRecording) {
                    // 移动设备上的特殊处理：尝试多次启动识别
                    const startRecognitionWithRetry = (retryCount = 0) => {
                        try {
                            // 重置recognition的状态，确保它完全停止
                            if (recognition && isRecording) {
                                try {
                                    recognition.stop();
                                } catch (e) {
                                    console.log('重置recognition状态时出错:', e);
                                }
                            }
                            
                            // 短暂延迟后再次尝试启动
                            setTimeout(() => {
                                try {
                                    // 确保recognition对象存在且未在录制中
                                    if (recognition && !isRecording) {
                                        recognition.start();
                                        console.log('语音识别开始命令已发送');
                                        
                                        // 设置超时，以防识别过程卡住
                                        recognitionTimeout = setTimeout(() => {
                                            console.log('语音识别超时，自动停止');
                                            forceStopRecording();
                                            addMessage('assistant', '语音识别超时，请重试');
                                        }, 30000); // 30秒超时
                                    }
                                } catch (error) {
                                    console.error('开始语音识别时发生异常:', error);
                                    
                                    // 特殊处理 "recognition has already started" 错误
                                    if (error.message && error.message.includes('already started')) {
                                        console.log('识别已经在运行，尝试强制重置状态');
                                        
                                        // 增加尝试次数
                                        recognitionAttempts++;
                                        
                                        // 记录最后错误
                                        lastRecognitionError = 'recognition has already started';
                                        
                                        // 如果尝试次数超过最大值，提示用户刷新页面
                                        if (recognitionAttempts >= MAX_RECOGNITION_ATTEMPTS) {
                                            console.log('达到最大识别尝试次数，建议用户刷新页面');
                                            forceStopRecording();
                                            addMessage('assistant', '语音识别系统持续遇到问题。\n\n建议：\n1. 尝试刷新页面后再试\n2. 使用下方的文本输入框进行交流\n3. 如果使用的是移动设备，请确保使用HTTPS连接');
                                            return;
                                        }
                                        
                                        // 首先强制停止并重置状态
                                        forceStopRecording();
                                        
                                        // 显示友好的错误提示，并提供更具体的操作建议
                                        addMessage('assistant', `语音识别系统可能处于不稳定状态，我们正在尝试修复（第${recognitionAttempts}次尝试）。\n\n请稍等2-3秒后再次点击"开始录音"按钮。`);
                                        
                                        // 添加一个短暂的延迟，确保状态完全重置
                                        setTimeout(() => {
                                            console.log('语音识别状态已重置，允许用户再次尝试');
                                        }, 2000);
                                    } else {
                                        // 在移动设备上，如果是首次失败，尝试第二次
                                        if (isMobile && retryCount < 1) {
                                            console.log('移动设备上尝试第二次启动语音识别');
                                            setTimeout(() => {
                                                startRecognitionWithRetry(retryCount + 1);
                                            }, 100);
                                        } else {
                                            // 使用新的错误处理函数
                                            handleRecognitionError('无法开启麦克风: ' + error.message);
                                        }
                                    }
                                }
                            }, 100); // 短暂延迟确保状态更新
                        } catch (error) {
                            console.error('启动语音识别的重试逻辑出错:', error);
                            // 使用新的错误处理函数
                            handleRecognitionError('无法开启麦克风: ' + error.message);
                        }
                    };
                    
                    startRecognitionWithRetry();
                }
            } catch (error) {
                console.error('开始语音识别时发生异常:', error);
                // 使用新的错误处理函数
                handleRecognitionError('无法开启麦克风: ' + error.message);
            }
        }
    });
    
    // 停止录音按钮事件监听
    stopBtn.addEventListener('click', function() {
        console.log('停止录音按钮被点击');
        console.log('当前recognition状态:', recognition);
        console.log('isRecording:', isRecording);
        console.log('recognitionInitialized:', recognitionInitialized);
        
        // 清除超时计时器
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
            console.log('录音超时计时器已清除');
        }
        
        if (recognition && isRecording) {
            try {
                // 在vivo手机上，可能需要强制停止
                console.log('尝试停止语音识别...');
                recognition.stop();
                
                // 立即更新UI状态，防止UI卡顿
                setTimeout(() => {
                    if (isRecording) {
                        console.log('强制更新录音状态');
                        isRecording = false;
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                        
                        // 移除录音指示器
                        const recordingIndicator = document.getElementById('recording-indicator');
                        if (recordingIndicator) {
                            document.body.removeChild(recordingIndicator);
                        }
                    }
                }, 500); // 500毫秒后检查并强制更新状态
            } catch (error) {
                console.error('停止录音时发生错误:', error);
                
                // 即使发生错误，也强制更新状态
                isRecording = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                
                // 移除录音指示器
                const recordingIndicator = document.getElementById('recording-indicator');
                if (recordingIndicator) {
                    document.body.removeChild(recordingIndicator);
                }
                
                // 判断错误类型，如果是严重错误，调用错误处理函数
                if (error.message && error.message.includes('not available') || error.message.includes('not initialized')) {
                    console.log('检测到严重错误，需要重新初始化recognition对象');
                    recognitionInitialized = false;
                    lastRecognitionError = error.message;
                    
                    // 延迟重置recognition对象，让用户有时间看到错误提示
                    setTimeout(() => {
                        resetRecognition();
                    }, 1000);
                }
            }
        } else if (!recognition) {
            console.warn('recognition对象不存在，无法停止录音');
            // 如果recognition对象不存在，但isRecording为true，强制更新状态
            if (isRecording) {
                isRecording = false;
                recognitionInitialized = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                
                // 移除录音指示器
                const recordingIndicator = document.getElementById('recording-indicator');
                if (recordingIndicator) {
                    document.body.removeChild(recordingIndicator);
                }
                
                // 调用错误处理函数
                handleRecognitionError('语音识别系统异常，请尝试刷新页面后再试');
            }
        } else {
            console.warn('录音未在进行中');
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