#!/bin/bash
echo "Starting SheCods Backend..."
cd "$(dirname "$0")/server"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python3 main.py
