from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.background.taskiq.taskiq import broker
from app.database import AsyncSessionLocal
from app.logger import get_logger
from app.models.application import Application, CurrentRound, InterviewSession, InterviewStatus
from app.models.dsa_question import DsaQuestion
from app.models.interaction import DsaInteraction
from app.models.interview import CustomInterview
from app.utils.piston_client import PistonClient

logger = get_logger(__name__)


# ── Job 1: Assign DSA questions to an interview session ──────────────────────


async def run_assign_dsa_questions(session_id: int) -> list[int]:
    """
    For each DsaTopic in the session's interview, pick a matching DsaQuestion
    from the DB and create a DsaInteraction with blank code/score.

    Idempotent AND safe under concurrent re-dispatch: the session row is
    locked FOR UPDATE for the whole run, so overlapping executions (the /start
    dispatch plus GET /sessions/{id}/dsa re-dispatching while the round looks
    unassigned) serialize, and the later one sees the earlier one's rows and
    skips them; a (session_id, topic_id) unique constraint backstops this at
    the DB. When done it stamps session.dsa_assigned_at — even if zero
    questions matched — so the round endpoint can distinguish "assignment
    pending" from "nothing will arrive". Runs after the session left the
    questions/DSA rounds (or ended) assign nothing.

    Returns list of the session's DsaInteraction IDs.
    """
    logger.info("Assigning DSA questions for session=%d", session_id)

    async with AsyncSessionLocal() as db:
        # session → application → interview (with dsa_topics)
        locked = await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id).with_for_update()
        )
        session = locked.scalar_one_or_none()
        if not session:
            logger.error("InterviewSession %d not found", session_id)
            return []

        if session.status != InterviewStatus.ONGOING.value or session.current_round not in (
            CurrentRound.QUESTIONS.value,
            CurrentRound.DSA.value,
        ):
            logger.warning(
                "Session %d is %s/%s — skipping DSA assignment",
                session_id,
                session.status,
                session.current_round,
            )
            return []

        app = await db.get(Application, session.application_id)
        if not app:
            logger.error("Application %d not found", session.application_id)
            return []

        result = await db.execute(
            select(CustomInterview)
            .options(selectinload(CustomInterview.dsa_topics))
            .where(CustomInterview.id == app.interview_id)
        )
        interview = result.scalar_one_or_none()
        if not interview:
            logger.error("Interview %d not found", app.interview_id)
            return []

        assigned_result = await db.execute(
            select(DsaInteraction.topic_id).where(DsaInteraction.session_id == session_id)
        )
        already_assigned = {row for row in assigned_result.scalars().all() if row is not None}

        for topic in interview.dsa_topics:
            if topic.id in already_assigned:
                continue

            q_result = await db.execute(
                select(DsaQuestion)
                .where(
                    DsaQuestion.topic == topic.topic,
                    DsaQuestion.difficulty == topic.difficulty,
                )
                .order_by(DsaQuestion.times_served.asc())
                .limit(1)
            )
            question = q_result.scalar_one_or_none()

            if not question:
                logger.warning(
                    "No DsaQuestion found for topic=%s difficulty=%s — skipping",
                    topic.topic,
                    topic.difficulty,
                )
                continue

            interaction = DsaInteraction(
                session_id=session_id,
                topic_id=topic.id,
                question_id=question.id,
            )
            db.add(interaction)
            # Atomic increment: assigns for OTHER sessions can pick the same
            # question concurrently; a Python += would lose counts.
            await db.execute(
                update(DsaQuestion)
                .where(DsaQuestion.id == question.id)
                .values(times_served=DsaQuestion.times_served + 1)
            )

        if session.dsa_assigned_at is None:
            session.dsa_assigned_at = datetime.utcnow()

        await db.commit()

        # Fetch the created interaction IDs
        id_result = await db.execute(
            select(DsaInteraction.id).where(DsaInteraction.session_id == session_id)
        )
        created_ids = list(id_result.scalars().all())

    logger.info("Assigned %d DSA questions for session %d", len(created_ids), session_id)
    return created_ids


@broker.task
async def assign_dsa_questions_task(session_id: int) -> list[int]:
    return await run_assign_dsa_questions(session_id)


# ── Job 2: Run code (simple execution, no DB) ────────────────────────────────


async def run_code(
    source_code: str, language: str, stdin: str = "", run_timeout_ms: int | None = None
) -> dict[str, Any]:
    """
    Execute code via Piston and return stdout/stderr/exit_code.
    """
    client = PistonClient()
    result = await client.execute(
        source_code=source_code,
        language=language,
        stdin=stdin,
        run_timeout_ms=run_timeout_ms,
    )
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exit_code": result.exit_code,
    }


@broker.task
async def run_code_task(
    source_code: str, language: str, stdin: str = "", run_timeout_ms: int | None = None
) -> dict[str, Any]:
    return await run_code(source_code, language, stdin, run_timeout_ms)


# ── Job 3: Evaluate DSA submission ───────────────────────────────────────────


