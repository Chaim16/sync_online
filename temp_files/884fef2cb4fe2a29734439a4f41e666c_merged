import os
from pathlib import Path

class Config:
    # 项目基础配置
    PROJECT_NAME = "公网临时文件传输系统"
    VERSION = "1.0.0"
    DEBUG = True
    
    # 服务器配置
    HOST = "0.0.0.0"
    PORT = 8000
    
    # 会话配置
    SESSION_EXPIRE_MINUTES = 10  # 会话过期时间（分钟）
    MAX_CONCURRENT_SESSIONS = 100  # 最大并发会话数
    VERIFICATION_CODE_LENGTH = 4  # 验证码长度
    
    # 文件传输配置
    MAX_FILE_SIZE = 300 * 1024 * 1024  # 单文件最大大小 300MB
    CHUNK_SIZE = 4 * 1024 * 1024  # 分片大小 4MB
    TEMP_DIR = Path("temp_files")  # 临时文件存储目录
    
    # WebSocket配置
    WEBSOCKET_PING_INTERVAL = 30  # 心跳间隔（秒）
    WEBSOCKET_TIMEOUT = 60  # 超时时间（秒）
    
    @classmethod
    def init_temp_dir(cls):
        """初始化临时目录"""
        cls.TEMP_DIR.mkdir(exist_ok=True)
        
    @classmethod
    def cleanup_temp_files(cls):
        """清理临时文件"""
        import shutil
        if cls.TEMP_DIR.exists():
            shutil.rmtree(cls.TEMP_DIR)
            cls.TEMP_DIR.mkdir(exist_ok=True)