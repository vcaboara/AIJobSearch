#!/bin/bash
# Script to run all frontend CI steps (lint, test, build) inside the container.

echo "--- Running Frontend CI Steps (Lint, Test, Build) ---"

# CRITICAL FIX: Run 'npm install' inside the container first.
# This ensures that any changes to package.json (like adding the 'ci' script 
# or adding new dependencies like eslint/vitest) are recognized and installed
# before the 'ci' script is executed.
docker compose exec frontend npm install

# Check the exit status of npm install
if [ $? -ne 0 ]; then
    echo "--- Frontend CI FAILED during npm install! ---"
    exit 1
fi

# Execute the 'ci' script defined in package.json inside the 'frontend' service container
docker compose exec frontend npm run ci

# Check the exit status of the CI command
if [ $? -eq 0 ]; then
    echo "--- Frontend CI PASSED! ---"
else
    echo "--- Frontend CI FAILED during npm run ci! ---"
    exit 1
fi
exit 0