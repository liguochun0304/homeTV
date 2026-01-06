# -*- coding: utf-8 -*-
from sqlalchemy import Column, String, DateTime
from datetime import datetime

from app.model import Base


class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = ({"comment": "邀请码表"})
    code = Column(String(32), primary_key=True, nullable=False, comment="邀请码")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")

    def data(self):
        return {
            "code": self.code,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

