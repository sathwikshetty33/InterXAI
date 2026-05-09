from datetime import datetime

from pydantic import BaseModel


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    interview_id: int
    resume: str | None = None
    extracted_resume: str | None = None
    approved: bool
    score: float
    shortlisting_decision: bool
    feedback: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
