#!/bin/bash
set -e

echo "--- Running Backend CI Steps (Lint, Test) ---"

PYTHON_CMD="python3"
cd backend
# --- Try to use venv if it exists, else fall back to system python ---
if [ -d "venv/bin" ]; then
    echo "Activating bin virtual environment..."
    source venv/bin/activate
elif [ -d "venv/Scripts" ]; then
    echo "Activating Scripts virtual environment..."
    source venv/Scripts/activate
else
    echo "No virtual environment found. Creating one..."
    $PYTHON_CMD -m venv venv
    source venv/**/activate
fi


# --- Install dependencies ---
echo "Installing Backend Dependencies..."
$PYTHON_CMD -m pip install -U pip
$PYTHON_CMD -m pip install -r requirements.txt

# --- Linting ---
echo "Running Flake8 Linting (max line length set to 120)..."
# Explicitly set the max-line-length flag to 120 to successfully parse all files.
$PYTHON_CMD -m flake8 . --max-line-length 120 --exclude=venv,__pycache__,old
if [ $? -ne 0 ]; then
    echo "--- Backend Linting FAILED! ---"
    exit 1
fi
echo "--- Backend Linting PASSED! ---"

# --- Testing ---
echo "Running Pytest Tests..."
$PYTHON_CMD  -m pytest
if [ $? -ne 0 ]; then
    echo "--- Backend Testing FAILED! ---"
    exit 1
fi
echo "--- Backend Testing PASSED! ---"