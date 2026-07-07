FROM node:22-alpine
WORKDIR /app
ENV DATA_DIR=/app/data

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
