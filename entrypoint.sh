#!/bin/sh

# 替换 index.html 中的 TMDB_API_KEY 行
if [ -n "$TMDB_API_KEY" ]; then
  echo "Injecting TMDB_API_KEY into index.html"
  sed -i "s|const TMDB_API_KEY = \".*\";|const TMDB_API_KEY = \"$TMDB_API_KEY\";|" //app/public/index.html
else
  echo "Warning: TMDB_API_KEY not set. Keeping original placeholder in index.html."
fi

# 替换 server.js 中的 ADMIN_PASSWORD
if [ -n "$ADMIN_PASSWORD" ]; then
  echo "✅ Injecting ADMIN_PASSWORD into server.js"
  sed -i "s|const ADMIN_PASSWORD = \".*\";|const ADMIN_PASSWORD = \"$ADMIN_PASSWORD\";|" server.js
else
  echo "⚠️ ADMIN_PASSWORD not set. Keeping default ('admin') in server.js."
fi

# 启动应用
exec npm start -- --port="${PORT:-3000}"