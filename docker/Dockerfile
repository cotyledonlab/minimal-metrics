FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tracker/ ./tracker/
RUN npm run build:tracker

FROM node:18-alpine AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S minimal -u 1001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/tracker/tracker.min.js ./tracker/tracker.min.js

COPY server/ ./server/
COPY dashboard/ ./dashboard/

RUN mkdir -p /app/data && \
    chown -R minimal:nodejs /app/data

USER minimal

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/metrics.db

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]