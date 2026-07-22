# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

InterXAI — an AI interview automation platform. Organizations create interviews (custom Q&A + DSA coding topics), candidates apply with a resume PDF that an LLM scores/shortlists, shortlisted candidates take a three-round AI-conducted interview (custom questions with LLM follow-ups → DSA coding in a Piston sandbox → resume-grounded questions), and orgs review a ranked leaderboard with full transcripts.

## Commands

Backend (from `backend/`, uses `uv`):

```bash
uv sync --dev                          # install deps
uv run alembic upgrade head            # apply migrations
uv run alembic revision --autogenerate -m "..."   # new migration after model changes
uv run uvicorn app.main:app --reload   # API server on :8000

# TaskIQ worker — the discovery flags are REQUIRED; without --fs-discover the
# worker imports zero task modules and every dispatched task fails "task not found"
uv run taskiq worker app.background.taskiq.taskiq:broker --fs-discover --tasks-pattern "app/background/taskiq/tasks/*.py"
```

Lint/type-check (CI enforces all of these on PRs touching `backend/`):

```bash
tools/backend_lint          # from REPO ROOT (not backend/) — ruff check --fix + ruff format + mypy
tools/backend_lint --only=ruff   # or --only=mypy
# CI runs the non-fixing variants: ruff check . && ruff format --check . && mypy .
```

Frontend (from `frontend/`):

```bash
npm run dev      # Vite dev server on :5173
npm run build    # tsc -b && vite build
npm run lint     # eslint; CI also runs: npx prettier --check "src/**/*.{ts,tsx,css}" && npx tsc --noEmit
```

Docker: `docker-compose up --build` → api :8000, frontend :8080, piston :2000, redis :6379, plus the taskiq worker. `env_file` is `backend/.env` (note: `.env.example` is incomplete — `REDIS_URL`, `GROQ_API_KEY`, `SUPABASE_*`, `LLM_MODEL_NAME` are documented only in the README table).

There is no test suite (no pytest anywhere); verification is lint + mypy strict + manual/API-level testing.

## Architecture

### Backend (`backend/app/`)

Ports-and-adapters: abstract interfaces in `interfaces/`, concrete implementations in `utils/`, selected by string settings through factory functions in `utils/default_providers.py` (`STORAGE_PROVIDER="supabase"`, `BACKGROUND_WORKER="taskiq"`, `EMAIL_PROVIDER="smtp"` — each factory supports exactly one value). Auth (`JwtAuth` in `utils/jwt_auth.py`) is the exception: imported directly, not via factory. `app/background/celery/` is dead legacy code — nothing references it; TaskIQ is the only wired worker.

Business logic lives inline in routers — there is no service layer. New env vars must be declared in `app/config.py` (pydantic-settings). `mypy --strict` must pass; line length 100 (ruff).

**Product lifecycle across routers:** `organization.py`/`user.py` (signup/login; JWT via password or Google OIDC — OIDC returns the token to the SPA in the URL fragment) → `interview.py` (org creates interview: nested questions + DSA topics; `dsa_score + dev_score` must equal 100; also hosts `POST /interviews/{id}/start`) → `application.py` (resume PDF upload → background task extracts/scores/sets `shortlisting_decision`) → `session.py` (the live interview) → `leaderboard.py` (org-only results, eager-loads the whole session graph).

**Interview session state machine:** `InterviewSession.status` (scheduled/ongoing/completed/cancelled/cheated/disqualified) + `current_round` (questions → dsa → resume) + 1-based `current_question_index` (questions/resume rounds only). Round transitions and question cursors live in `utils/interview_flow.py`; heartbeat-based disqualification in `utils/session_lifecycle.py` (every mutating session endpoint calls `assert_session_alive` first). `POST /interviews/{id}/start` pre-generates the later rounds via background tasks (`assign_dsa_questions_task`, `generate_resume_questions_task`). The questions/resume rounds are linear one-question-at-a-time flows returning the shared `InterviewStateResponse` envelope (`schemas/session.py`, discriminated union of custom/resume payloads; `question` is null while `round=="dsa"`). The DSA round is NOT linear: `GET /sessions/{id}/dsa` serves all questions at once (with a `preparing` status while background assignment runs — the endpoint re-dispatches the idempotent assign task on such polls), `dsa/run|test|submit` are keyed by an explicit `interaction_id` from the request body, submissions are retryable (last-submitted-wins under row locks, never advancing the session, hidden-case outputs never echoed), and the candidate exits via idempotent `POST /sessions/{id}/dsa/finish` (session-row lock makes the transition and its final-grading dispatch exactly-once).

**AI layer (`ai/`):** every agent is a `BaseAgent[T_in, T_out]` (`interfaces/base_agent.py`): request model → `ChatPromptTemplate` (all prompts in `ai/prompts.py`) → `LiteLLMProvider` (`ai/lite_llm.py`, LangChain ChatLiteLLM → Groq, one model for everything: `settings.LLM_MODEL_NAME`) → `JsonOutputParser` → response model. LiteLLM exceptions map to the `AIError` hierarchy in `exceptions/ai.py`. Most agents catch errors and return safe fallbacks (`FollowUpDecider` → "no follow-up"; `Evaluator` → score 0); `ResumeEvaluator` has none, and its caller deletes the `Application` row on failure.

