"""Local demonstration API. No webcam frames are saved; only numeric scores.
Run on 127.0.0.1:8010. Not a production service or an emotion diagnostic tool.
"""
import asyncio
import base64
import binascii
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="MathQuest Local DeepFace Demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
DATA_FILE = Path(__file__).with_name("deepface_observations.jsonl")
write_lock = Lock()
model_lock = Lock()
EMOTIONS = ("angry", "disgust", "fear", "happy", "sad", "surprise", "neutral")

class FrameRequest(BaseModel):
    sessionId: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    imageBase64: str = Field(min_length=20, max_length=1_500_000)

@app.get("/health")
def health():
    return {"status": "ok", "storage": str(DATA_FILE)}

@app.post("/analyze")
async def analyze_frame(request: FrameRequest):
    try:
        image_bytes = base64.b64decode(request.imageBase64, validate=True)
        if len(image_bytes) > 900_000:
            raise HTTPException(status_code=413, detail="Frame too large")
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid JPEG image")
        if image.shape[0] > 720 or image.shape[1] > 960:
            raise HTTPException(status_code=413, detail="Image dimensions too large")
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid base64") from exc

    def run_inference():
        with model_lock:  # avoid overlapping heavyweight model inference
            return DeepFace.analyze(
                img_path=image,
                actions=["emotion"],
                detector_backend="opencv",
                enforce_detection=True,
                silent=True,
            )

    try:
        results = await asyncio.to_thread(run_inference)
    except ValueError:  # no detectable face
        return {"faceDetected": False, "scores": None, "dominant": None}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DeepFace inference unavailable: {type(exc).__name__}") from exc

    if isinstance(results, dict):
        results = [results]
    if not results:
        return {"faceDetected": False, "scores": None, "dominant": None}

    result = results[0]  # one-face local demo
    raw = result.get("emotion") or {}
    scores = {name: round(float(raw.get(name, 0.0)), 3) for name in EMOTIONS}
    dominant = max(scores, key=scores.get)
    record = {
        "sessionId": request.sessionId,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "faceDetected": True,
        "dominant": dominant,
        "scores": scores,
    }
    with write_lock:
        with DATA_FILE.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"faceDetected": True, "timestamp": record["timestamp"], "dominant": dominant, "scores": scores}
