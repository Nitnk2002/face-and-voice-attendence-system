from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

# In a true enterprise setup, we use a connection pooler like PgBouncer.
# SQLAlchemy handles its own connection pooling which is excellent for FastAPI.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency to yield a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
