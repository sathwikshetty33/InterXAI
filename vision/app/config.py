from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VISION_", env_file=".env", extra="ignore", protected_namespaces=()
    )

    model_path: str = "models/blaze_face_short_range.tflite"
    model_url: str = (
        "https://storage.googleapis.com/mediapipe-models/face_detector/"
        "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
    )
    # Kept sensitive on purpose — a background face is what we need to catch.
    min_detection_confidence: float = 0.5
    # Empty = auth off (dev); when set, callers must send X-Vision-Secret.
    shared_secret: str = ""
    detector: str = "Media Pipe"


settings = Settings()
