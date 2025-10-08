# Use Node.js 18 as base image
FROM node:18

# Set working directory to /app
WORKDIR /app

# 1. Copy dependency files first
COPY package*.json ./

# 2. Copy all required folders into the WORKDIR (/app)
#    This creates the structure: /app/backend, /app/frontend, /app/prisma
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY prisma/ ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Expose application port
EXPOSE 3000

# Start the server: The script is now located inside the 'backend' folder
CMD ["node", "backend/smartsubmit_app.js"]