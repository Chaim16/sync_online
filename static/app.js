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
    
    // 初始化文件输入框
    initFileInput();
});

// 初始化文件输入框
function initFileInput() {
    const fileInput = document.getElementById('fileInput');
    const customFileInput = document.getElementById('customFileInput');
    const selectedFilesContainer = document.getElementById('selectedFiles');
    
    if (fileInput && customFileInput) {
        // 文件选择事件
        fileInput.addEventListener('change', function(e) {
            handleFileSelect(e.target.files);
        });
        
        // 拖拽事件
        const fileInputContent = customFileInput.querySelector('.file-input-content');
        
        fileInputContent.addEventListener('dragover', function(e) {
            e.preventDefault();
            customFileInput.classList.add('active');
        });
        
        fileInputContent.addEventListener('dragleave', function() {
            customFileInput.classList.remove('active');
        });
        
        fileInputContent.addEventListener('drop', function(e) {
            e.preventDefault();
            customFileInput.classList.remove('active');
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files);
            }
        });
    }
}

// 处理文件选择
function handleFileSelect(files) {
    const selectedFilesContainer = document.getElementById('selectedFiles');
    if (!selectedFilesContainer) return;
    
    // 清空现有列表
    selectedFilesContainer.innerHTML = '';
    
    // 添加新文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileItem = document.createElement('div');
        fileItem.className = 'selected-file-item';
        fileItem.dataset.index = i;
        
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${fileSize} MB</div>
            </div>
            <button class="remove-file-btn" onclick="removeFile(${i})">移除</button>
        `;
        
        selectedFilesContainer.appendChild(fileItem);
    }
}

// 移除文件
function removeFile(index) {
    // 这里简化处理，实际项目中可能需要更复杂的逻辑
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        // 创建新的FileList
        const newFiles = Array.from(fileInput.files).filter((_, i) => i !== index);
        // 由于FileList是只读的，这里我们使用DataTransfer来创建新的FileList
        const dataTransfer = new DataTransfer();
        newFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        // 更新显示
        handleFileSelect(fileInput.files);
    }
}

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
            const verificationCode = data.verification_code;
            const expiresAt = new Date(data.expires_at);
            const now = new Date();
            const minutes = Math.ceil((expiresAt - now) / (1000 * 60));
            showResult('sessionInfo', `✅ 会话创建成功<br>验证码: <strong onclick="copyVerificationCode('${verificationCode}')" style="cursor: pointer;">${verificationCode}</strong><br>有效时间：${minutes} 分钟<br>请将验证码告诉接收方<br><small style="font-size: 0.8rem; opacity: 0.8;">点击验证码自动复制</small>`, 'success');
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

// 复制验证码功能
function copyVerificationCode(code) {
    try {
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(() => {
                showVerificationCodeCopied();
            }).catch(err => {
                console.error('复制失败:', err);
                fallbackCopyVerificationCode(code);
            });
        } else {
            // 降级方案：使用传统方法
            fallbackCopyVerificationCode(code);
        }
    } catch (err) {
        console.error('复制失败:', err);
        fallbackCopyVerificationCode(code);
    }
}

// 降级复制验证码方法
function fallbackCopyVerificationCode(code) {
    const textArea = document.createElement('textarea');
    textArea.value = code;
    
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
            showVerificationCodeCopied();
        } else {
            alert('复制失败，请手动复制验证码');
        }
    } catch (err) {
        document.body.removeChild(textArea);
        console.error('降级复制失败:', err);
        alert('复制失败，请手动复制验证码');
    }
}

// 显示验证码复制成功提示
function showVerificationCodeCopied() {
    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo) {
        // 创建临时提示元素
        const tipElement = document.createElement('div');
        tipElement.textContent = '✅ 验证码已复制';
        tipElement.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--success-color);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in-out;
            box-shadow: 0 4px 12px rgba(76, 201, 240, 0.3);
        `;
        
        sessionInfo.style.position = 'relative';
        sessionInfo.appendChild(tipElement);
        
        // 2秒后移除提示
        setTimeout(() => {
            if (tipElement.parentNode) {
                tipElement.parentNode.removeChild(tipElement);
            }
        }, 2000);
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
    messageContainer.className = 'message-item';
    messageContainer.dataset.role = message.sender_role;
    
    const timeStr = new Date(message.timestamp).toLocaleString();
    
    // 为接收方添加复制按钮（仅对接收的消息显示）
    const copyButtonHtml = message.sender_role !== 'sender' ? 
        `<button class="copy-btn" onclick="copyTextToClipboard('${message.message_id}')">
         📋 复制
         </button>` : '';
    
    messageContainer.innerHTML = `
        ${copyButtonHtml}
        <div class="message-time">${timeStr}</div>
        <div id="message-content-${message.message_id}" class="message-content" onclick="copyMessageText('${message.message_id}')">${message.content}</div>
    `;
    
    textMessages.appendChild(messageContainer);
    textMessages.scrollTop = textMessages.scrollHeight; // 自动滚动到底部
}

