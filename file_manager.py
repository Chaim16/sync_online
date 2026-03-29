import os
import hashlib
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime
import aiofiles
from models import FileInfo, TransferProgress, TextMessage
from config import Config

class FileManager:
    """文件管理器"""
    
    def __init__(self):
        self.files: Dict[str, FileInfo] = {}  # file_id -> FileInfo
        self.progress: Dict[str, TransferProgress] = {}  # file_id -> TransferProgress
        self.session_files: Dict[str, List[str]] = {}  # session_id -> [file_ids]
        self.text_messages: Dict[str, List[TextMessage]] = {}  # session_id -> [TextMessage]
        
    def generate_file_id(self, filename: str, size: int) -> str:
        """生成文件ID"""
        timestamp = str(int(datetime.now().timestamp() * 1000000))
        content = f"{filename}_{size}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()
        
    def create_file_record(self, session_id: str, filename: str, size: int, 
                          mime_type: str, total_chunks: int) -> FileInfo:
        """创建文件记录"""
        file_id = self.generate_file_id(filename, size)
        
        file_info = FileInfo(
            file_id=file_id,
            filename=filename,
            size=size,
            mime_type=mime_type,
            total_chunks=total_chunks
        )
        
        # 创建传输进度记录
        progress = TransferProgress(
            file_id=file_id,
            filename=filename,
            size=size
        )
        
        # 存储记录
        self.files[file_id] = file_info
        self.progress[file_id] = progress
        
        # 关联到会话
        if session_id not in self.session_files:
            self.session_files[session_id] = []
        self.session_files[session_id].append(file_id)
        
        return file_info
        
    def get_file_info(self, file_id: str) -> Optional[FileInfo]:
        """获取文件信息"""
        return self.files.get(file_id)
        
    def get_transfer_progress(self, file_id: str) -> Optional[TransferProgress]:
        """获取传输进度"""
        return self.progress.get(file_id)
        
    def update_chunk_uploaded(self, file_id: str, chunk_size: int):
        """更新已上传分片"""
        if file_id in self.files and file_id in self.progress:
            file_info = self.files[file_id]
            progress = self.progress[file_id]
            
            file_info.uploaded_chunks += 1
            progress.uploaded_bytes += chunk_size
            
            # 更新进度百分比
            if file_info.total_chunks > 0:
                progress.progress_percent = (file_info.uploaded_chunks / file_info.total_chunks) * 100
            
            # 检查是否上传完成
            if file_info.uploaded_chunks >= file_info.total_chunks:
                file_info.upload_complete = True
                progress.status = "uploaded"
                
    def start_download(self, file_id: str):
        """开始下载"""
        if file_id in self.progress:
            self.progress[file_id].download_started = True
            self.progress[file_id].status = "downloading"
            
    def update_chunk_downloaded(self, file_id: str, chunk_size: int):
        """更新已下载分片"""
        if file_id in self.progress:
            progress = self.progress[file_id]
            progress.downloaded_bytes += chunk_size
            
            # 更新下载进度百分比
            if progress.size > 0:
                download_percent = (progress.downloaded_bytes / progress.size) * 100
                # 整体进度是上传进度和下载进度的平均值
                upload_percent = progress.progress_percent
                progress.progress_percent = (upload_percent + download_percent) / 2
                
            # 检查是否下载完成
            if progress.downloaded_bytes >= progress.size:
                progress.status = "complete"
                
    def update_transfer_speed(self, file_id: str, speed: float):
        """更新传输速度"""
        if file_id in self.progress:
            self.progress[file_id].speed = speed
            
    def get_session_files(self, session_id: str) -> List[FileInfo]:
        """获取会话中的所有文件"""
        file_ids = self.session_files.get(session_id, [])
        return [self.files[file_id] for file_id in file_ids if file_id in self.files]
        
    def delete_file_records(self, session_id: str):
        """删除会话相关的文件记录"""
        file_ids = self.session_files.pop(session_id, [])
        for file_id in file_ids:
            self.files.pop(file_id, None)
            self.progress.pop(file_id, None)
            
    def cleanup_expired_files(self, expired_sessions: List[str]):
        """清理过期会话的文件记录"""
        for session_id in expired_sessions:
            self.delete_file_records(session_id)
            
    def add_text_message(self, session_id: str, content: str, sender_id: str) -> TextMessage:
        """添加文本消息"""
        message_id = f"msg_{int(datetime.now().timestamp() * 1000000)}_{hashlib.md5(content.encode()).hexdigest()[:8]}"
        
        message = TextMessage(
            message_id=message_id,
            content=content,
            sender_id=sender_id,
            session_id=session_id
        )
        
        if session_id not in self.text_messages:
            self.text_messages[session_id] = []
        self.text_messages[session_id].append(message)
        
        return message
        
    def get_session_text_messages(self, session_id: str) -> List[TextMessage]:
        """获取会话中的所有文本消息"""
        return self.text_messages.get(session_id, [])
        
    def delete_text_messages(self, session_id: str):
        """删除会话相关的文本消息"""
        self.text_messages.pop(session_id, [])

# 全局文件管理器实例
file_manager = FileManager()