const prisma = require('../config/prisma');

const getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      stocks,
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers,
      pendingAdjustments,
      lateReceipts,
      lateDeliveries,
      recentMoves,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.locationStock.findMany({ include: { product: true } }),
      prisma.operation.count({ where: { type: 'RECEIPT', status: { in: ['READY', 'WAITING'] } } }),
      prisma.operation.count({ where: { type: 'DELIVERY', status: { in: ['READY', 'WAITING'] } } }),
      prisma.operation.count({ where: { type: 'TRANSFER', status: { in: ['READY', 'WAITING'] } } }),
      prisma.operation.count({ where: { type: 'ADJUSTMENT', status: 'DRAFT' } }),
      prisma.operation.count({ where: { type: 'RECEIPT', status: 'READY', scheduledDate: { lt: today } } }),
      prisma.operation.count({ where: { type: 'DELIVERY', status: 'READY', scheduledDate: { lt: today } } }),
      prisma.stockMove.findMany({
        take: 10,
        orderBy: { movedAt: 'desc' },
        include: { product: true, fromLocation: true, toLocation: true },
      }),
    ]);

    // Low stock products
    const productStockMap = {};
    stocks.forEach((s) => {
      if (!productStockMap[s.productId]) productStockMap[s.productId] = { onHand: 0, reorderLevel: s.product.reorderLevel };
      productStockMap[s.productId].onHand += s.onHand;
    });
    const lowStockCount = Object.values(productStockMap).filter((p) => p.onHand <= p.reorderLevel).length;

    // Total stock value
    const totalValue = stocks.reduce((sum, s) => sum + s.onHand * s.product.costPerUnit, 0);

    // Top 5 products by stock
    const topProducts = Object.entries(productStockMap)
      .sort((a, b) => b[1].onHand - a[1].onHand)
      .slice(0, 5)
      .map(([id, s]) => ({ id, ...s }));

    res.json({
      totalProducts,
      lowStockCount,
      totalValue: Math.round(totalValue),
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers,
      pendingAdjustments,
      lateReceipts,
      lateDeliveries,
      recentMoves,
      topProducts,
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboard };
