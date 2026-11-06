import base64
from io import BytesIO
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import numpy as np
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
with patch('dotenv.load_dotenv'):
    from app.main import app
    from app import clothing_recognition as recognition

ROOT = Path(__file__).resolve().parents[2]
LABELS = json.loads((recognition.MODEL_DIR / 'labels_order.json').read_text())


def photo_url(image):
    output = BytesIO()
    image.save(output, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()


class ClothingRecognitionTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.image = Image.new('RGBA', (80, 120), (180, 40, 50, 255))
        self.photo = photo_url(self.image)

    def result_for(self, scores):
        probabilities = np.zeros(20, dtype=np.float32)
        for name, score in scores.items():
            probabilities[LABELS['garment_types'].index(name)] = score
        session = Mock()
        session.run.return_value = [probabilities[None]]
        with patch.object(recognition, 'get_classifier', return_value=(session, LABELS)):
            return self.client.post('/api/clothing/recognize', json={'image': self.photo})

    def test_type_and_category_are_consistent_and_best_three_are_sorted(self):
        result = self.result_for({'T_SHIRT': .8, 'SHIRT': .15, 'DRESS': .05})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['status'], 'suggested')
        self.assertEqual(result.json()['suggestions'][0], {
            'type': 'T_SHIRT', 'label': 'T-shirt', 'category': 'Tops', 'score': .8})
        self.assertEqual([s['type'] for s in result.json()['suggestions']], ['T_SHIRT', 'SHIRT', 'DRESS'])
        self.assertEqual(result.headers['cache-control'], 'no-store')
        dress = self.result_for({'DRESS': .9, 'SHIRT': .1})
        self.assertEqual(dress.json()['suggestions'][0]['category'], 'Dresses')

    def test_low_confidence_or_close_choices_are_presented_as_uncertain(self):
        for scores in ({'T_SHIRT': .5, 'SHIRT': .3, 'BLOUSE': .2},
                       {'SHIRT': .55, 'BLOUSE': .45}):
            self.assertEqual(self.result_for(scores).json()['status'], 'uncertain')

    def test_preprocessing_uses_gray_letterbox_and_preserves_transparency(self):
        image = Image.new('RGBA', (80, 40), (255, 0, 0, 255))
        image.putpixel((40, 20), (0, 0, 0, 0))
        tensor = recognition.image_tensor(image)
        self.assertEqual(tensor.shape, (1, 3, 320, 320))
        self.assertEqual(tensor.dtype, np.float32)
        np.testing.assert_allclose(tensor[0, :, 0, 0], [128 / 255] * 3)
        np.testing.assert_allclose(tensor[0, :, 120, 40], [1, 0, 0])
        self.assertGreater(float(tensor[0, 1, 162, 162]), .3)
        self.assertGreaterEqual(float(tensor.min()), 0)
        self.assertLessEqual(float(tensor.max()), 1)

    def test_invalid_photos_and_schema_errors_do_not_echo_uploads(self):
        for change in ({'image': 'https://example.com/private.jpg'}, {'image': 'data:image/png;base64,???'},
                       {'image': self.photo, 'extra': True}):
            result = self.client.post('/api/clothing/recognize', json=change)
            self.assertEqual(result.status_code, 422)
            self.assertNotIn(self.photo, result.text)

    def test_missing_model_returns_manual_entry_error_without_breaking_cutouts(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(recognition, '_classifier', None), \
                patch.object(recognition, 'MODEL_DIR', Path(directory)):
            result = self.client.post('/api/clothing/recognize', json={'image': self.photo})
        self.assertEqual(result.status_code, 503)
        self.assertIn('manually', result.json()['detail'])
        self.assertEqual(self.client.post('/api/clothing/cutout', json={
            'image': self.photo, 'remove_background': False}).status_code, 200)

    def test_runtime_failure_and_invalid_probabilities_return_a_short_error(self):
        session = Mock()
        for output in (np.full((1, 20), float('nan')), np.ones((1, 20)), np.ones((1, 5))):
            session.run.return_value = [output]
            with patch.object(recognition, 'get_classifier', return_value=(session, LABELS)):
                self.assertEqual(self.client.post('/api/clothing/recognize', json={
                    'image': self.photo}).status_code, 503)
        session.run.side_effect = Exception('Private runtime diagnostic')
        with patch.object(recognition, 'get_classifier', return_value=(session, LABELS)):
            result = self.client.post('/api/clothing/recognize', json={'image': self.photo})
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('Private', result.text)

    def test_frontend_types_match_bundled_model_labels_and_categories(self):
        types = json.loads((ROOT / 'src/data/clothingTypes.json').read_text())
        self.assertEqual([t['id'] for t in types], LABELS['garment_types'])
        for item in types:
            self.assertEqual(item['category'], recognition.CATEGORIES[LABELS['type_to_coarse'][item['id']]])

    def test_real_cpu_model_runs_without_external_requests_or_database(self):
        # A simple product-style pair of trousers exercises the bundled graph.
        photo = Image.new('RGB', (320, 480), 'white')
        ImageDraw.Draw(photo).polygon([(90, 40), (230, 40), (245, 445), (175, 445),
                                      (160, 200), (145, 445), (75, 445)], fill=(30, 45, 65))
        with patch('httpx.AsyncClient', side_effect=AssertionError('No external requests')), \
                patch('app.database.create_engine', side_effect=AssertionError('No database')):
            result = self.client.post('/api/clothing/recognize', json={'image': photo_url(photo)})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['suggestions'][0]['type'], 'PANTS')
        self.assertEqual(recognition.get_classifier()[0].get_providers(), ['CPUExecutionProvider'])
