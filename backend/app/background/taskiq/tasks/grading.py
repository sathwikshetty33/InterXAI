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

        turns_result = await db.execute(
            select(FollowUpQuestion)
            .where(FollowUpQuestion.interaction_id == interaction_id)
            .order_by(FollowUpQuestion.id.asc())
        )
        turns = list(turns_result.scalars().all())
        lines: list[str] = []
        for i, row in enumerate(turns, 1):
            lines.append(f"Q{i}: {row.question}")
            lines.append(f"A{i}: {row.answer or '<no answer>'}")
        conversation = "\n".join(lines)

        evaluator = Evaluator(llm_provider=LiteLLMProvider())
        result = await evaluator.evaluate(
            EvaluationRequest(
                position=interview.position,
                experience=interview.experience,
                conversation_context=conversation,
                question=custom_q.question,
                expected_answer=custom_q.expected_answer or "",
            )
        )

        interaction.score = result.score
        interaction.feedback = result.feedback
        await db.commit()

    logger.info("Graded interaction %d: score=%.1f", interaction_id, result.score)


@broker.task
async def grade_interaction_task(interaction_id: int) -> None:
    """TaskIQ-dispatchable wrapper around run_grade_interaction."""
    await run_grade_interaction(interaction_id)


async def _grade_resume_conversations(
    db: AsyncSession, session_id: int, interview: CustomInterview
) -> list[ResumeConversation]:
    """
    Evaluate each ResumeConversation of the session that has at least one
    answered question: one Evaluator (LLM) call per conversation over its full
    Q/A transcript vs the stored expected answers, persisting score/feedback
    onto the conversation row. Returns the conversations that were graded.
    """
    conv_result = await db.execute(
        select(ResumeConversation)
        .where(ResumeConversation.session_id == session_id)
        .order_by(ResumeConversation.id.asc())
    )
    conversations = list(conv_result.scalars().all())
    graded: list[ResumeConversation] = []

    for conv in conversations:
        rq_result = await db.execute(
            select(ResumeQuestion)
            .where(ResumeQuestion.conversation_id == conv.id)
            .order_by(ResumeQuestion.id.asc())
        )
        answered = [q for q in rq_result.scalars().all() if q.answer]
        if not answered:
            continue

        lines: list[str] = []
        expected_lines: list[str] = []
        for i, q in enumerate(answered, 1):
            lines.append(f"Q{i}: {q.question}")
            lines.append(f"A{i}: {q.answer}")
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
        graded.append(conv)

    return graded


async def run_grade_session(session_id: int) -> None:
    """
    Final evaluation across the entire interview session.

    The stored session score is the interview's configured weighted split:
    `dev_score` weighs the dev component (mean of the QUESTIONS-round
    interaction scores and the freshly-evaluated resume-conversation scores,
    each item counting equally) and `dsa_score` weighs the DSA component
    (mean over every assigned DSA question — unsubmitted ones count as 0).
    A component that doesn't exist for this session (no DSA questions
    assigned, no resume round) drops out and its weight redistributes.

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

        history: list[dict[str, Any]] = []
        for interaction in interactions:
            cq = await db.get(CustomQuestion, interaction.custom_question_id)
            history.append(
                {
                    "round": "questions",
                    "main_question": cq.question if cq else None,
                    "expected_answer": cq.expected_answer if cq else None,
                    "individual_score": interaction.score,
                    "individual_feedback": interaction.feedback,
                }
            )

        graded_conversations = await _grade_resume_conversations(db, session_id, interview)
        for conv in graded_conversations:
            history.append(
                {
                    "round": "resume",
                    "main_question": "Resume-grounded questions (evaluated as one set)",
                    "expected_answer": None,
                    "individual_score": conv.score,
                    "individual_feedback": conv.feedback,
                }
            )

        dsa_result = await db.execute(
            select(DsaInteraction).where(DsaInteraction.session_id == session_id)
        )
        # Assigned-but-unsubmitted questions count as 0 — the candidate chose
        # to finish the round without them.
        dsa_scores = [row.score if row.score is not None else 0.0 for row in dsa_result.scalars()]

        dev_scores = [i.score for i in interactions if i.score is not None] + [
            conv.score for conv in graded_conversations
        ]
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
