<div align="center">

<img src="frontend/public/favicon.svg" alt="InterXAI Logo" width="80" height="80" />

# InterXAI

**AI-Powered Interview Automation Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [API Reference](#api-reference) · [Proctoring](#proctoring--the-vision-service) · [Contributing](#contributing)

</div>


## Overview

InterXAI is an AI-powered interview automation platform designed to make technical hiring smarter, faster, and more scalable. It simulates real interview experiences by dynamically generating follow-up questions based on candidate responses, evaluating answers in real time using large language models, and maintaining a natural conversational flow throughout the entire interview process.

Organizations create fully customized interviews with domain-specific questions and DSA challenges. Candidates apply by submitting their resumes, which are automatically evaluated and scored by an LLM agent against the job requirements - all without manual intervention. To ensure interview integrity, every session is proctored by a two-tier webcam face-detection pipeline: a lightweight in-browser model gives the candidate instant feedback, while a standalone [vision service](#proctoring--the-vision-service) running a stronger detector (OpenCV YuNet) holds the authoritative verdict — backed by a heartbeat liveness check and stored evidence frames.


## Features

### For Organizations
- **Custom Interview Builder** - Create structured interviews with tailored questions, DSA topics, and evaluation criteria
- **Automated Resume Screening** - LLM-powered analysis that scores and shortlists candidates automatically
- **AI-Driven Evaluations** - Real-time answer evaluation with structured, unbiased scoring
- **Candidate Dashboard** - Track all applications, review scores, and access AI-generated feedback reports

### For Candidates
- **Seamless Application Flow** - Upload your resume and let the AI evaluate your fit for the role
- **Conversational Interviews** - Experience dynamic, follow-up-rich interviews that adapt to your responses
- **Instant Feedback** - Receive structured feedback on your performance after each session
- **Multi-Round Sessions** - Navigate through Q&A, DSA, and resume-based rounds in a single interview

### Platform Intelligence
- **Dynamic Question Generation** - LLMs generate context-aware follow-up questions based on candidate answers
- **Resume Intelligence** - Extracts, standardizes, and evaluates resume content against job requirements
- **Interview Proctoring** - Two-tier face counting (in-browser BlazeFace trigger + authoritative server-side YuNet), heartbeat liveness, violation escalation, and evidence frames stored for org review
- **Event-Driven Processing** - Asynchronous background jobs via TaskIQ + Redis ensure interviews scale without bottlenecks


## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | FastAPI, Python 3.12+ |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4, React Router |
| **Database** | PostgreSQL — Neon in production, containerised Postgres for local dev |
| **ORM & Migrations** | SQLAlchemy 2.0 (async), Alembic |
| **Background Jobs** | TaskIQ + Redis |
| **MCP Server** | Model Context Protocol (`mcp` SDK), mounted on the API |
| **AI / LLM** | LangChain, LiteLLM, Groq |
| **Proctoring Vision** | Standalone FastAPI service + OpenCV YuNet (`cv2.FaceDetectorYN`, ONNX), Pillow, NumPy; MediaPipe BlazeFace selectable |
| **In-Browser Vision** | `@mediapipe/tasks-vision` 1.0.1 — BlazeFace full-range (WASM, CPU delegate → GPU fallback) |
| **Code Execution** | Piston (sandboxed DSA runs) |
| **File Storage** | Supabase Storage |
| **Auth** | JWT (PyJWT), bcrypt |
| **State Management** | React Context + local hooks (no external store) |
| **Package Manager** | `uv` (backend), `npm` (frontend) |
| **Containerization** | Docker, Docker Compose |


## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React)                          │
│  Interview UI · ProctorWidget (BlazeFace WASM — local trigger)  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST / JSON  (+ base64 webcam frames)
┌───────────────────────────▼─────────────────────────────────────┐
│                         FastAPI Backend                         │
│    /users /organizations /interviews /applications /sessions    │
│                                                                 │
│   ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│   │  Auth (JWT +   │  │  Routers /       │  │  Exception     │  │
│   │  bcrypt)       │  │  Business Logic  │  │  Handlers      │  │
│   └────────────────┘  └────────┬─────────┘  └────────────────┘  │
└─────┬──────────────────────────┼─────────────────────┬──────────┘
      │ POST /detect             │                     │ POST /execute
┌─────▼──────────────────┐       │               ┌──────▼───────────────┐
│ Vision service (peer)  │       │               │  Piston sandbox      │
│ stateless FastAPI      │       │               │  (DSA code runs)     │
│ OpenCV YuNet (ONNX)    │       │               └──────────────────────┘
│ authoritative verdict  │       │
└────────────────────────┘       │
               ┌─────────────────┼──────────────────┐
               │                 │                  │
    ┌──────────▼───────┐ ┌───────▼──────────┐ ┌─────▼────────────┐
    │    PostgreSQL    │ │  TaskIQ + Redis  │ │ Supabase Storage │
    │                  │ │  Worker          │ │ (resume PDFs +   │
    │ (SQLAlchemy ORM) │ └───────┬──────────┘ │  violation JPEGs)│
    └──────────────────┘         │            └──────────────────┘
                        ┌────────▼────────┐
                        │  LLM Pipeline   │
                        │  LiteLLM/Groq   │
                        │  LangChain      │
                        │  ResumeEvaluator│
                        └─────────────────┘
```
### System archietecture

<img width="1199" height="765" alt="image" src="https://github.com/user-attachments/assets/33af8af3-52e2-4be8-96d1-a9597f723b84" />

### Request Lifecycle

1. The client sends a request with a JWT `Authorization` header
2. FastAPI validates the token via `get_current_user()` dependency injection
3. Router functions execute business logic using async SQLAlchemy sessions
4. For resume applications, a TaskIQ task is dispatched and the HTTP response returns immediately (201)
5. The background worker uploads the PDF to Supabase, extracts text, calls the LLM evaluator, and writes results back to the database

### Resume Processing Pipeline

```
POST /applications/{interview_id}
        │
        ├── Create Application record (status: applied)
        └── Return 201 to client immediately

TaskIQ Worker (async):
        ├── Decode base64 PDF
        ├── Upload PDF → Supabase Storage
        ├── Extract text (PyPDF2)
        ├── ResumeEvaluator.evaluate()
        │       ├── Build ChatPromptTemplate
        │       ├── Call LiteLLM/Groq
        │       └── Parse structured JSON response
        │             score · shortlisting_decision · feedback
        └── Update Application record with evaluation results
              (Delete Application on failure)
```


## Project Structure

```
InterXAI-re/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── ai/                 # LLM agents and prompt templates
│   │   ├── background/
│   │   │   └── taskiq/         # TaskIQ broker, tasks & worker facade
│   │   ├── exceptions/         # Custom exception hierarchy
│   │   ├── interfaces/         # Abstract base classes
│   │   ├── mcp/                # MCP server: tools mounted on the API
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routers/            # API route handlers
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── utils/              # Concrete implementations
│   │   ├── config.py           # Pydantic settings (env-driven)
│   │   ├── database.py         # Async DB session factory
│   │   └── main.py             # App factory, lifespan, middleware
│   ├── alembic/                # Database migrations
│   ├── Dockerfile              # API server image
│   ├── Dockerfile.taskiq       # Worker image
│   └── pyproject.toml
├── vision/                     # Proctoring vision service (peer, not a backend module)
│   ├── app/
│   │   ├── interfaces/         # FaceDetector ABC (seam for future models)
│   │   │   ├── yunet_detector.py   # OpenCV YuNet — the default detector
│   │   ├── mediapipe_detector.py  # BlazeFace short-range (selectable)
│   │   ├── frames.py           # shared base64 -> RGB decode
│   │   ├── model_assets.py     # stdlib-only model downloader
│   │   ├── config.py           # VISION_* pydantic settings
│   │   ├── schemas.py          # /detect request & response models
│   │   ├── utils.py            # get_detector() provider factory
│   │   └── main.py             # FastAPI app: GET /health, POST /detect
│   ├── models/                 # Downloaded .tflite bundle (gitignored)
│   ├── Dockerfile              # Bakes the model into the image
│   └── pyproject.toml          # Own uv project — Python 3.12 only
├── frontend/                   # React + TypeScript SPA
│   ├── src/
│   │   ├── components/         # Shared, reusable UI components
│   │   ├── auth/               # AuthContext
│   │   ├── features/           # Feature-scoped modules
│   │   │   └── interview/      # CameraGate + ProctorWidget (BlazeFace full-range)
│   │   └── services/           # fetch-based API client layer
│   └── package.json
├── docker-compose.yml          # Multi-service orchestration
├── LICENSE
└── tools/
    └── backend_lint            # One-shot ruff + mypy quality check
```


## Getting Started

### Prerequisites

- Python 3.12+ (the `vision/` service is pinned to **3.12 only** — MediaPipe wheels lag new CPython)
- Node.js 20+
- Redis (or run everything via Docker)
- [`uv`](https://github.com/astral-sh/uv) - fast Python package manager
- A webcam — every interview session is camera-gated

### Environment Variables

Create a `.env` file inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | - | Postgres connection URL. **Postgres is required** — the schema uses JSONB and the engine passes asyncpg-only connect args |
| `REDIS_URL` | `redis://localhost:6379/0` | TaskIQ broker + result backend |
| `SECRET_KEY` | `secret` | JWT signing key - **change in production** |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30000` | Token lifetime |
| `GROQ_API_KEY` | - | Required for LLM inference |
| `SUPABASE_URL` | - | Supabase project URL |
| `SUPABASE_KEY` | - | Supabase service role key |
| `SUPABASE_BUCKET_NAME` | `resumes` | Storage bucket for resume PDFs |
| `LLM_MODEL_NAME` | `groq/openai/gpt-oss-120b` | LiteLLM model string |
| `PISTON_URL` | `http://localhost:2000` | Sandbox for DSA code execution |
| `VISION_URL` | `http://localhost:8001` | Proctoring vision service base URL (compose overrides it to `http://vision:8000`) |
| `VISION_SHARED_SECRET` | - | Sent as `X-Vision-Secret`; must match the vision service's own value |
| `VISION_TIMEOUT_S` | `10.0` | Per-request timeout for `/detect`; a timeout counts as a clean frame |
| `PROCTOR_VIOLATION_THRESHOLD` | `3` | Confirmed face-count violations before a session is marked `cheated` |
| `HEARTBEAT_THRESHOLD_S` | `20` | Silence after which a session may be disqualified |
| `IMMEDIATE_DISQUALIFICATION` | `false` | Enables stale-heartbeat disqualification |

The `vision/` service reads its **own** `.env` in `vision/` with a `VISION_` prefix:

| Variable | Default | Description |
|---|---|---|
| `VISION_SHARED_SECRET` | - | Empty = auth off (dev). When set, callers must send `X-Vision-Secret` |
| `VISION_DETECTOR` | `YuNet` | `YuNet` (default) or `Media Pipe` |
| `VISION_MIN_DETECTION_CONFIDENCE` | `0.5` | Score threshold, shared by both detectors. Don't lower it — see [Proctoring](#proctoring--the-vision-service) |
| `VISION_YUNET_MODEL_PATH` | `models/face_detection_yunet_2026may.onnx` | Where the ONNX bundle lives |
| `VISION_YUNET_MODEL_URL` | pinned `opencv_zoo` commit | Bundle to download when absent |
| `VISION_YUNET_NMS_THRESHOLD` | `0.3` | Non-max-suppression IoU threshold |
| `VISION_YUNET_TOP_K` | `200` | Cap on boxes returned per frame |
| `VISION_BLAZE_MODEL_PATH` | `models/blaze_face_short_range.tflite` | MediaPipe bundle path |
| `VISION_BLAZE_MODEL_URL` | Google-hosted `float16/1` | MediaPipe bundle to download when absent |

The frontend needs no vision configuration: the WASM runtime and `.tflite` model are fetched from
public CDNs at runtime, and it degrades to fallback mode if they're unreachable.

### Option A - Docker (Recommended)

`make provision` is the one-command setup — it brings the stack up, migrates, installs the Piston
language runtimes, and seeds a demo candidate/company plus an attendable interview:

```bash
make provision
```

Or start the containers by hand — API server, TaskIQ worker, Postgres, Redis, Piston, and the
**vision service**:

```bash
docker compose up --build
```

| Service | Host port | Notes |
|---|---|---|
| `api` | 8000 | FastAPI + mounted MCP server |
| `frontend` | 8080 | nginx-served SPA |
| `vision` | 8001 → 8000 | Reached internally as `http://vision:8000`; the published port is for debugging only |
| `piston` | 2000 | Ships with **no** language runtimes — `make piston` installs them |
| `postgres` | 5433 → 5432 | Local DB (far lower latency than remote Neon) |
| `redis` | 6379 | TaskIQ broker |

The vision image **bakes both model bundles in at build time**, so a fresh container needs no
network to start detecting — and can switch `VISION_DETECTOR` without a download.

### Option B - Local Development

**1. Backend:**

```bash
cd backend

# Install all dependencies, including dev tools
uv sync --dev

# Apply database migrations
uv run alembic upgrade head

# Start the API server (with hot-reload)
uv run uvicorn app.main:app --reload
```

**2. TaskIQ Worker** (in a separate terminal):

```bash
cd backend
# The discovery flags are REQUIRED — without them the worker imports zero task
# modules and every dispatched task fails with "task not found".
uv run taskiq worker app.background.taskiq.taskiq:broker \
  --fs-discover --tasks-pattern "app/background/taskiq/tasks/*.py"
```

**3. Vision service** (in a separate terminal — required for proctoring and to pass the camera gate):

```bash
cd vision
uv sync
uv run python -m app.model_assets                  # fetch both model bundles into models/
uv run uvicorn app.main:app --reload --port 8001   # matches the backend's default VISION_URL
```

Sanity check: `curl localhost:8001/health` → `{"ok":true}`.

**4. Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173`.


## API Reference

FastAPI auto-generates interactive documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | - | Health check |
| `POST` | `/users/signup` | - | Register a candidate account |
| `POST` | `/users/login` | - | Authenticate and receive JWT |
| `GET` | `/users/{user_id}` | User | Get user profile |
| `PUT` | `/users/{user_id}` | User | Update user profile |
| `DELETE` | `/users/{user_id}` | User | Delete user account |
| `POST` | `/organizations/signup` | - | Register an organization |
| `GET` | `/organizations/{org_id}` | Org | Get organization details |
| `PUT` | `/organizations/{org_id}` | Org | Update organization |
| `POST` | `/interviews/` | Org | Create a new interview |
| `GET` | `/interviews/` | Any | List interviews |
| `GET` | `/interviews/applied` | User | Get applied interviews |
| `GET` | `/interviews/{interview_id}` | Org | Get full interview details |
| `POST` | `/applications/{interview_id}` | User | Apply with resume (PDF) |
| `GET` | `/applications/{interview_id}` | Org | Get all applications |
| `POST` | `/interviews/{interview_id}/start` | User | Start a session — **camera-gated**, body carries one base64 frame that must show exactly one face |
| `POST` | `/sessions/{session_id}/frame` | User | Proctoring frame beat — face check, violation counting, escalation, liveness refresh |
| `POST` | `/sessions/{session_id}/heartbeat` | User | Liveness ping (5 s); returns a terminal status when the session has ended |
| `GET` | `/leaderboard/{interview_id}` | Org | Ranked results with per-round scores, `violation_count`, and evidence frames |


## MCP Server

InterXAI exposes a subset of its capabilities as [Model Context Protocol](https://modelcontextprotocol.io) tools, so AI agents can drive the platform directly. The server is **mounted on the FastAPI app** (not a separate service) and served over Streamable HTTP at `/mcp` — same origin and port as the REST API, started automatically with `uv run uvicorn app.main:app`.

**Authentication reuses the platform JWT**, resource-server style (like GitHub's remote MCP server): every request to `/mcp` must carry an organization access token as `Authorization: Bearer <token>` — the same JWT issued by `/users/login`. Missing or invalid tokens get a `401` with a `WWW-Authenticate` hint; discovery metadata is served, unauthenticated, at `/.well-known/oauth-protected-resource` (RFC 9728). Each tool resolves the caller's organization from the token, so tools never take it as an argument.

Every tool is a thin wrapper that reuses the matching REST router handler and Pydantic schema — no business logic is duplicated.

| Tool | Input | Reuses | Description |
|---|---|---|---|
| `create_interview` | `interview` | `POST /interviews/` | Create an interview (questions, DSA topics, score split) |
| `get_applications` | `interview_id` | `GET /applications/{id}` | List an interview's applicants |
| `shortlist_application` | `application_id` | `PATCH /applications/{id}/shortlist` | Approve/reject an applicant (toggles the decision) |
| `get_leaderboard` | `interview_id` | `GET /leaderboard/{id}` | Ranked results with per-round scores and feedback |

**Connecting a client** (any MCP client supporting Streamable HTTP with a bearer token):

```
URL:     http://localhost:8000/mcp
Header:  Authorization: Bearer <org JWT from /users/login>
```

Implementation lives in `backend/app/mcp/`. Add a tool by writing a `register(mcp)` in `app/mcp/tools/` and calling it in `server.py`; its session-manager lifespan is composed into the app's lifespan via `combine_lifespans`.


## Proctoring & the Vision Service

Proctoring is **two-tier on purpose**. A small model runs in the candidate's browser for
instant feedback and to decide *when* to bother the server; a stronger model runs in the
standalone `vision/` service and holds the only verdict that counts. No violation is ever
decided client-side — the client is untrusted by construction.

### Models in use

| | Browser — [`ProctorWidget.tsx`](frontend/src/features/interview/components/ProctorWidget.tsx) | Vision service — [`yunet_detector.py`](vision/app/yunet_detector.py) |
|---|---|---|
| **Model** | **BlazeFace full-range** — `blaze_face_full_range/float16/1` (MediaPipe, ~1.1 MB) | **YuNet** — `face_detection_yunet_2026may.onnx` (OpenCV Zoo, MIT, ~230 KB) |
| **Runtime** | `@mediapipe/tasks-vision` **1.0.1**, WASM from jsDelivr, `CPU` delegate | `cv2.FaceDetectorYN`, OpenCV 5 ONNX engine, Python 3.12 |
| **Mode** | `VIDEO` — `detectForVideo` on the live `<video>`, every 800 ms | one independent frame per request |
| **Role** | Cheap local **trigger**: warn instantly, decide when to post | **Authoritative** face count — the only input to violation counting |
| **Fallbacks** | BlazeFace short-range, then `GPU` delegate, then no local detection at all | BlazeFace short-range via `VISION_DETECTOR="Media Pipe"` |

### Why these specific models

**Server — YuNet, because it can see the thing proctoring exists to catch.** The server model
decides whether someone gets flagged, so accuracy is the only thing that matters and a few
milliseconds are irrelevant. YuNet resolves faces from roughly 10×10 px upward (WIDER Face AP
0.884/0.866/0.750) at ~2.4 ms per frame, is MIT licensed, and costs **no extra dependencies** —
`cv2` ships transitively with mediapipe, so the model is a 230 KB file. The `2026may` export
specifically, because it carries dynamic input dims, which is what OpenCV 5.x needs to infer at
arbitrary frame sizes.

The MediaPipe option is deliberately not the default. BlazeFace short-range is built for a single
selfie-scale face within about 2 m: measured against the live `/detect` endpoint with only
`VISION_DETECTOR` changed, it does not detect a second person standing behind the candidate at
any size from 56 px down to 12 px of face height, at either capture resolution, and it misses a
non-frontal face outright. It stays selectable because mediapipe is the path to the planned
`FaceLandmarker` (head pose) and `HandLandmarker` (finger count) models.

**Browser - BlazeFace full-range, because it is the strongest model that costs nothing extra.**
The client's only job is to warn the candidate immediately and throttle uploads, so the bar is
"free and already there". YuNet in the browser would mean shipping onnxruntime-web plus a
hand-written port of its post-processing, for a component that doesn't decide anything;
`@mediapipe/tasks-vision` is already a dependency, and of the bundles it can load, full-range
reaches about twice as far as short-range. Short-range is the configured fallback so that a
runtime which rejects the full-range bundle keeps a local detector rather than losing one.

**Why not the same model on both sides.** Smallest background face each tier still resolves at
640×480, as a fraction of frame height:

| tier | model | reach |
|---|---|---|
| browser | BlazeFace full-range | **14%** (→ 10% across a few ticks) |
| browser fallback | BlazeFace short-range | 28% |
| vision service | YuNet | **7%** |

The server reaches twice as far as the browser, and that gap is the whole reason
a clean local read **still posts on the liveness interval**, the browser can read clean while
the server would flag.

### Three settings that look arbitrary and aren't

- **Confidence stays at 0.5 on both tiers.** Lowering it looks like a free way to trade false
  positives for fewer misses, and it doesn't work: YuNet produces zero phantom faces on
  face-free images at *every* threshold down to 0.1 (no FP headroom to trade), and 0.5 → 0.3
  catches no smaller intruder while multiplying boxes on cluttered frames — each spurious box
  being a step toward a false `cheated`. On the short-range fallback it is actively harmful: at
  0.3 it reports **two faces on a frame containing one person**, which would fire warnings at a
  candidate sitting alone.
- **Frames are posted at 640×480.** Frame size, not the threshold, is the lever that governs
  misses: the server's reach is ~14% of frame height at 320×240 against ~7% at 640×480 — roughly
  double the distance — and the larger frame costs about 22 KB per post rather than 10 KB. Local
  detection is unaffected either way, since it reads the video element, not the uploaded JPEG.
- **The browser prefers the `CPU` delegate over `GPU`.** On the same model and frames, `CPU`
  detected a background face that `GPU` missed, identically under both `IMAGE` and `VIDEO` modes
  — so it is the delegate, not the mode. Inference is ~5 ms per tick either way, and sensitivity
  that doesn't vary with the candidate's GPU driver is worth more than offloading 5 ms.

### End-to-end flow

```
Candidate's browser                    Backend API                      Vision service
───────────────────                    ───────────                      ──────────────
CameraGate.tsx
  capture 1 frame  ───────►  POST /interviews/{id}/start  ──────────►  POST /detect
  ("you must be alone")        0 faces  → 400 "No face detected"        YuNet face_count
                               >1 faces → 400 "More than one person"
                               1 face   → session created (ongoing)

ProctorWidget.tsx  (every 800 ms, entirely local, BlazeFace full-range)
  detectForVideo(video) → face count
    ├─ 1 face   → clear the warning; post only on the 12 s liveness beat
    │             (the server may STILL flag someone BlazeFace can't see)
    └─ 0 or >1  → warn instantly (optimistic), post now (at most 1 per 4 s)
         │
         ▼
  POST /sessions/{id}/frame  ──────────────────────────────────────►  POST /detect
  (base64 JPEG, 640×480, q=0.6)   │                                    face_count =
                                  │                                    max(per_frame)
                                  ├─ 1 face  → clean: refresh last_heartbeat_at
                                  └─ 0 or >1 → violation:
                                       lock the session row (FOR UPDATE)
                                       violation_count += 1
                                       ≥ PROCTOR_VIOLATION_THRESHOLD → status = cheated
                                       dispatch upload_violation_image_task
                                          └─► Supabase Storage + ViolationImage row
                                  ▼
  { status, violation, violation_count, threshold, deadline }
  ← the server verdict overrides the local guess (it can clear an optimistic warning)
  ← a terminal status stops the loop and routes to the "interview ended" screen
```

### Cadence

| Constant | Value | Purpose |
|---|---|---|
| `DETECT_MS` | 800 ms | Local detection tick — free, so it can be aggressive |
| `FLAG_POST_THROTTLE_MS` | 4 s | Max rate of *flagged* frame posts, so one flag can't spam `/frame` |
| `LIVENESS_MS` | 12 s | Post even on a clean local read — the server still reaches twice as far as the browser, and can't trust a client that simply stopped flagging |
| `FALLBACK_FRAME_MS` | 6 s | Plain periodic server beat used when the local model fails to load |
| `HEARTBEAT_MS` | 5 s | Separate `POST /sessions/{id}/heartbeat` liveness ping (`useInterviewSession`) |

Every accepted frame also refreshes `last_heartbeat_at`, so the frame beat doubles as camera
liveness on top of the heartbeat ping. A background person present for the whole session is
therefore caught within ~12 s even when the browser never flags.

### Why the vision service is a separate service

It is a **peer** of `backend/` and `frontend/`, not a backend module: its own `uv` project, its
own image, its own dependency tree, and no shared code. It is **stateless** — no database, no
users, no notion of interviews or sessions; its only auth is an optional shared secret. The
backend is the authenticating proxy: it validates the JWT and session ownership, forwards
frames, and owns all escalation logic. The service only ever answers *"how many faces are in
these frames"*.

### Failure modes (both fail *open*)

| Failure | Behaviour |
|---|---|
| Vision service down / timing out | The frame is treated as **clean** (a flaky service must never punish a candidate); the camera gate at `/start` also lets the interview begin |
| jsDelivr WASM or Google-hosted model blocked | The widget silently drops into **fallback mode**: no local detection, plain 6 s server beat. Detection quality is unchanged — the server holds the real model — only the instant warning is lost |
| GPU delegate unavailable | Retries the same model on the `CPU` delegate before giving up |
| Camera permission denied | The candidate cannot pass `CameraGate`; the interview never starts |
| Undecodable frame | The service returns `400 Bad frame`, which the backend treats as a vision failure (clean) |

### Internal `/detect` contract

Called only by the backend; not exposed to browsers.

```
POST /detect                 header: X-Vision-Secret: <secret>   (only when set)
  { "frames": ["<base64 jpeg/png>", ...], "checks": ["face_count"] }
→ { "face_count": 2,                 # max across frames
    "per_frame": [1, 2],             # in request order
    "faces": [ { "confidence": 0.91, "x": 49, "y": 44, "width": 27, "height": 34 } ] }
```

`GET /health` → `{ "ok": true }` once the detector has loaded, `{ "ok": false }` before that;
`/detect` itself answers `503 Detector not ready` until the lifespan hook finishes. `checks` is
accepted for forward-compatibility; v1 implements `face_count` only.

## Data Models

```
User ────────────────────────── Organization
  │                                  │
  │ applies to                       │ creates
  ▼                                  ▼
Application ◄──────────── CustomInterview
  │                          │
  │ has session              ├── CustomQuestion[]
  ▼                          └── DsaTopic[]
InterviewSession
  │
  ├── Interaction[]          (Q&A rounds)
  │     └── FollowUpQuestion[]
  ├── DsaInteraction[]       (coding rounds)
  └── ResumeConversation[]   (resume rounds)
        └── ResumeQuestion[]
```

**Interview Session States:** `SCHEDULED` → `ONGOING` → `COMPLETED` | `CANCELLED` | `CHEATED`

**Round Types:** `QUESTIONS` · `DSA` · `RESUME`


## Development

### Running Code Quality Checks

Backend — run the wrapper from the **repo root** (it cd's into `backend/` itself):

```bash
# Run all checks at once (ruff check --fix + ruff format + mypy)
tools/backend_lint
tools/backend_lint --only=ruff      # or --only=mypy

# Or the individual tools, from backend/
cd backend
uv run ruff check --fix . && uv run ruff format . && uv run mypy .
```

The `vision/` service is **not** covered by `tools/backend_lint` — it has its own env and its own
`ruff.toml` / `mypy.ini` (same rules: line length 100, `mypy --strict`):

```bash
cd vision
uv run ruff check --fix . && uv run ruff format . && uv run mypy .
```

Frontend:

```bash
cd frontend
npm run lint && npx prettier --check "src/**/*.{ts,tsx,css}" && npx tsc --noEmit
```

### Database Migrations

```bash
cd backend

# Apply all pending migrations
uv run alembic upgrade head

# Auto-generate a new migration after model changes
uv run alembic revision --autogenerate -m "add column to applications"
```


## Contributing

Contributions are welcome. Please follow these steps:

1. **Fork** the repository and clone your fork
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes and ensure all quality checks pass: `./tools/backend_lint`
4. **Commit** with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/)
5. **Push** to your fork and **open a Pull Request**

### Code Guidelines

- Business logic lives inline in routers - no separate service layer yet
- New abstractions go in `app/interfaces/`, implementations in `app/utils/`
- All environment variables must be declared in `app/config.py` via `pydantic-settings`
- Type annotations are mandatory - `mypy --strict` must pass without errors
- Line length: 100 characters (enforced by Ruff)


## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.


<div align="center">
  Built with FastAPI, React, and LangChain
</div>
