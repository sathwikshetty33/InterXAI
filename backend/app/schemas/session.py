from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class HeartbeatResponse(BaseModel):
    status: str
    # The client resyncs its countdown from this each heartbeat instead of
    # trusting local clock drift.
    deadline: datetime | None = None


class AnswerRequest(BaseModel):
    answer: str


class DsaRunRequest(BaseModel):
    interaction_id: int
    source_code: str
    language: str
    stdin: str = ""


class DsaRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int


class DsaSubmitRequest(BaseModel):
    interaction_id: int
    source_code: str
    language: str


class DsaTestRequest(BaseModel):
    interaction_id: int
    source_code: str
    language: str


class DsaTestCaseStatus(BaseModel):
    """Per-hidden-case outcome. Deliberately carries no stdin/expected/actual —
    with resubmission allowed, echoing outputs would let candidates reverse-
    engineer the hidden test cases across attempts."""

    case: int
    status: str  # passed | failed | error


class DsaTestResponse(BaseModel):
    case_results: list[DsaTestCaseStatus]
    passed: int
    total: int


class CustomQuestionPayload(BaseModel):
    type: Literal["custom"] = "custom"
    interaction_id: int
    question: str


class ResumeQuestionPayload(BaseModel):
    type: Literal["resume"] = "resume"
    question_id: int
    question: str


QuestionPayload = Annotated[
    CustomQuestionPayload | ResumeQuestionPayload,
    Field(discriminator="type"),
]


class InterviewStateResponse(BaseModel):
    """Returned by /interviews/{id}/start and every /sessions/{id}/... mutation.

    `question` is None when `completed=true` or when `round=="dsa"` — the DSA
    round is not question-at-a-time; clients fetch the full set via
    GET /sessions/{id}/dsa and leave the round via POST /sessions/{id}/dsa/finish.
    `round` reflects the server-side current_round at the moment of the response.
    """

    session_id: int
    round: str
    completed: bool
    question: QuestionPayload | None
    deadline: datetime | None = None


class DsaSubmitResponse(BaseModel):
    """Outcome of grading one submission. Resubmission is allowed (the last
    SUBMITTED code wins) and submitting never advances the session, so there
    is no next_state. recorded=false means this run's result was NOT stored:
    either the session left the DSA round while it was being graded, or a
    newer submission superseded it mid-grade."""

    case_results: list[DsaTestCaseStatus]
    passed: int
    total: int
    score: float
    attempts: int
    recorded: bool


class DsaRoundQuestion(BaseModel):
    """One DSA question as shown in the round overview, including the
    candidate's own submission state so the frontend can render progress."""

    interaction_id: int
    problem_name: str
    description: str
    sample_test_cases: list[dict[str, str]] | None = None
    time_limit_ms: int
    attempts: int
    score: float | None = None
    passed_cases: int | None = None
    total_cases: int | None = None


class DsaRoundResponse(BaseModel):
    """The whole DSA round. status=="preparing" means the background
    assignment task hasn't finished yet — poll again (the server re-dispatches
    the task, so this resolves). status=="ready" with an empty questions list
    means assignment finished with no bank match for any topic — nothing more
    is coming; finish the round to move on."""

    session_id: int
    status: Literal["preparing", "ready"]
    questions: list[DsaRoundQuestion]
