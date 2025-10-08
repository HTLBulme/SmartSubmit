# Use Node.js 18 as base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy backend files
COPY backend/ ./

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Expose application port
EXPOSE 3000

# Start the server
CMD ["node", "smartsubmit_app.js"]
