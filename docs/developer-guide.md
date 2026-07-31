---
layout: default
title: Developer Guide
---

# CashFlow Developer Guide

## Architecture

CashFlow is an API-first Python application. The backend exposes a REST interface built with FastAPI and persists data through SQLAlchemy. The database layer is abstracted: SQLite is used for local development and can be replaced by PostgreSQL in production by changing a single environment variable.

All front-end layers (web dashboard, Telegram bot, mobile application) are stateless clients that consume the REST API.

## Project Structure

```
cashflow/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Pydantic settings (env-driven)
│   ├── database.py          # SQLAlchemy engine, session factory, Base
│   ├── models.py            # ORM declarations
│   ├── schemas.py           # Pydantic request/response models
│   ├── crud.py              # Database operations
│   ├── dependencies.py      # FastAPI dependency injections
│   └── routers/
│       ├── categories.py    # Category management endpoints
│       ├── transactions.py  # Historical ledger endpoints
│       ├── commitments.py   # Future obligations endpoints
│       └── dashboard.py     # Summary & analytics endpoints
├── alembic/                 # Database migrations
├── docs/                    # GitHub Pages documentation
├── requirements.txt
├── .env.example
└── README.md
```

## Data Model

### Category
The fixed set of categories available to transactions and commitments (e.g. `salary`, `house`, `taxes`).
- `id`, `name` (unique)

Categories are managed through their own endpoints rather than free text, so the set stays consistent and can be listed for use in clients (dashboard, Telegram bot). Transactions and commitments reference a category by `category_id`; attempting to create either with a `category_id` that doesn't exist returns `404`.

On startup, `app/seed.py` idempotently inserts a default set of categories (skipping any that already exist by name):

`balance`, `salary`, `house`, `taxes`, `insurance`, `car`, `transport`,  `trip`, `education`, `gifts`, `other`

Add or remove entries in `DEFAULT_CATEGORIES` as needed — the list is just a starting point, not a hard constraint (new categories can always be created via `POST /api/v1/categories`).

### Transaction
The historical ledger. Every row represents an executed movement.
- `id`, `date`, `amount` (Decimal), `category_id` (FK), `description`
- `commitment_id` (FK, nullable): links back to a commitment if this transaction originated from a promotion.

### Commitment
Future obligations.
- `id`, `due_date`, `amount` (negative Decimal), `category_id` (FK), `description`
- `status`: `pending`, `confirmed`, or `paid`
- `parent_id` (FK, nullable): self-referential for grouped installments.

### Relationship
A commitment can generate one or more transactions (in theory, one per execution). A transaction can be linked to the commitment that originated it. Both link to a `Category`.

## API Reference

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/categories` | List all categories |
| `POST` | `/api/v1/categories` | Create a new category |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/transactions` | List all transactions |
| `POST` | `/api/v1/transactions` | Create a raw transaction (`category_id` must reference an existing category) |
| `GET` | `/api/v1/transactions/{id}` | Get single transaction |

### Commitments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/commitments` | List pending commitments |
| `POST` | `/api/v1/commitments` | Create a new commitment (`category_id` must reference an existing category) |
| `POST` | `/api/v1/commitments/{id}/execute` | Promote commitment to transaction |
| `GET` | `/api/v1/commitments/upcoming` | List due within N days |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dashboard` | Summary: balance, safe margin, next commitment |

## Setup

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
git clone https://github.com/yourusername/cashflow.git
cd cashflow
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

For local development, SQLite is pre-configured.

### Database Initialization

The application auto-creates tables on startup via `Base.metadata.create_all()`.

Alembic is already configured (`alembic/env.py` imports `app.models` so `Base.metadata` picks up every table). To generate and apply migrations:

```bash
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head
```

### Run the Server

```bash
uvicorn app.main:app --reload
```

Interactive documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing with Postman

### 1. Look Up Category IDs
`GET /api/v1/categories`

The default categories (`balance`, `salary`, `house`, `taxes`, `insurance`, `car`, `transport`, `trip`, `education`, `gifts`, `other`) are seeded automatically on startup (see `app/seed.py`) — scoped to big/recurring expenses rather than day-to-day spending. Note the `id` for `balance`, `house`, and `salary` — this walkthrough assumes `balance=1`, `salary=2`, `house=3` on a freshly seeded database. If you need a category that isn't in the default set, create it with `POST /api/v1/categories`.

### 2. Initialize Opening Balance
`POST /api/v1/transactions`

```json
{
  "date": "2026-07-29",
  "amount": 7000.00,
  "category_id": 1,
  "description": "Initial cash balance"
}
```

### 3. Register a Commitment
`POST /api/v1/commitments`

```json
{
  "due_date": "2026-09-01",
  "amount": -1450.00,
  "category_id": 3,
  "description": "Facade renovation - installment 1/11",
  "status": "pending"
}
```

### 4. Execute a Commitment
`POST /api/v1/commitments/1/execute`

Response will contain the new transaction and the updated state.

### 5. Add Income
`POST /api/v1/transactions`

```json
{
  "date": "2026-07-31",
  "amount": 2400.00,
  "category_id": 2,
  "description": "July salary"
}
```

### 6. Check Dashboard
`GET /api/v1/dashboard`

Response:

```json
{
  "balance": 9400.00,
  "pending_commitments_total": -4800.00,
  "safe_margin": 4600.00,
  "next_commitment": {
    "id": 1,
    "due_date": "2026-09-01",
    "amount": -1450.00,
    "description": "Facade renovation - installment 1/11"
  }
}
```

## Roadmap

### Step 1 — Backend (Current)
REST API with full CRUD for transactions and commitments, promotion workflow, and dashboard summaries. Testable via Postman and Swagger UI.

### Step 2 — Web Dashboard
A Plotly Dash or Streamlit application (or a React SPA) that consumes the API. Visualizes:
- KPI cards: Balance, Safe Margin, Next Due
- Timeline calendar of upcoming commitments
- Historical burn-rate charts

### Step 3 — Telegram Bot
A stateless bot built with `python-telegram-bot`. It calls the backend REST API.
- `/balance` → dashboard summary
- `/upcoming` → list pending commitments
- `/pay <id>` → execute commitment
- `/add_income <amount> <description>` → create transaction
- Daily scheduler to poll upcoming commitments and send reminders.

### Step 4 — Mobile Application
A Progressive Web App (PWA) or a React Native / Flutter wrapper. The API is ready for JWT-based authentication if multi-user support is required in the future.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Write tests for new endpoints.
4. Submit a pull request.

All documentation is located in the `docs/` folder and is published via GitHub Pages.
```

---

## How to publish on GitHub Pages

1. Push the `docs/` folder to the root of your repository.
2. Go to **Settings → Pages** on GitHub.
3. Select **Source: Deploy from a branch**.
4. Choose the branch (e.g., `main` or `master`) and folder `/docs`.
5. Replace `yourusername` in `docs/_config.yml` with your actual GitHub username.

Once deployed, the User Guide will be at:  
`https://yourusername.github.io/cashflow/user-guide`

---

**To create the zip file locally:**

```bash
mkdir -p cashflow && cd cashflow
# create all files above, then:
cd ..
zip -r cashflow.zip cashflow/
