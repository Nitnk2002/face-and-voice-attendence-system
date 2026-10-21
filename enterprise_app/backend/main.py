from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Initialize database tables
from infrastructure.database import Base, engine
from domain.models import user, attendance
Base.metadata.create_all(bind=engine)

# Migration: ensure 'admin' is an allowed role
from sqlalchemy import text
with engine.connect() as conn:
    # Drop old constraint if it only allowed teacher/student
    conn.execute(text("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name='users' AND constraint_name='users_role_check'
            ) THEN
                ALTER TABLE users DROP CONSTRAINT users_role_check;
            END IF;
        END $$;
    """))
    # Add updated constraint that includes admin
    conn.execute(text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name='users' AND constraint_name='users_role_check_v2'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT users_role_check_v2
                CHECK (role IN ('teacher', 'student', 'admin'));
            END IF;
        END $$;
    """))
    conn.commit()

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the Next.js frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the exception here
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred.", "details": str(exc)},
    )

@app.get("/")
def root():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}

from api.v1 import auth, attendance, enrollment

# Include routers here (Phase 2+)
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
app.include_router(enrollment.router, prefix=f"{settings.API_V1_STR}/enrollment", tags=["enrollment"])

