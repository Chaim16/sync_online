let sessionId = '';
let ws = null;

// 字符计数功能
function updateCharCount() {
    const textArea = document.getElementById('textMessage');
    const charCountSpan = document.getElementById('charCount');
    
    if (textArea && charCountSpan) {
        const currentLength = textArea.value.length;
        charCountSpan.textContent = `(已输入 ${currentLength} 个字符)`;
        
        // 如果接近限制，改变颜色提醒用户
        if (currentLength > 9000) {
            charCountSpan.style.color = '#ff6b6b';
        } else if (currentLength > 8000) {
            charCountSpan.style.color = '#ffa500';
        } else {
            charCountSpan.style.color = '#666';
        }
    }
}

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
    const textArea = document.getElementById('textMessage');
    if (textArea) {
        textArea.addEventListener('input', updateCharCount);
        // 初始化字符计数
        updateCharCount();
    }
});

function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
    
    if (mode === 'send') {
        event.target.classList.add('active');
        document.getElementById('sendSection').classList.add('active');
    } else {
        event.target.classList.add('active');
        document.getElementById('receiveSection').classList.add('active');
    }
}

async function createSession() {
    try {
        // 清除之前的文件列表和文本列表
        clearFileList();
        clearTextMessages();
        
        const response = await fetch('/api/session/create', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.session_id;
            showResult('sessionInfo', `✅ 会话创建成功<br>验证码: <strong>${data.verification_code}</strong><br>过期时间: ${new Date(data.expires_at).toLocaleString()}<br>请将验证码告诉接收方`, 'success');
            document.getElementById('fileUploadArea').style.display = 'block';
            document.getElementById('textSendArea').style.display = 'block';  // 显示文本发送区域
            connectWebSocket(data.session_id, 'sender');
        } else {
            showResult('sessionInfo', `❌ ${data.detail}`, 'error');
        }
    } catch (error) {
        showResult('sessionInfo', `❌ 网络错误: ${error.message}`, 'error');
    }
}

async function joinSession() {
    const code = document.getElementById('verificationCode').value;
    if (!code) {
        showResult('receiveInfo', '❌ 请输入验证码', 'error');
        return;
    }
    
    try {
        // 清除之前的文件列表和文本列表
        clearFileList();
        clearTextMessages();
        
        const response = await fetch('/api/session/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verification_code: code })
        });
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.session_id;
            showResult('receiveInfo', `✅ 成功加入会话`, 'success');
            document.getElementById('downloadArea').style.display = 'block';
            connectWebSocket(data.session_id, 'receiver');
            loadFileList();
            loadTextHistory();  // 加载文本消息历史
        } else {
            showResult('receiveInfo', `❌ ${data.detail}`, 'error');
        }
    } catch (error) {
        showResult('receiveInfo', `❌ 网络错误: ${error.message}`, 'error');
    }
}

async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showResult('uploadResults', '❌ 请选择要上传的文件', 'error');
        return;
    }
    
    // 检查文件大小（300MB限制）
    const maxSize = 300 * 1024 * 1024; // 300MB in bytes
    let oversizedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
            oversizedFiles.push(`${files[i].name} (${(files[i].size / (1024 * 1024)).toFixed(2)} MB)`);
        }
    }
    
    if (oversizedFiles.length > 0) {
        const errorMsg = `以下文件超过300MB限制，无法上传：<br>${oversizedFiles.join('<br>')}`;
        showResult('uploadResults', `❌ ${errorMsg}`, 'error');
        return;
    }
    
    const resultsDiv = document.getElementById('uploadResults');
    resultsDiv.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadSingleFile(file, i, resultsDiv);
    }
}

