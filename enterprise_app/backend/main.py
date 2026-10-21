from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Initialize database tables and schema migrations safely on startup
try:
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
    print("[STARTUP] Database connection and schema verification successful.")
except Exception as db_init_err:
    print(f"[STARTUP WARNING] Database initialization encountered an error: {db_init_err}")
    print("[STARTUP WARNING] The application will continue running so health endpoints remain responsive.")

# Set spec-compliant CORS middleware (reflects incoming Origin instead of wildcard '*' to allow credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
        headers["vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred.", "details": str(exc)},
        headers=headers,
    )

@app.get("/")
def root():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}

from api.v1 import auth, attendance, enrollment

# Include routers here (Phase 2+)
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
app.include_router(enrollment.router, prefix=f"{settings.API_V1_STR}/enrollment", tags=["enrollment"])

