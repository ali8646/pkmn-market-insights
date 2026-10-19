# CardSight

**Pokémon market insights dashboard**

Live link can be found at: https://cardsight-frontend.onrender.com

CardSight is a full-stack dashboard for exploring Pokémon trading card prices,
tracking market movement, and reviewing historical trends. It combines a React
SSR frontend, a typed Express and Prisma API, PostgreSQL on Neon, and Python
ETL jobs that keep market data up to date.

> Prices come from public TCGCSV/Tcgplayer data and may be incomplete or stale.

## Features

- Browse a paginated catalog of Pokémon cards.
- Search by card name, normalized name, or set.
- Sort by current price, dollar change, or percentage change.
- View current prices, seven-day movement, set metadata, and trend previews.
- Open tracked-card details with historical price charts.
- Save a browser-local watchlist.
- Browse the market catalog without an account.
- Optionally sign in with email, Google, or GitHub through Neon Managed Auth.
- Ingest daily catalog and price data with separate Python ETL stages.
- Calculate reusable price-change snapshots for market analysis.

## Project structure

```text
backend/    Express API, Prisma schema, and Neon Auth JWT verification
etl/        Market-data ingestion and price-change jobs
frontend/   React SSR dashboard, charts, and authentication UI
neon.ts     Neon project configuration with Managed Auth enabled
tests.http  Example API requests
```

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

## Current limitations

- Watchlists are stored in `localStorage` and are not synchronized to user
  accounts.
- Cards with fewer than two historical data points use an explicitly labeled
  illustrative trend preview.
- The API currently focuses on market data and tracked-card history; portfolio
  management and write endpoints are not implemented.
- ETL freshness depends on the availability and schema of the upstream exports.

## Attribution

Market data is sourced from the public TCGCSV/Tcgplayer export format.
Pokémon and related marks are the property of their respective owners. Card
images and market data are used for informational and portfolio-project
purposes.
