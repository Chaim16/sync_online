import random
import string
from datetime import datetime, timedelta
from typing import Dict, Optional, Set
import asyncio
from models import SessionInfo
from config import Config

class SessionManager:
    """会话管理器"""
    
    def __init__(self):
        self.sessions: Dict[str, SessionInfo] = {}  # session_id -> SessionInfo
        self.code_to_session: Dict[str, str] = {}   # verification_code -> session_id
        self.active_connections: Dict[str, Set[str]] = {}  # session_id -> {websocket_ids}
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def start_cleanup_task(self):
        """启动定期清理任务"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            
    async def stop_cleanup_task(self):
        """停止清理任务"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            
    async def _periodic_cleanup(self):
        """定期清理过期会话"""
        while True:
            try:
                await asyncio.sleep(60)  # 每分钟检查一次
                current_time = datetime.now()
                
                expired_sessions = []
                for session_id, session in self.sessions.items():
                    if session.expires_at <= current_time:
                        expired_sessions.append(session_id)
                        
                for session_id in expired_sessions:
                    self.destroy_session(session_id)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"清理任务出错: {e}")
                
    def generate_verification_code(self) -> str:
        """生成6位数字验证码"""
        return ''.join(random.choices(string.digits, k=Config.VERIFICATION_CODE_LENGTH))
        
    def create_session(self) -> SessionInfo:
        """创建新会话"""
        # 检查并发会话数限制
        if len(self.sessions) >= Config.MAX_CONCURRENT_SESSIONS:
            raise Exception("达到最大并发会话数限制")
            
        # 生成唯一的会话ID和验证码
        session_id = f"sess_{int(datetime.now().timestamp() * 1000000)}"
        
        # 确保验证码唯一性
        max_attempts = 100
        verification_code = ""
        for _ in range(max_attempts):
            code = self.generate_verification_code()
            if code not in self.code_to_session:
                verification_code = code
                break
                
        if not verification_code:
            raise Exception("无法生成唯一的验证码")
            
        # 创建会话信息
        now = datetime.now()
        expires_at = now + timedelta(minutes=Config.SESSION_EXPIRE_MINUTES)
        
        session_info = SessionInfo(
            session_id=session_id,
            verification_code=verification_code,
            created_at=now,
            expires_at=expires_at
        )
        
        # 存储会话信息
        self.sessions[session_id] = session_info
        self.code_to_session[verification_code] = session_id
        self.active_connections[session_id] = set()
        
        return session_info
        
    def join_session(self, verification_code: str) -> Optional[SessionInfo]:
        """加入会话"""
        session_id = self.code_to_session.get(verification_code)
        if not session_id:
            return None
            
        session = self.sessions.get(session_id)
        if not session:
            return None
            
        # 检查会话是否过期
        if session.expires_at <= datetime.now():
            self.destroy_session(session_id)
            return None
            
        return session
        
    def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """获取会话信息"""
        session = self.sessions.get(session_id)
        if session and session.expires_at <= datetime.now():
            self.destroy_session(session_id)
            return None
        return session
        
    def add_connection(self, session_id: str, websocket_id: str):
        """添加WebSocket连接"""
        if session_id in self.active_connections:
            self.active_connections[session_id].add(websocket_id)
            
    def remove_connection(self, session_id: str, websocket_id: str):
        """移除WebSocket连接"""
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket_id)
            # 如果没有活跃连接，可以考虑销毁会话
            if not self.active_connections[session_id]:
                # 可以选择立即销毁或延时销毁
                pass
                
    def destroy_session(self, session_id: str):
        """销毁会话"""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            # 移除验证码映射
            if session.verification_code in self.code_to_session:
                del self.code_to_session[session.verification_code]
            # 移除会话
            del self.sessions[session_id]
            # 移除连接记录
            if session_id in self.active_connections:
                del self.active_connections[session_id]
            
            # 清理相关的物理文件
            self._cleanup_session_files(session_id)
    
    def _cleanup_session_files(self, session_id: str):
        """清理会话相关的所有物理文件"""
        import os
        from file_manager import file_manager
        
        # 获取会话中的所有文件 ID
        file_ids = file_manager.session_files.get(session_id, [])
        
        for file_id in file_ids:
            try:
                # 删除分片文件
                chunk_index = 0
                while True:
                    chunk_path = Config.TEMP_DIR / f"{file_id}_chunk_{chunk_index}"
                    if chunk_path.exists():
                        chunk_path.unlink()  # 删除文件
                        chunk_index += 1
                    else:
                        break
                
                # 删除合并后的文件
                merged_path = Config.TEMP_DIR / f"{file_id}_merged"
                if merged_path.exists():
                    merged_path.unlink()
                    
                print(f"🗑️ 已清理文件：{file_id}")
            except Exception as e:
                print(f"⚠️ 清理文件失败 {file_id}: {e}")
        
        # 清理文件记录
        file_manager.delete_file_records(session_id)
        # 清理文本消息
        file_manager.delete_text_messages(session_id)
                
    def get_active_sessions_count(self) -> int:
        """获取活跃会话数量"""
        return len(self.sessions)
        
    def extend_session_lifetime(self, session_id: str):
        """延长会话生命周期"""
        session = self.sessions.get(session_id)
        if session:
            session.expires_at = datetime.now() + timedelta(minutes=Config.SESSION_EXPIRE_MINUTES)

# 全局会话管理器实例
session_manager = SessionManager()