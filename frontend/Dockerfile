# Base image for development environment
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install dependencies on container start (required when using volume mounts)
# For local dev, we ensure all necessary packages are present
# We copy package.json first to leverage caching if possible
COPY package*.json ./
RUN npm install

# Copy the rest of the source code (although this is often overridden by volume mounts)
COPY . .

# Define the port the container listens on
EXPOSE 5173

# CRITICAL: This command runs the Vite dev server with host and port settings
# It must be the CMD because we need to run a persistent process.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
