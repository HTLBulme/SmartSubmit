# Use Node.js 18 as base image
FROM node:18

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code
COPY . .

# Expose application port
EXPOSE 3000

# Start the server
CMD ["node", "smartsubmit_app.js"]