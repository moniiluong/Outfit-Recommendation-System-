import apiService from './apiService';

const originalFetch = global.fetch;
const originalTimeout = AbortSignal.timeout;

beforeEach(() => {
  global.fetch = jest.fn();
  AbortSignal.timeout = jest.fn(() => undefined);
});

afterEach(() => {
  global.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
});

it('explains when the local backend cannot be reached', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(apiService.fetchWeather(40, -74)).rejects.toThrow(
    'Could not reach the weather server'
  );
});

it('preserves the backend weather error instead of blaming every failure on the key', async () => {
  fetch.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => ({ detail: 'OpenWeather is unavailable. Please try again later.' }),
  });
  await expect(apiService.fetchWeather(40, -74)).rejects.toThrow(
    'OpenWeather is unavailable'
  );
});

it('explains a request timeout', async () => {
  fetch.mockRejectedValue(Object.assign(new Error('Timeout'), { name: 'TimeoutError' }));
  await expect(apiService.fetchWeather(40, -74)).rejects.toThrow('timed out');
});
