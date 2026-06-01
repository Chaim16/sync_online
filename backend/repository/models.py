import time

from sqlalchemy import Column, BIGINT, inspect, String, JSON, ARRAY

from utils.database import Base


class BaseModel(Base):
    """基础模型"""

    __table_args__ = {"schema": "decision_engine"}

    __abstract__ = True
    id = Column(BIGINT(), primary_key=True, autoincrement=True)
    create_time = Column(BIGINT(), default=int(time.time()), comment="创建时间")
    update_time = Column(BIGINT(), default=int(time.time()), onupdate=int(time.time()),
                         comment="更新时间")

    def as_dict(self):
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}

