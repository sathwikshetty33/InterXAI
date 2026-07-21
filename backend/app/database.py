from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Neon's connection pooler runs PgBouncer in transaction mode, which is
# incompatible with prepared-statement caching: a cached plan is bound to one
# server-side connection, so when the pooler routes the next query to a
# different connection (or the schema changes), asyncpg raises
# InvalidCachedStatementError. Disable both asyncpg's own cache
# (statement_cache_size) and SQLAlchemy's dialect-level cache
# (prepared_statement_cache_size) so every query uses a fresh statement.
separator = "&" if "?" in db_url else "?"
db_url = f"{db_url}{separator}prepared_statement_cache_size=0"

# Neon drops idle connections; without pre_ping SQLAlchemy hands out a dead one
# and the first query fails with "connection is closed". pre_ping checks/replaces
# it first; pool_recycle retires connections before Neon's idle timeout hits.
engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_recycle=180,
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,
    },
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
