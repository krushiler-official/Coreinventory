const prisma = require('../config/prisma');

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      const parsed = Number(category);
      if (!Number.isNaN(parsed) && parsed > 0) {
        where.categoryId = parsed;
      } else {
        where.category = { name: { equals: String(category), mode: 'insensitive' } };
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, stocks: { include: { location: true } } },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    const result = products.map((p) => ({
      ...p,
      totalStock: p.stocks.reduce((s, ls) => s + ls.onHand, 0),
      isLowStock: p.stocks.reduce((s, ls) => s + ls.onHand, 0) <= p.reorderLevel,
    }));

    res.json({ data: result, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        category: true,
        stocks: { include: { location: { include: { warehouse: true } } } },
      },
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, categoryName, uom, initialStock, reorderLevel, costPerUnit } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required.' });

    // Upsert category
    let categoryId;
    if (categoryName) {
      const cat = await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });
      categoryId = cat.id;
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku.toUpperCase(),
        categoryId,
        uom: uom || 'Units',
        reorderLevel: Number(reorderLevel) || 10,
        costPerUnit: Number(costPerUnit) || 0,
      },
      include: { category: true },
    });

    // Set initial stock in default location if provided
    if (initialStock && Number(initialStock) > 0) {
      const defaultLoc = await prisma.location.findFirst({ orderBy: { createdAt: 'asc' } });
      if (defaultLoc) {
        await prisma.locationStock.upsert({
          where: { productId_locationId: { productId: product.id, locationId: defaultLoc.id } },
          update: { onHand: { increment: Number(initialStock) } },
          create: { productId: product.id, locationId: defaultLoc.id, onHand: Number(initialStock) },
        });
      }
    }

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, categoryName, uom, reorderLevel, costPerUnit } = req.body;

    let categoryId;
    if (categoryName) {
      const cat = await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName },
      });
      categoryId = cat.id;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(sku && { sku: sku.toUpperCase() }),
        ...(categoryId && { categoryId }),
        ...(uom && { uom }),
        ...(reorderLevel !== undefined && { reorderLevel: Number(reorderLevel) }),
        ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
      },
      include: { category: true },
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories };
