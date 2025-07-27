import express from 'express';
import cardRoutes from './routes/cardRoutes';

const app = express();

app.use(express.json());
app.use('/api', cardRoutes);

export default app;