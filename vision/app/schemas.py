from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    # One or more base64-encoded frames (JPEG/PNG; data-URL prefix tolerated).
    frames: list[str] = Field(min_length=1)
    # Checks to run. v1 supports only "face_count"; kept for forward-compat.
    checks: list[str] = Field(default_factory=lambda: ["face_count"])


class FaceBox(BaseModel):
    confidence: float
    x: int
    y: int
    width: int
    height: int


class DetectResponse(BaseModel):
    # Max faces across the submitted frames — conservative: a second person in
    # ANY frame trips the count.
    face_count: int
    # Per-frame counts, in request order.
    per_frame: list[int]
    # Boxes from the frame with the most faces (for evidence/debugging).
    faces: list[FaceBox] = Field(default_factory=list)
