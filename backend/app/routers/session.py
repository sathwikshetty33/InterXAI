from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.follow_up_decider import FollowUpDecider
from app.ai.lite_llm import LiteLLMProvider
from app.ai.schema import FollowUpDeciderRequest
from app.background.taskiq.tasks.dsa_execution import run_evaluate_submission
from app.config import settings
from app.database import get_db
from app.exceptions.common import BadRequestError, ForbiddenError, NotFoundError
from app.interfaces.vision import VisionError
from app.logger import get_logger
from app.models.application import CurrentRound, InterviewSession, InterviewStatus
from app.models.dsa_question import DsaQuestion
from app.models.interaction import DsaInteraction, FollowUpQuestion, Interaction
from app.models.interview import CustomQuestion
from app.models.proctoring import ViolationType
from app.models.user import User
from app.schemas.session import (
    AnswerRequest,
    CustomQuestionPayload,
    DsaRoundQuestion,
    DsaRoundResponse,
    DsaRunRequest,
    DsaRunResponse,
    DsaSubmitRequest,
    DsaSubmitResponse,
    DsaTestCaseStatus,
    DsaTestRequest,
    DsaTestResponse,
    FrameRequest,
    FrameResponse,
    HeartbeatResponse,
    InterviewStateResponse,
    ResumeQuestionPayload,
)
from app.utils.authorization import get_current_user
from app.utils.default_providers import default_worker_provider
from app.utils.interview_flow import (
    MAX_FOLLOWUPS,
    conversation_context,
    current_resume_question,
    dsa_interaction_by_id,
    followups_used,
    interview_metadata,
    latest_interaction,
    mark_session_completed,
    next_custom_question,
    next_resume_question,
    open_follow_up,
    session_dsa_interactions,
    transition_to_dsa,
    transition_to_resume,
)
from app.utils.piston_client import PistonClient
from app.utils.session_lifecycle import (
    TERMINAL_STATUSES,
    assert_session_alive,
    complete_if_time_exceeded,
    disqualify_if_stale,
)
from app.utils.vision_client import VisionClient

logger = get_logger(__name__)

router: APIRouter = APIRouter(prefix="/sessions", tags=["sessions"])


async def _load_owned_session(session_id: int, user: User, db: AsyncSession) -> InterviewSession:
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.application))
        .where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Session not found")
    if session.application is None or session.application.user_id != user.id:
        raise ForbiddenError("You cannot access this resource")
    return session


