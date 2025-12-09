# STAGE 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies with fewer logs and cleanup
RUN npm ci --prefix ./backend --quiet --no-progress
RUN npm ci --prefix ./frontend --quiet --no-progress

# Copy all source files
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN npm run build --prefix ./frontend

# Generate Prisma Client using the locally installed version from node_modules
RUN cd backend && npx prisma generate

# STAGE 2: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend files including prisma schema
COPY --from=builder /app/backend ./backend

# Copy frontend build
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

# The CMD will be overridden by docker-compose
CMD ["node", "backend/smartsubmit_app.js"]