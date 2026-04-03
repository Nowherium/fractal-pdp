# Standalone production web image.
# - Builds the Vite app once
# - Serves the compiled SPA from `dist/`
# - Proxies `/api/*` to a separate `backend` container when present
FROM node:22-alpine3.23 AS frontend-builder
WORKDIR /app

RUN apk upgrade --no-cache

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine AS production-web
WORKDIR /usr/share/caddy

RUN apk upgrade --no-cache

COPY --from=frontend-builder /app/dist /usr/share/caddy
COPY Caddyfile.prod /etc/caddy/Caddyfile

EXPOSE 80
