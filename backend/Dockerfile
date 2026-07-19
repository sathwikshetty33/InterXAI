FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./

# Install EXACTLY the locked dependency set into the system interpreter.
# UV_PROJECT_ENVIRONMENT keeps packages out of /app, which docker-compose
# bind-mounts over; a fresh `uv pip install -r pyproject.toml` re-resolves
# and drifts (that's how an untested redis major once landed in the image).
ENV UV_PROJECT_ENVIRONMENT=/usr/local
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
