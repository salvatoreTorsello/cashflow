from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./cashflow.db"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CashFlow"
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
