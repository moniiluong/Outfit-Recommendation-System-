import base64
from io import BytesIO
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
with patch('dotenv.load_dotenv'):
    from app.main import app
    from app import clothing_cutout as cutout_service


def data_url(image, image_format="PNG", **kwargs):
    output = BytesIO()
    image.save(output, format=image_format, **kwargs)
    mime = "jpeg" if image_format == "JPEG" else "png"
    return f"data:image/{mime};base64," + base64.b64encode(output.getvalue()).decode()


def returned_image(result):
    return Image.open(BytesIO(base64.b64decode(result.json()['image'].split(',')[1]))).convert('RGBA')


class ClothingCutoutTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.red = data_url(Image.new('RGBA', (10, 10), (230, 30, 40, 255)))

    def test_plain_background_cleanup_preserves_enclosed_white_print(self):
        photo = Image.new('RGB', (80, 100), 'white')
        draw = ImageDraw.Draw(photo)
        draw.rectangle((20, 20, 60, 80), fill=(120, 30, 40))
        draw.rectangle((34, 34, 45, 45), fill='white')
        result = self.client.post('/api/clothing/cutout', json={'image': data_url(photo)})
        self.assertEqual(result.status_code, 200)
        cutout = returned_image(result)
        self.assertEqual(cutout.size, (41, 61))
        self.assertEqual(cutout.getpixel((18, 18)), (255, 255, 255, 255))
        self.assertEqual(cutout.getpixel((2, 2)), (120, 30, 40, 255))
        self.assertEqual(result.headers['cache-control'], 'no-store')

    def test_existing_alpha_is_preserved_and_empty_margins_are_trimmed(self):
        photo = Image.new('RGBA', (40, 40))
        ImageDraw.Draw(photo).rectangle((10, 8, 30, 32), fill='white')
        result = self.client.post('/api/clothing/cutout', json={'image': data_url(photo)})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(returned_image(result).size, (21, 25))
        self.assertEqual(result.json()['method'], 'original transparency')

    def test_manual_outline_retains_source_pixels_and_cuts_away_background(self):
        photo = Image.new('RGBA', (100, 100), (20, 170, 100, 255))
        result = self.client.post('/api/clothing/cutout', json={
            'image': data_url(photo), 'outline': [{'x': .2, 'y': .2}, {'x': .8, 'y': .2}, {'x': .5, 'y': .8}]})
        self.assertEqual(result.status_code, 200)
        cutout = returned_image(result)
        self.assertEqual(cutout.getpixel((30, 15)), (20, 170, 100, 255))
        self.assertEqual(cutout.getpixel((0, cutout.height - 1))[3], 0)
        self.assertEqual(result.json()['method'], 'your outline')

    def test_empty_cleanup_bad_photos_and_incomplete_outline_report_errors(self):
        invalid = ['https://example.com/photo.jpg', 'data:image/png;base64,???', data_url(Image.new('RGB', (2001, 2000)))]
        for image in invalid:
            self.assertEqual(self.client.post('/api/clothing/cutout', json={'image': image}).status_code, 422)
        blank = data_url(Image.new('RGB', (20, 20), 'white'))
        self.assertEqual(self.client.post('/api/clothing/cutout', json={'image': blank}).status_code, 422)
        self.assertEqual(self.client.post('/api/clothing/cutout', json={'image': self.red, 'outline': [{'x': .1, 'y': .1}]}).status_code, 422)

    def test_cutout_needs_neither_database_nor_external_image_service(self):
        with patch('httpx.AsyncClient', side_effect=AssertionError('No external requests')), \
                patch('app.database.create_engine', side_effect=AssertionError('No database')):
            self.assertEqual(self.client.post('/api/clothing/cutout', json={
                'image': self.red, 'remove_background': False}).status_code, 200)

    def test_invalid_settings_do_not_echo_photo_data(self):
        for change in ({'tolerance': 81}, {'outline': [{'x': -1, 'y': .2}] * 3},
                       {'outline': [{'x': .2, 'y': .2}] * 81}):
            result = self.client.post('/api/clothing/cutout', json={'image': self.red, **change})
            self.assertEqual(result.status_code, 422)
            self.assertNotIn(self.red, result.text)
        body = '{"image": "' + self.red + '", "outline": [{"x": 1e999, "y": 0}, {"x": 0, "y": 0}, {"x": 1, "y": 1}]}'
        self.assertEqual(self.client.post('/api/clothing/cutout', content=body,
                        headers={'Content-Type': 'application/json'}).status_code, 422)

    def test_model_and_composition_routes_have_been_removed(self):
        self.assertEqual(self.client.get('/api/try-on/status').status_code, 404)
        for route in ('/api/try-on', '/api/fitting-room/prepare', '/api/fitting-room/compose'):
            self.assertEqual(self.client.post(route, json={}).status_code, 404)

    def test_exif_orientation_is_applied_before_cutting_out(self):
        photo = Image.new('RGB', (20, 10), 'red')
        exif = photo.getexif()
        exif[274] = 6
        self.assertEqual(cutout_service.read_photo(data_url(photo, 'JPEG', exif=exif)).size, (10, 20))
