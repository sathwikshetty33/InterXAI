from app.ai.prompts import resume_evaluator_prompt
from app.ai.schema import ResumeEvaluatorRequest, ResumeEvaluatorResponse
from app.interfaces.base_agent import BaseAgent
from app.interfaces.llm_provider import LLMProviderInterface


class ResumeEvaluator(BaseAgent[ResumeEvaluatorRequest, ResumeEvaluatorResponse]):
    def __init__(self, llm_provider: LLMProviderInterface):
        super().__init__(
            llm_provider=llm_provider,
            prompt=resume_evaluator_prompt,
            output_model=ResumeEvaluatorResponse,
        )
