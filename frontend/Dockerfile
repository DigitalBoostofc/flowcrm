FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
LABEL org.opencontainers.image.title="flowcrm-frontend"
LABEL org.opencontainers.image.description="FlowCRM React frontend (nginx)"
LABEL org.opencontainers.image.source="https://github.com/DigitalBoostofc/flowcrm"

# Roda nginx como usuário 'nginx' (UID 101) em vez de root.
# - libcap + setcap permite bindar na :80 sem privilégios root (CAP_NET_BIND_SERVICE).
# - chown nos paths que nginx escreve em runtime (pid + cache).
# - access/error log já são symlinks pra /dev/stdout|stderr na imagem base.
RUN apk add --no-cache wget libcap \
    && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx

COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
