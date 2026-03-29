from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
import uuid

class SessionInfo(BaseModel):
    """会话信息模型"""
    session_id: str
    verification_code: str
    created_at: datetime
    expires_at: datetime
    sender_connected: bool = False
    receiver_connected: bool = False
    active_transfers: List[str] = []  # 正在传输的文件ID列表

class FileInfo(BaseModel):
    """文件信息模型"""
    file_id: str
    filename: str
    size: int
    mime_type: str
    uploaded_chunks: int = 0
    total_chunks: int
    upload_complete: bool = False
    download_started: bool = False

class TransferProgress(BaseModel):
    """传输进度模型"""
    file_id: str
    filename: str
    size: int
    uploaded_bytes: int = 0
    downloaded_bytes: int = 0
    progress_percent: float = 0.0
    speed: float = 0.0  # bytes/sec
    status: str = "pending"  # pending, uploading, downloading, complete, failed
    download_started: bool = False

class CreateSessionResponse(BaseModel):
    """创建会话响应"""
    session_id: str
    verification_code: str
    expires_at: datetime
    message: str = "会话创建成功"

class JoinSessionRequest(BaseModel):
    """加入会话请求"""
    verification_code: str

class JoinSessionResponse(BaseModel):
    """加入会话响应"""
    session_id: str
    message: str = "成功加入会话"

class TextMessage(BaseModel):
    """文本消息模型"""
    message_id: str
    content: str
    sender_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    session_id: str
    
class TextTransferRequest(BaseModel):
    """文本传输请求"""
    session_id: str
    content: str
    
class TextMessageResponse(BaseModel):
    """文本消息响应"""
    message_id: str
    content: str
    timestamp: str
    sender_role: str  # sender 或 receiver
    
class UploadChunkRequest(BaseModel):
    """上传分片请求"""
    session_id: str
    file_id: str
    chunk_index: int
    total_chunks: int
    filename: str
    size: int
    mime_type: str

class FileListResponse(BaseModel):
    """文件列表响应"""
    files: List[FileInfo]
    message: str = "文件列表获取成功"

class WebSocketMessage(BaseModel):
    """WebSocket消息基类"""
    type: str
    data: dict

class ProgressMessage(WebSocketMessage):
    """进度消息"""
    type: str = "progress"
    data: TransferProgress

class ControlMessage(WebSocketMessage):
    """控制消息"""
    type: str = "control"
    data: dict  # 包含操作类型如 start_download, cancel_transfer 等