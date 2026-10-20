import cors from 'cors';
import express from 'express';
import cardRoutes from './routes/cardRoutes';
import newsRoutes from './routes/newsRoutes';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}));
app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api', cardRoutes);
app.use('/api', newsRoutes);

export default app;