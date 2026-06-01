from contextlib import contextmanager

from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from utils.other import read_yaml_config

config = read_yaml_config()

# 数据库配置
DB_HOST = config.get("database", {}).get("host", "localhost")
DB_PORT = config.get("database", {}).get("port", 5432)
DB_USER = config.get("database", {}).get("user", "postgres")
DB_PASSWORD = config.get("database", {}).get("password", "")
DB_NAME = config.get("database", {}).get("name", "code_review")

# 数据库连接URL
DB_PASSWORD = quote_plus(DB_PASSWORD)  # 转义特殊字符
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 创建数据库引擎
engine = create_engine(
    DATABASE_URL,
    echo=False,  # 设置为True可以看到SQL语句
    pool_pre_ping=True,
    pool_recycle=3600
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础模型类
Base = declarative_base()


@contextmanager
def get_db_session():
    """获取数据库会话的上下文管理器"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()