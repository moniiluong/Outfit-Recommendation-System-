# Outfit Recommendation System

Weather-based outfit recommendations with a React frontend and a FastAPI backend. The backend handles weather fetching, recommendation generation, feedback learning, and Postgres persistence. The repo is now structured to support a single Vercel project with Python API functions.

## Stack

- React frontend in `src/`
- FastAPI backend in `backend/app/`
- Postgres database for user feedback and model weights
- OpenWeatherMap for current weather and forecast data

## Project Structure

```text
.
├── backend/              # FastAPI app, database, ML services
├── api/                  # Vercel Python entrypoint
├── public/               # Static assets
├── src/                  # React app
├── requirements.txt      # Root Python deps for Vercel
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
Set `DATABASE_URL` in `backend/.env` to your Postgres connection string.

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

Or start both with one command:

```bash
npm run dev
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
- The backend stores feedback, weather history, and learned weights in Postgres.
- Generated local artifacts such as `build/`, `backend.log`, `backend/venv/`, and old local `.db` files are not part of the source code and can be recreated when needed.

## Vercel Deployment

For a single-project Vercel deployment:

- keep the frontend and backend in the same repo
- Vercel will build the React app from the root project
- the FastAPI backend is exposed through `api/index.py`

Set these Vercel environment variables:

- `DATABASE_URL`
- `REACT_APP_WEATHER_API_KEY`
- `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`

`REACT_APP_API_URL` is optional for same-project deployment. If unset, the frontend uses the local backend in development and `/api` in production.
