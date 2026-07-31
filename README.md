# CashFlow

A macro-level personal cashflow management API. Track your liquid balance, future obligations, and safe margin—without recording every daily coffee.

## What is CashFlow?

CashFlow is designed for users who want financial awareness without micromanaging expenses. Instead of logging every purchase, you record your opening balance, future commitments (installments, taxes, planned trips), and income as it arrives. The system tells you exactly how much money is truly free to spend.

## Quick Start

```bash
# Clone and enter
git clone https://github.com/yourusername/cashflow.git
cd cashflow

# Virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment
cp .env.example .env

# Run
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Open `http://localhost:8000/docs` for interactive Swagger documentation.

## Developer Hints

- **Database:** SQLite is used by default. Switch to PostgreSQL by changing `DATABASE_URL` in `.env`.
- **Migrations:** Alembic is pre-configured. Run `alembic init alembic` if you need migrations, then `alembic revision --autogenerate -m "message"`.
- **ORM:** SQLAlchemy 2.0 style is used (`Mapped`, `mapped_column`). Classic `session.query` is used in CRUD for readability; feel free to migrate to `select()` if you prefer.
- **Stateless clients:** The Telegram bot, dashboard, and future mobile app are all stateless API consumers. Keep business logic in the backend.

## Documentation

- [User Guide](https://yourusername.github.io/cashflow/user-guide) — How CashFlow works and how to use it.
- [Developer Guide](https://yourusername.github.io/cashflow/developer-guide) — Architecture, API reference, and roadmap.

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI |
| ORM | SQLAlchemy 2.0 |
| DB | SQLite (local) / PostgreSQL (prod) |
| Validation | Pydantic v2 |
| Docs | GitHub Pages (Jekyll) |

## License

MIT
