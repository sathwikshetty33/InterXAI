import json
from statistics import fmean
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.evaluator import Evaluator
from app.ai.final_evaluator import FinalEvaluator
from app.ai.lite_llm import LiteLLMProvider
from app.ai.schema import EvaluationRequest, FinalEvaluationRequest
from app.background.taskiq.taskiq import broker
from app.database import AsyncSessionLocal
from app.logger import get_logger
from app.models.application import Application, InterviewSession
from app.models.interaction import (
    DsaInteraction,
    FollowUpQuestion,
    Interaction,
    ResumeConversation,
    ResumeQuestion,
)
from app.models.interview import CustomInterview, CustomQuestion

logger = get_logger(__name__)


async def _interaction_turns(db: AsyncSession, interaction_id: int) -> list[FollowUpQuestion]:
    """The full Q/A turn list for one interaction, oldest first."""
    result = await db.execute(
        select(FollowUpQuestion)
        .where(FollowUpQuestion.interaction_id == interaction_id)
        .order_by(FollowUpQuestion.id.asc())
    )
    return list(result.scalars().all())


async def _evaluate_interaction(
    db: AsyncSession,
    interaction: Interaction,
    custom_q: CustomQuestion,
    interview: CustomInterview,
) -> None:
    """
    Run the Evaluator over one interaction's transcript and write score/feedback
    onto the row. Does NOT commit — the caller owns the transaction, so this can
    be used both standalone and inline during final grading.
    """
    turns = await _interaction_turns(db, interaction.id)
    lines: list[str] = []
    for i, row in enumerate(turns, 1):
        lines.append(f"Q{i}: {row.question}")
        lines.append(f"A{i}: {row.answer or '<no answer>'}")

    evaluator = Evaluator(llm_provider=LiteLLMProvider())
    result = await evaluator.evaluate(
        EvaluationRequest(
            position=interview.position,
            experience=interview.experience,
            conversation_context="\n".join(lines),
            question=custom_q.question,
            expected_answer=custom_q.expected_answer or "",
        )
    )
    interaction.score = result.score
    interaction.feedback = result.feedback


async def run_grade_interaction(interaction_id: int) -> None:
    """
    Evaluate a single Interaction (a QUESTIONS-round conversation: the main
    custom question plus its follow-up turns). Stores the LLM-derived score and
    feedback onto the Interaction so the final evaluator can aggregate later.
    """
    async with AsyncSessionLocal() as db:
        interaction = await db.get(Interaction, interaction_id)
        if interaction is None:
            logger.error("Interaction %d not found", interaction_id)
            return

        custom_q = await db.get(CustomQuestion, interaction.custom_question_id)
        session = await db.get(InterviewSession, interaction.session_id)
        if custom_q is None or session is None:
            logger.error(
                "Missing CustomQuestion or InterviewSession for interaction %d", interaction_id
            )
            return

        application = await db.get(Application, session.application_id)
        interview = (
            await db.get(CustomInterview, application.interview_id)
            if application is not None
            else None
        )
        if interview is None:
            logger.error("Missing interview metadata for interaction %d", interaction_id)
            return

        await _evaluate_interaction(db, interaction, custom_q, interview)
        score = interaction.score
        await db.commit()

    logger.info("Graded interaction %d: score=%.1f", interaction_id, score or 0.0)


@broker.task
async def grade_interaction_task(interaction_id: int) -> None:
    """TaskIQ-dispatchable wrapper around run_grade_interaction."""
    await run_grade_interaction(interaction_id)


async def _grade_resume_conversations(
    db: AsyncSession, session_id: int, interview: CustomInterview
) -> list[tuple[ResumeConversation, bool]]:
    """
    Evaluate each ResumeConversation of the session — one Evaluator (LLM) call
    per conversation over its Q/A transcript vs the stored expected answers,
    persisting score/feedback onto the conversation row.

    Unanswered questions stay IN the transcript, marked as unanswered, so a
    candidate who ran out of time part-way is judged on the gaps too rather
    than only on what they managed to answer. A conversation with nothing
    answered scores 0 without spending an LLM call.

    Returns (conversation, attempted) pairs — every conversation, not just the
    graded ones, since an unattempted one still counts as a 0 slot.
    """
    conv_result = await db.execute(
        select(ResumeConversation)
        .where(ResumeConversation.session_id == session_id)
        .order_by(ResumeConversation.id.asc())
    )
    conversations = list(conv_result.scalars().all())
    graded: list[tuple[ResumeConversation, bool]] = []

    for conv in conversations:
        rq_result = await db.execute(
            select(ResumeQuestion)
            .where(ResumeQuestion.conversation_id == conv.id)
            .order_by(ResumeQuestion.id.asc())
        )
        questions = list(rq_result.scalars().all())
        attempted = any(q.answer for q in questions)

        if not attempted:
            conv.score = 0.0
            conv.feedback = "Not attempted — the candidate did not answer any resume question."
            graded.append((conv, False))
            continue

        lines: list[str] = []
        expected_lines: list[str] = []
        for i, q in enumerate(questions, 1):
            lines.append(f"Q{i}: {q.question}")
            lines.append(f"A{i}: {q.answer or '<no answer — not attempted>'}")
            expected_lines.append(f"Q{i}: {q.expected_answer or '<no reference answer>'}")

        evaluator = Evaluator(llm_provider=LiteLLMProvider())
        result = await evaluator.evaluate(
            EvaluationRequest(
                position=interview.position,
                experience=interview.experience,
                conversation_context="\n".join(lines),
                question="Resume-grounded questions",
                expected_answer="\n".join(expected_lines),
            )
        )
        conv.score = result.score
        conv.feedback = result.feedback
        graded.append((conv, True))

    return graded


