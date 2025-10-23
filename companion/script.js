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
let recognitionTimeout = null; // 添加超时计时器

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
        return localStorage.getItem('userPersonality') || 'life'; // 默认返回'life'
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
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
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
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
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
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
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
                    { role: 'system', content: characterContent },
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
window.addEventListener('DOMContentLoaded', async function() {
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
    
    // 加载角色设定文件
    await loadCharacterSetting();
    
    
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
    
    // 停止录音按钮事件监听
    stopBtn.addEventListener('click', function() {
        console.log('停止录音按钮被点击');
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
            }
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