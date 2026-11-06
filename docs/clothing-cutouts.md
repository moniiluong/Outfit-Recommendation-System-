# Clothing photo cleanup

Add a photo using **Add clothing**. The browser resizes it to at most 1000 pixels on its longest side and sends it to `POST /api/clothing/cutout`. Pillow attempts to remove a plain background connected to the image edges and trims empty margins. Existing transparency is preserved. There are no image-generation API calls or downloaded AI models.

The preview shows the clothing against a checkerboard. Switch between **Clothing cutout** and **Original photo** to compare and choose which version to save. The selected image is stored in the browser's existing IndexedDB wardrobe and used in wardrobe cards, outfit boards, and saved looks. Existing wardrobe photos and saved outfits are unchanged.

## Improve the outline

Use **Refine outline** to adjust the background tolerance, then select **Apply cleanup**. Lower tolerance preserves more colors; higher tolerance removes more colors similar to the background. Cleanup preserves isolated light prints inside a darker garment, but cannot distinguish light clothing from a matching backdrop where they touch.

For patterned backgrounds, enable **Trace garment outline** and tap around the garment in order. At least three points are required, with a maximum of 80. The final point connects to the first. **Undo point** and **Clear outline** correct your selection. This keeps pixels inside a single polygon; it cannot automatically separate clothing from a person, hanger, or complex scene, and cannot trace internal holes independently.

Apply changed settings before saving the cutout, or select the original photo. A failed or unavailable cleanup never prevents saving the original. Requests time out after 25 seconds; choosing another photo or closing the dialog cancels the active request.

## Backend and privacy

Install `backend/requirements.txt` and start the backend with `npm run dev` or `uvicorn app.main:app --reload` from `backend/`. Pillow is the only image-processing dependency. No photo-cleanup API key or database is required.

New photos are sent automatically to this app's backend for cleanup. Processing is in memory, without storing photos on the backend or forwarding them to a third-party service. The selected saved image stays in the current browser. Hosting capacity and usage limits still apply.

The endpoint accepts embedded still JPG, PNG, or WebP photos up to approximately 2 MB and 4 megapixels; the upload dialog first accepts files up to 8 MB and resizes them. The endpoint returns a transparent PNG data URL, width, height, and processing method. Output is at most 640 pixels on its longest side. No remote image URLs are fetched. Schema validation errors omit the input photo. Successful responses have `Cache-Control: no-store`.

## Checks

```bash
backend/venv/bin/python -m unittest discover -s backend/tests
CI=true npm test -- --watchAll=false --runInBand
npm run build
```
