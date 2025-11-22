# Base image for Python 3.11
FROM python:3.11-slim

# Set environment variables for non-interactive commands
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory
WORKDIR /app

# Copy requirements file and install dependencies
# We use a temporary command to ensure this step doesn't rely on the broken cache
# This step forces a new layer to be generated, bypassing the parent snapshot issue.
# This specific command is a standard practice to invalidate the cache only when the file changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port Uvicorn runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# The --host 0.0.0.0 is crucial for running inside a container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
