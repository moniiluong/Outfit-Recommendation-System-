# ML-Powered Outfit Recommendation System

An intelligent weather-based outfit recommendation system that uses machine learning to analyze weather patterns, temperature ranges, and precipitation data to generate personalized clothing suggestions. The system learns from your feedback to provide increasingly accurate recommendations over time.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface (React)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Weather   │  │   Avatar     │  │    Recommendations     │  │
│  │   Header    │  │   Display    │  │  (ML-Enhanced UI)      │  |
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│         ▲               ▲                      ▲                │
└─────────┼───────────────┼──────────────────────┼────────────────┘
          │               │                      │
          │               │                      │ Feedback
          │               │                      ▼
┌─────────┴───────────────┴──────────────────────────────────────-┐
│                         App.js (Main Controller)                │
│  • Fetches weather data from OpenWeatherMap API                 │
│  • Initializes ML services                                      │
│  • Coordinates data flow between services                       │
│  • Manages state and user interactions                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
        ┌────────▼────────┐      ┌────────▼────────┐
        │  Weather API    │      │  ML Services    │
        │  (OpenWeather)  │      │   Layer         │
        └────────┬────────┘      └────────┬────────┘
                 │                        │
                 │                        │
        ┌────────▼───────────────────────-▼───────┐
        │                                         │
        │         ML Processing Pipeline          │
        │                                         │
        │  ┌────────────────────────────────────┐ │
        │  │  1. Weather Pattern Analyzer       │ │
        │  │     • Analyze weather metrics      │ │
        │  │     • Calculate comfort indices    │ │
        │  │     • Detect trends & patterns     │ │
        │  │     • Store historical data        │ │
        │  └──────────────┬─────────────────────┘ │
        │                 │                       │
        │                 │ Weather Analysis      │
        │                 ▼                       │
        │  ┌────────────────────────────────────┐ │
        │  │  2. ML Recommendation Engine       │ │
        │  │     • Extract ML features          │ │
        │  │     • Generate base recommendations│ │
        │  │     • Apply personalization        │ │
        │  │     • Rank by confidence           │ │
        │  │     • Generate reasoning           │ │
        │  └──────────────┬─────────────────────┘ │
        │                 │                        │
        │                 │ Recommendations        │
        │                 ▼                        │
        │  ┌────────────────────────────────────┐ │
        │  │  3. User Preference Learning       │ │
        │  │     • Record feedback              │ │
        │  │     • Update model weights         │ │
        │  │     • Build user profile           │ │
        │  │     • Generate insights            │ │
        │  └──────────────┬─────────────────────┘ │
        │                 │                        │
        └─────────────────┼────────────────────────┘
                          │
                          │ Persistence
                          ▼
              ┌────────────────────────┐
              │   localStorage         │
              │  • Historical data     │
              │  • User profile        │
              │  • Model weights       │
              │  • Feedback history    │
              └────────────────────────┘
```

## Features

### Core ML Capabilities

- **Weather Pattern Analysis**: Analyzes temperature trends, precipitation risks, comfort indices, and weather stability
- **Machine Learning Recommendations**: Uses neural network-inspired algorithms to generate personalized outfit suggestions
- **Reinforcement Learning**: Continuously learns from user feedback to improve recommendations
- **Confidence Scoring**: Each recommendation includes a confidence score (0-100%)
- **Reasoning Explanations**: Transparent explanations for why each item is recommended
- **Historical Data Tracking**: Stores up to 100 weather patterns for learning
- **User Preference Learning**: Adapts to your clothing preferences and style

### User Interface

- **Real-time Weather Data**: Fetches current weather and 4-day forecast
- **Customizable Avatar**: Avatar that changes clothing based on weather conditions
- **Avatar Customization**: Personalize skin tone, hair style, facial features, and accessories
- **Interactive Recommendations**: Click recommendations to see detailed reasoning
- **Feedback System**: Like/dislike buttons to train the ML system
- **Weather Insights Panel**: Detailed weather analysis metrics
- **Responsive Design**: Works on desktop and mobile

## How It Works

### 1. Weather Analysis
The system analyzes multiple weather factors:
- Temperature and "feels like" temperature
- Precipitation risk and type (rain/snow)
- Comfort index (combining temp, humidity, wind)
- Temperature trends (warming/cooling/stable)
- Weather stability across forecast period

### 2. ML Recommendation Generation
Using extracted weather features:
- Normalizes all weather data to 0-1 range
- Applies base recommendations using hybrid rule-based + ML approach
- Personalizes using your learned preferences
- Ranks items by confidence and category diversity
- Generates human-readable reasoning

### 3. Learning from Feedback
The system improves over time:
- Records your likes/dislikes on recommendations
- Updates ML model weights using gradient descent
- Generalizes learning to similar weather conditions
- Builds user profile of category and item preferences
- Stores all learning data locally in your browser

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenWeatherMap API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Outfit-Recommendation-System-
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
REACT_APP_WEATHER_API_KEY=your_openweathermap_api_key_here
```

Get a free API key from [OpenWeatherMap](https://openweathermap.org/api).

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. Grant location permission when prompted
2. View your initial recommendations based on current weather
3. Click recommendations to see detailed reasoning
4. Provide feedback by clicking 👍 or 👎 on items
5. After 10+ feedback entries, the system starts personalizing

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.

## Troubleshooting

### Location Permission Issues
- **Chrome**: Click lock icon → Site settings → Location → Allow
- **Safari**: Settings → Safari → Location → Allow
- **Firefox**: Click lock icon → Permissions → Location → Allow

### Weather Data Not Loading
- Check your API key in `.env` file
- Verify internet connection
- Ensure API key is active and has quota

### Recommendations Not Improving
- Provide more feedback (aim for 10+ entries)
- Check that localStorage is enabled
- Try clearing data and starting fresh

### Performance Issues
- Clear old historical data (auto-caps at 100 entries)
- Check localStorage isn't full
- Ensure browser is up to date