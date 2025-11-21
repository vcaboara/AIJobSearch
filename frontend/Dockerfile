# 1. Build Stage: Use Node.js to prepare the environment
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies (This is the only thing we need the Dockerfile for now)
COPY package.json .
RUN npm install

# Set the entry point to run the npm command (though command in docker-compose will override this)
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
