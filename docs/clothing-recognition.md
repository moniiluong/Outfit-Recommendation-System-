# Clothing recognition

After choosing a clothing photo, the upload dialog sends the resized original to `POST /api/clothing/recognize` while background cleanup runs separately. Recognition examines image pixels, not the filename. It shows a suggested type such as **T-shirt** or **Jeans**, then asks whether that is correct.

Select **Yes, use …** to fill the clothing type and category. A name derived from the filename is replaced with the confirmed type; a name you have typed yourself is preserved. **Change item** reveals alternatives and focuses the type selector. You can choose any supported type, select **Other / enter details myself**, or fill the ordinary name/category fields manually. The confirmed or manually chosen type is stored as `clothingType` alongside the selected wardrobe image.

Uncertain predictions show three choices without selecting one. The application treats a top score below 0.55, or a lead smaller than 0.15 over the runner-up, as uncertain. These are product heuristics, not a guarantee of accuracy. Recognition never changes warmth or water resistance. Changing the category clears an incompatible selected type. Replacing the photo resets the type and cancels the previous request; leaving the dialog cancels recognition too.

Recognition times out after 15 seconds. An unavailable classifier, timeout, or invalid response leaves manual entry available and does not block photo cleanup or saving. Suggestions are optional; nothing is applied merely because a response arrives.

## Run and deploy

Install `backend/requirements.txt` into the backend environment and run `npm run dev`, or run the frontend and backend separately as described in the README. The model weights and metadata live in `backend/models/pasma/`; their licenses and source revision are retained there. Vercel's function configuration includes this directory in the backend bundle.

The backend lazily loads the approximately 20.4 MiB FP32 ONNX graph once per process and verifies the weights and label hashes. It uses ONNX Runtime's CPU provider with one inference thread, serializes inference to bound activation memory, and disables runtime telemetry. No GPU, PyTorch, paid image API, model download during requests, or browser-side neural network is used. Local development runs on your local backend; deployment moves that work to the server. Ordinary server memory, CPU, and hosting limits still apply.

Inputs follow the same embedded still-image size and format limits as photo cleanup. EXIF orientation is corrected, transparency is composited onto gray, and the photo is resized with preserved aspect ratio into a 320 × 320 gray letterbox. RGB float32 values are divided by 255 and sent in NCHW order; normalization and probabilities are already part of the graph. Responses contain three types, their categories, and scores, with `Cache-Control: no-store`.

Photos stay in memory on this app's backend and are not forwarded to Hugging Face or another inference service. Recognition does not persist uploads, results, or training data on the server. The selected clothing image and confirmed details stay in the browser's existing IndexedDB wardrobe.

## Labels and limitations

Supported types are T-shirt, shirt, blouse, sweater, hoodie, pants, jeans, shorts, skirt, jacket, coat, vest, dress, shoes, boots, sneakers, sandals, accessory, hat, and scarf. Dresses have their own category and can replace tops and bottoms in an outfit. Refreshing can alternate between a dress and separates when both are available.

The bundled model is [Pasma Small-320](https://huggingface.co/Prikol5ist/pasma), an Apache-2.0 candidate release by Vestes Archive. [Upstream source and deployment details](https://github.com/prikol5ist-art/Pasma) document its evaluation and training limitations. Our integration has been checked for preprocessing, real CPU execution, confirmation/correction, failure recovery, and storage behavior; this is not an independent accuracy benchmark.

Use one clear garment per photo. Similar items, multiple garments, unusual crops, or non-clothing photos can produce wrong or confident guesses because the model has no explicit unknown class. It does not detect brands, certify materials, or infer how warm or waterproof something is. Confirm or correct the suggestion before using it.
