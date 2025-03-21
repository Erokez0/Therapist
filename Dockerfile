# Use official Node.js 22 as base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies since we're using npm run dev)
RUN npm ci

# Copy the rest of the application code
COPY . .

CMD ["npm", "run", "dev"]