// 点击文本消息自动复制功能
function copyMessageText(messageId) {
    try {
        const contentElement = document.getElementById(`message-content-${messageId}`);
        if (!contentElement) {
            showResult('textMessages', '❌ 找不到要复制的文本', 'error');
            return;
        }
        
        const textToCopy = contentElement.innerText;
        
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showMessageCopySuccess(messageId);
            }).catch(err => {
                console.error('复制失败:', err);
                fallbackCopyMessageText(textToCopy, messageId);
            });
        } else {
            // 降级方案：使用传统方法
            fallbackCopyMessageText(textToCopy, messageId);
        }
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制文本');
    }
}

// 降级复制文本方法
function fallbackCopyMessageText(text, messageId) {
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
            showMessageCopySuccess(messageId);
        } else {
            alert('复制失败，请手动复制文本');
        }
    } catch (err) {
        document.body.removeChild(textArea);
        console.error('降级复制失败:', err);
        alert('复制失败，请手动复制文本');
    }
}

// 显示消息复制成功提示
function showMessageCopySuccess(messageId) {
    const messageContent = document.getElementById(`message-content-${messageId}`);
    if (messageContent) {
        // 创建临时提示元素
        const tipElement = document.createElement('div');
        tipElement.textContent = '✅ 已复制';
        tipElement.className = 'copy-success';
        
        const messageItem = messageContent.closest('.message-item');
        if (messageItem) {
            messageItem.appendChild(tipElement);
            
            // 2秒后移除提示
            setTimeout(() => {
                if (tipElement.parentNode) {
                    tipElement.parentNode.removeChild(tipElement);
                }
            }, 2000);
        }
        
        // 添加复制成功的视觉反馈
        messageContent.style.backgroundColor = 'rgba(76, 201, 240, 0.1)';
        messageContent.style.borderRadius = '4px';
        messageContent.style.padding = '4px 8px';
        
        // 1秒后恢复原状
        setTimeout(() => {
            messageContent.style.backgroundColor = '';
            messageContent.style.borderRadius = '';
            messageContent.style.padding = '';
        }, 1000);
    }
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
        copyBtn.style.backgroundColor = 'var(--success-color)';
        
        // 2秒后恢复原状
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = '';
        }, 2000);
    }
    
    // 在对应消息旁边显示临时提示
    const messageContainer = document.getElementById(`message-content-${messageId}`).closest('.message-item');
    if (messageContainer) {
        // 创建临时提示元素
        const tipElement = document.createElement('div');
        tipElement.textContent = '✅ 已复制';
        tipElement.className = 'copy-success';
        
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
            fileList.innerHTML = `<div class="empty-state">
                <div style="font-size: 1.5rem; margin-bottom: 10px;">📁</div>
                <div>暂无文件</div>
                <div style="font-size: 0.9rem; margin-top: 5px;">等待发送方上传文件...</div>
            </div>`;
            return;
        }
        
        fileList.innerHTML = data.files.map(file => `
            <div class="file-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>${file.filename}</strong>
                    ${file.upload_complete ? 
                        '<span class="status-indicator status-success">✅ 已完成</span>' : 
                        '<span class="status-indicator status-pending">⏳ 上传中</span>'}
                </div>
                <div style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 8px;">
                    大小: ${(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                ${file.upload_complete ? 
                    `<button class="btn download" onclick="downloadFile('${file.file_id}', '${file.filename}')">📥 下载</button>` : 
                    ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载文件列表失败:', error);
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = `<div class="empty-state">
            <div style="font-size: 1.5rem; margin-bottom: 10px;">⚠️</div>
            <div>加载文件列表失败</div>
            <div style="font-size: 0.9rem; margin-top: 5px;">请稍后重试</div>
        </div>`;
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