async def run_evaluate_submission(
    dsa_interaction_id: int,
    source_code: str,
    language: str,
    submitted_at: datetime | None = None,
) -> dict[str, Any]:
    """
    Run candidate code INDEPENDENTLY against each entry in question.test_cases.
    Each test case is one Piston invocation; a crash on one case does not affect
    the others. Per-case time limit comes from question.time_limit_ms.

    Resubmission is allowed and the last SUBMITTED code wins: the final write
    happens under a row lock, `attempts` counts every recorded grading run, and
    `submitted_at` (captured when the HTTP request arrived) orders overlapping
    runs so a slow-grading older submission cannot overwrite a newer one.
    Nothing is stored — and the summary says recorded=False — if the session
    left the DSA round (finish / disqualification) while grading was in
    flight, or if a newer submission superseded this one (the superseded run
    still counts an attempt).

    Per-case results carry status only, never the hidden case's
    stdin/expected/actual (candidates can resubmit, so echoing outputs would
    leak the hidden test cases).

    Returns a summary of THIS grading run:
        {"case_results": [{"case": 1, "status": "passed"|"failed"|"error"}, ...],
         "passed": int, "total": int, "score": float,
         "attempts": int, "recorded": bool}
    """
    logger.info("Evaluating submission for dsa_interaction=%d", dsa_interaction_id)

    async with AsyncSessionLocal() as db:
        interaction = await db.get(DsaInteraction, dsa_interaction_id)
        if not interaction:
            logger.error("DsaInteraction %d not found", dsa_interaction_id)
            return {}

        question = await db.get(DsaQuestion, interaction.question_id)
        if not question:
            logger.error("DsaQuestion not found for interaction %d", dsa_interaction_id)
            return {}

        cases: list[dict[str, Any]] = question.test_cases or []
        client = PistonClient()
        case_results: list[dict[str, Any]] = []

        for idx, case in enumerate(cases, 1):
            stdin = case.get("stdin", "")
            expected = case.get("expected_stdout", "").strip()

            result = await client.execute(
                source_code=source_code,
                language=language,
                stdin=stdin,
                run_timeout_ms=question.time_limit_ms,
            )

            if result.exit_code != 0:
                case_results.append({"case": idx, "status": "error"})
                continue

            case_results.append(
                {
                    "case": idx,
                    "status": "passed" if result.stdout.strip() == expected else "failed",
                }
            )

        passed = sum(1 for c in case_results if c["status"] == "passed")
        total = len(case_results)
        score = (passed / total) * 10.0 if total > 0 else 0.0

        # Re-read session then interaction under row locks (consistent order to
        # avoid deadlocks) so concurrent grading / finish / disqualification
        # serialize; populate_existing forces fresh state past the identity map.
        locked_session = (
            (
                await db.execute(
                    select(InterviewSession)
                    .where(InterviewSession.id == interaction.session_id)
                    .with_for_update()
                    .execution_options(populate_existing=True)
                )
            ).scalar_one_or_none()
            if interaction.session_id is not None
            else None
        )
        if (
            locked_session is None
            or locked_session.status != InterviewStatus.ONGOING.value
            or locked_session.current_round != CurrentRound.DSA.value
        ):
            logger.warning(
                "Session left the DSA round while grading interaction %d — result not recorded",
                dsa_interaction_id,
            )
            # interaction was read before the Piston loop; re-read the counter
            # so the response matches what GET /sessions/{id}/dsa shows.
            fresh_attempts = (
                await db.execute(
                    select(DsaInteraction.attempts).where(DsaInteraction.id == dsa_interaction_id)
                )
            ).scalar_one()
            return {
                "case_results": case_results,
                "passed": passed,
                "total": total,
                "score": score,
                "attempts": fresh_attempts,
                "recorded": False,
            }

        locked = await db.execute(
            select(DsaInteraction)
            .where(DsaInteraction.id == dsa_interaction_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        interaction = locked.scalar_one()

        interaction.attempts = interaction.attempts + 1
        attempts = interaction.attempts

        # Last SUBMITTED wins: an overlapping run for an older submission may
        # finish grading later — count its attempt but keep the newer solution.
        is_latest = (
            submitted_at is None
            or interaction.last_submitted_at is None
            or submitted_at >= interaction.last_submitted_at
        )
        if is_latest:
            interaction.code = source_code
            interaction.language = language
            interaction.score = score
            interaction.passed_cases = passed
            interaction.total_cases = total
            if submitted_at is not None:
                interaction.last_submitted_at = submitted_at

        await db.commit()

        logger.info(
            "Submission evaluated: %d/%d passed (score=%.1f) for interaction %d "
            "(attempt %d, stored=%s)",
            passed,
            total,
            score,
            dsa_interaction_id,
            attempts,
            is_latest,
        )

    return {
        "case_results": case_results,
        "passed": passed,
        "total": total,
        "score": score,
        "attempts": attempts,
        "recorded": is_latest,
    }


@broker.task
async def evaluate_submission_task(
    dsa_interaction_id: int,
    source_code: str,
    language: str,
    submitted_at_iso: str | None = None,
) -> dict[str, Any]:
    # ISO string rather than datetime so the argument survives JSON transport;
    # omitting it would bypass last-submitted-wins ordering.
    submitted_at = datetime.fromisoformat(submitted_at_iso) if submitted_at_iso else None
    return await run_evaluate_submission(dsa_interaction_id, source_code, language, submitted_at)
