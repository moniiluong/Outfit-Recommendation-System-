import apiService from './apiService';

export const EXAMPLE_WEATHER = {
  location: 'Brooklyn, New York',
  temperature: 18,
  condition: 'Clouds',
  description: 'Partly cloudy',
  high: 21,
  low: 14,
  humidity: 64,
  wind: 12,
  sample: true,
  forecast: [18, 19, 20, 19, 17, 16].map((temp, index) => ({
    dt: Date.now() + index * 10800000,
    temp,
    condition: index === 3 ? 'Rain' : 'Clouds',
  })),
};

export async function getLocalWeather(latitude, longitude) {
  const data = await apiService.fetchWeather(latitude, longitude);
  const current = data.current?.current;
  if (!Number.isFinite(current?.temperature))
    throw new Error('Weather data is unavailable. Please try again.');
  const forecast = (data.forecast || [])
    .filter((item) => Number.isFinite(item.temp) && Number.isFinite(item.dt))
    .map((item) => ({ ...item, dt: item.dt * 1000 }));
  const today = new Date().toLocaleDateString();
  const todayTemps = [
    current.temperature,
    ...forecast
      .filter((item) => new Date(item.dt).toLocaleDateString() === today)
      .map((item) => item.temp),
  ];
  return {
    location: [data.current.location?.name, data.current.location?.country]
      .filter(Boolean)
      .join(', '),
    temperature: current.temperature,
    condition: current.condition,
    description: current.description || current.condition,
    high: Math.max(...todayTemps),
    low: Math.min(...todayTemps),
    humidity: current.humidity,
    wind: (current.wind?.speed || 0) * 3.6,
    forecast,
    sample: false,
  };
}
