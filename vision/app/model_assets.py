"""Fetch the MediaPipe model bundle if absent. Stdlib only — no mediapipe import,
so the Dockerfile can pre-download the model without loading the heavy runtime."""

import urllib.request
from pathlib import Path


def ensure_model(path: str, url: str) -> str:
    target = Path(path)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, target)
    return path


if __name__ == "__main__":
    from app.config import settings

    ensure_model(settings.model_path, settings.model_url)
    print(f"Model ready at {settings.model_path}")
