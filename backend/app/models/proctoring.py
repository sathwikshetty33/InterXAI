from enum import StrEnum

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseTable


class ViolationType(StrEnum):
    MULTIPLE_FACES = "multiple_faces"
    NO_FACE = "no_face"
    CAMERA_LOST = "camera_lost"


class ViolationImage(BaseTable):
    __tablename__ = "violation_images"

    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    violation_type: Mapped[str] = mapped_column(String(50), nullable=False)

    session = relationship(
        "InterviewSession", back_populates="violation_images", foreign_keys=[session_id]
    )

    def __repr__(self) -> str:
        return f"<ViolationImage(session_id={self.session_id}, type='{self.violation_type}')>"
