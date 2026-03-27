# Outfit Recommendation System

Weather-based outfit recommendations with a React frontend and a FastAPI backend. The backend handles weather fetching, recommendation generation, feedback learning, and SQLite persistence.

## Stack

- React frontend in `src/`
- FastAPI backend in `backend/app/`
- SQLite database for user feedback and model weights
- OpenWeatherMap for current weather and forecast data

## Project Structure

```text
.
├── backend/              # FastAPI app, database, ML services
├── public/               # Static assets
├── src/                  # React app
├── start.sh              # Unix startup helper
├── start.bat             # Windows startup helper
└── README.md
```

## Prerequisites

- Python 3.8+
- Node.js 14+
- An OpenWeatherMap API key

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `REACT_APP_WEATHER_API_KEY` in `backend/.env`.

### 2. Frontend

From the project root:

```bash
npm install
```

Create `.env` in the project root:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WEATHER_API_KEY=your_openweathermap_api_key
```

## Run

Start the backend:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```bash
npm start
```

You can also use `./start.sh` on macOS/Linux or `start.bat` on Windows.

## Main Endpoints

- `GET /` health check
- `POST /api/weather`
- `POST /api/recommendations`
- `POST /api/feedback`
- `POST /api/user/insights`
- `POST /api/user/export`
- `DELETE /api/user/clear`

Swagger UI is available at `http://localhost:8000/docs`.

## Notes

- Recommendation quality improves after the user provides feedback.
- The backend stores feedback, weather history, and learned weights in SQLite.
- Backend-specific details remain in `backend/README.md`.

## Deploy Backend on Render

This repo includes `render.yaml` for the FastAPI backend.

Required backend environment variables:

- `REACT_APP_WEATHER_API_KEY`
- `ALLOWED_ORIGINS` set to your frontend URL, for example `https://your-app.vercel.app`
- `DATABASE_URL` can use the Render disk path from `render.yaml`

After Render creates the backend service, copy its public URL into your Vercel frontend env as:

```env
REACT_APP_API_URL=https://your-render-service.onrender.com
```
