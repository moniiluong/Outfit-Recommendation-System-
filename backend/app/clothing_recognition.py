"""Small CPU clothing classifier. Photos never leave this app's backend."""
import hashlib
import json
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, HTTPException, Response
from PIL import Image

from app.clothing_cutout import HEADERS, PhotoRequest, PhotoRoute, read_photo

MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "pasma"
MODEL_NAME = "pasma_small_320_fp32.onnx"
MODEL_SHA256 = "a6d1ccced0b9c5223cc75be531f4a681a6bda48be2211d06777ac7a438f54e40"
LABELS_SHA256 = "0e3b29ddb7c3456ed07eb52bdf4b31c9843e3b161e43b916233837b5b8a0733b"
CATEGORIES = {
    "TOP": "Tops", "BOTTOM": "Bottoms", "OUTERWEAR": "Outerwear",
    "FOOTWEAR": "Shoes", "FULL_BODY": "Dresses", "ACCESSORY": "Accessories",
}
UNAVAILABLE = "Clothing recognition is unavailable. Choose the item type manually."
_classifier = None
_load_lock = Lock()
_inference_lock = Lock()

router = APIRouter(prefix="/api/clothing", tags=["Clothing recognition"], route_class=PhotoRoute)


def file_digest(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def get_classifier():
    """Load once, on first use; no downloads, GPU, or eager startup dependency."""
    global _classifier
    with _load_lock:
        if _classifier is not None:
            return _classifier
        try:
            import onnxruntime as ort

            model = MODEL_DIR / MODEL_NAME
            labels_path = MODEL_DIR / "labels_order.json"
            if file_digest(model) != MODEL_SHA256 or file_digest(labels_path) != LABELS_SHA256:
                raise ValueError("Model integrity check failed")
            labels = json.loads(labels_path.read_text())
            ort.disable_telemetry_events()
            options = ort.SessionOptions()
            options.intra_op_num_threads = 1
            options.inter_op_num_threads = 1
            session = ort.InferenceSession(
                str(model), sess_options=options, providers=["CPUExecutionProvider"]
            )
            _classifier = (session, labels)
            return _classifier
        except Exception:
            # Optional inference must not leak runtime details or break manual entry.
            raise HTTPException(503, UNAVAILABLE, headers=HEADERS) from None


def image_tensor(image):
    import numpy as np

    # Match Pasma's RGB letterbox contract, including transparent PNGs.
    backdrop = Image.new("RGBA", image.size, (128, 128, 128, 255))
    backdrop.alpha_composite(image.convert("RGBA"))
    image = backdrop.convert("RGB")
    scale = 320 / max(image.size)
    image = image.resize(
        tuple(max(1, round(value * scale)) for value in image.size), Image.Resampling.BILINEAR
    )
    canvas = Image.new("RGB", (320, 320), (128, 128, 128))
    canvas.paste(image, ((320 - image.width) // 2, (320 - image.height) // 2))
    return np.asarray(canvas, dtype=np.float32).transpose(2, 0, 1)[None] / 255.0


def classify_photo(image):
    session, labels = get_classifier()
    try:
        import numpy as np

        tensor = image_tensor(image)
        # Bound concurrent activation memory while retaining the loaded model.
        with _inference_lock:
            probabilities = session.run(["prob_type"], {"image": tensor})[0][0]
        if (probabilities.shape != (len(labels["garment_types"]),)
                or not np.isfinite(probabilities).all()
                or (probabilities < 0).any() or (probabilities > 1).any()
                or not np.isclose(probabilities.sum(), 1, atol=.01)):
            raise ValueError("Invalid classifier output")
        suggestions = []
        for index in np.argsort(-probabilities)[:3]:
            garment_type = labels["garment_types"][int(index)]
            suggestions.append({
                "type": garment_type,
                "label": "T-shirt" if garment_type == "T_SHIRT" else garment_type.capitalize(),
                "category": CATEGORIES[labels["type_to_coarse"][garment_type]],
                "score": round(float(probabilities[index]), 4),
            })
        best, runner_up = suggestions[:2]
        uncertain = best["score"] < .55 or best["score"] - runner_up["score"] < .15
        return {"status": "uncertain" if uncertain else "suggested", "suggestions": suggestions}
    except Exception:
        raise HTTPException(503, UNAVAILABLE, headers=HEADERS) from None


@router.post("/recognize")
def recognize(request: PhotoRequest, response: Response):
    response.headers.update(HEADERS)
    return classify_photo(read_photo(request.image))
