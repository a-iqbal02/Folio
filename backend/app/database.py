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
    """Run Alembic migrations to bring the schema up to date. Called on
    startup for both local dev (SQLite) and production (Postgres) — this
    replaced a bare Base.metadata.create_all() fallback, which only ever
    creates missing tables and never alters existing ones, so it couldn't
    apply real schema changes once a database had data in it.
    """
    from pathlib import Path
    from alembic.config import Config
    from alembic import command

    backend_dir = Path(__file__).resolve().parent.parent
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")
