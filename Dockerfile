// File: Dockerfile
// Generated: 2025-10-08 13:14:24 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_v2ffhjtj2o84

rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ============================================
# Dependencies stage
# ============================================
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Build stage
# ============================================
FROM base AS build

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts

# Copy application source
COPY . .

# Remove dev dependencies and clean cache
RUN npm prune --production && \
    npm cache clean --force

# ============================================
# Production stage
# ============================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_LOGLEVEL=warn

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application files from build stage
COPY --from=build --chown=nodejs:nodejs /app/src ./src
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Create directories for uploads and logs with proper permissions
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
