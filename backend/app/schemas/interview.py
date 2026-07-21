from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class CustomQuestionCreate(BaseModel):
    question: str
    expected_answer: str


class DsaTopicCreate(BaseModel):
    topic: str
    difficulty: str


class DsaTopicCatalogEntry(BaseModel):
    """One topic from the DSA question bank, with the difficulties it has
    at least one question for. Lets the interview-creation UI offer a
    dropdown of topics that will actually resolve to a question at assignment
    time, instead of free text that must match the bank exactly."""

    topic: str
    difficulties: list[str]


class CustomInterviewCreate(BaseModel):
    description: str
    position: str
    experience: str = Field(min_length=1, max_length=50)
    submission_deadline: datetime
    start_time: datetime
    end_time: datetime
    duration: int = 60
    dsa_score: int = 50
    dev_score: int = 50
    resume_shortlist_score: float = Field(default=0, ge=0, le=10)
    ask_questions_on_resume: bool = False

    questions: list[CustomQuestionCreate] = []
    dsa_topics: list[DsaTopicCreate] = []

    @model_validator(mode="after")
    def validate_times_and_scores(self) -> "CustomInterviewCreate":
        tz = self.start_time.tzinfo
        now = datetime.now(tz)

        # start_time is allowed in the past — an interview may open its window
        # immediately (or backdated for testing). The window must still not have
        # already closed, and the application deadline must still be reachable.
        if self.end_time <= now:
            raise ValueError("end_time must be in the future")
        if self.submission_deadline <= now:
            raise ValueError("submission_deadline must be in the future")

        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")

        if self.dsa_score is not None or self.dev_score is not None:
            dsa = self.dsa_score or 0
            dev = self.dev_score or 0
            if dsa + dev != 100:
                raise ValueError("The sum of dsa_score and dev_score must be exactly 100")

        return self


class CustomQuestionResponse(CustomQuestionCreate):
    id: int
    interview_id: int

    class Config:
        from_attributes = True


class DsaTopicResponse(DsaTopicCreate):
    id: int
    interview_id: int

    class Config:
        from_attributes = True


class CustomInterviewResponse(CustomInterviewCreate):
    id: int
    org_id: int
    questions: list[CustomQuestionResponse] = []  # type: ignore[assignment]
    dsa_topics: list[DsaTopicResponse] = []  # type: ignore[assignment]

    class Config:
        from_attributes = True


class CustomInterviewBasicResponse(BaseModel):
    id: int
    org_id: int
    description: str
    position: str
    experience: str
    submission_deadline: datetime
    start_time: datetime
    end_time: datetime

    class Config:
        from_attributes = True


class AppliedInterviewResponse(CustomInterviewBasicResponse):
    status: str
