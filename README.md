# 公网临时文件传输系统 (Web版)

## 项目简介

这是一个基于Web的临时文件传输工具，用于手机与电脑之间快速传输文件。系统采用服务器中转模式，无需注册登录，通过验证码建立临时会话，文件不做持久化存储。

## 核心特性

- 🔒 **安全可靠**: 临时会话，过期自动销毁
- 📱 **移动友好**: 响应式设计，适配各种设备
- ⚡ **极速传输**: 分片上传技术，支持大文件快速传输
- 📁 **多种格式**: 支持图片、视频、文档等各种文件类型
- 🆓 **无需注册**: 使用验证码快速建立连接

## 技术架构

### 后端技术栈
- **FastAPI**: 高性能Python Web框架
- **WebSocket**: 实时双向通信
- **Uvicorn**: ASGI服务器
- **aiofiles**: 异步文件操作

### 前端技术栈
- **Vue 3**: 渐进式JavaScript框架
- **Vite**: 现代化构建工具
- **Axios**: HTTP客户端

## 系统功能

### 会话管理
- 自动生成6位数字验证码
- 会话默认有效期10分钟
- 支持发送方和接收方同时在线
- 过期自动清理机制

### 文件传输
- 支持多文件同时上传
- 单文件最大300MB限制
- 4MB分片上传技术
- 实时传输进度显示
- 断点续传支持

### 安全机制
- 验证码一次性使用
- 会话过期自动销毁
- 文件临时存储，不留痕迹
- 防止路径穿越攻击

## 部署说明

### 环境要求
- Python 3.11
- Node.js 16+ (仅开发环境需要)

### Docker 部署（推荐）

1. **构建 Docker 镜像**
```bash
cd sync_online
docker build -t sync_online:1.0 .
```

2. **运行 Docker 容器**
```bash
docker run -d -p 8000:8000 --name sync_online sync_online:1.1
```

参数说明：
- `-d`: 后台运行容器
- `-p 8000:8000`: 将容器的 8000 端口映射到主机的 8000 端口
- `--name sync-online`: 为容器指定名称
- `sync-online:1.0`: 使用构建的镜像标签

### 本地部署

### 安装步骤

1. **安装后端依赖**
```bash
cd sync_online
pip install -r requirements.txt
```

2. **构建前端** (如果需要修改前端)
```bash
cd frontend
npm install
npm run build
```

3. **启动服务**
```bash
cd sync_online
python main.py
```

服务将运行在 `http://localhost:8000`

### 配置说明

在 `config.py` 中可以调整以下参数：

```python
# 会话配置
SESSION_EXPIRE_MINUTES = 10      # 会话过期时间
MAX_CONCURRENT_SESSIONS = 100    # 最大并发会话数

# 文件传输配置
MAX_FILE_SIZE = 300 * 1024 * 1024  # 单文件最大大小
CHUNK_SIZE = 4 * 1024 * 1024       # 分片大小
```

## 使用指南

### 发送文件流程

1. 访问系统首页，点击"发送文件"
2. 点击"创建传输会话"按钮
3. 系统生成4位验证码，将其告知接收方
4. 等待接收方加入会话
5. 选择要传输的文件并上传
6. 文件上传完成后，接收方可立即下载

### 接收文件流程

1. 访问系统首页，点击"接收文件"
2. 输入发送方提供的4位验证码
3. 成功加入会话后，等待文件列表更新
4. 文件准备好后，点击"下载"按钮
5. 文件将自动下载到本地

## API接口

### 会话相关
- `POST /api/session/create` - 创建传输会话
- `POST /api/session/join` - 加入传输会话

### 文件相关
- `POST /api/file/init-upload` - 初始化文件上传
- `POST /api/file/upload-chunk` - 上传文件分片
- `GET /api/file/download` - 下载文件
- `GET /api/files/list` - 获取文件列表

### WebSocket端点
- `GET /ws/{session_id}?role={sender|receiver}` - 实时通信连接

## 安全注意事项

1. **验证码安全**: 验证码为一次性使用，请及时分享给接收方
2. **会话时效**: 会话10分钟后自动过期，请在有效期内完成传输
3. **文件清理**: 系统会自动清理过期会话的临时文件
4. **网络环境**: 建议在相对安全的网络环境下使用

## 故障排除

### 常见问题

1. **无法创建会话**
   - 检查是否达到最大并发会话限制
   - 确认服务正常运行

2. **文件上传失败**
   - 检查文件大小是否超过300MB限制
   - 确认网络连接稳定

3. **验证码无效**
   - 验证码可能已过期，请重新创建会话
   - 确认输入的验证码正确

### 日志查看
系统运行时会在控制台输出详细日志，包括：
- 会话创建和销毁记录
- WebSocket连接状态
- 文件上传下载进度
- 错误信息

## 开发说明

### 项目结构
```
sync_online/
├── main.py              # 主应用文件
├── config.py            # 配置文件
├── models.py            # 数据模型
├── session_manager.py   # 会话管理
├── file_manager.py      # 文件管理
├── websocket_manager.py # WebSocket管理
├── requirements.txt     # 后端依赖
├── static/             # 前端静态文件
└── temp_files/         # 临时文件存储目录
```

### 前端开发
前端代码位于 `frontend/` 目录，使用Vue 3 + Vite开发：
```bash
cd frontend
npm run dev  # 开发模式
npm run build  # 生产构建
```

## 许可证

本项目为开源软件，可用于个人和商业用途。

---
**注意**: 本系统仅供临时文件传输使用，请勿用于传输敏感或重要数据。