from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VISION_", env_file=".env", extra="ignore", protected_namespaces=()
    )

    detector: str = "YuNet"


    yunet_model_path: str = "models/face_detection_yunet_2026may.onnx"
    yunet_model_url: str = (
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/"
        "26cc381e4d2594bb9f47a26eb8fd96c94a13660d/models/face_detection_yunet/"
        "face_detection_yunet_2026may.onnx"
    )
    yunet_nms_threshold: float = 0.3
    yunet_top_k: int = 200


    blaze_model_path: str = "models/blaze_face_short_range.tflite"
    blaze_model_url: str = (
        "https://storage.googleapis.com/mediapipe-models/face_detector/"
        "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
    )

    # Score threshold, shared by both detectors. Kept sensitive on purpose — a
    # background face is what we need to catch. Measured: going below 0.5 does
    # NOT catch a smaller intruder, it only multiplies boxes on cluttered
    # frames; capture resolution is the lever that actually reduces misses.
    min_detection_confidence: float = 0.5

    # Empty = auth off (dev); when set, callers must send X-Vision-Secret.
    shared_secret: str = ""


settings = Settings()
