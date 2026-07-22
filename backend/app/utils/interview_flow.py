from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.common import BadRequestError, NotFoundError
from app.logger import get_logger
from app.models.application import (
    Application,
    CurrentRound,
    InterviewSession,
    InterviewStatus,
)
from app.models.dsa_question import DsaQuestion
from app.models.interaction import (
    DsaInteraction,
    FollowUpQuestion,
    Interaction,
    ResumeConversation,
    ResumeQuestion,
)
from app.models.interview import CustomInterview, CustomQuestion, DsaTopic
from app.schemas.session import (
    InterviewStateResponse,
    ResumeQuestionPayload,
)
from app.utils.default_providers import default_worker_provider

logger = get_logger(__name__)


# Maximum follow-up questions per main question, per the interview design.
MAX_FOLLOWUPS = 3


async def latest_interaction(session_id: int, db: AsyncSession) -> Interaction | None:
    """The most-recently-created Interaction for this session (i.e. the current one)."""
    result = await db.execute(
        select(Interaction)
        .where(Interaction.session_id == session_id)
        .order_by(Interaction.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def open_follow_up(interaction_id: int, db: AsyncSession) -> FollowUpQuestion | None:
    """Most recent FollowUpQuestion row for this interaction with no answer yet."""
    result = await db.execute(
        select(FollowUpQuestion)
        .where(
            FollowUpQuestion.interaction_id == interaction_id,
            FollowUpQuestion.answer.is_(None),
        )
        .order_by(FollowUpQuestion.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def followups_used(interaction_id: int, db: AsyncSession) -> int:
    """
    Number of actual follow-ups asked so far for this interaction.

    The first FollowUpQuestion row holds the main question; subsequent rows are
    the actual follow-ups. We return `total - 1` (clamped at zero) so callers can
    compare directly against MAX_FOLLOWUPS.
    """
    result = await db.execute(
        select(func.count(FollowUpQuestion.id)).where(
            FollowUpQuestion.interaction_id == interaction_id
        )
    )
    total = int(result.scalar_one() or 0)
    return max(0, total - 1)


async def conversation_context(interaction_id: int, db: AsyncSession) -> str:
    """Build a Q1/A1 ... Qn/An transcript for the FollowUpDecider / Evaluator."""
    result = await db.execute(
        select(FollowUpQuestion)
        .where(FollowUpQuestion.interaction_id == interaction_id)
        .order_by(FollowUpQuestion.id.asc())
    )
    rows = list(result.scalars().all())
    lines: list[str] = []
    for i, row in enumerate(rows, 1):
        lines.append(f"Q{i}: {row.question}")
        lines.append(f"A{i}: {row.answer or '<no answer yet>'}")
    return "\n".join(lines)


async def next_custom_question(
    interview_id: int, after_question_id: int, db: AsyncSession
) -> CustomQuestion | None:
    """The next CustomQuestion (by id) for this interview after the given one."""
    result = await db.execute(
        select(CustomQuestion)
        .where(
            CustomQuestion.interview_id == interview_id,
            CustomQuestion.id > after_question_id,
        )
        .order_by(CustomQuestion.id.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def session_dsa_interactions(
    session_id: int, db: AsyncSession
) -> list[tuple[DsaInteraction, DsaQuestion]]:
    """
    All DsaInteractions assigned to this session (oldest first), each paired
    with its DsaQuestion. Interactions whose question row was deleted
    (question_id is NULL via ondelete=SET NULL) are excluded by the join.
    """
    result = await db.execute(
        select(DsaInteraction, DsaQuestion)
        .join(DsaQuestion, DsaInteraction.question_id == DsaQuestion.id)
        .where(DsaInteraction.session_id == session_id)
        .order_by(DsaInteraction.id.asc())
    )
    return list(result.tuples().all())


async def dsa_interaction_by_id(
    session_id: int, interaction_id: int, db: AsyncSession
) -> tuple[DsaInteraction, DsaQuestion]:
    """
    Load one of this session's DsaInteractions by id, paired with its question.
    The session check prevents a candidate from targeting another session's
    interaction; raising (rather than falling back to a cursor) is what makes
    run/test/submit safe to retry.
    """
    interaction = await db.get(DsaInteraction, interaction_id)
    if interaction is None or interaction.session_id != session_id:
        raise NotFoundError("DSA question not found for this session")
    question = (
        await db.get(DsaQuestion, interaction.question_id)
        if interaction.question_id is not None
        else None
    )
    if question is None:
        raise BadRequestError("This DSA question is no longer available")
    return interaction, question


async def mark_session_completed(
    session: InterviewSession, db: AsyncSession
) -> InterviewStateResponse:
    """Terminal-transition the session, fire the final-grading task, and return."""
    session.status = InterviewStatus.COMPLETED.value
    session.end_time = datetime.utcnow()
    await db.commit()
    await default_worker_provider().grade_session_task(session.id)
    return InterviewStateResponse(
        session_id=session.id,
        round=session.current_round,
        completed=True,
        question=None,
        deadline=session.deadline,
    )


async def current_resume_question(
    session: InterviewSession, db: AsyncSession
) -> ResumeQuestion | None:
    """The ResumeQuestion at session.current_question_index (1-based) for this session."""
    conv_result = await db.execute(
        select(ResumeConversation).where(ResumeConversation.session_id == session.id)
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation is None:
        return None
    offset = max(0, session.current_question_index - 1)
    rq_result = await db.execute(
        select(ResumeQuestion)
        .where(ResumeQuestion.conversation_id == conversation.id)
        .order_by(ResumeQuestion.id.asc())
        .offset(offset)
        .limit(1)
    )
    return rq_result.scalar_one_or_none()


async def next_resume_question(
    conversation_id: int, after_question_id: int, db: AsyncSession
) -> ResumeQuestion | None:
    """The next ResumeQuestion (by id) in the conversation after the given one."""
    result = await db.execute(
        select(ResumeQuestion)
        .where(
            ResumeQuestion.conversation_id == conversation_id,
            ResumeQuestion.id > after_question_id,
        )
        .order_by(ResumeQuestion.id.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def transition_to_resume(
    session: InterviewSession, db: AsyncSession
) -> InterviewStateResponse:
    """
    Flip to the RESUME round and return the first resume question. If the
    interview has ask_questions_on_resume=False (no ResumeConversation was ever
    created) or the conversation has no questions, fall through to completion.
    """
    conv_result = await db.execute(
        select(ResumeConversation).where(ResumeConversation.session_id == session.id)
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation is None:
        return await mark_session_completed(session, db)

    rq_result = await db.execute(
        select(ResumeQuestion)
        .where(ResumeQuestion.conversation_id == conversation.id)
        .order_by(ResumeQuestion.id.asc())
        .limit(1)
    )
    first_rq = rq_result.scalar_one_or_none()
    if first_rq is None:
        return await mark_session_completed(session, db)

    session.current_round = CurrentRound.RESUME.value
    session.current_question_index = 1
    await db.commit()

    return InterviewStateResponse(
        session_id=session.id,
        round=session.current_round,
        completed=False,
        question=ResumeQuestionPayload(
            question_id=first_rq.id,
            question=first_rq.question,
        ),
        deadline=session.deadline,
    )


async def transition_to_dsa(session: InterviewSession, db: AsyncSession) -> InterviewStateResponse:
    """
    Flip the session to the DSA round if the interview has DSA topics,
    otherwise fall through to the RESUME round.

    The decision is made on DsaTopics (what the org configured), NOT on
    DsaInteraction rows (what the background assignment task has produced so
    far) — so a candidate who reaches this point before the task has run gets
    a "preparing" DSA round instead of silently losing it. The envelope
    carries no question: the round serves all its questions at once via
    GET /sessions/{id}/dsa and is left via POST /sessions/{id}/dsa/finish.
    """
    interview = await interview_metadata(session, db)
    topic_count = await db.execute(
        select(func.count(DsaTopic.id)).where(DsaTopic.interview_id == interview.id)
    )
    if int(topic_count.scalar_one() or 0) == 0:
        logger.info(
            "Interview %d has no DSA topics — session %d falls through to resume round",
            interview.id,
            session.id,
        )
        return await transition_to_resume(session, db)

    session.current_round = CurrentRound.DSA.value
    session.current_question_index = 1
    await db.commit()

    return InterviewStateResponse(
        session_id=session.id,
        round=session.current_round,
        completed=False,
        question=None,
        deadline=session.deadline,
    )


async def interview_metadata(session: InterviewSession, db: AsyncSession) -> CustomInterview:
    """Load the CustomInterview tied to this session (via application.interview_id)."""
    result = await db.execute(
        select(CustomInterview)
        .join(Application, Application.interview_id == CustomInterview.id)
        .where(Application.id == session.application_id)
    )
    interview = result.scalar_one_or_none()
    if interview is None:
        # Should be impossible if FKs are intact, but raise rather than return None
        # so callers can rely on a non-null return.
        raise BadRequestError("Session has no associated interview")
    return interview
