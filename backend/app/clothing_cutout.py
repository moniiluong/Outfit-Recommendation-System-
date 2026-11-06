"""Clothing photo background cleanup; no external services or persistent storage."""
import base64
import binascii
from io import BytesIO
from statistics import median
from typing import List

from fastapi import APIRouter, HTTPException, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from PIL import Image, ImageChops, ImageDraw, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, model_validator

HEADERS = {"Cache-Control": "no-store"}


class CutoutRoute(APIRoute):
    """Keep rejected photo data and nonfinite numbers out of error responses."""
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def validate_request(request):
            try:
                return await handler(request)
            except RequestValidationError:
                return JSONResponse(
                    status_code=422,
                    content={"detail": "Check the photo size, outline points, and background tolerance, then try again."},
                    headers=HEADERS,
                )
        return validate_request


router = APIRouter(prefix="/api/clothing", tags=["Clothing cutouts"], route_class=CutoutRoute)


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Point(Settings):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class CutoutRequest(Settings):
    image: str = Field(max_length=2_800_000)
    remove_background: bool = True
    tolerance: int = Field(default=24, ge=0, le=80)
    outline: List[Point] = Field(default_factory=list, max_length=80)

    @model_validator(mode="after")
    def complete_outline(self):
        if self.outline and len(self.outline) < 3:
            raise ValueError("Trace at least three points around the garment.")
        return self


def read_photo(value: str) -> Image.Image:
    header, comma, encoded = value.partition(",")
    if not comma or header not in (
        "data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"
    ):
        raise HTTPException(422, "Choose an embedded JPG, PNG, or WebP photo.")
    try:
        raw = base64.b64decode(encoded, validate=True)
        if not raw or len(raw) > 2_100_000:
            raise ValueError()
        with Image.open(BytesIO(raw)) as source:
            if source.format not in ("JPEG", "PNG", "WEBP"):
                raise ValueError()
            if source.width * source.height > 4_000_000 or getattr(source, "n_frames", 1) != 1:
                raise ValueError()
            source.load()
            return ImageOps.exif_transpose(source).convert("RGBA")
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError, Image.DecompressionBombError):
        raise HTTPException(422, "This photo could not be read. Use a still image under 2 MB and 4 megapixels.") from None


def plain_background_mask(image: Image.Image, tolerance: int) -> Image.Image:
    """Remove only similar-colored regions connected to the image border."""
    rgb = image.convert("RGB")
    w, h = rgb.size
    corners = [rgb.getpixel(point) for point in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    color = tuple(int(median(channel)) for channel in zip(*corners))
    channels = ImageChops.difference(rgb, Image.new("RGB", rgb.size, color)).split()
    difference = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    candidates = difference.point(lambda value: 255 if value <= tolerance else 0)
    border = [(x, y) for y in (0, h - 1) for x in range(w)]
    border.extend((x, y) for x in (0, w - 1) for y in range(h))
    for point in border:
        if candidates.getpixel(point) == 255:
            ImageDraw.floodfill(candidates, point, 128, thresh=0)
    return candidates.point(lambda value: 0 if value == 128 else 255)


def make_cutout(request: CutoutRequest):
    image = read_photo(request.image)
    image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
    method = "original transparency"
    if request.outline:
        mask = Image.new("L", image.size)
        points = [(round(p.x * (image.width - 1)), round(p.y * (image.height - 1))) for p in request.outline]
        ImageDraw.Draw(mask).polygon(points, fill=255)
        image.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
        method = "your outline"
    elif request.remove_background and image.getchannel("A").getextrema()[0] >= 250:
        image.putalpha(ImageChops.multiply(image.getchannel("A"), plain_background_mask(image, request.tolerance)))
        method = "plain background cleanup"
    elif not request.remove_background:
        method = "original background"
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise HTTPException(422, "The cleanup removed the entire photo. Lower the tolerance, keep the background, or trace an outline.")
    image = image.crop(bounds)
    image.thumbnail((640, 640), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    if len(encoded) > 1_850_000:
        raise HTTPException(422, "This cutout is too large. Try a smaller clothing photo.")
    return {"image": f"data:image/png;base64,{encoded}", "width": image.width, "height": image.height, "method": method}


@router.post("/cutout")
def prepare(request: CutoutRequest, response: Response):
    response.headers.update(HEADERS)
    return make_cutout(request)