async function uploadSingleFile(file, index, container) {
    try {
        // 1. 初始化上传
        const initResponse = await fetch('/api/file/init-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                file_id: `${Date.now()}_${file.name}`,
                filename: file.name,
                size: file.size,
                mime_type: file.type || 'application/octet-stream',
                total_chunks: Math.ceil(file.size / (4 * 1024 * 1024))
            })
        });
        
        const initData = await initResponse.json();
        if (!initResponse.ok) {
            throw new Error(initData.detail);
        }
        
        const actualFileId = initData.file_id;
        
        // 2. 分片上传
        const chunkSize = 4 * 1024 * 1024;
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        // 创建进度显示
        container.innerHTML += `
            <div class="file-item">
                <div>${file.name}</div>
                <div class="progress-bar">
                    <div id="progress-${index}" class="progress-fill" style="width: 0%"></div>
                </div>
                <div id="status-${index}">准备上传...</div>
            </div>
        `;
        
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            const formData = new FormData();
            formData.append('file', chunk, file.name);
            formData.append('session_id', sessionId);
            formData.append('file_id', actualFileId);
            formData.append('chunk_index', chunkIndex.toString());
            formData.append('total_chunks', totalChunks.toString());
            
            const uploadResponse = await fetch('/api/file/upload-chunk', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`上传分片 ${chunkIndex + 1} 失败`);
            }
            
            // 更新进度
            const progress = ((chunkIndex + 1) / totalChunks) * 100;
            document.getElementById(`progress-${index}`).style.width = progress + '%';
            document.getElementById(`status-${index}`).textContent = `上传中: ${Math.round(progress)}%`;
        }
        
        document.getElementById(`status-${index}`).textContent = '✅ 上传完成';
        
    } catch (error) {
        document.getElementById(`status-${index}`).textContent = `❌ 上传失败: ${error.message}`;
    }
}

async function downloadFile(fileId, filename) {
    try {
        const response = await fetch(`/api/file/download?session_id=${sessionId}&file_id=${fileId}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    } catch (error) {
        alert('下载失败: ' + error.message);
    }
}

// 文本传输相关函数
async function sendTextMessage() {
    const textContent = document.getElementById('textMessage').value.trim();
    if (!textContent) {
        showResult('textSendResult', '❌ 请输入文本内容', 'error');
        return;
    }
    
    if (textContent.length > 10000) {
        showResult('textSendResult', '❌ 文本内容过长（最多10000字符）', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/text/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                content: textContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showResult('textSendResult', '✅ 文本发送成功', 'success');
            document.getElementById('textMessage').value = '';
            // 在本地显示刚发送的消息
            displayTextMessage({
                content: textContent,
                timestamp: data.timestamp,
                sender_role: 'sender'
            });
        } else {
            showResult('textSendResult', `❌ ${data.detail}`, 'error');
        }
    } catch (error) {
        showResult('textSendResult', `❌ 网络错误: ${error.message}`, 'error');
    }
}

async function loadTextHistory() {
    try {
        const response = await fetch(`/api/text/history?session_id=${sessionId}`);
        const data = await response.json();
        
        if (response.ok) {
            const textMessages = document.getElementById('textMessages');
            textMessages.innerHTML = '';
            
            data.messages.forEach(msg => {
                displayTextMessage(msg);
            });
        }
    } catch (error) {
        console.error('加载文本历史失败:', error);
    }
}

function displayTextMessage(message) {
    const textMessages = document.getElementById('textMessages');
    
    // 创建消息容器
    const messageContainer = document.createElement('div');
    messageContainer.style.marginBottom = '15px';
    messageContainer.style.padding = '12px';
    messageContainer.style.borderRadius = '8px';
    messageContainer.style.backgroundColor = '#ffffff';
    messageContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    messageContainer.style.position = 'relative';
    
    const timeStr = new Date(message.timestamp).toLocaleString();
    
    // 为接收方添加复制按钮（仅对接收的消息显示）
    const copyButtonHtml = message.sender_role !== 'sender' ? 
        `<button class="copy-btn" onclick="copyTextToClipboard('${message.message_id}')" 
                 style="position: absolute; top: 10px; right: 10px; background: #007bff; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer;">
         📋 复制
         </button>` : '';
    
    messageContainer.innerHTML = `
        ${copyButtonHtml}
        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${timeStr}</div>
        <div id="message-content-${message.message_id}" style="line-height: 1.5;">${message.content}</div>
    `;
    
    textMessages.appendChild(messageContainer);
    textMessages.scrollTop = textMessages.scrollHeight; // 自动滚动到底部
}

// 复制文本到剪贴板功能
async function copyTextToClipboard(messageId) {
    try {
        const contentElement = document.getElementById(`message-content-${messageId}`);
        if (!contentElement) {
            showResult('textMessages', '❌ 找不到要复制的文本', 'error');
            return;
        }
        
        const textToCopy = contentElement.innerText;
        
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
            showCopySuccess(messageId);
        } else {
            // 降级方案：使用传统方法
            fallbackCopyTextToClipboard(textToCopy, messageId);
        }
    } catch (err) {
        console.error('复制失败:', err);
        showResult('textMessages', '❌ 复制失败，请手动选择文本复制', 'error');
    }
}

// 降级复制方法（兼容旧浏览器和移动设备）
function fallbackCopyTextToClipboard(text, messageId) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 设置样式使其不可见
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showCopySuccess(messageId);
        } else {
            showResult('textMessages', '❌ 复制失败，请手动选择文本复制', 'error');
        }
    } catch (err) {
        document.body.removeChild(textArea);
        console.error('降级复制失败:', err);
        showResult('textMessages', '❌ 复制失败，请手动选择文本复制', 'error');
    }
}

// 显示复制成功提示
function showCopySuccess(messageId) {
    const copyBtn = document.querySelector(`button[onclick="copyTextToClipboard('${messageId}')"]`);
    if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅ 已复制';
        copyBtn.style.backgroundColor = '#28a745';
        
        // 2秒后恢复原状
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = '#007bff';
        }, 2000);
    }
    
    // 在对应消息旁边显示临时提示
    const messageContainer = document.getElementById(`message-content-${messageId}`).closest('div[style*="margin-bottom"]');
    if (messageContainer) {
        // 创建临时提示元素
        const tipElement = document.createElement('div');
        tipElement.textContent = '✅ 已复制';
        tipElement.style.cssText = `
            position: absolute;
            top: -25px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
        `;
        
        messageContainer.style.position = 'relative';
        messageContainer.appendChild(tipElement);
        
        // 2秒后移除提示
        setTimeout(() => {
            if (tipElement.parentNode) {
                tipElement.parentNode.removeChild(tipElement);
            }
        }, 2000);
    }
}

function connectWebSocket(sessionId, role) {
    if (ws) {
        ws.close();
    }
    
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws/${sessionId}?role=${role}`);
    
    ws.onopen = function(event) {
        console.log('WebSocket连接已建立');
    };
    
    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        if (message.type === 'file_update') {
            loadFileList();
        } else if (message.type === 'text_message') {
            // 处理文本消息
            displayTextMessage(message.data);
        }
    };
    
    ws.onclose = function(event) {
        console.log('WebSocket连接已关闭');
    };
}

