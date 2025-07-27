import { Router } from 'express';
import { getTopOrBottomCards } from '../controllers/cardController';

const router = Router();

router.get('/cards/top-bottom', getTopOrBottomCards);

export default router;