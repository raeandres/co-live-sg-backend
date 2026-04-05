# Stage 1: Install dependencies
FROM node:22.12-alpine3.20 AS deps
WORKDIR /app

# Install libc6-compat for better compatibility
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: Development (hot reload, debug tools)
FROM node:22.12-alpine3.20 AS dev
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 3: Build
FROM node:22.12-alpine3.20 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 4: Production (minimal, secure image)
FROM node:22.12-alpine3.20 AS production
WORKDIR /app

# Set node environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy built application and production dependencies
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "dist/main"]
