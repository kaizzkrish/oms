# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend ./backend
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod /prod/backend

# ---------- Runtime ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9 --activate \
    && npm install -g pm2 \
    && addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
WORKDIR /app

COPY --from=build /prod/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/ecosystem.config.js ./ecosystem.config.js

RUN mkdir -p /app/storage && chown -R nodeusr:nodegrp /app
USER nodeusr

EXPOSE 3000
CMD ["pm2-runtime", "ecosystem.config.js"]
