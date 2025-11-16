# --- STAGE 1: Build & Dependencies ---
# Use a Node.js 20 image as the base for building and installing dependencies.
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# 1. Copy package files for backend (server dependencies)
COPY backend/package*.json ./backend/
# [CRITICAL]: Copy the local .env file (which contains the DATABASE_URL definition)
# This is REQUIRED for 'npx prisma generate' to read the data source configuration.
# This local file is NOT used at runtime in production.
#COPY backend/.env ./backend/.env 

# 2. Copy package files for frontend (build dependencies)
COPY frontend/package*.json ./frontend/

# Install dependencies in the backend subdirectory
RUN npm install --prefix ./backend

# Install dependencies and run the frontend build process
RUN npm install --prefix ./frontend
# NOTE: Replace 'npm run build' if your frontend build script has a different name
RUN npm run build --prefix ./frontend

# Copy the rest of the application code
COPY . .

# Run Prisma generation to create the client for the application
# This step requires the DATABASE_URL to be defined, which is why we copied the local .env file.
RUN npx prisma generate --schema=./backend/prisma/schema.prisma

# --- STAGE 2: Production Image ---
# Use a minimal image for the final production environment
FROM node:20-alpine

# Set the working directory for the final application
WORKDIR /app

# Copy only the necessary files from the builder stage
# Copy backend production node modules and Prisma client
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma

# Copy the application code (including backend/smartsubmit_app.js and other files)
COPY --from=builder /app .

# Copy the built frontend static files
# IMPORTANT: Adjust the 'frontend/dist' path if your build output directory is different!
COPY --from=builder /app/frontend/dist ./frontend/dist 


# Expose the application port
EXPOSE 3000

# Command to run the application (smartsubmit_app.js is in the backend/ subdirectory)
CMD [ "node", "backend/smartsubmit_app.js" ]