import { Router } from 'express';
import {
  getTopOrBottomCards,
  getTrackedCardHistory,
  getTrackedCards,
} from '../controllers/cardController';

const router = Router();

router.get('/price_change/top-bottom', getTopOrBottomCards);
router.get('/tracked-cards', getTrackedCards);
router.get('/tracked-cards/:productId/history', getTrackedCardHistory);

export default router;