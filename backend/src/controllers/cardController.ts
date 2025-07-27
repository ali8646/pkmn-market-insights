import prisma from '../../prisma/client';
import { Request, Response } from 'express';

export const getTopOrBottomCards = async (req: Request, res: Response) => {
  try {
    // Example: sort by "price" column from "cards" table, get top/bottom 15
    const { sort = 'desc', column = 'price' } = req.query;

    const cards = await prisma.price_change.findMany({
      // orderBy: { [column as string]: sort === 'asc' ? 'asc' : 'desc' },
      take: 15,
    });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};