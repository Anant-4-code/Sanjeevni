"""
X-ray fracture/abnormality detection using the YOLOv7-p6 GRAZPEDWRI-DX ONNX model
(bundled by the user from https://github.com/... yolov7-p6-bonefracture project).

Place the model weight file at:
  app/ai/xray/model/yolov7-p6-bonefracture.onnx

Classes (from the original training config):
  0 boneanomaly, 1 bonelesion, 2 foreignbody, 3 fracture,
  4 metal, 5 periostealreaction, 6 pronatorsign, 7 softtissue, 8 text
"""
import os
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

MODEL_PATH = Path(__file__).parent / "model" / "yolov7-p6-bonefracture.onnx"
INPUT_SIZE = 640

CLASS_NAMES = {
    0: "boneanomaly",
    1: "bonelesion",
    2: "foreignbody",
    3: "fracture",
    4: "metal",
    5: "periostealreaction",
    6: "pronatorsign",
    7: "softtissue",
    8: "text",
}

_session: ort.InferenceSession | None = None


def _get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"X-ray model not found at {MODEL_PATH}. "
                "Copy yolov7-p6-bonefracture.onnx into app/ai/xray/model/."
            )
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if "CUDAExecutionProvider" in ort.get_available_providers() else ["CPUExecutionProvider"]
        _session = ort.InferenceSession(str(MODEL_PATH), providers=providers)
    return _session


def _preprocess(image_bgr: np.ndarray) -> tuple[np.ndarray, int, int]:
    h0, w0 = image_bgr.shape[:2]
    resized = cv2.resize(image_bgr, (INPUT_SIZE, INPUT_SIZE), interpolation=cv2.INTER_LINEAR)
    rgb = resized[..., ::-1].astype(np.float32).transpose(2, 0, 1) / 255.0
    return np.expand_dims(rgb, axis=0), h0, w0


def analyze_xray(image_bytes: bytes, score_threshold: float = 0.3) -> list[dict]:
    """
    Runs the fracture-detection model on a raw image and returns detections in
    the JSON shape the frontend Canvas overlay expects:
      [{"label": "fracture", "confidence": 0.92, "box": {"x": 120, "y": 80, "w": 45, "h": 60}}]
    Coordinates are scaled back to the ORIGINAL image's pixel space.
    """
    session = _get_session()
    file_bytes = np.frombuffer(image_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise ValueError("Could not decode image")

    input_tensor, h0, w0 = _preprocess(image_bgr)
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    raw_output = session.run([output_name], {input_name: input_tensor})[0][:, :6]

    scale_x, scale_y = w0 / INPUT_SIZE, h0 / INPUT_SIZE
    detections = []
    for det in raw_output:
        x1, y1, x2, y2, score, cls_id = det
        if score < score_threshold:
            continue
        x1, x2 = x1 * scale_x, x2 * scale_x
        y1, y2 = y1 * scale_y, y2 * scale_y
        detections.append({
            "label": CLASS_NAMES.get(int(cls_id), "unknown"),
            "confidence": round(float(score), 4),
            "box": {
                "x": round(float(x1), 1),
                "y": round(float(y1), 1),
                "w": round(float(x2 - x1), 1),
                "h": round(float(y2 - y1), 1),
            },
        })
    return detections
