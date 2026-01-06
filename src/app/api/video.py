# -*- coding: utf-8 -*-
import time
from typing import List

import requests
from flask_openapi3 import APIBlueprint
from flask_openapi3 import Tag
from sqlalchemy import select

from app.config import API_PREFIX, JWT
from app.form.video import SearchQuery, CategoryQuery, DetailQuery, CheckQuery, VideoListResponse
from app.model import db
from app.model.site import Site
from app.utils.jwt_tools import login_required
from app.utils.response import response

__version__ = "/v1"
__bp__ = "/video"
url_prefix = API_PREFIX + __version__ + __bp__
tag = Tag(name="视频", description="视频搜索、详情、类别等")
api = APIBlueprint(__bp__, __name__, url_prefix=url_prefix, abp_tags=[tag], abp_security=JWT)


def fetch_from_site(site_key: str, type_id: int = None, page: int = 1, keyword: str = None) -> List[dict]:
    """从指定站点获取数据"""
    site_result = db.session.execute(select(Site).where(Site.key == site_key, Site.active == True)).limit(1))
    site = site_result.scalar_one_or_none()
    if not site:
        return []
    
    try:
        params = {"ac": "list", "out": "json"}
        if type_id:
            params["t"] = type_id
        if page:
            params["pg"] = page
        if keyword:
            params["wd"] = keyword
        
        res = requests.get(site.api, params=params, timeout=4)
        data = res.json()
        list_data = data.get("list") or data.get("data") or []
        if not isinstance(list_data, list):
            return []
        
        return [{"site_key": site.key, "site_name": site.name, **item} for item in list_data]
    except Exception:
        return []


@api.get("/search", responses={"200": VideoListResponse})
@login_required
def search(query: SearchQuery):
    """搜索视频"""
    wd = query.wd
    if not wd:
        return response(list=[])
    
    try:
        sites_result = db.session.execute(select(Site).where(Site.active == True))
        sites = sites_result.scalars().all()
        
        all_results = []
        for site in sites:
            try:
                results = fetch_from_site(site.key, keyword=wd)
                all_results.extend(results)
            except Exception:
                continue
        
        return response(list=all_results)
    except Exception:
        return response(list=[])


@api.get("/category", responses={"200": VideoListResponse})
@login_required
def get_category(query: CategoryQuery):
    """获取类别视频"""
    type_id = query.type
    page = query.page
    
    try:
        sites_result = db.session.execute(select(Site).where(Site.active == True).limit(3))
        sites = sites_result.scalars().all()
        
        all_results = []
        seen_names = set()
        
        for site in sites:
            try:
                results = fetch_from_site(site.key, type_id=type_id, page=page)
                for item in results:
                    name = item.get("vod_name")
                    if name and name not in seen_names:
                        seen_names.add(name)
                        all_results.append(item)
            except Exception:
                continue
        
        return response(list=all_results[:20])
    except Exception:
        return response(list=[])


@api.get("/detail", responses={"200": VideoListResponse})
@login_required
def get_detail(query: DetailQuery):
    """获取视频详情"""
    site_key = query.site_key
    video_id = query.id
    
    try:
        site_result = db.session.execute(select(Site).where(Site.key == site_key))
        site = site_result.scalar_one_or_none()
        if not site:
            return response(list=[])
        
        params = {"ac": "detail", "ids": video_id, "out": "json"}
        res = requests.get(site.api, params=params, timeout=6)
        data = res.json()
        list_data = data.get("list") or data.get("data") or []
        
        return response(list=list_data if isinstance(list_data, list) else [])
    except Exception:
        return response(list=[])


@api.get("/check")
@login_required
def check_site(query: CheckQuery):
    """检查站点速度"""
    key = query.key
    
    try:
        site_result = db.session.execute(select(Site).where(Site.key == key))
        site = site_result.scalar_one_or_none()
        if not site:
            return response(latency=9999)
        
        start = time.time() * 1000
        requests.get(f"{site.api}?ac=list&pg=1", timeout=3)
        latency = int((time.time() * 1000) - start)
        
        return response(latency=latency)
    except Exception:
        return response(latency=9999)


@api.get("/hot", responses={"200": VideoListResponse})
@login_required
def get_hot():
    """获取热门视频"""
    try:
        sites_result = db.session.execute(
            select(Site).where(Site.active == True, Site.key.in_(["ffzy", "bfzy", "lzi"]))
        )
        sites = sites_result.scalars().all()
        
        for site in sites:
            try:
                params = {"ac": "list", "pg": 1, "h": 24, "out": "json"}
                res = requests.get(site.api, params=params, timeout=3)
                data = res.json()
                list_data = data.get("list") or data.get("data") or []
                if list_data and isinstance(list_data, list):
                    return response(list=list_data[:12])
            except Exception:
                continue
        
        return response(list=[])
    except Exception:
        return response(list=[])

