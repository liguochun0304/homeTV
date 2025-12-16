FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chmod +x /app/entrypoint.sh

# 使用自定义入口脚本
ENTRYPOINT ["/app/entrypoint.sh"]