import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket
from models import WebSocketMessage, ProgressMessage, TransferProgress
from session_manager import session_manager

class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 存储所有活跃的WebSocket连接
        self.active_connections: Dict[str, WebSocket] = {}  # websocket_id -> WebSocket
        # 存储会话到连接的映射
        self.session_connections: Dict[str, Set[str]] = {}  # session_id -> {websocket_ids}
        # 存储连接的角色（sender/receiver）
        self.connection_roles: Dict[str, str] = {}  # websocket_id -> role
        
    async def connect(self, websocket: WebSocket, session_id: str, role: str) -> str:
        """建立WebSocket连接"""
        # 生成唯一的连接ID
        websocket_id = f"ws_{id(websocket)}"
        
        # 接受连接
        await websocket.accept()
        
        # 存储连接信息
        self.active_connections[websocket_id] = websocket
        self.connection_roles[websocket_id] = role
        
        # 添加到会话连接列表
        if session_id not in self.session_connections:
            self.session_connections[session_id] = set()
        self.session_connections[session_id].add(websocket_id)
        
        # 在会话管理器中注册连接
        session_manager.add_connection(session_id, websocket_id)
        
        print(f"WebSocket连接建立: {websocket_id}, 会话: {session_id}, 角色: {role}")
        return websocket_id
        
    def disconnect(self, websocket_id: str, session_id: str):
        """断开WebSocket连接"""
        # 从活跃连接中移除
        if websocket_id in self.active_connections:
            del self.active_connections[websocket_id]
            
        # 从角色映射中移除
        if websocket_id in self.connection_roles:
            del self.connection_roles[websocket_id]
            
        # 从会话连接列表中移除
        if session_id in self.session_connections:
            self.session_connections[session_id].discard(websocket_id)
            # 如果该会话没有其他连接，可以考虑清理
            if not self.session_connections[session_id]:
                del self.session_connections[session_id]
                
        # 从会话管理器中移除连接
        session_manager.remove_connection(session_id, websocket_id)
        
        print(f"WebSocket连接断开: {websocket_id}, 会话: {session_id}")
        
    async def send_personal_message(self, websocket_id: str, message: str):
        """向特定连接发送消息"""
        if websocket_id in self.active_connections:
            try:
                await self.active_connections[websocket_id].send_text(message)
            except Exception as e:
                print(f"发送消息失败: {e}")
                # 如果发送失败，断开连接
                # 这里不主动断开，让上层处理
                
    async def broadcast_to_session(self, session_id: str, message: str, exclude_sender: Optional[str] = None):
        """向会话中的所有连接广播消息"""
        if session_id in self.session_connections:
            disconnected = []
            for websocket_id in self.session_connections[session_id]:
                # 跳过指定的发送者
                if websocket_id == exclude_sender:
                    continue
                    
                try:
                    await self.send_personal_message(websocket_id, message)
                except Exception as e:
                    print(f"广播消息失败: {e}")
                    disconnected.append(websocket_id)
                    
            # 清理断开的连接
            for websocket_id in disconnected:
                self.disconnect(websocket_id, session_id)
                
    async def send_progress_update(self, session_id: str, progress: TransferProgress):
        """发送进度更新"""
        message = ProgressMessage(data=progress)
        await self.broadcast_to_session(session_id, message.json())
        
    async def send_control_message(self, session_id: str, message_type: str, data: dict):
        """发送控制消息"""
        control_msg = {
            "type": "control",
            "data": {
                "message_type": message_type,
                "payload": data
            }
        }
        await self.broadcast_to_session(session_id, json.dumps(control_msg))
        
    def get_session_participants(self, session_id: str) -> Dict[str, int]:
        """获取会话参与者统计"""
        participants = {"senders": 0, "receivers": 0}
        
        if session_id in self.session_connections:
            for websocket_id in self.session_connections[session_id]:
                role = self.connection_roles.get(websocket_id, "")
                if role == "sender":
                    participants["senders"] += 1
                elif role == "receiver":
                    participants["receivers"] += 1
                    
        return participants
        
    def is_session_active(self, session_id: str) -> bool:
        """检查会话是否有活跃连接"""
        return session_id in self.session_connections and len(self.session_connections[session_id]) > 0
        
    async def close_all_connections(self):
        """关闭所有连接"""
        disconnected_sessions = set()
        
        for websocket_id, websocket in list(self.active_connections.items()):
            try:
                await websocket.close()
            except Exception:
                pass
                
        # 清理所有数据结构
        self.active_connections.clear()
        self.session_connections.clear()
        self.connection_roles.clear()

# 全局连接管理器实例
connection_manager = ConnectionManager()