from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.config import settings


# SQLite needs connect_args for thread safety; PostgreSQL does not need them.
# The StaticPool is needed for SQLite in-memory and test scenarios.
connect_args = {}
pool_class = None

if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_class = StaticPool

engine_kwargs = {
    "connect_args": connect_args,
}
if pool_class:
    engine_kwargs["poolclass"] = pool_class

engine = create_engine(settings.database_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called on startup."""
    from app.models import portfolio  # noqa: F401 — import triggers table registration
    Base.metadata.create_all(bind=engine)
