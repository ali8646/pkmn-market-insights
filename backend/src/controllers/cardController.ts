import prisma from '../../prisma/client';
import { Request, Response } from 'express';

export const getTopOrBottomCards = async (req: Request, res: Response) => {
  try {
    const { sort = 'desc', column = 'current_price' } = req.query;
    
    // Validate allowed columns for security
    const allowedColumns = ['current_price', 'price_change', 'percentage_change', 'productId'];
    const sortColumn = allowedColumns.includes(column as string) ? column as string : 'current_price';
    const sortOrder = sort === 'asc' ? 'asc' : 'desc';

    const cards = await prisma.price_change.findMany({
      orderBy: {
        [sortColumn]: sortOrder,
      },
      take: 15,
    });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};