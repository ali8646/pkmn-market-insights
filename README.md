# pkmn-market-insights 💹 Pokémon Card Investment Web App

A full-stack web application that recommends Pokémon cards to invest in, displays trending cards by price changes, and shows price history graphs — inspired by stock trading platforms.

---

## 📍 Project Roadmap

## ✅ Phase 1: Frontend + Pokémon TCG API (Week 1–2)

**Goal:** Build a React frontend that fetches and displays card data.

- [x] Create a React app (Vite or Create React App)
- [x] Fetch card data from [Pokémon TCG API](https://pokemontcg.io/)
- [x] Display card name, image, and price
- [x] Style card grid layout with Tailwind or plain CSS

---

## ✅ Phase 2: Simulated Trends & Filters (Week 2–3)

**Goal:** Show % change and trending behavior using mock data.

- [x] Add simulated % change values (7, 30, 90 days)
- [x] Sort cards by % change
- [ ] Add filter dropdowns or toggle buttons

---

## ✅ Phase 3: Backend + Database (Week 3–5)

**Goal:** Build a backend to store card data and track historical prices.

- [ ] Create a REST API using Node.js + Express (or FastAPI)
- [x] Set up a database (MongoDB or PostgreSQL)
- [ ] Create endpoints:
  - `GET /cards` — return trending cards
  - `GET /cards/:id` — return card info + price history
- [ ] Store price data with timestamps for trend tracking
- [ ] Add script to update card prices daily (CRON job or manual)

📚 **Resources:**
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Express Docs](https://expressjs.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

## ✅ Phase 4: Price History Graph (Week 5–6)

**Goal:** Display card price history using a graph library.

- [x] When clicking a card, fetch and display historical data
- [x] Use Chart.js or Recharts for line graph
- [ ] Add toggle for 7, 30, 90-day views

📚 **Libraries:**
- [Chart.js](https://www.chartjs.org/)
- [Recharts](https://recharts.org/)

---

## ✅ Phase 5: UI Polish & Stock-Inspired Design (Week 6–7)

**Goal:** Make the app visually clean, usable, and stock-like.

- [ ] Add navigation bar, filters, badges (🔥, 📈)
- [ ] Use Tailwind or Material UI for styling
- [ ] Use dark mode or minimalistic finance-inspired themes
- [ ] Add loading states, hover effects, and nice transitions

---

## ✅ Phase 6: Hosting & Deployment (Week 7–8)

**Goal:** Deploy the full stack online so anyone can use it.

- [ ] Host frontend on [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/)
- [ ] Host backend on [Render](https://render.com/) or [Railway](https://railway.app/)
- [ ] Use MongoDB Atlas (or Supabase for SQL)
- [ ] Set up environment variables (API keys, DB URLs)
- [ ] Test CORS, error handling, and client-server connection

---

## 🧠 Stretch Features

- [ ] Add user accounts (Firebase Auth or Supabase)
- [ ] Let users favorite or watchlist cards
- [ ] Add real-time price updates or webhooks
- [ ] Compare cards side-by-side
- [ ] Scrape TCGPlayer or eBay for alternate price sources

---

## 📘 Learning Resources

| Topic              | Resource                                                              |
|--------------------|-----------------------------------------------------------------------|
| React              | [Scrimba React Course](https://scrimba.com/learn/learnreact)         |
| Express + MongoDB  | [The Odin Project Node Path](https://www.theodinproject.com/)        |
| API Testing        | [Postman](https://www.postman.com/) or Thunder Client (VS Code ext)  |
| Deployment         | [Vercel Docs](https://vercel.com/docs), [Render Docs](https://render.com/docs) |
| Charts             | [Chart.js Docs](https://www.chartjs.org/docs/latest/)                |

---

## 🏁 Final Result

A deployed full-stack app that:

✅ Shows trending Pokémon cards  
✅ Visualizes investment data like a stock site  
✅ Tracks historical prices in a database  
✅ Teaches you frontend, backend, API, database & deployment skills

---

## 🧾 License

MIT License. Built for learning and portfolio development.

