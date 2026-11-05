"""Run with: backend/venv/bin/python -m unittest discover -s backend/tests"""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# Unit tests never load the developer's env files.
with patch('dotenv.load_dotenv'):
    from app.main import app
    from app import database


class WeatherTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'REACT_APP_WEATHER_API_KEY': 'test-key'})
        self.env.start()
        self.addCleanup(self.env.stop)

    def upstream(self, status=200):
        request = httpx.Request('GET', 'https://api.openweathermap.org/?appid=test-key')
        return httpx.Response(status, request=request, json={})

    def test_startup_and_weather_do_not_connect_to_database(self):
        upstream = AsyncMock()
        upstream.get.side_effect = [
            httpx.Response(200, request=self.upstream().request, json={
                'main': {'temp': 12, 'humidity': 70},
                'weather': [{'main': 'Clouds', 'description': 'cloudy'}],
                'wind': {'speed': 3}, 'name': 'Test City', 'sys': {'country': 'US'},
            }),
            httpx.Response(200, request=self.upstream().request, json={'list': [{
                'dt': 1700000000, 'main': {'temp': 13},
                'weather': [{'main': 'Rain', 'description': 'light rain'}],
            }]}),
        ]
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=upstream)
        context.__aexit__ = AsyncMock(return_value=False)
        with patch.object(database, 'create_engine', side_effect=AssertionError('Database must not be used')), \
                patch('app.main.httpx.AsyncClient', return_value=context), \
                TestClient(app) as client:
            self.assertEqual(client.get('/api/').status_code, 200)
            result = client.post('/api/weather', json={'lat': 40, 'lon': -74})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['current']['current']['temperature'], 12)
        self.assertEqual(result.json()['forecast'][0]['condition'], 'Rain')

    def test_upstream_failures_are_specific_and_never_expose_key(self):
        request = self.upstream().request
        for failure, status, message in (
            (httpx.HTTPStatusError('secret: test-key', request=request, response=self.upstream(401)), 502, 'rejected'),
            (httpx.HTTPStatusError('secret: test-key', request=request, response=self.upstream(429)), 502, 'limit'),
            (httpx.ConnectError('secret: test-key', request=request), 502, 'connect'),
            (httpx.ReadTimeout('secret: test-key', request=request), 504, 'too long'),
        ):
            with self.subTest(failure=type(failure).__name__, status=status):
                upstream = AsyncMock()
                upstream.get.side_effect = failure
                context = MagicMock()
                context.__aenter__ = AsyncMock(return_value=upstream)
                context.__aexit__ = AsyncMock(return_value=False)
                with patch('app.main.httpx.AsyncClient', return_value=context), TestClient(app) as client:
                    result = client.post('/api/weather', json={'lat': 40, 'lon': -74})
                self.assertEqual(result.status_code, status)
                self.assertIn(message, result.json()['detail'])
                self.assertNotIn('test-key', result.text)
                self.assertNotIn('appid', result.text)

    def test_missing_key_reports_configuration_error(self):
        with patch.dict(os.environ, {'REACT_APP_WEATHER_API_KEY': ''}), TestClient(app) as client:
            result = client.post('/api/weather', json={'lat': 40, 'lon': -74})
        self.assertEqual(result.status_code, 500)
        self.assertIn('not configured', result.json()['detail'])

    def test_legacy_routes_report_database_failure_and_can_retry(self):
        session = MagicMock()
        factory = MagicMock(return_value=session)
        with patch.object(database, 'SessionLocal', None), \
                patch.object(database, 'init_db', side_effect=RuntimeError('private connection string')):
            with TestClient(app) as client:
                result = client.post('/api/user/insights', json={'user_id': 'test'})
            self.assertEqual(result.status_code, 503)
            self.assertNotIn('private', result.text)
            with patch.object(database, 'init_db', side_effect=lambda: setattr(database, 'SessionLocal', factory)):
                dependency = database.get_db()
                self.assertIs(next(dependency), session)
                dependency.close()
                session.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()
