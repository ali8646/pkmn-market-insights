import prisma from '../../prisma/client';
import { Request, Response } from 'express';

const sortFields = {
  current_price: 'current_price',
  price_change: 'change_7d_dollar',
  percentage_change: 'change_7d_pct',
} as const;

type SortField = keyof typeof sortFields;

const isSortField = (value: unknown): value is SortField =>
  typeof value === 'string' && value in sortFields;

const isSortOrder = (value: unknown): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc';

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const serializeCard = (card: {
  product_id: number;
  current_price: unknown;
  change_7d_pct: unknown;
  products: {
    name: string;
    image_url: string | null;
    group_id: number | null;
    groups: { group_name: string } | null;
  };
}) => ({
  productId: card.product_id,
  name: card.products.name,
  set: card.products.groups?.group_name ?? 'Unknown set',
  imageUrl: card.products.image_url,
  price: card.current_price === null ? null : Number(card.current_price),
  percentChange: card.change_7d_pct === null ? null : Number(card.change_7d_pct),
});

export const getTopOrBottomCards = async (req: Request, res: Response) => {
  try {
    const { sort = 'desc', column = 'current_price', search = '' } = req.query;
    const sortColumn = isSortField(column) ? sortFields[column] : sortFields.current_price;
    const sortOrder = isSortOrder(sort) ? sort : 'desc';
    const limit = Math.min(parsePositiveInt(req.query.limit, 25), 100);
    const offset = parsePositiveInt(req.query.offset, 0);
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    const where = searchTerm
      ? {
          products: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' as const } },
              { clean_name: { contains: searchTerm, mode: 'insensitive' as const } },
              {
                groups: {
                  group_name: { contains: searchTerm, mode: 'insensitive' as const },
                },
              },
            ],
          },
        }
      : undefined;

    const [cards, total] = await Promise.all([
      prisma.price_change.findMany({
        where,
        orderBy: {
          [sortColumn]: sortOrder,
        },
        include: {
          products: {
            include: { groups: { select: { group_name: true } } },
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.price_change.count({ where }),
    ]);

    res.json({
      data: cards.map(serializeCard),
      pagination: { total, limit, offset, hasMore: offset + cards.length < total },
    });
  } catch (error) {
    console.error('Failed to fetch cards', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
};

export const getTrackedCards = async (_req: Request, res: Response) => {
  try {
    const cards = await prisma.tracked_card.findMany({
      where: { active: true },
      orderBy: { started_at: 'asc' },
      include: {
        products: {
          include: {
            groups: { select: { group_name: true } },
            price_change: true,
          },
        },
      },
    });

    res.json(cards.map(({ products }) => serializeCard({
      product_id: products.product_id,
      current_price: products.price_change?.current_price ?? null,
      change_7d_pct: products.price_change?.change_7d_pct ?? null,
      products,
    })));
  } catch (error) {
    console.error('Failed to fetch tracked cards', error);
    res.status(500).json({ error: 'Failed to fetch tracked cards' });
  }
};

export const getTrackedCardHistory = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ error: 'productId must be a positive integer' });
    return;
  }

  try {
    const tracked = await prisma.tracked_card.findUnique({
      where: { product_id: productId, active: true },
    });
    if (!tracked) {
      res.status(404).json({ error: 'Card is not actively tracked' });
      return;
    }

    const history = await prisma.price_history.findMany({
      where: { product_id: productId },
      orderBy: { date_point: 'asc' },
      distinct: ['date_point'],
      select: {
        date_point: true,
        market_price: true,
        close_price: true,
        volume: true,
      },
    });

    res.json(history.map((point) => ({
      date: point.date_point,
      price: point.market_price === null && point.close_price === null
        ? null
        : Number(point.market_price ?? point.close_price),
      volume: point.volume,
    })));
  } catch (error) {
    console.error('Failed to fetch tracked card history', error);
    res.status(500).json({ error: 'Failed to fetch tracked card history' });
  }
};