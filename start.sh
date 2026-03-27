#!/bin/bash

# Start script for Outfit Recommendation System
# Starts both backend and frontend

echo "🚀 Starting Outfit Recommendation System..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14 or higher."
    exit 1
fi

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "⚠️  Virtual environment not found. Creating it now..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✅ Virtual environment created and dependencies installed"
fi

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Copying from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and add your OpenWeatherMap API key"
fi

# Check if frontend .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Frontend .env file not found. Please create it with:"
    echo "   REACT_APP_WEATHER_API_KEY=your_key_here"
    echo "   REACT_APP_API_URL=http://localhost:8000"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Node modules not found. Installing..."
    npm install
    echo "✅ Node modules installed"
fi

echo ""
echo "Starting services..."
echo ""

# Start backend in background
echo "📦 Starting Python backend on port 8000..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to become reachable
BACKEND_READY=0
for _ in {1..15}; do
    if curl -sf http://localhost:8000/ > /dev/null; then
        BACKEND_READY=1
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" -ne 1 ]; then
    echo "❌ Backend failed to become ready. Check backend.log for errors."
    if ps -p $BACKEND_PID > /dev/null; then
        kill $BACKEND_PID
    fi
    exit 1
fi

echo "✅ Backend started successfully (PID: $BACKEND_PID)"

# Start frontend
echo "⚛️  Starting React frontend on port 3000..."
echo ""
npm start

# When npm start exits, kill the backend
echo ""
echo "🛑 Stopping backend..."
kill $BACKEND_PID
echo "✅ All services stopped"
