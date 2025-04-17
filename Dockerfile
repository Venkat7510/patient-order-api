# Use official Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package descriptors
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production

# Copy application code
COPY src ./src

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm","start"]
