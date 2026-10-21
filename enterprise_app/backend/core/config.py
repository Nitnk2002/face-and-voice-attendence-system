from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Apni Kaksha API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "super-secret-key-do-not-use-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql+pg8000://postgres:postgres@localhost:5432/apni_kaksha"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    
    class Config:
        env_file = ".env"

settings = Settings()