@router.post("/{session_id}/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HeartbeatResponse:
    """
    Liveness ping from the candidate's frontend. Updates last_heartbeat_at on the
    session. If IMMEDIATE_DISQUALIFICATION is enabled and the previous heartbeat
    is older than HEARTBEAT_THRESHOLD_S, the session is marked disqualified
    instead and the terminal status is returned.

    A terminal status in the response is the signal for the frontend to stop
    pinging and route the candidate to the "interview ended" screen.
    """
    session = await _load_owned_session(session_id, user, db)

    if session.status in TERMINAL_STATUSES:
        return HeartbeatResponse(status=session.status, deadline=session.deadline)

    if await complete_if_time_exceeded(session, db):
        return HeartbeatResponse(status=session.status, deadline=session.deadline)

    if await disqualify_if_stale(session, db):
        return HeartbeatResponse(status=session.status, deadline=session.deadline)

    session.last_heartbeat_at = datetime.utcnow()
    await db.commit()
    return HeartbeatResponse(status=session.status, deadline=session.deadline)


def _classify_violation(face_count: int) -> ViolationType | None:
    if face_count == 1:
        return None
    return ViolationType.MULTIPLE_FACES if face_count > 1 else ViolationType.NO_FACE


@router.post("/{session_id}/frame", response_model=FrameResponse)
async def proctor_frame(
    session_id: int,
    payload: FrameRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FrameResponse:
    """
    Proctoring frame-beat. The client periodically posts a webcam frame; the
    vision service counts faces, and a violation (0 or >1 faces) increments the
    session's violation_count — escalating to CHEATED at
    PROCTOR_VIOLATION_THRESHOLD. Doubles as camera liveness (refreshes
    last_heartbeat_at). A terminal status tells the client to stop and route to
    the "interview ended" screen.
    """
    session = await _load_owned_session(session_id, user, db)
    threshold = settings.PROCTOR_VIOLATION_THRESHOLD

    def _resp(violation: str | None = None) -> FrameResponse:
        return FrameResponse(
            status=session.status,
            violation=violation,
            violation_count=session.violation_count,
            threshold=threshold,
            deadline=session.deadline,
        )

    if session.status in TERMINAL_STATUSES:
        return _resp()

    # A flaky or unreachable vision service must never punish the candidate:
    # treat a failed check as a clean frame.
    try:
        result = await VisionClient().detect([payload.frame])
    except VisionError:
        logger.warning("Vision check failed for session %d; treating frame as clean", session_id)
        session.last_heartbeat_at = datetime.utcnow()
        await db.commit()
        return _resp()

    violation = _classify_violation(result.face_count)
    if violation is None:
        session.last_heartbeat_at = datetime.utcnow()
        await db.commit()
        return _resp()

    # Lock the row so concurrent violation beats can't lose an increment or
    # double-escalate past the threshold.
    locked = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    session = locked.scalar_one()
    if session.status in TERMINAL_STATUSES:
        return _resp(violation.value)

    session.violation_count += 1
    session.last_heartbeat_at = datetime.utcnow()
    if session.violation_count >= threshold:
        session.status = InterviewStatus.CHEATED.value
        logger.info(
            "Session %d marked CHEATED after %d violations", session_id, session.violation_count
        )
    await db.commit()

    # Persist the evidence frame off the request path.
    await default_worker_provider().upload_violation_image_task(
        session_id, payload.frame, violation.value
    )
    return _resp(violation.value)


async def _handle_questions_answer(
    session: InterviewSession, answer_text: str, db: AsyncSession
) -> InterviewStateResponse:
    """
    QUESTIONS-round answer handler. Persists the candidate's answer onto the
    currently-open FollowUpQuestion turn, decides whether to ask another follow-up
    (capped at MAX_FOLLOWUPS), and otherwise advances to the next CustomQuestion
    or transitions the session into the DSA round.
    """
    interaction = await latest_interaction(session.id, db)
    if interaction is None:
        raise BadRequestError("Session has no active interaction")

    pending = await open_follow_up(interaction.id, db)
    if pending is None:
        raise BadRequestError("No pending question to answer for this session")

    pending.answer = answer_text
    await db.commit()

    used = await followups_used(interaction.id, db)
    custom_q = await db.get(CustomQuestion, interaction.custom_question_id)

    if used < MAX_FOLLOWUPS and custom_q is not None:
        interview = await interview_metadata(session, db)
        ctx = await conversation_context(interaction.id, db)
        decider = FollowUpDecider(llm_provider=LiteLLMProvider())
        decision = await decider.evaluate(
            FollowUpDeciderRequest(
                position=interview.position,
                experience=interview.experience,
                conversation_context=ctx,
                expected_answer=custom_q.expected_answer or "",
            )
        )
        if decision.needs_followup and decision.followup_question:
            db.add(
                FollowUpQuestion(
                    interaction_id=interaction.id,
                    question=decision.followup_question,
                    answer=None,
                )
            )
            await db.commit()
            return InterviewStateResponse(
                session_id=session.id,
                round=session.current_round,
                completed=False,
                question=CustomQuestionPayload(
                    interaction_id=interaction.id,
                    question=decision.followup_question,
                ),
                deadline=session.deadline,
            )

    # No follow-up needed (or cap hit). The conversation around this Interaction
    # is complete — fire off LLM grading in the background, then advance.
    if custom_q is None:
        raise BadRequestError("Interaction references a missing CustomQuestion")

    await default_worker_provider().grade_interaction_task(interaction.id)

    upcoming = await next_custom_question(custom_q.interview_id, custom_q.id, db)
    if upcoming is not None:
        session.current_question_index += 1
        new_interaction = Interaction(
            session_id=session.id,
            custom_question_id=upcoming.id,
        )
        db.add(new_interaction)
        await db.flush()
        db.add(
            FollowUpQuestion(
                interaction_id=new_interaction.id,
                question=upcoming.question,
                answer=None,
            )
        )
        await db.commit()
        return InterviewStateResponse(
            session_id=session.id,
            round=session.current_round,
            completed=False,
            question=CustomQuestionPayload(
                interaction_id=new_interaction.id,
                question=upcoming.question,
            ),
            deadline=session.deadline,
        )

    # Custom questions exhausted -> hand off to the DSA round.
    return await transition_to_dsa(session, db)


@router.post("/{session_id}/answer", response_model=InterviewStateResponse)
async def answer(
    session_id: int,
    body: AnswerRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewStateResponse:
    """
    Submit an answer to the currently-served question. Handles the follow-up
    loop for the QUESTIONS round and transitions to the DSA round when those
    questions are exhausted. DSA submissions go through /dsa/submit instead.
    """
    session = await _load_owned_session(session_id, user, db)
    await assert_session_alive(session, db)

    if session.current_round == CurrentRound.QUESTIONS.value:
        return await _handle_questions_answer(session, body.answer, db)

    if session.current_round == CurrentRound.DSA.value:
        raise BadRequestError("DSA submissions must be sent to /dsa/submit, not /answer")

    if session.current_round == CurrentRound.RESUME.value:
        return await _handle_resume_answer(session, body.answer, db)

    raise BadRequestError(f"Unknown round: {session.current_round}")


async def _handle_resume_answer(
    session: InterviewSession, answer_text: str, db: AsyncSession
) -> InterviewStateResponse:
    """
    RESUME-round answer handler. Linear flow (no follow-ups): persist the
    candidate's response onto the current ResumeQuestion, advance to the next
    one, or mark the session COMPLETED when the resume questions are exhausted.
    """
    current = await current_resume_question(session, db)
    if current is None:
        raise BadRequestError("No active resume question for this session")

    current.answer = answer_text
    await db.flush()

    upcoming = await next_resume_question(current.conversation_id, current.id, db)
    if upcoming is None:
        return await mark_session_completed(session, db)

    session.current_question_index += 1
    await db.commit()

    return InterviewStateResponse(
        session_id=session.id,
        round=session.current_round,
        completed=False,
        question=ResumeQuestionPayload(
            question_id=upcoming.id,
            question=upcoming.question,
        ),
        deadline=session.deadline,
    )


async def _load_dsa_context(
    session_id: int, interaction_id: int, user: User, db: AsyncSession
) -> tuple[InterviewSession, DsaInteraction, DsaQuestion]:
    """
    Shared guard for the DSA run/test/submit endpoints: ownership, liveness,
    round check, then resolve the interaction the CLIENT named. Keying every
    DSA operation on an explicit interaction_id (instead of a server-side
    cursor) is what makes these endpoints safe to retry.
    """
    session = await _load_owned_session(session_id, user, db)
    await assert_session_alive(session, db)

    if session.current_round != CurrentRound.DSA.value:
        raise BadRequestError(
            f"DSA endpoints are only valid during the DSA round (current: {session.current_round})"
        )

    interaction, question = await dsa_interaction_by_id(session_id, interaction_id, db)
    return session, interaction, question


@router.get("/{session_id}/dsa", response_model=DsaRoundResponse)
async def dsa_round(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DsaRoundResponse:
    """
    The full DSA round: every assigned question plus the candidate's own
    submission state (attempts, score, cases passed). Serves both the round
    overview and rehydration after a page refresh.

    status="preparing" means the assignment task hasn't finished yet — poll
    again (we re-dispatch the idempotent task on each such poll, so a lost
    dispatch self-heals). status="ready" with an empty questions list means
    assignment finished but the question bank had no match for any topic:
    nothing more is coming and the candidate should POST /dsa/finish.
    """
    session = await _load_owned_session(session_id, user, db)
    await assert_session_alive(session, db)

    if session.current_round != CurrentRound.DSA.value:
        raise BadRequestError(
            f"The DSA overview is only valid during the DSA round "
            f"(current: {session.current_round})"
        )

    pairs = await session_dsa_interactions(session_id, db)
    if pairs or session.dsa_assigned_at is not None:
        round_status: Literal["preparing", "ready"] = "ready"
    else:
        round_status = "preparing"
        await default_worker_provider().assign_dsa_questions_task(session_id)

    return DsaRoundResponse(
        session_id=session.id,
        status=round_status,
        questions=[
            DsaRoundQuestion(
                interaction_id=interaction.id,
                problem_name=question.problem_name,
                description=question.description,
                sample_test_cases=question.sample_test_cases,
                time_limit_ms=question.time_limit_ms,
                attempts=interaction.attempts,
                score=interaction.score,
                passed_cases=interaction.passed_cases,
                total_cases=interaction.total_cases,
            )
            for interaction, question in pairs
        ],
    )


@router.post("/{session_id}/dsa/run", response_model=DsaRunResponse)
async def dsa_run(
    session_id: int,
    body: DsaRunRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DsaRunResponse:
    """
    Free-form code execution for the candidate during the DSA round. Runs the
    submitted source against the provided stdin (custom input or sample input
    chosen by the frontend) and returns stdout/stderr/exit_code.

    This endpoint does NOT touch the DsaInteraction — it's the candidate's
    scratchpad. The interaction_id only supplies the question's time limit.
    """
    _, _, question = await _load_dsa_context(session_id, body.interaction_id, user, db)

    client = PistonClient()
    result = await client.execute(
        source_code=body.source_code,
        language=body.language,
        stdin=body.stdin,
        run_timeout_ms=question.time_limit_ms,
    )
    return DsaRunResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.exit_code,
    )


@router.post("/{session_id}/dsa/test", response_model=DsaTestResponse)
async def dsa_test(
    session_id: int,
    body: DsaTestRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DsaTestResponse:
    """
    Dry-run the candidate's code against the named question's HIDDEN test
    cases. Like /dsa/submit, the response carries only per-case status and
    counts — never the cases' inputs or outputs. Does NOT update the
    DsaInteraction; code and score are only persisted on /dsa/submit.
    """
    _, _, question = await _load_dsa_context(session_id, body.interaction_id, user, db)

    cases: list[dict[str, str]] = question.test_cases or []
    client = PistonClient()
    results: list[DsaTestCaseStatus] = []

    for idx, case in enumerate(cases, 1):
        stdin = case.get("stdin", "")
        expected = (case.get("expected_stdout") or "").strip()

        run = await client.execute(
            source_code=body.source_code,
            language=body.language,
            stdin=stdin,
            run_timeout_ms=question.time_limit_ms,
        )
        if run.exit_code != 0:
            results.append(DsaTestCaseStatus(case=idx, status="error"))
            continue
        results.append(
            DsaTestCaseStatus(
                case=idx,
                status="passed" if run.stdout.strip() == expected else "failed",
            )
        )

    passed = sum(1 for r in results if r.status == "passed")
    return DsaTestResponse(case_results=results, passed=passed, total=len(results))


@router.post("/{session_id}/dsa/submit", response_model=DsaSubmitResponse)
async def dsa_submit(
    session_id: int,
    body: DsaSubmitRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DsaSubmitResponse:
    """
    Grade a submission for the named DSA question: run the code against every
    hidden test case and persist code/language/score onto the DsaInteraction.

    Resubmission is allowed and the LAST SUBMITTED code wins — each recorded
    submit overwrites the stored solution wholesale, ordered by the time the
    request arrived (not by how long grading took). Submitting never advances
    the session; the candidate leaves the round explicitly via POST
    /dsa/finish. A duplicate or retried submit therefore just re-grades the
    same question. recorded=false means this run's result was not stored
    (the session left the DSA round mid-grade, or a newer submission
    superseded this one).
    """
    submitted_at = datetime.utcnow()
    await _load_dsa_context(session_id, body.interaction_id, user, db)

    # Grades + commits in its own session under row locks; the summary describes
    # THIS run, so the response never mixes results from concurrent attempts.
    summary = await run_evaluate_submission(
        body.interaction_id, body.source_code, body.language, submitted_at
    )
    if not summary:
        raise BadRequestError("This DSA question is no longer available")

    return DsaSubmitResponse(
        case_results=[DsaTestCaseStatus(**c) for c in summary["case_results"]],
        passed=summary["passed"],
        total=summary["total"],
        score=summary["score"],
        attempts=summary["attempts"],
        recorded=summary["recorded"],
    )


@router.post("/{session_id}/dsa/finish", response_model=InterviewStateResponse)
async def dsa_finish(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewStateResponse:
    """
    Explicitly leave the DSA round — on to the RESUME round, or straight to
    COMPLETED when the interview asks no resume questions.

    Idempotent: repeating the call after the transition returns the current
    state instead of erroring, so a retried request can never double-advance
    the session.
    """
    session = await _load_owned_session(session_id, user, db)

    # Lock the session row so concurrent finishes serialize: a duplicate blocks
    # here, then sees the committed transition and replays — so the transition
    # (and its final-grading dispatch) happens exactly once.
    locked = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    session = locked.scalar_one()

    # Replay after a finish that completed the session (no resume round).
    if session.status == InterviewStatus.COMPLETED.value:
        return InterviewStateResponse(
            session_id=session.id,
            round=session.current_round,
            completed=True,
            question=None,
            deadline=session.deadline,
        )

    await assert_session_alive(session, db)

    # Replay after a finish that moved us into the resume round.
    if session.current_round == CurrentRound.RESUME.value:
        current = await current_resume_question(session, db)
        if current is None:
            raise BadRequestError("No active resume question for this session")
        return InterviewStateResponse(
            session_id=session.id,
            round=session.current_round,
            completed=False,
            question=ResumeQuestionPayload(
                question_id=current.id,
                question=current.question,
            ),
            deadline=session.deadline,
        )

    if session.current_round != CurrentRound.DSA.value:
        raise BadRequestError(
            f"/dsa/finish is only valid during the DSA round (current: {session.current_round})"
        )

    return await transition_to_resume(session, db)