**Background tasks (`background/taskiq/tasks/`):** each module has a plain `run_*` coroutine plus a thin `@broker.task` wrapper; tasks open their own DB sessions via `AsyncSessionLocal`. Dispatch goes through the `TaskiqWorker` facade (`background/taskiq/worker.py`) obtained from `default_worker_provider()`. Exception to the pattern: `POST /sessions/{id}/dsa/submit` awaits `run_evaluate_submission` inline in the request (so the response can carry per-case results) instead of dispatching it. Final grading (`run_grade_session`) evaluates resume conversations (one Evaluator call per conversation), grades any answered-but-ungraded interaction inline (the duration deadline can end a session mid-conversation, before the normal advance path dispatches grading), and stores `session.score` as the interview's configured weighted split — `dev_score` × mean(every *configured* question + each resume conversation) + `dsa_score` × mean(per-assigned-question DSA scores); FinalEvaluator supplies only the qualitative feedback/strengths/recommendation. **Anything the candidate didn't attempt scores 0** (a question never reached has no `Interaction` row at all, so slots come from `CustomQuestion`s, not from existing interactions), but an opportunity never *given* — no DSA question assigned, no resume round configured — drops out and its weight redistributes. Scores are only written to rows actually evaluated, so unattempted work stays NULL/0-with-"Not attempted" feedback and the leaderboard can render it as **unattempted** rather than a genuine zero (`QuestionInteractionResult.attempted`, `DsaInteractionResult.attempts == 0`, `ResumeQuestionResult.answer == null`).

### Frontend (`frontend/src/`)

React 19 + Vite + Tailwind 4, but **no URL router** — navigation is a page state machine in `src/App.tsx` keyed off a `Page` union. Only three URL inputs matter: `/admin*` (hidden org entry; the public landing page has no org link), `#oidc_token=`/`#oidc_error=` (OIDC return), everything else → landing. Tokens live in localStorage (`token` for users, `org_token` for orgs) and are prop-drilled; state is local hooks (`useInterviewSession`, `useDashboard`, ...) — `react-router-dom`, `zustand`, `react-query`, `axios`, `zod` in package.json are dead weight, never imported. API calls are plain-fetch modules in `src/services/`, each with its own `BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"`. `src/app/App.tsx` and `src/components/{layout,sections,ui}/` are an abandoned second implementation — the live code is `src/components/LandingPage.tsx` and `src/features/`.

## Critical cross-file couplings (things that break non-obviously)

- **Worker mapper registration:** `app/models/__init__.py` imports every model module so SQLAlchemy string-based relationships resolve inside the TaskIQ worker's import graph. Add any new model there, or grading tasks crash with `failed to locate a name`.
- **Neon/PgBouncer:** `app/database.py` disables both SQLAlchemy's and asyncpg's prepared-statement caches (transaction pooling breaks them). These connect_args are asyncpg-only and applied unconditionally — despite the sqlite default in config, **Postgres is de facto required** (also: `DsaQuestion` uses JSONB).
- **Alembic** takes its URL from `app.database.db_url`, inheriting the cache-disabling suffix.
- **`VITE_API_URL` is baked at frontend image build time** (Dockerfile ARG→ENV before `npm run build`); empty default falls back to localhost:8000. nginx serves the SPA only — no `/api` reverse proxy; the browser calls the backend origin directly (backend CORS is wildcard).
- DSA question generation validates the LLM's reference solution against every test case in Piston before saving; broken generations are discarded, not retried differently.
- **Piston ships with zero language runtimes installed.** A fresh `piston` container/volume answers `GET /api/v2/runtimes` with `[]`, and `/dsa/run|test|submit` then 400 on every language. `docker-compose.yml`'s `piston_bootstrap` service (`tools/piston_bootstrap.py`) installs the needed set automatically on every `docker compose up` — already-installed packages are skipped via `/api/v2/packages`'s `installed` flag (keyed by exact package name+version, NOT the runtime language names in `/api/v2/runtimes` — those differ for gcc→c/c++ and mono→csharp), so reruns are a fast no-op; `api`/`taskiq_worker` wait on it via `condition: service_completed_successfully`. Keep `PACKAGES` in that script in sync with `PistonClient.LANGUAGE_ALIASES` (`app/utils/piston_client.py`) and the editor's language list. Also: inside docker-compose, `PISTON_URL` must be `http://piston:2000` (the service name), not `localhost:2000` — `backend/.env`'s value is for running the API directly on the host, and `docker-compose.yml` overrides it for the containerized services.

## Commit conventions

Match the existing history: atomic commits, `backend/<area>: <Sentence-cased imperative>` (e.g. `backend/database: Disable caching in db.`), `frontend:<area>` for frontend. Do not add a Claude co-author trailer.

## Known unfinished areas (as of 2026-07)

- The email pipeline (SMTP provider + `send_email_task`) is fully wired but has zero callers.
- `transition_to_resume` treats "no ResumeConversation rows yet" as "round doesn't exist" — a candidate who outruns `generate_resume_questions_task` (or whose generation failed) silently skips the resume round. (The DSA round had the same bug; it's fixed — `transition_to_dsa` keys on configured `DsaTopic`s and the round endpoint has a `preparing` state.)
- Session start has a SELECT-then-INSERT race (no unique constraint on `application_id`); two concurrent `/answer` calls can grab the same open follow-up turn.
- No endpoint rehydrates the current question after a page refresh in the questions/resume rounds (the DSA round rehydrates via `GET /sessions/{id}/dsa`).
- The `Application.status` column never transitions past "applied" — the candidate-facing status in `GET /interviews/applied` is derived from `shortlisting_decision` ("approved"/"pending") instead, but the org leaderboard still displays the raw column. A real approve/reject lifecycle (and replacing the blind shortlist toggle) is still open.
