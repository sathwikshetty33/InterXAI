"""Fetch the MediaPipe model bundle if absent. Stdlib only — no mediapipe import,
so the Dockerfile can pre-download the model without loading the heavy runtime."""

import shutil
import urllib.request
from pathlib import Path

DOWNLOAD_TIMEOUT_S = 60


def ensure_model(path: str, url: str) -> str:
    target = Path(path)
    if target.exists():
        return path
    target.parent.mkdir(parents=True, exist_ok=True)
    # Download beside the target and rename: a fetch killed halfway must not
    # leave a truncated file behind, since every later boot would take its mere
    # existence as "already downloaded".
    partial = target.with_suffix(target.suffix + ".part")
    with (
        urllib.request.urlopen(url, timeout=DOWNLOAD_TIMEOUT_S) as response,
        partial.open("wb") as f,
    ):
        shutil.copyfileobj(response, f)
    partial.replace(target)
    return path


if __name__ == "__main__":
    from app.config import settings

    for model_path, model_url in (
        (settings.yunet_model_path, settings.yunet_model_url),
        (settings.blaze_model_path, settings.blaze_model_url),
    ):
        ensure_model(model_path, model_url)
        print(f"Model ready at {model_path}")
