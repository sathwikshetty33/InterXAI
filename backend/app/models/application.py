from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseTable


class InterviewStatus(StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CHEATED = "cheated"
    ONGOING = "ongoing"
    DISQUALIFIED = "disqualified"


class CurrentRound(StrEnum):
    QUESTIONS = "questions"
    DSA = "dsa"
    RESUME = "resume"


class Application(BaseTable):
    __tablename__ = "applications"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_id: Mapped[int] = mapped_column(
        ForeignKey("custom_interviews.id", ondelete="CASCADE"), nullable=False
    )
    resume: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extracted_resume: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="applied")
    score: Mapped[float] = mapped_column(Float, default=0)
    # The resume screener's verdict, written ONCE and never overwritten, so the
    # org can always see what the AI recommended even after overriding it.
    # None = the resume hasn't been screened (yet, or it failed).
    ai_shortlist_recommendation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    # The EFFECTIVE decision — seeded from the AI recommendation, then owned by
    # the org (the shortlist toggle). This is what gates starting an interview.
    shortlisting_decision: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="applications")

    interview = relationship(
        "CustomInterview", back_populates="applications", foreign_keys=[interview_id]
    )
    sessions = relationship(
        "InterviewSession",
        back_populates="application",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Application(user_id={self.user_id}, interview_id={self.interview_id})>"


class InterviewSession(BaseTable):
    __tablename__ = "interview_sessions"

    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, server_default=func.now()
    )
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_heartbeat_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, server_default=func.now()
    )
    # start_time + interview.duration, capped at interview.end_time; set at
    # /start. Nullable only for sessions that predate this column.
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_round: Mapped[str] = mapped_column(String(20), default=CurrentRound.QUESTIONS.value)
    current_question_index: Mapped[int] = mapped_column(Integer, default=1)
    # Set by run_assign_dsa_questions when it finishes (even with zero matches),
    # so GET /sessions/{id}/dsa can tell "assignment still pending" apart from
    # "assignment done — this is all the questions there will be".
    dsa_assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=InterviewStatus.SCHEDULED.value)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    strengths: Mapped[str | None] = mapped_column(Text, nullable=True)

    application = relationship("Application", back_populates="sessions")
    interactions = relationship(
        "Interaction",
        back_populates="session",
        cascade="all, delete-orphan",
        foreign_keys="Interaction.session_id",
    )
    dsa_sessions = relationship(
        "DsaInteraction",
        back_populates="session",
        cascade="all, delete-orphan",
        foreign_keys="DsaInteraction.session_id",
    )
    resume_conversations = relationship(
        "ResumeConversation",
        back_populates="session",
        cascade="all, delete-orphan",
        foreign_keys="ResumeConversation.session_id",
    )

    def __repr__(self) -> str:
        return f"<InterviewSession(application_id={self.application_id}, status='{self.status}')>"
