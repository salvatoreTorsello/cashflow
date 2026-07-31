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

# Apply database migrations
alembic -c alembic/alembic.ini upgrade head

# Run
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Open `http://localhost:8000/docs` for interactive Swagger documentation.

## Web UI

A mobile-first React PWA lives in `frontend/` and talks to this API. See [frontend/README.md](frontend/README.md) for setup, including testing it on your phone.

## Deployment (Docker)

The whole stack (Postgres + API + web UI behind nginx) runs as a Docker Compose stack — handy for trying it out on a home server / Proxmox LXC with Docker installed.

```bash
cp .env.example .env   # set POSTGRES_PASSWORD at least
docker compose build   # or: docker compose pull, once images are published by CI
docker compose up -d
```

The web UI is then at `http://<host>:8080` — nginx serves the built PWA and reverse-proxies `/api/*` to the backend, so the browser never needs CORS. The backend container applies Alembic migrations on startup before serving.

Images are built and pushed to `ghcr.io/salvatoretorsello/cashflow-{backend,frontend}` by [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) on every push to `main` (tag `latest`) and on version tags (`vX.Y.Z`). `docker-compose.yml` references those images directly, so on a deploy host you can skip building from source with `docker compose pull && docker compose up -d`.

## Developer Hints

- **Database:** SQLite is used by default. Switch to PostgreSQL by changing `DATABASE_URL` in `.env`.
- **Migrations:** Alembic owns the schema — the app no longer auto-creates tables. Run `alembic -c alembic/alembic.ini upgrade head` before starting the server, and after changing `app/models.py` generate a new revision with `alembic -c alembic/alembic.ini revision --autogenerate -m "message"`.
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
| Web UI | React + Vite (PWA) |
| Docs | GitHub Pages (Jekyll) |

## License

MIT
