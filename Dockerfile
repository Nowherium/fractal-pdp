# Standalone production web image.
# - Builds the Vite app once
# - Serves the compiled SPA from `dist/`
# - Proxies `/api/*` to a separate `backend` container when present
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine AS production-web
WORKDIR /usr/share/caddy

COPY --from=frontend-builder /app/dist /usr/share/caddy
COPY Caddyfile.prod /etc/caddy/Caddyfile

EXPOSE 80
