import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

router.get('/db-test', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

export default router;