from typing import Any, cast

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts.base import BasePromptTemplate
from pydantic import BaseModel

from app.interfaces.llm_provider import LLMProviderInterface


class BaseAgent[T_in: BaseModel, T_out: BaseModel]:
    def __init__(
        self,
        llm_provider: LLMProviderInterface,
        prompt: BasePromptTemplate[Any],
        output_model: type[T_out],
    ) -> None:
        self.llm_provider = llm_provider
        self.output_parser = JsonOutputParser(pydantic_object=output_model)
        self.output_model = output_model
        self.prompt = prompt

    async def evaluate(self, req: T_in) -> T_out:
        result: Any = await self.llm_provider.generate_response(
            prompt=self.prompt,
            variables=req.model_dump(),
            output_parser=self.output_parser,
        )

        if isinstance(result, dict):
            return self.output_model(**result)

        return cast(T_out, result)
