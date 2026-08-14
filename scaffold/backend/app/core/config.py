from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""   # server-side only, never expose to frontend
    SUPABASE_ANON_KEY: str = ""           # used by frontend clients directly
    JWT_SECRET: str = "change-me"
    ENV: str = "development"
    OPENROUTER_API_KEY: str = ""
    OLLAMA_HOST: str = "http://localhost:11434"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
