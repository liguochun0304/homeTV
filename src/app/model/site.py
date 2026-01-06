# -*- coding: utf-8 -*-
from sqlalchemy import Column, String, Boolean

from app.model import Base


class Site(Base):
    __tablename__ = "sites"
    __table_args__ = ({"comment": "站点表"})
    key = Column(String(32), unique=True, nullable=False, comment="站点key")
    name = Column(String(64), nullable=False, comment="站点名称")
    api = Column(String(512), nullable=False, comment="API地址")
    active = Column(Boolean, default=True, nullable=False, comment="是否启用")

    def data(self):
        return {
            "key": self.key,
            "name": self.name,
            "api": self.api,
            "active": self.active
        }

