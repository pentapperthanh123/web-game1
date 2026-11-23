# ========================================================
# LoL TikTok Live Game - Multi-stage Production Dockerfile
# ========================================================

# --- Stage 1: Base image with PNPM package manager ---
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo manifests for optimal Docker layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
COPY apps/web-game1/client/package.json ./apps/web-game1/client/
COPY apps/web-game1/admin/package.json ./apps/web-game1/admin/

# --- Stage 2: Server Builder ---
FROM base AS server-build
RUN pnpm --filter server install --frozen-lockfile
COPY server ./server
RUN pnpm --filter server build && \
    mkdir -p ./server/dist/constants && \
    cp -r ./server/src/constants/*.json ./server/dist/constants/ 2>/dev/null || true

# --- Stage 3: Server Production Runner ---
FROM node:22-alpine AS server-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
RUN pnpm --filter server install --prod --frozen-lockfile

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/data ./server/data

WORKDIR /app/server
EXPOSE 4000

CMD ["node", "dist/index.js"]

# --- Stage 4: Client (Game Overlay) Builder ---
FROM base AS client-build
RUN pnpm --filter client install --frozen-lockfile
COPY apps/web-game1/client ./apps/web-game1/client
RUN pnpm --filter client build

# --- Stage 5: Client Production Runner (Lightweight Nginx) ---
FROM nginx:alpine AS client-runner
COPY --from=client-build /app/apps/web-game1/client/dist /usr/share/nginx/html
COPY docker/nginx-client.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# --- Stage 6: Admin Portal Builder ---
FROM base AS admin-build
RUN pnpm --filter admin install --frozen-lockfile
COPY apps/web-game1/admin ./apps/web-game1/admin
RUN pnpm --filter admin build

# --- Stage 7: Admin Portal Production Runner (Lightweight Nginx) ---
FROM nginx:alpine AS admin-runner
COPY --from=admin-build /app/apps/web-game1/admin/dist /usr/share/nginx/html
COPY docker/nginx-admin.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
