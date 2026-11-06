# Outfit Recommendation System

Thread is a wardrobe-first outfit dashboard with a React frontend and a FastAPI weather backend. Add photos of your own clothes, label their category and warmth, and put together an outfit for the current conditions.

## Wardrobe experience

- Upload JPG, PNG, or WebP clothing photos up to 8 MB; photos are resized before storage.
- Organize and search tops, bottoms, outerwear, shoes, and accessories.
- Generate weather-based outfit boards using your uploaded pieces, with guidance for missing layers and rain protection.
- Save and delete looks, and switch between Celsius and Fahrenheit.
- Clothing photos and saved looks persist in IndexedDB in the current browser. They do not sync to a server or other devices. Clearing site data removes them.
- First-time visitors see a labeled sample wardrobe and example weather. The first clothing upload switches to the personal wardrobe. Select **Use my location** to fetch live weather. Location or weather errors keep the rest of the app usable.

Outfit matching uses local rules based on clothing details, temperature, and rain. New uploads automatically try plain-background cleanup with Pillow on the backend. Preview the transparent clothing cutout, adjust background tolerance, trace an outline for a complex background, or keep the original photo. The selected version appears throughout your wardrobe and saved outfit boards. No image-generation service or model downloads are needed. See [Clothing photo cleanup](docs/clothing-cutouts.md) for behavior and limitations.

## Quick preview

```bash
npm install
npm start
```

The dashboard, sample wardrobe, original photo uploads, and saved outfits work without a backend. Automatic background cleanup requires the backend; if it is unavailable, you can save the original photo. Live weather also requires the backend and an OpenWeatherMap key. Postgres is only needed for the legacy recommendation and feedback endpoints; it does not block weather or backend startup.

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
Restart the backend after changing the key; Python file reloading does not reload `.env` changes.
For the legacy recommendation and feedback endpoints, also set `DATABASE_URL` in `backend/.env` to your Postgres connection string. The database connects on the first request to one of those endpoints.

### 2. Frontend

From the project root:

```bash
npm install
```

Optionally create `.env` in the project root to override the default backend address. The OpenWeatherMap key belongs only in `backend/.env`:

```env
REACT_APP_API_URL=http://localhost:8000
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

- `GET /api/` health check
- `POST /api/weather`
- `POST /api/clothing/cutout`
- `POST /api/recommendations`
- `POST /api/feedback`
- `POST /api/user/insights`
- `POST /api/user/export`
- `DELETE /api/user/clear`

Swagger UI is available at `http://localhost:8000/docs`.

## Notes

- Wardrobe recommendations use `src/data/wardrobe.js`; photo storage is local to the browser.
- The legacy backend learning services store feedback, weather history, and learned weights in Postgres.
- Local and deployed API requests use the `/api` prefix. `REACT_APP_API_URL` accepts an origin with or without `/api`.
- Verify the frontend with `CI=true npm test -- --watchAll=false --runInBand` and `npm run build`.
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
