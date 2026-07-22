from datetime import datetime

from pydantic import BaseModel


class FollowUpTurn(BaseModel):
    """A single question/answer turn within a QUESTIONS-round interaction."""

    id: int
    question: str
    answer: str | None


class QuestionInteractionResult(BaseModel):
    """One main custom question, its follow-up conversation, score and feedback.

    Every question CONFIGURED on the interview appears here, including ones the
    candidate never reached (the session ran out of time) — those have id=None,
    attempted=False and no score. They count as 0 in the final score, but are
    surfaced as unattempted rather than as a genuine zero."""

    id: int | None
    question_id: int
    attempted: bool
    question: str | None
    expected_answer: str | None
    score: float | None
    feedback: str | None
    follow_ups: list[FollowUpTurn]


class DsaInteractionResult(BaseModel):
    """One DSA question attempt: the problem, the candidate's code and its score.
    code/score/case tallies describe the LAST submission (resubmission allowed);
    attempts counts how many submissions were graded in total."""

    id: int
    problem_name: str | None
    description: str | None
    difficulty: str | None
    topic: str | None
    language: str | None
    code: str | None
    score: float | None
    attempts: int
    passed_cases: int | None
    total_cases: int | None


class ResumeQuestionResult(BaseModel):
    id: int
    question: str
    expected_answer: str | None
    # None (not "") when never reached, so the UI can show "unattempted".
    answer: str | None


class ResumeConversationResult(BaseModel):
    """A resume-round conversation with its per-conversation score and feedback."""

    id: int
    score: float
    feedback: str | None
    questions: list[ResumeQuestionResult]


class SessionResult(BaseModel):
    """Everything captured during a single interview session, across all rounds."""

    id: int
    status: str
    score: float | None
    feedback: str | None
    recommendation: str | None
    strengths: str | None
    start_time: datetime
    end_time: datetime | None
    questions_round: list[QuestionInteractionResult]
    dsa_round: list[DsaInteractionResult]
    resume_round: list[ResumeConversationResult]


class LeaderboardEntry(BaseModel):
    """One candidate's standing and full interview record."""

    rank: int
    application_id: int
    user_id: int
    username: str
    email: str
    status: str
    resume_score: float  # Application.score — resume shortlisting score
    shortlisting_decision: bool
    application_feedback: str | None
    interview_score: float | None  # best session score — the ranking key
    sessions: list[SessionResult]


class InterviewLeaderboardResponse(BaseModel):
    interview_id: int
    position: str
    total_candidates: int
    entries: list[LeaderboardEntry]
