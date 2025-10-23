// 简单的测试脚本来验证聊天功能

console.log('测试聊天功能...');

// 模拟用户输入
const testMessage = "你好，这是一条测试消息";
console.log('测试消息:', testMessage);

// 模拟sendManualMessage函数的行为
try {
    console.log('开始调用豆包API...');
    
    // 这里我们将直接调用getDoubaoResponse函数的核心逻辑，以便快速验证
    const testApiCall = async () => {
        try {
            const DOBAO_API_KEY = 'bd747896-e89b-46f4-a5ab-0a232d086845';
            const DOBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
            const ENDPOINT_ID = 'ep-20251015101857-wc8xz';
            const userNickname = '测试用户';
            
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
                        { role: 'user', content: testMessage }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            console.log('API响应状态码:', response.status);
            
            if (data.choices && data.choices.length > 0) {
                const assistantResponse = data.choices[0].message.content;
                console.log('API成功返回响应:', assistantResponse);
            } else {
                console.error('API返回了无效的响应:', data);
            }
        } catch (error) {
            console.error('API调用失败:', error);
            // 模拟使用本地响应作为备选
            console.log('使用本地响应作为备选');
            let response = '';
            if (testMessage.includes('你好') || testMessage.includes('嗨')) {
                response = '你好！有什么我可以帮助你的吗？';
            } else {
                response = `我收到了你的消息：${testMessage}`;
            }
            console.log('本地响应:', response);
        }
    };
    
    testApiCall();
    
    console.log('测试脚本执行完成。请检查控制台输出以查看结果。');
} catch (error) {
    console.error('测试脚本执行出错:', error);
}