# SpendWise — Personal Finance Tracker

SpendWise is a small, full-stack personal finance tracker built for a single local user. Add income and expenses, search and filter transaction history, and review server-calculated balances and spending trends. A fresh database is empty; the app never adds sample financial data automatically.

## Features

- Create, edit, and delete income and expense transactions.
- Search descriptions; filter by type, category, and inclusive date range; paginate newest-first results.
- Dashboard totals across the full database, expense category breakdown, monthly income and expense totals, and recent transactions.
- Responsive React interface with accessible controls, empty/loading/error states, and confirmation before deletion.
- SQLite persistence through FastAPI and SQLAlchemy.

## Technology

Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic 2, SQLite, Uvicorn, Pytest, HTTPX, React 18, Vite 6, Recharts, and Lucide.

## Screenshots

No screenshots have been created yet. Add genuine captures to `screenshots/` and link them here when available.

## Architecture

```text
backend/app/       FastAPI application, database, ORM models, schemas, routers
backend/tests/     Isolated API tests using an in-memory SQLite database
frontend/src/      React dashboard and API service
screenshots/       Reserved for real project screenshots
```

The browser calls `/api` endpoints. The API validates requests and stores each amount in integer minor units (`amount_minor`, 100 tiyn per KZT). Dashboard aggregates are SQL queries and do not depend on the visible transaction page. Transaction dates are calendar dates (`YYYY-MM-DD`) with no time zone; creation and update timestamps are UTC stored as naive UTC values in SQLite and serialized as ISO timestamps.

## Prerequisites

- Python 3.11 or later and pip.
- Node.js 20 or later and npm.
- Windows PowerShell, macOS, or Linux.

## Run on Windows PowerShell

Open two PowerShell terminals in the repository root (`spendwise-expense-tracker`).

### Backend

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:DATABASE_URL = "sqlite:///./spendwise.db"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
python -m uvicorn app.main:app --reload
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal and activate again. The default SQLite database is created in `backend/` the first time the API starts. It is ignored by Git.

### Frontend

```powershell
cd frontend
npm install
$env:VITE_API_URL = "http://localhost:8000/api"
$env:VITE_CURRENCY = "KZT"
npm run dev
```

Open <http://localhost:5173>. Backend settings can be placed in `backend/.env` by copying the root `.env.example`; frontend settings can be placed in `frontend/.env` by copying `frontend/.env.example`. Both tools read their local `.env` at startup. Backend settings are `DATABASE_URL` and `FRONTEND_ORIGIN`; frontend settings are `VITE_API_URL` and `VITE_CURRENCY`. Currency is configurable for display; no conversion is performed. The API currently stores two decimal places, so KZT amounts use a consistent two-decimal input precision.

## API

Interactive API docs: <http://localhost:8000/docs>.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/categories` | Income/expense category options |
| GET | `/api/transactions?limit=10&offset=0` | List/filter transactions |
| GET | `/api/transactions/{id}` | Read one transaction |
| POST | `/api/transactions` | Create transaction (201) |
| PATCH | `/api/transactions/{id}` | Partially update transaction |
| DELETE | `/api/transactions/{id}` | Delete (204) |
| GET | `/api/dashboard/summary` | All-time totals and recent activity |
| GET | `/api/dashboard/category-breakdown` | Expense totals grouped by category |
| GET | `/api/dashboard/monthly-summary?year=2025` | Twelve monthly totals for a year |

Listing supports `type=income|expense`, `category`, inclusive `start_date` and `end_date` (ISO dates), `search`, and `sort=newest|oldest`. The response includes `items`, `total`, `limit`, and `offset`.

Example:

```powershell
$body = @{ type="expense"; amount="1250.50"; category="Food"; description="Groceries"; transaction_date="2025-02-10" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/transactions -ContentType "application/json" -Body $body
Invoke-RestMethod http://localhost:8000/api/dashboard/summary
```

The create response contains the stored transaction, for example:

```json
{
  "id": 1,
  "type": "expense",
  "amount": "1250.50",
  "category": "Food",
  "description": "Groceries",
  "transaction_date": "2025-02-10",
  "created_at": "2025-02-10T12:00:00",
  "updated_at": "2025-02-10T12:00:00"
}
```

Amounts in transaction API responses are decimal currency units. Dashboard monetary aggregates are integer minor units, explicitly named `*_minor`. Invalid and nonpositive values, unknown type/category combinations, and malformed dates receive 422 responses. Missing transaction IDs receive 404.

## Tests and build

```powershell
cd backend
python -m pip install -r requirements.txt
python -m pytest -q
cd ..\frontend
npm install
npm run lint
npm run build
```

Tests override the API's session dependency with an isolated in-memory SQLite database. They do not read or alter the development database.

## Manual check

1. Start both servers and confirm the dashboard shows zero totals and an empty transaction state.
2. Add a salary and an expense; verify totals, chart, and category breakdown update.
3. Search by description and combine type/category/date filters; try pagination.
4. Edit a transaction and verify aggregate values change, then cancel and confirm a deletion.
5. Refresh the page and verify saved transactions remain.

## Limitations and security

This MVP has no authentication or user isolation. It is intended for one local user and must not be exposed as a multi-user financial service without authentication, authorization, deployment hardening, and per-user data isolation. It stores no bank credentials, connects to no banks, and processes no payments. CORS permits only the configured frontend origin. SQLite is suitable for local use, not a substitute for a production database backup plan.

## Troubleshooting

- **Browser cannot reach API:** confirm Uvicorn is running on port 8000 and `VITE_API_URL` ends in `/api`.
- **CORS error:** set `FRONTEND_ORIGIN` to the exact Vite origin, restart the backend.
- **Database locked:** close other processes using the local SQLite file; do not keep the database inside a cloud-synced directory while multiple processes write to it.
- **Port already in use:** start Uvicorn with `--port 8001` and set `VITE_API_URL` to the matching port, or select another Vite port.

## Future improvements

Authentication and per-user isolation, migrations, export/backup, configurable budgets, richer date ranges, and a deployment pipeline.

## License

MIT. See [LICENSE](LICENSE).
