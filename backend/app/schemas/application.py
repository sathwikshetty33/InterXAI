from datetime import datetime

from pydantic import BaseModel


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    username: str | None = None
    email: str | None = None
    interview_id: int
    resume: str | None = None
    extracted_resume: str | None = None
    status: str
    score: float
    # What the resume screener recommended (never overwritten by the org).
    # None = not screened yet, or screening failed.
    ai_shortlist_recommendation: bool | None = None
    # The effective decision — seeded from the AI, then owned by the org.
    shortlisting_decision: bool
    feedback: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
