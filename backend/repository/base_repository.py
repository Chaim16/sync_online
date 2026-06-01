from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from utils.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """基础数据访问层"""

    def __init__(self, model: Type[ModelType]):
        self.model = model

    def detail(self, db: Session, id: int) -> Optional[ModelType]:
        """根据ID获取单个记录"""
        return db.query(self.model).filter(self.model.id == id).first()

    def get_list(self, db: Session, page=1, size=10, *args, **extra_filters) -> List[ModelType]:
        """获取列表"""
        offset = (page - 1) * size
        query = db.query(self.model).filter(and_(*args))
        return query.offset(offset).limit(size).all()

    def create(self, db: Session, obj_in: dict) -> ModelType:
        """创建记录"""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def bulk_create(self, db: Session, obj_list: List[dict]) -> List[ModelType]:
        """批量创建记录"""
        db_obj_list = [self.model(**obj_in) for obj_in in obj_list]
        db.bulk_save_objects(db_obj_list)
        db.commit()
        return db_obj_list

    def update(self, db: Session, id: int, obj_in: dict) -> Optional[ModelType]:
        """更新记录"""
        db_obj = self.detail(db, id)
        if db_obj:
            for field, value in obj_in.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        """删除记录"""
        db_obj = self.detail(db, id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False
