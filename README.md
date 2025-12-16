# 冬瓜TV (dongguaTV)

🎬 打造你的私人 Netflix！TMDb 智能刮削 + 全网聚合 + 极速播放

## 🌟 项目简介

冬瓜TV是一个基于Node.js的视频聚合平台，集成了30+个影视资源站点的API，提供智能搜索、资源聚合、实时测速等功能，让你轻松构建个人影视库。

## ✨ 核心功能

- 🔍 **智能搜索** - 聚合30+影视站点，一键搜索全网资源
- ⚡ **实时测速** - 自动检测各站点响应速度，优先推荐最快资源
- 🎯 **多源聚合** - 支持非凡影视、暴风资源、电影天堂等30+主流站点
- 🔥 **热门推荐** - 自动获取24小时热门影视内容
- 🎨 **简洁界面** - 响应式设计，支持PC/移动端完美适配
- 🔐 **后台管理** - 支持站点开关配置，自定义资源源
- 📊 **数据持久化** - JSON数据库存储，支持自定义配置

## 🚀 快速开始

### 环境要求
- Node.js ≥ 16.0
- npm ≥ 6.0

### 安装部署
```bash
# 克隆项目
git clone https://github.com/your-username/dongguaTV.git
cd dongguaTV

# 安装依赖
npm install

# 配置TMDB_API_KEY 编辑 index.html 
const TMDB_API_KEY = "替换成你自己的KEY"; 
# 配置 TMDB_API_KEY 为你自己的TMDb API密钥

# 启动服务
npm start
# 或
node server.js
```

### Docker 方式
```bash
# 克隆项目
git clone https://github.com/your-username/dongguaTV.git
cd dongguaTV
# 编译和启动
docker compose up -d --build
```
### 访问应用
- 前端页面: http://localhost:3000
- 后台管理: http://localhost:3000/admin.html
- 管理员密码: `admin`

## 📡 API接口

### 搜索接口
```
GET /api/search?wd=关键词
```

### 详情接口
```
GET /api/detail?site_key=站点key&id=影片ID
```

### 热门推荐
```
GET /api/hot
```

### 站点测速
```
GET /api/check?key=站点key
```

### 管理接口
```
POST /api/admin/login              # 管理员登录
GET  /api/admin/sites              # 获取站点配置
POST /api/admin/sites              # 更新站点配置
```

## 🎛️ 内置站点

平台集成了以下30+个影视资源站点：

| 站点名称 | 状态 | 特点 |
|---------|------|------|
| 非凡影视 | ✅ | 资源丰富，更新快速 |
| 暴风资源 | ✅ | 高清资源多 |
| 电影天堂 | ✅ | 经典老牌站点 |
| 天涯资源 | ✅ | 稳定可靠 |
| 360资源 | ✅ | 接口稳定 |
| 量子资源 | ✅ | 蓝光高清 |
| 豆瓣资源 | ✅ | 评分准确 |
| 爱奇艺 | ✅ | 正版资源 |
| ... | ... | ... |

## 🔧 配置说明

### 环境配置
```javascript
const PORT = 3000;              // 服务端口
const ADMIN_PASSWORD = "admin"; // 管理员密码
const FORCE_UPDATE = true;      // 是否强制更新站点配置
```

### 站点配置
站点配置存储在 `db.json` 文件中，包含以下字段：
```json
{
  "sites": [
    {
      "key": "ffzy",
      "name": "非凡影视",
      "api": "https://api.ffzyapi.com/api.php/provide/vod",
      "active": true
    }
  ]
}
```

## 🛠️ 技术栈

- **后端**: Node.js + Express.js
- **前端**: HTML5 + CSS3 + JavaScript
- **数据存储**: JSON文件数据库
- **HTTP请求**: Axios
- **跨域处理**: CORS
- **缓存**: Node-cache

## 📱 界面预览

### 主界面
- 搜索框：支持关键词搜索
- 热门推荐：展示24小时热门内容
- 搜索结果：显示多源聚合结果
- 详情页面：展示影片详细信息和播放链接

### 管理后台
- 站点管理：开关各资源站点
- 配置管理：自定义API接口
- 系统状态：查看服务运行状态

## 🔒 安全说明

- 建议修改默认管理员密码
- 生产环境建议使用Nginx反向代理
- 定期更新依赖包以确保安全性

## 📝 免责声明

本项目仅供学习研究使用，请勿用于商业用途。使用本项目产生的任何法律问题由使用者自行承担。请支持正版影视内容。

## 🤝 贡献指南

欢迎提交Issue和Pull Request来完善项目！

### 开发计划
- [ ] 添加更多影视资源站点
- [ ] 支持用户收藏和历史记录
- [ ] 添加播放历史同步功能
- [ ] 支持多用户系统
- [ ] 添加影视推荐算法

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

## ⭐ 支持项目

如果这个项目对你有帮助，请给个Star支持一下！

---

**🎬 冬瓜TV - 让每个人都能拥有专属的影视库！**