# pkmn-market-insights 💹  
**Pokémon Card Investment Web App**

A full-stack web application that recommends Pokémon cards to invest in, displays trending cards by price changes, and shows price history graphs inspired by stock trading platforms.

---

## 🚀 Current Features
- ✅ Daily updates to a **Postgres database** with a Python script  
- ✅ **Backend connection** to Postgres database using **Prisma**  
- ✅ Base project setup in **TypeScript**  
- ✅ Basic **REST API**  
- ✅ Basic **frontend**  

---

## 🛠️ Upcoming Features
- [ ] Update **React frontend** to fetch data from backend  
- [ ] Replace all **mock data** with live API data  
- [ ] Add **error/loading states** to frontend  
- [ ] Implement **user authentication**  
- [ ] Add **user features**: watchlist, favorites, etc.  
- [ ] Deploy database, backend, and frontend  

---

## 📌 Tech Stack
- **Frontend:** React, TypeScript  
- **Backend:** Node.js, Prisma, REST API  
- **Database:** PostgreSQL  
- **Data Processing:** Python  

## Local backend and Neon database

The backend uses Prisma with a hosted PostgreSQL database. Put the Neon connection string in `backend/.env`:

```env
DATABASE_URL="postgresql://..."
```

Then apply the schema and seed the initial curated tracked cards:

```bash
cd backend
npx prisma db push
npx prisma db execute --schema prisma/schema.prisma --file prisma/seed-tracked-cards.sql
npm run dev
```

The backend exposes `GET /health`, catalog price summaries at
`/api/price_change/top-bottom`, active tracked cards at `/api/tracked-cards`, and
history for a tracked product at `/api/tracked-cards/:productId/history`.

The catalog ETL and price-summary ETL support `DATABASE_URL`. The historical ETL
only reads active rows from `tracked_card`; do not run it before reviewing the
selected-card list and its date range.

## Authentication

Authentication uses Neon Managed Better Auth. The root `neon.ts` declares the
Auth service; after linking this repository to the intended Neon project and
branch, deploy it with:

```bash
neon deploy
neon neon-auth domain add http://localhost:5173
```

Configure Google and GitHub OAuth applications in Neon and register their
provider credentials in the Neon Auth settings. Do not commit provider secrets.
The OAuth callback URL for a provider is the branch's
`NEON_AUTH_BASE_URL` followed by `/callback/google` or `/callback/github`.

For local development, set the following values:

```env
# frontend/.env.local
VITE_NEON_AUTH_URL="https://<branch-auth-url>"

# backend/.env
NEON_AUTH_BASE_URL="https://<branch-auth-url>"
NEON_AUTH_JWKS_URL="https://<branch-auth-url>/.well-known/jwks.json"
# Optional when the branch config defines an audience:
NEON_AUTH_AUDIENCE="..."
```

The market dashboard remains publicly accessible. Signed-in users receive a
short-lived Neon JWT for authenticated requests, while unauthenticated users
can continue browsing the public market API. The banner's **Sign in** action
opens the optional authentication flow.

---
