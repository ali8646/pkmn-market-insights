import { Router } from 'express';
import { getTopOrBottomCards } from '../controllers/cardController';

const router = Router();

router.get('/price_change/top-bottom', getTopOrBottomCards);

export default router;