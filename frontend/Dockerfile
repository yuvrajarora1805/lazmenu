FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
