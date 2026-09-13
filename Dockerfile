# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build stage
FROM --platform=$BUILDPLATFORM docker.io/library/node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# No API URL is baked in: the container resolves it at runtime (see docker/env.sh).
RUN npx expo export --platform web --output-dir dist \
 && sed -i 's|<head>|<head><script src="/env.js"></script><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#FF6A00"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Dichtbij3D">|' dist/index.html

# ---------------------------------------------------------------- runtime stage
FROM docker.io/library/nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/env.sh /docker-entrypoint.d/40-dichtbij3d-env.sh
COPY --from=build /app/dist /usr/share/nginx/html

# API_URL empty  -> same origin, nginx proxies /api to BACKEND_URL
# API_URL set    -> the browser talks to that origin directly (CORS applies)
ENV API_URL="" \
    BACKEND_URL="http://backend:8080" \
    PORT=80

RUN chmod +x /docker-entrypoint.d/40-dichtbij3d-env.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:${PORT}/ >/dev/null || exit 1
