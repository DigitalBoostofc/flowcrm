FROM node:25-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:25-alpine
LABEL org.opencontainers.image.title="flowcrm-backend"
LABEL org.opencontainers.image.description="FlowCRM NestJS backend"
LABEL org.opencontainers.image.source="https://github.com/DigitalBoostofc/flowcrm"

WORKDIR /app

RUN apk add --no-cache wget tini && \
    mkdir -p /app/uploads/avatars && \
    chown -R node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package*.json ./

USER node

EXPOSE 3001
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
