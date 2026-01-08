# STAGE 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --prefix ./backend
RUN npm ci --prefix ./frontend

# Copy all source files
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN npm run build --prefix ./frontend

# Generate Prisma Client
RUN cd backend && npx prisma generate

# STAGE 2: Production
FROM node:20-alpine
WORKDIR /app

# Copy backend files
COPY --from=builder /app/backend ./backend

# Copy frontend build
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "backend/src/main.js"]