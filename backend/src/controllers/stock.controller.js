// stock.controller.js
const prisma = require('../config/prisma');

const getStockByLocation = async (req, res, next) => {
  try {
    const { locationId, warehouseId, lowStock } = req.query;
    const where = {};
    if (locationId) where.locationId = locationId;
    if (warehouseId) where.location = { warehouseId };
    if (lowStock === 'true') where.AND = [{ onHand: { lte: prisma.product.fields?.reorderLevel } }];

    const stocks = await prisma.locationStock.findMany({
      where,
      include: {
        product: { include: { category: true } },
        location: { include: { warehouse: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const result = stocks.map((s) => ({
      ...s,
      isLow: s.onHand <= s.product.reorderLevel,
    }));

    res.json(result);
  } catch (err) { next(err); }
};

const getMoveHistory = async (req, res, next) => {
  try {
    const { type, productId, fromDate, toDate, page = 1, limit = 100 } = req.query;
    const where = {};
    if (type) where.type = type.toUpperCase();
    if (productId) where.productId = productId;
    if (fromDate || toDate) {
      where.movedAt = {};
      if (fromDate) where.movedAt.gte = new Date(fromDate);
      if (toDate) where.movedAt.lte = new Date(toDate);
    }

    const [moves, total] = await Promise.all([
      prisma.stockMove.findMany({
        where,
        include: {
          product: true,
          fromLocation: { include: { warehouse: true } },
          toLocation: { include: { warehouse: true } },
          doneBy: { select: { loginId: true } },
        },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
        orderBy: { movedAt: 'desc' },
      }),
      prisma.stockMove.count({ where }),
    ]);

    res.json({ data: moves, total });
  } catch (err) { next(err); }
};

module.exports = { getStockByLocation, getMoveHistory };
