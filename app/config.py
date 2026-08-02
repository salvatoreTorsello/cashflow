from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://cashflow:cashflow@localhost:5432/cashflow"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CashFlow"
    CORS_ORIGINS: list[str] = ["*"]
    # Session cookies require HTTPS in production. Set to false only for local
    # http:// dev (browsers refuse to store `Secure` cookies over plain http).
    COOKIE_SECURE: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
