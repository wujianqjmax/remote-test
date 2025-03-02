const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

const app = express();

// 启用CORS
app.use(cors());

// 配置静态文件服务
app.use(express.static('public'));
app.use(express.static('.'));

// 解析JSON请求体
app.use(express.json());

// DeepSeek R1 API配置
const API_KEY = '9b95fe7f-9153-4036-85de-c7d4e28bdf3d';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        // 设置请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };

        // 准备请求体
        const requestBody = {
            model: 'ep-20250216155443-t4dnf',
            messages: [
                {
                    role: 'system',
                    content: '你是一位专业的生活教练AI助手。你的目标是通过对话理解用户的困扰和需求，提供有针对性的建议和指导，帮助用户在生活、工作、学习等方面取得进步和成长。你应该以积极、专业、富有同理心的态度与用户交流，给出实用且具体的建议。'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            stream: true,
            temperature: 0.6
        };

        // 发送请求到DeepSeek R1 API
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: 60000 // 60秒超时
        });

        if (!apiResponse.ok) {
            throw new Error(`API请求失败: ${apiResponse.status}`);
        }

        // 设置响应头
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 处理流式响应
        apiResponse.body.on('data', chunk => {
            // 将二进制数据转换为文本
            const text = chunk.toString();
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') continue;

                try {
                    if (line.startsWith('data: ')) {
                        const jsonData = JSON.parse(line.slice(6));
                        if (jsonData.choices && jsonData.choices[0].delta.content) {
                            res.write(jsonData.choices[0].delta.content);
                        }
                    }
                } catch (error) {
                    console.error('解析响应数据出错:', error);
                }
            }
        });

        apiResponse.body.on('end', () => {
            res.end();
        });

        apiResponse.body.on('error', error => {
            console.error('读取响应流出错:', error);
            res.status(500).end();
        });
    } catch (error) {
        console.error('处理请求出错:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});