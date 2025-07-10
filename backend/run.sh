#!/bin/bash

echo "Starting Stable Diffusion Inpainting API..."
echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 