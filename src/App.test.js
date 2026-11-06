import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { readWardrobe, writeWardrobe, preparePhoto } from './data/wardrobe';
import { getLocalWeather } from './services/dashboardWeather';
import apiService from './services/apiService';

jest.mock('./services/apiService', () => ({
  prepareGarment: jest.fn(),
  recognizeGarment: jest.fn(),
}));

jest.mock('./data/wardrobe', () => ({
  ...jest.requireActual('./data/wardrobe'),
  readWardrobe: jest.fn(),
  writeWardrobe: jest.fn(),
  preparePhoto: jest.fn(),
}));
jest.mock('./services/dashboardWeather', () => ({
  ...jest.requireActual('./services/dashboardWeather'),
  getLocalWeather: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  readWardrobe.mockResolvedValue({ items: [], looks: [] });
  writeWardrobe.mockResolvedValue();
  apiService.recognizeGarment.mockRejectedValue(new Error('Unavailable'));
  HTMLDialogElement.prototype.showModal = jest.fn();
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: { randomUUID: () => 'test-uuid' },
  });
});

it('shows explicit samples, keeps navigation usable, and filters wardrobe categories', async () => {
  render(<App />);
  await screen.findByText('Exploring a sample wardrobe');
  fireEvent.click(screen.getByRole('button', { name: 'My wardrobe' }));
  expect(screen.getByText(/These are sample pieces/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Shoes', exact: true }));
  expect(
    screen.getByRole('heading', { name: 'Classic white sneakers' })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Olive overshirt' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show my clothes' }));
  expect(
    screen.getByText(/No clothing yet. Add a top/)
  ).toBeInTheDocument();
});

it('adds a photo and switches from sample pieces to the personal wardrobe', async () => {
  preparePhoto.mockResolvedValue('data:image/webp;base64,test');
  apiService.prepareGarment.mockResolvedValue({
    image: 'data:image/png;base64,cleaned',
    width: 200,
    height: 300,
  });
  render(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Add clothing', exact: true })
    ).toBeEnabled()
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Add clothing', exact: true })
  );
  const dialog = screen.getByRole('dialog', { hidden: true });
  fireEvent.change(within(dialog).getByLabelText('Clothing photo'), {
    target: {
      files: [new File(['photo'], 'my-top.png', { type: 'image/png' })],
    },
  });
  await waitFor(() =>
    expect(
      within(dialog).getByAltText(/Your clothing preview/)
    ).toHaveAttribute('src', 'data:image/png;base64,cleaned')
  );
  fireEvent.change(within(dialog).getByLabelText('Item name'), {
    target: { value: 'My actual shirt' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Add clothing', hidden: true })
  );
  await screen.findByText('Made from your wardrobe');
  expect(writeWardrobe).toHaveBeenCalledWith(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          name: 'My actual shirt',
          image: 'data:image/png;base64,cleaned',
          category: 'Tops',
        }),
      ],
    })
  );
  expect(
    screen.queryByRole('heading', { name: 'Olive overshirt' })
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Add bottoms, shoes, outerwear/)).toBeInTheDocument();
});

it('persists outfits and opens them in Saved outfits', async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save outfit' })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save outfit' }));
  await screen.findByRole('button', { name: 'Saved', exact: true });
  expect(writeWardrobe).toHaveBeenCalledWith(
    expect.objectContaining({
      looks: [expect.objectContaining({ sample: true })],
    })
  );
  fireEvent.click(screen.getByRole('button', { name: /Saved outfits/ }));
  expect(
    screen.getByRole('heading', { name: 'Everyday layers · sample' })
  ).toBeInTheDocument();
});

it('keeps the app usable when storage and location are unavailable', async () => {
  readWardrobe.mockRejectedValue(new Error('Unavailable'));
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (_success, failure) => failure({ code: 1 }) },
  });
  render(<App />);
  await screen.findByText(/Browser storage is unavailable/);
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(screen.getByText(/Location access is off/)).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Today', exact: true })
  ).toBeInTheDocument();
  expect(getLocalWeather).not.toHaveBeenCalled();
});

it('loads live weather and converts display units without changing matching temperature', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success) =>
        success({ coords: { latitude: 40, longitude: -74 } }),
    },
  });
  getLocalWeather.mockResolvedValue({
    location: 'New York, US',
    temperature: 10,
    high: 12,
    low: 8,
    humidity: 70,
    wind: 14,
    condition: 'Rain',
    description: 'Light rain',
    sample: false,
    forecast: [],
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await screen.findByText('LIVE WEATHER');
  expect(getLocalWeather).toHaveBeenCalledWith(40, -74);
  expect(screen.getByText('Light rain')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '°F' }));
  expect(screen.getByText(/H: 54°/)).toBeInTheDocument();
  expect(screen.getByText('Exploring a sample wardrobe')).toBeInTheDocument();
});

it('shows the actual weather failure and allows another attempt', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (success) =>
        success({ coords: { latitude: 40, longitude: -74 } }),
    },
  });
  getLocalWeather.mockRejectedValue(new Error('OpenWeather is unavailable. Please try again later.'));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await screen.findByText(/OpenWeather is unavailable/);
  expect(screen.getByRole('button', { name: 'Use my location' })).toBeEnabled();
  expect(screen.getByText('EXAMPLE WEATHER')).toBeInTheDocument();
  expect(screen.queryByText(/Check the backend and weather API key/)).not.toBeInTheDocument();
});
