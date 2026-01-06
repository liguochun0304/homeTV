# -*- coding: utf-8 -*-
# @Author  : llc
# @Time    : 2020/5/4 17:11
from typing import List, Optional

from pydantic import BaseModel, Field
from pydantic import EmailStr

from app.form import JsonResponse


class RegisterBody(BaseModel):
    username: str = Field(..., min_length=4, max_length=32, description="用户名")
    password: str = Field(..., min_length=6, description="密码")
    confirm_password: str = Field(..., min_length=6, description="确认密码")
    email: Optional[EmailStr] = Field(None, description="邮箱")
    role_ids: Optional[List[int]] = Field([], description="角色ID列表")
    inviteCode: Optional[str] = Field(None, description="邀请码")


class LoginBody(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class PasswordBody(BaseModel):
    old_password: str = Field(..., description="密码")
    new_password: str = Field(..., description="新密码")
    confirm_password: str = Field(..., description="验证密码")


class UserData(BaseModel):
    id: Optional[int] = Field(None, description="用户ID")
    username: str = Field(..., description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    inviteCode: Optional[str] = Field(None, description="邀请码")
    referrer: Optional[str] = Field(None, description="推荐人")


class UserInfoResponse(JsonResponse):
    data: UserData
