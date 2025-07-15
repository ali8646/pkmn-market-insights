import express, { Request, Response } from 'express';
import testDbRoute from './routes/testDb';

const app = express();

app.use(express.json());

// Example/test DB route
app.use(testDbRoute);

app.get('/', (_req: Request, res: Response) => {
  res.send('API is running!');
});

export default app;