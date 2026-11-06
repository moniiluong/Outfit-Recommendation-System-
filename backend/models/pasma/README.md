# Bundled clothing classifier

Pasma Small-320 FP32, by Vestes Archive. Downloaded from https://huggingface.co/Prikol5ist/pasma at revision `5346fc6adf7c345fef3ff0ac84abfc11a210b959`.

- `pasma_small_320_fp32.onnx`: 21,358,203 bytes; SHA-256 `a6d1ccced0b9c5223cc75be531f4a681a6bda48be2211d06777ac7a438f54e40`.
- `labels_order.json`: SHA-256 `0e3b29ddb7c3456ed07eb52bdf4b31c9843e3b161e43b916233837b5b8a0733b`.
- `checksums.sha256`: upstream manifest covering the full release; only the two required files above are bundled here.
- `LICENSE` and `THIRD_PARTY_NOTICES.md`: upstream notices retained unchanged.

The model is an Apache-2.0 candidate release for one garment per image. It has no unknown class, can confuse similar items, and needs user confirmation. No material predictions are used. See https://github.com/prikol5ist-art/Pasma for upstream preprocessing, evaluation limitations, and training lineage. Our adapter performs CPU inference on the app's backend; it does not run downloaded Python code or upload photos to Hugging Face.
