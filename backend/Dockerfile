FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy only the requirements file for efficient caching
# CRITICAL FIX: The path is now relative to the build context (the 'backend' folder).
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# The application code (main.py, etc.) will be mounted via docker-compose volumes in development.

# Expose the port the FastAPI application runs on
EXPOSE 8000

# The command to run the application is specified in docker-compose.yml
