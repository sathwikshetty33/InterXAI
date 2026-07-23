# InterXAI Vision Service

Stateless proctoring vision service — face/hand/pose inference over HTTP. Called by
the main backend (which validates the session and owns all escalation logic); this
service just answers "how many faces / what gesture is in these frames".

## Run locally

```bash
uv sync
uv run python -m app.model_assets            # fetch the model bundle
uv run uvicorn app.main:app --reload --port 8001
```

## Endpoints

- `GET /health` → `{ "ok": true }`
- `POST /detect` → face count over one or more frames:

```bash
curl -s localhost:8001/detect \
  -H 'Content-Type: application/json' \
  -d '{"frames":["<base64-jpeg>"],"checks":["face_count"]}'
# → {"face_count":1,"per_frame":[1],"faces":[{"confidence":0.98,"x":..,"y":..,"width":..,"height":..}]}
```

Set `VISION_SHARED_SECRET` to require an `X-Vision-Secret` header. See `CLAUDE.md` for details.