async function loadFileList() {
    try {
        const response = await fetch(`/api/files/list?session_id=${sessionId}`);
        const data = await response.json();
        
        const fileList = document.getElementById('fileList');
        if (data.files.length === 0) {
            fileList.innerHTML = '<div class="file-item">暂无文件</div>';
            return;
        }
        
        fileList.innerHTML = data.files.map(file => `
            <div class="file-item">
                <div><strong>${file.filename}</strong></div>
                <div>大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                <div>状态: ${file.upload_complete ? '✅ 已完成' : '⏳ 上传中'}</div>
                ${file.upload_complete ? 
                    `<button onclick="downloadFile('${file.file_id}', '${file.filename}')">📥 下载</button>` : 
                    ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载文件列表失败:', error);
    }
}

function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = message;
    element.className = `result ${type}`;
}

// 清除文件列表
function clearFileList() {
    const fileList = document.getElementById('fileList');
    const uploadResults = document.getElementById('uploadResults');
    
    if (fileList) {
        fileList.innerHTML = '<div class="file-item">暂无文件</div>';
    }
    if (uploadResults) {
        uploadResults.innerHTML = '';
    }
}

// 清除文本消息
function clearTextMessages() {
    const textMessages = document.getElementById('textMessages');
    const textMessageInput = document.getElementById('textMessage');
    
    if (textMessages) {
        textMessages.innerHTML = '';
    }
    if (textMessageInput) {
        textMessageInput.value = '';
        // 重置字符计数
        updateCharCount();
    }
}