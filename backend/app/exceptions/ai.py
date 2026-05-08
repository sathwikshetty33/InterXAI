class AIError(Exception):
    def __init__(self, detail: str = "An error occurred during AI generation"):
        self.detail = detail
        super().__init__(self.detail)


class AITimeoutError(AIError):
    def __init__(self, detail: str = "AI generation request timed out"):
        super().__init__(detail)


class AIRateLimitError(AIError):
    def __init__(self, detail: str = "AI provider rate limit exceeded"):
        super().__init__(detail)


class AIAuthenticationError(AIError):
    def __init__(self, detail: str = "AI provider authentication failed"):
        super().__init__(detail)


class AIContextWindowError(AIError):
    def __init__(self, detail: str = "Context window exceeded"):
        super().__init__(detail)


class AIProviderError(AIError):
    def __init__(self, detail: str = "AI provider API error"):
        super().__init__(detail)
