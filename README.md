# CardSight

**Pokémon market insights dashboard**

CardSight is a full-stack market-data application for exploring Pokémon trading
card prices, comparing short-term movement, and reviewing tracked-card history.
It combines a React SSR frontend, a typed Express/Prisma API, PostgreSQL on Neon,
and Python ETL jobs that ingest and transform daily market data.

> This is a portfolio project for market-data exploration, not financial advice.
> Prices are sourced from TCGCSV/Tcgplayer data and can be incomplete or stale.

## Why this project

This project demonstrates:

- Building a typed API around a relational data model with Prisma.
- Designing a data pipeline that ingests external CSV/JSON data into PostgreSQL.
- Computing reusable price-change snapshots across multiple time windows.
- Delivering an SSR React interface with search, sorting, pagination, charts,
  watchlists, loading states, and authentication-aware requests.
- Integrating Neon Managed Auth while keeping the public market catalog
  browseable without an account.

## Product capabilities

- Browse a paginated catalog of cards and filter by card name, normalized name,
  or set.
- Sort by current price, dollar change, or percentage change in either direction.
- View current price, seven-day percentage movement, set metadata, and trend
  previews.
- Open tracked-card details with historical price data when available.
- Save a browser-local watchlist.
- Sign in with email, Google, or GitHub through Neon Managed Auth when an Auth
  URL is configured.
- Run daily catalog ingestion, historical tracked-card ingestion, and price
  change calculations as separate ETL stages.

### Current limitations

- Watchlists are stored in `localStorage`; they are not yet synchronized to a
  user account.
- When a tracked card has fewer than two historical points, the UI displays an
  explicitly labeled illustrative trend so the layout remains useful.
- The API currently exposes market data and tracked-card history; write endpoints
  and user-specific portfolio features are not implemented.
- The ETL jobs depend on the availability and schema of the upstream TCGCSV
  exports.

## Architecture

```text
TCGCSV / Tcgplayer exports
             |
             v
       Python ETL jobs
             |
             v
     PostgreSQL (Neon)
             |
             v
      Express + Prisma API
             |
             v
       React SSR frontend
```

### Repository layout

| Path | Responsibility |
| --- | --- |
| `frontend/` | React 19, Vite SSR, charts, search/sort UI, auth client |
| `backend/` | Express API, Prisma schema/client, JWT verification |
| `etl/` | Python ingestion and price-change calculation jobs |
| `neon.ts` | Neon project configuration with Managed Auth enabled |
| `tests.http` | Example API requests for local development |

## Prerequisites

- Node.js 20 or newer
- Python 3.9 or newer
- PostgreSQL/Neon database
- npm

## Quick start

Install dependencies in each application:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../etl && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` from
[backend/.env.example](./backend/.env.example). At minimum, set
`DATABASE_URL`. To enable authentication, also set the Neon Auth values shown
in that file.

Prepare the database and seed the initial tracked-card list:

```bash
cd backend
npx prisma db push
npx prisma db execute --schema prisma/schema.prisma --file prisma/seed-tracked-cards.sql
```

Start the API and frontend in separate terminals:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
cp .env.local.example .env.local
# Set VITE_NEON_AUTH_URL in .env.local when using authentication.
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3001>
- Health check: <http://localhost:3001/health>

The frontend expects the API at the same origin in the current local setup. If
you run the frontend and API on different origins, configure the appropriate
proxy or deployment routing before using the dashboard.

## Data pipeline

The ETL scripts load `DATABASE_URL` from `backend/.env` when present, or from
the process environment:

```bash
cd etl
python etl_script.py              # groups, products, and daily prices
python historical_price_etl.py    # historical data for active tracked cards
python price_changes.py           # derived price-change snapshots
```

Run the historical job only after reviewing the active tracked-card rows and
the intended date range. Each job writes progress to a log and also reports to
stdout. `setup_cron.sh` contains the intended scheduling entry point; review
paths and environment activation before installing a cron entry.

## API reference

### `GET /health`

Returns `{ "status": "ok" }` when the API process is running.

### `GET /api/price_change/top-bottom`

Returns paginated cards. Supported query parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `column` | `current_price`, `price_change`, `percentage_change` | `current_price` |
| `sort` | `asc`, `desc` | `desc` |
| `search` | card name, clean name, or set text | empty |
| `limit` | `0`–`100` | `25` |
| `offset` | non-negative integer | `0` |

### `GET /api/tracked-cards`

Returns active tracked cards with their current price and seven-day movement.

### `GET /api/tracked-cards/:productId/history`

Returns chronological historical price points for an actively tracked product.
Invalid product IDs return `400`; inactive or unknown products return `404`.

Example requests are available in [tests.http](./tests.http).

## Verification

Run the checks used for the current project:

```bash
cd frontend && npm run typecheck && npm run build
cd ../backend && npm run typecheck && npm run build
cd ../etl && python3 -m compileall -q .
```

The frontend build may report a Vite bundle-size warning because the charting
and authentication dependencies are currently shipped in the main client
bundle; it does not prevent a successful production build.

There is not yet an automated unit/integration test suite. The HTTP examples in
[tests.http](./tests.http), the health endpoint, and the checks above provide
the current smoke-test workflow.

## Authentication and Neon

`neon.ts` enables Neon Managed Auth for the project. Link this repository to
the intended Neon project and branch before deploying:

```bash
neon deploy
neon neon-auth domain add http://localhost:5173
```

Configure provider credentials in Neon rather than committing them. For Google
and GitHub OAuth, the callback URL is the branch's `NEON_AUTH_BASE_URL` followed
by `/callback/google` or `/callback/github`.

The market catalog remains public. When a signed-in user has a valid Neon JWT,
the frontend attaches it to API requests and the backend can verify it using
the configured JWKS endpoint.

## Data attribution

Market data is sourced from the public TCGCSV/Tcgplayer export format. Pokémon
and related marks are the property of their respective owners. Card images and
market data are used here for informational and portfolio-project purposes.
