FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "run", "server"]
