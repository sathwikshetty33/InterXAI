"""MCP server for InterXAI.

Exposes selected backend capabilities as Model Context Protocol tools. Each tool
is a thin wrapper that reuses the existing FastAPI routers and schemas, so no
business logic (validation, auth, persistence) is duplicated here.
"""
