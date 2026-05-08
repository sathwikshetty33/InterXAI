from abc import ABC, abstractmethod
from typing import Any


class LLMProviderInterface(ABC):
    @abstractmethod
    async def generate_response(self, prompt: Any, **kwargs: Any) -> Any:
        pass
