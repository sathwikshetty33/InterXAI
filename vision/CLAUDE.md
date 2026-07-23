# CLAUDE.md — vision service

## What this is

A **standalone, stateless proctoring vision service** for InterXAI. It runs face/hand/pose inference over HTTP and nothing else: no database, no auth of its own beyond a shared secret, no knowledge of interviews or sessions. The main backend (`../backend`) is the authenticating proxy — it validates the JWT/session, forwards frames here, gets a verdict, and owns all escalation/status logic. This service just answers "how many faces / what gesture is in these frames".

It is a **peer** to `backend/` and `frontend/`, not part of the backend — its own uv project, its own image, its own deps. It deliberately shares no code with the backend (that's why it isn't under `backend/`, unlike the taskiq worker which *is* the backend run with a different command).

## Commands (from `vision/`)

```bash
uv sync                      # install deps (mediapipe, opencv via mediapipe, etc.)
uv run python -m app.model_assets   # download the model bundle to models/
uv run uvicorn app.main:app --reload --port 8001   # dev server
uv run ruff check . && uv run ruff format --check .  # lint
```

Note: this project is **not** covered by `tools/backend_lint` (that runs inside `backend/`). Lint it here, in its own env.

## Architecture

- `app/main.py` — FastAPI app. `GET /health`, `POST /detect`. Loads the detector once at startup (lifespan). Inference runs in a threadpool (`asyncio.to_thread`) so it never blocks the event loop.
- `app/detector.py` — MediaPipe `FaceDetector` wrapper, **IMAGE** running mode (each request is independent frames). MediaPipe detectors are not thread-safe, so `detect()` is serialized behind a `threading.Lock`. Decodes base64 frames with Pillow (data-URL prefix tolerated) to sidestep the opencv-headless vs mediapipe-bundled-opencv conflict.
- `app/model_assets.py` — stdlib-only model downloader (no mediapipe import), so the Dockerfile can pre-fetch the model without loading the heavy runtime.
- `app/config.py` — pydantic `BaseSettings`, `VISION_` env prefix.
- `app/schemas.py` — request/response models.

## The `/detect` contract (internal)

```
POST /detect        header: X-Vision-Secret: <shared secret>   (only when VISION_SHARED_SECRET set)
  { "frames": ["<base64 jpeg/png>", ...], "checks": ["face_count"] }
→ { "face_count": <max across frames>, "per_frame": [...], "faces": [{confidence,x,y,width,height}] }
```

`face_count` is the **max** across the submitted frames — conservative: a second person in any frame trips it.

## Model

- v1: **BlazeFace short-range** (`FaceDetector`) — front-webcam face counting only.
- Bundle is pinned (`VISION_MODEL_URL`) and downloaded to `models/` (baked into the image at build; downloaded on first boot otherwise). Not committed.
- Coming with the liveness bit: `FaceLandmarker` (head pose) + `HandLandmarker` (finger count).

## Conventions / gotchas

- **Python 3.12 only** (`>=3.12,<3.13`) — MediaPipe wheels lag new CPython; don't widen this or resolution breaks.
- `[tool.uv] package = false` — this is an application, not an installable library.
- Runtime needs `libgl1` + `libglib2.0-0` (in the Dockerfile) for MediaPipe/OpenCV on slim images.
- Keep face detection **sensitive** (`VISION_MIN_DETECTION_CONFIDENCE`); a background person is the whole point. False positives get filtered by the main API's escalation + human review of stored evidence.
