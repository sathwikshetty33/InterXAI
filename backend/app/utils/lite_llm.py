from typing import Any

import litellm.exceptions as lite_exc
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.prompts.base import BasePromptTemplate
from langchain_litellm import ChatLiteLLM

from app.config import settings
from app.exceptions.ai import (
    AIAuthenticationError,
    AIContextWindowError,
    AIError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.interfaces.llm_provider import LLMProviderInterface
from app.logger import get_logger

logger = get_logger(__name__)


class LiteLLMProvider(LLMProviderInterface):
    def __init__(
        self, model_name: str = settings.LLM_MODEL_NAME, api_key: str = settings.GROQ_API_KEY
    ):
        self.client = ChatLiteLLM(model=model_name, api_key=api_key)

    def generate_response(  # type: ignore[override]
        self,
        prompt: BasePromptTemplate[Any],
        variables: dict[str, Any],
        output_parser: BaseOutputParser[Any],
    ) -> Any:
        try:
            chain = prompt | self.client | output_parser

            if hasattr(output_parser, "get_format_instructions"):
                variables["format_instructions"] = output_parser.get_format_instructions()

            return chain.invoke(variables)
        except lite_exc.Timeout as e:
            logger.error("LLM Timeout: %s", str(e))
            raise AITimeoutError(f"Generation timed out: {str(e)}") from e
        except lite_exc.RateLimitError as e:
            logger.error("LLM Rate Limit Exceeded: %s", str(e))
            raise AIRateLimitError(f"Rate limit exceeded: {str(e)}") from e
        except lite_exc.AuthenticationError as e:
            logger.error("LLM Authentication Failed: %s", str(e))
            raise AIAuthenticationError(f"Authentication failed: {str(e)}") from e
        except lite_exc.ContextWindowExceededError as e:
            logger.error("LLM Context Window Exceeded: %s", str(e))
            raise AIContextWindowError(f"Context window exceeded: {str(e)}") from e
        except lite_exc.APIError as e:
            logger.error("LLM API Error: %s", str(e))
            raise AIProviderError(f"Provider API error: {str(e)}") from e
        except Exception as e:
            logger.error("Error generating LLM response: %s", str(e), exc_info=True)
            raise AIError(f"Unexpected generation error: {str(e)}") from e
