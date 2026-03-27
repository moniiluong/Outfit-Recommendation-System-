@echo off
REM Start script for Outfit Recommendation System (Windows)
REM Starts both backend and frontend

echo Starting Outfit Recommendation System...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python 3 is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js 14 or higher.
    exit /b 1
)

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo Virtual environment not found. Creating it now...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    echo Virtual environment created and dependencies installed
)

REM Check if backend .env exists
if not exist "backend\.env" (
    echo Backend .env file not found. Copying from example...
    copy backend\.env.example backend\.env
    echo Please edit backend\.env and add your OpenWeatherMap API key
)

REM Check if frontend .env exists
if not exist ".env" (
    echo Frontend .env file not found. Please create it with:
    echo    REACT_APP_WEATHER_API_KEY=your_key_here
    echo    REACT_APP_API_URL=http://localhost:8000
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Node modules not found. Installing...
    call npm install
    echo Node modules installed
)

echo.
echo Starting services...
echo.

REM Start backend
echo Starting Python backend on port 8000...
cd backend
call venv\Scripts\activate
start /B uvicorn app.main:app --reload > ..\backend.log 2>&1
cd ..

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo Backend started
echo.

REM Start frontend
echo Starting React frontend on port 3000...
echo.
call npm start

echo.
echo All services stopped
