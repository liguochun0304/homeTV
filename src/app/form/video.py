# -*- coding: utf-8 -*-
from pydantic import BaseModel, Field

from app.form import JsonResponse


class SearchQuery(BaseModel):
    wd: str = Field(..., description="搜索关键词")


class CategoryQuery(BaseModel):
    type: int = Field(..., description="类别ID: 1=Movie, 2=TV, 3=Variety, 4=Anime")
    page: int = Field(1, ge=1, description="页码")


class DetailQuery(BaseModel):
    site_key: str = Field(..., description="站点key")
    id: str = Field(..., description="视频ID")


class CheckQuery(BaseModel):
    key: str = Field(..., description="站点key")


class VideoListResponse(JsonResponse):
    list: list = Field(default=[], description="视频列表")

