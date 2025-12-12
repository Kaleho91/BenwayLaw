FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY tsconfig.json ./

# Build shared package
RUN pnpm --filter @maplelaw/shared build

# Build backend
RUN pnpm --filter @maplelaw/backend build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy built artifacts
COPY --from=base /app/apps/backend/dist ./dist
COPY --from=base /app/apps/backend/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages

# Create uploads directory
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/main.js"]
