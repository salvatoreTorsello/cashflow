from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://cashflow:cashflow@localhost:5432/cashflow"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CashFlow"
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
