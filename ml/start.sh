#!/bin/bash

# VetCare Pro ML Service Startup Script

echo "Starting VetCare Pro ML Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update requirements
echo "Installing/updating dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Please copy .env.example to .env and configure it."
    cp .env.example .env
    echo "Created .env from .env.example. Please update with your database credentials."
fi

# Report which Ollama chat model is configured before starting
CHAT_MODEL=$(grep -E '^OLLAMA_CHAT_MODEL=' .env | cut -d '=' -f2-)
echo "Using LLM chat model: ${CHAT_MODEL:-qwen3:8b (default)}"

# Start Flask server
echo "Starting Flask ML API server..."
python app.py
