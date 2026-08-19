# InterXAI Vision Service

Stateless proctoring vision service — face inference over HTTP. Called by the main
backend (which validates the session and owns all escalation logic); this service
just answers "how many faces are in these frames".

## Run locally

```bash
uv sync
uv run python -m app.model_assets            # fetch the model bundles
uv run uvicorn app.main:app --reload --port 8001
```

## Endpoints

- `GET /health` → `{ "ok": true }` once the detector has loaded
- `POST /detect` → face count over one or more frames:

```bash
curl -s localhost:8001/detect \
  -H 'Content-Type: application/json' \
  -d '{"frames":["<base64-jpeg>"],"checks":["face_count"]}'
# → {"face_count":1,"per_frame":[1],"faces":[{"confidence":0.98,"x":..,"y":..,"width":..,"height":..}]}
```

`face_count` is the **max** across the submitted frames — conservative: a second
person in any frame trips it.

## Model

**YuNet** (`face_detection_yunet_2026may.onnx`, OpenCV Zoo, MIT, ~230KB) via
`cv2.FaceDetectorYN`, the default. It resolves faces from roughly 10×10 px upward at
~2.4 ms/frame, so it still sees a second person standing behind the candidate — the
case this service exists for.

BlazeFace short-range is selectable with `VISION_DETECTOR="Media Pipe"` but is not
the default: it is built for a single close-up face within ~2 m and, measured on real
capture frames, does not detect that background person. It stays available because
mediapipe is the path to the planned `FaceLandmarker` (head pose) and `HandLandmarker`
work.

Note the browser runs BlazeFace full-range while the server runs YuNet — the
in-browser model is only a cheap trigger, never the verdict.

## Configuration

All settings take a `VISION_` prefix and can go in `vision/.env`.

| Variable | Default | Description |
|---|---|---|
| `VISION_DETECTOR` | `YuNet` | `YuNet` or `Media Pipe` |
| `VISION_MIN_DETECTION_CONFIDENCE` | `0.5` | Score threshold, shared by both detectors |
| `VISION_SHARED_SECRET` | - | Empty = auth off. When set, callers must send `X-Vision-Secret` |
| `VISION_YUNET_MODEL_PATH` | `models/face_detection_yunet_2026may.onnx` | Where the ONNX bundle lives |
| `VISION_YUNET_MODEL_URL` | pinned opencv_zoo commit | Bundle to download when absent |
| `VISION_YUNET_NMS_THRESHOLD` | `0.3` | Non-max-suppression IoU threshold |
| `VISION_YUNET_TOP_K` | `200` | Cap on boxes returned per frame |
| `VISION_BLAZE_MODEL_PATH` | `models/blaze_face_short_range.tflite` | MediaPipe bundle path |
| `VISION_BLAZE_MODEL_URL` | Google-hosted `float16/1` | MediaPipe bundle to download when absent |

Don't lower `VISION_MIN_DETECTION_CONFIDENCE` hoping to catch more: it doesn't
find smaller faces, it just adds boxes on cluttered frames. Frame **resolution**
is the lever — see `CLAUDE.md`.
