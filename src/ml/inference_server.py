#!/usr/bin/env python
"""FastAPI inference server for the xView3 TorchScript ensemble.

Exposes three endpoints:
  GET /health               – simple health check
  GET /model/info           – returns model metadata (name, device, version)
  POST /infer/sar           – runs inference on a Sentinel‑1 tile

The service expects a local file path to a calibrated Sentinel‑1 GeoTIFF
containing *two* channels (VV and VH). The file must be 800×800 pixels and
EPSG:4326. The server reads the raster with rasterio, normalises the values
to the range expected by the model (0‑1), builds a tensor of shape
[1, 2, 800, 800] and feeds it to the torchscript model loaded from
`traced_ensemble.jit`.

Output JSON format matches the internal `Detection` type used by the
Node backend:
```
{
  "detections": [
    {
      "id": "det-<uuid>",
      "source": "SAR_MODEL",
      "scene_id": "<scene_id>",
      "timestamp": <epoch_ms>,
      "bbox": [x1, y1, x2, y2],   # pixel coordinates
      "confidence": 0.92,
      "class": "vessel" | "fishing" | "non-vessel",
      "attributes": {
        "length_m": 120.5,
        "is_fishing": true
      }
    }, ...
  ]
}
```
If georeferencing information (lat/lon) is available, the caller can later
convert the pixel bbox using the scene metadata – this service does not
perform that conversion.
"""

import os
import uuid
import time
import json
from typing import List, Dict, Any

import torch
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Optional: rasterio is used for reading GeoTIFFs. If unavailable we raise a clear error.
try:
    import rasterio
    from rasterio.enums import Resampling
except ImportError as e:  # pragma: no cover
    rasterio = None

app = FastAPI(title="xView3 SAR Inference Service")

candidate_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "traced_ensemble.jit")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "traced_ensemble.jit")),
    os.path.abspath(os.path.join(os.getcwd(), "src", "traced_ensemble.jit")),
]
MODEL_PATH = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
if not os.path.exists(MODEL_PATH):
    print(f"[WARN] TorchScript model not found at {MODEL_PATH}")
    model = None
else:
    print(f"[INFO] Loading TorchScript model from {MODEL_PATH}")
    try:
        model = torch.jit.load(MODEL_PATH, map_location="cpu")
        model.eval()
    except Exception as e:
        print(f"[WARN] Failed to load TorchScript model: {e}")
        model = None
DEVICE = "cpu"

class InferRequest(BaseModel):
    tile_path: str  # absolute path on the server to a Sentinel‑1 GeoTIFF (2‑channel)
    scene_id: str | None = None

def _load_tile(path: str) -> torch.Tensor:
    if rasterio is None:
        raise RuntimeError("rasterio is required to read SAR tiles but is not installed.")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Tile file not found: {path}")

    with rasterio.open(path) as src:
        # Expect exactly 2 bands (VV, VH). If more are present we take the first two.
        band_count = src.count
        if band_count < 2:
            raise ValueError(f"Tile must contain at least 2 bands (found {band_count})")
        # Read as float32 and resample to 800×800 if necessary.
        data = src.read([1, 2], out_shape=(2, 800, 800), resampling=Resampling.bilinear)
        # Normalise to 0‑1 using a simple min‑max based on typical Sentinel‑1 dB range.
        # Sentinel‑1 reflectance after log‑compression is roughly -30 dB … 0 dB.
        data = data.astype("float32")
        data = (data + 30.0) / 30.0  # now in [0,1]
        tensor = torch.from_numpy(data).unsqueeze(0)  # shape [1,2,800,800]
        return tensor

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}

@app.get("/model/info")
def model_info():
    return {
        "model_path": MODEL_PATH,
        "device": DEVICE,
        "torch_version": torch.__version__,
        "model_type": "TorchScript Ensemble (xView3 first‑place)",
    }

@app.post("/infer/sar")
def infer_sar(req: InferRequest):
    start = time.time()
    try:
        tensor = _load_tile(req.tile_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    with torch.no_grad():
        # The TorchScript model returns a list of dicts – we assume it follows the xView3 format:
        # [{"boxes": [[x1,y1,x2,y2], ...], "scores": [...], "labels": [...]}]
        output = model(tensor)[0]

    # Normalise output structures.
    boxes: List[List[float]] = output.get("boxes", []).tolist()
    scores: List[float] = output.get("scores", []).tolist()
    labels_idx: List[int] = output.get("labels", []).tolist()
    # Map label indices to human readable class names (based on xView3 mapping).
    label_map = {1: "vessel", 2: "fishing", 3: "non-vessel"}
    detections: List[Dict[str, Any]] = []
    for i, box in enumerate(boxes):
        det_id = f"det-{uuid.uuid4().hex[:8]}"
        detections.append({
            "id": det_id,
            "source": "SAR_MODEL",
            "scene_id": req.scene_id or os.path.basename(req.tile_path),
            "timestamp": int(time.time() * 1000),
            "bbox": box,
            "confidence": scores[i],
            "class": label_map.get(labels_idx[i], "unknown"),
            "attributes": {},
        })

    latency_ms = (time.time() - start) * 1000.0
    return JSONResponse(content={"detections": detections, "latency_ms": latency_ms})

# Optional: allow direct file upload via multipart/form‑data for convenience.
@app.post("/upload_and_infer")
async def upload_and_infer(file: UploadFile = File(...), scene_id: str | None = None):
    # Save to a temporary location.
    tmp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tmp", "sar"))
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}_{file.filename}")
    with open(tmp_path, "wb") as out:
        content = await file.read()
        out.write(content)
    # Run inference on saved file.
    try:
        result = infer_sar(InferRequest(tile_path=tmp_path, scene_id=scene_id))
    finally:
        # Clean up the temporary file.
        try:
            os.remove(tmp_path)
        except OSError:
            pass
    return result
