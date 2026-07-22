from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions.common import ForbiddenError
from app.logger import get_logger
from app.models.application import InterviewSession, InterviewStatus
from app.utils.default_providers import default_worker_provider

logger = get_logger(__name__)


TERMINAL_STATUSES: frozenset[str] = frozenset(
    {
        InterviewStatus.COMPLETED.value,
        InterviewStatus.CANCELLED.value,
        InterviewStatus.CHEATED.value,
        InterviewStatus.DISQUALIFIED.value,
    }
)


async def disqualify_if_stale(session: InterviewSession, db: AsyncSession) -> bool:
    """
    If IMMEDIATE_DISQUALIFICATION is enabled, the session is still active, and the
    last heartbeat is older than HEARTBEAT_THRESHOLD_S, transition the session to
    DISQUALIFIED and commit.

    Returns True iff a transition happened. Callers in non-mutation paths (e.g. the
    heartbeat endpoint itself) should treat the session as terminal afterwards.
    """
    if session.status in TERMINAL_STATUSES:
        return False
    if not settings.IMMEDIATE_DISQUALIFICATION:
        return False

    threshold = timedelta(seconds=settings.HEARTBEAT_THRESHOLD_S)
    elapsed = datetime.utcnow() - session.last_heartbeat_at
    if elapsed <= threshold:
        return False

    # The checks above ran on an unlocked read. Re-check under FOR UPDATE so we
    # don't stamp DISQUALIFIED over a concurrent transition (dsa/finish, etc.).
    locked = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    session = locked.scalar_one()
    if session.status in TERMINAL_STATUSES:
        return False
    elapsed = datetime.utcnow() - session.last_heartbeat_at
    if elapsed <= threshold:
        return False

    logger.info(
        "Disqualifying session %d (silence=%.1fs, threshold=%ds)",
        session.id,
        elapsed.total_seconds(),
        settings.HEARTBEAT_THRESHOLD_S,
    )
    session.status = InterviewStatus.DISQUALIFIED.value
    await db.commit()
    return True


async def complete_if_time_exceeded(session: InterviewSession, db: AsyncSession) -> bool:
    """
    If the session has a deadline (start_time + interview.duration, set once at
    /start) and it has passed, transition the session to COMPLETED — running out
    of time is expected, not misconduct, so this is a normal completion (with the
    usual final-grading dispatch), never a disqualification.

    Returns True iff a transition happened. Callers in non-mutation paths (e.g.
    the heartbeat endpoint itself) should treat the session as terminal afterwards.
    """
    if session.status in TERMINAL_STATUSES:
        return False
    if session.deadline is None or datetime.utcnow() < session.deadline:
        return False

    # Re-check under the row lock: see disqualify_if_stale for why (a concurrent
    # transition — dsa/finish, disqualification — must not be clobbered).
    locked = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    session = locked.scalar_one()
    if session.status in TERMINAL_STATUSES:
        return False
    if session.deadline is None or datetime.utcnow() < session.deadline:
        return False

    logger.info(
        "Time-limit completing session %d (deadline=%s)",
        session.id,
        session.deadline,
    )
    session.status = InterviewStatus.COMPLETED.value
    session.end_time = datetime.utcnow()
    await db.commit()
    await default_worker_provider().grade_session_task(session.id)
    return True


async def assert_session_alive(session: InterviewSession, db: AsyncSession) -> None:
    """
    Gate for mutation endpoints (answer, dsa/run, dsa/submit, etc.). Checks the
    time limit first (running out of time always wins, regardless of how
    recently the candidate was active), then the stale-heartbeat check, then
    raises ForbiddenError if the session is terminal.
    """
    await complete_if_time_exceeded(session, db)
    await disqualify_if_stale(session, db)
    if session.status in TERMINAL_STATUSES:
        raise ForbiddenError(f"Session is {session.status} and cannot be modified")
