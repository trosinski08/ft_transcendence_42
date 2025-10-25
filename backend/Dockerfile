# Backend Dockerfile
FROM node:18-bullseye-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (do this after npm install so we don't overwrite node_modules)
COPY . .

# Generate Prisma client for the container platform (include musl and debian targets)
# Run this after the schema is copied so the correct binaries are generated for this image
# Ensure DATABASE_URL is available during build and sqlite file exists so prisma can load the datasource
ENV DATABASE_URL="file:./prisma/dev.db"
RUN mkdir -p prisma && touch prisma/dev.db
RUN npx prisma generate

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "start"]
