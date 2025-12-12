FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY tsconfig.json ./

# Build shared package first
RUN pnpm --filter @maplelaw/shared build

# Build backend
RUN pnpm --filter @maplelaw/backend build

# Production image - minimal, no pnpm needed
FROM node:20-alpine AS production

WORKDIR /app

# Copy the built backend dist
COPY --from=builder /app/apps/backend/dist ./dist

# Copy the entire node_modules from builder (includes all deps resolved by pnpm)
COPY --from=builder /app/node_modules ./node_modules

# Copy the built shared package
COPY --from=builder /app/packages/shared ./node_modules/@maplelaw/shared

# Create uploads directory
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/main.js"]