async def run_grade_session(session_id: int) -> None:
    """
    Final evaluation across the entire interview session.

    The stored session score is the interview's configured weighted split:
    `dev_score` weighs the dev component (every configured custom question plus
    each resume conversation, counting equally) and `dsa_score` weighs the DSA
    component (mean over every assigned DSA question).

    ANYTHING THE CANDIDATE DIDN'T ATTEMPT SCORES 0 — a session cut short by the
    time limit doesn't get a free pass on the questions it never reached. But
    an opportunity the candidate was never GIVEN (no DSA question assigned
    because the bank had no match, no resume round configured) drops out and
    its weight redistributes; that's a config gap, not a candidate failure.

    Interactions that were answered but never graded (the deadline can end a
    session mid-conversation, before the normal advance path dispatches
    grading) are evaluated inline here, so a real answer is never discarded.

    Scores are only ever written to rows that were actually evaluated —
    unattempted work stays NULL/0 in the DB so the dashboard can tell
    "unattempted" apart from "attempted and scored badly".

    FinalEvaluator still runs over the dev-side history to produce the
    qualitative feedback / strengths / recommendation.
    """
    async with AsyncSessionLocal() as db:
        session = await db.get(InterviewSession, session_id)
        if session is None:
            logger.error("InterviewSession %d not found", session_id)
            return
        application = await db.get(Application, session.application_id)
        interview = (
            await db.get(CustomInterview, application.interview_id)
            if application is not None
            else None
        )
        if interview is None:
            logger.error("Missing interview metadata for session %d", session_id)
            return

        interactions_result = await db.execute(
            select(Interaction)
            .where(Interaction.session_id == session_id)
            .order_by(Interaction.id.asc())
        )
        interactions = list(interactions_result.scalars().all())
        by_question = {i.custom_question_id: i for i in interactions}

        # Score against the CONFIGURED questions, not the interactions that
        # exist: a never-reached question has no Interaction row and must
        # count as 0 rather than vanish from the score.
        questions_result = await db.execute(
            select(CustomQuestion)
            .where(CustomQuestion.interview_id == interview.id)
            .order_by(CustomQuestion.id.asc())
        )
        configured_questions = list(questions_result.scalars().all())

        history: list[dict[str, Any]] = []
        dev_scores: list[float] = []
        for cq in configured_questions:
            interaction = by_question.get(cq.id)
            attempted = False
            if interaction is not None:
                turns = await _interaction_turns(db, interaction.id)
                attempted = any(t.answer for t in turns)
                if attempted and interaction.score is None:
                    await _evaluate_interaction(db, interaction, cq, interview)

            score = interaction.score if (interaction and attempted) else None
            dev_scores.append(score if score is not None else 0.0)
            history.append(
                {
                    "round": "questions",
                    "main_question": cq.question,
                    "expected_answer": cq.expected_answer,
                    "attempted": attempted,
                    "individual_score": score if attempted else 0,
                    "individual_feedback": (
                        interaction.feedback
                        if (interaction and attempted)
                        else "Not attempted — the candidate did not answer this question."
                    ),
                }
            )

        graded_conversations = await _grade_resume_conversations(db, session_id, interview)
        for conv, conv_attempted in graded_conversations:
            dev_scores.append(conv.score)
            history.append(
                {
                    "round": "resume",
                    "main_question": "Resume-grounded questions (evaluated as one set)",
                    "expected_answer": None,
                    "attempted": conv_attempted,
                    "individual_score": conv.score,
                    "individual_feedback": conv.feedback,
                }
            )

        dsa_result = await db.execute(
            select(DsaInteraction).where(DsaInteraction.session_id == session_id)
        )
        # Assigned-but-unsubmitted DSA questions count as 0.
        dsa_scores = [row.score if row.score is not None else 0.0 for row in dsa_result.scalars()]

        dev_avg = fmean(dev_scores) if dev_scores else None
        dsa_avg = fmean(dsa_scores) if dsa_scores else None
        dev_weight = float(interview.dev_score or 0)
        dsa_weight = float(interview.dsa_score or 0)

        if dev_avg is not None and dsa_avg is not None and dev_weight + dsa_weight > 0:
            final_score = (dev_weight * dev_avg + dsa_weight * dsa_avg) / (dev_weight + dsa_weight)
        elif dev_avg is not None:
            final_score = dev_avg
        elif dsa_avg is not None:
            final_score = dsa_avg
        else:
            final_score = 0.0

        final = FinalEvaluator(llm_provider=LiteLLMProvider())
        result = await final.evaluate(
            FinalEvaluationRequest(
                position=interview.position,
                experience=interview.experience,
                interview_history=json.dumps(history),
            )
        )

        session.score = round(final_score, 2)
        session.feedback = result.overall_feedback
        session.strengths = result.strengths
        session.recommendation = result.recommendation
        await db.commit()

    logger.info(
        "Final-graded session %d: score=%.2f (dev=%s×%.0f%%, dsa=%s×%.0f%%) recommendation=%s",
        session_id,
        final_score,
        f"{dev_avg:.2f}" if dev_avg is not None else "n/a",
        dev_weight,
        f"{dsa_avg:.2f}" if dsa_avg is not None else "n/a",
        dsa_weight,
        result.recommendation,
    )


@broker.task
async def grade_session_task(session_id: int) -> None:
    """TaskIQ-dispatchable wrapper around run_grade_session."""
    await run_grade_session(session_id)
