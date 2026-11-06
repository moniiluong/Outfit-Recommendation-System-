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

## Vercel bundle size

The Python function contains native inference, NumPy, Pillow, database libraries, the approximately 20.4 MiB model, and Vercel's runtime. The relevant size is the uncompressed function bundle, not the Git repository size or the compressed wheel downloads.

The production configuration pins ONNX Runtime 1.26.0, NumPy 2.5.4, and Pillow 13.0.0 for Python 3.12. The root `pyproject.toml` and `backend/requirements.txt` must agree for that interpreter. Older local Python versions retain compatible pins. Plain Uvicorn supports the local HTTP server and basic `--reload` without the optional `[standard]` packages (uvloop, httptools, watchfiles, PyYAML, and websockets); those extras are not needed by this app's Vercel function. No inference library, model data, or required shared library is stripped out.

`vercel.json` excludes the frontend source/build, tests, docs, scripts, and local virtual environment from the Python function while explicitly retaining `backend/models/pasma/**`. This does not exclude the frontend from its separate static build.

To audit an updated dependency set, use a clean temporary wheel directory. On Linux x86-64 with Python 3.12:

```bash
python -m pip download -r backend/requirements.txt --only-binary=:all: --dest /tmp/thread-runtime-wheels
python scripts/audit_vercel_bundle.py /tmp/thread-runtime-wheels
```

For cross-platform auditing, resolve dependency markers for Linux x86-64 and Python 3.12 first (for example with `uv pip compile --python-version 3.12 --python-platform x86_64-manylinux_2_28`). Then download those resolved requirements using pip's matching platform/ABI flags and `--no-deps`; pip's platform flags alone do not consistently retarget environment markers. Do not count macOS wheels as the deployment size.

The local audit totals uncompressed wheels and backend/model files, adds a 40 MiB runtime/packaging allowance, and checks the reported 225 MiB deployment budget. It is an estimate, not an actual Vercel build. Keep the model's licenses and notices in the deployment. Commit and push the dependency/configuration changes, then redeploy once with the previous build cache disabled. No new recognition API key or external hosting account is needed.

## Labels and limitations

Supported types are T-shirt, shirt, blouse, sweater, hoodie, pants, jeans, shorts, skirt, jacket, coat, vest, dress, shoes, boots, sneakers, sandals, accessory, hat, and scarf. Dresses have their own category and can replace tops and bottoms in an outfit. Refreshing can alternate between a dress and separates when both are available.

The bundled model is [Pasma Small-320](https://huggingface.co/Prikol5ist/pasma), an Apache-2.0 candidate release by Vestes Archive. [Upstream source and deployment details](https://github.com/prikol5ist-art/Pasma) document its evaluation and training limitations. Our integration has been checked for preprocessing, real CPU execution, confirmation/correction, failure recovery, and storage behavior; this is not an independent accuracy benchmark.

Use one clear garment per photo. Similar items, multiple garments, unusual crops, or non-clothing photos can produce wrong or confident guesses because the model has no explicit unknown class. It does not detect brands, certify materials, or infer how warm or waterproof something is. Confirm or correct the suggestion before using it.
