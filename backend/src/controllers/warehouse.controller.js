const prisma = require('../config/prisma');

const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { locations: true },
      orderBy: { name: 'asc' },
    });
    res.json(warehouses);
  } catch (err) { next(err); }
};

const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code required.' });

    const wh = await prisma.warehouse.create({ data: { name, code: code.toUpperCase(), address } });

    // Auto-create Stock and Input/Output locations
    await prisma.location.createMany({
      data: [
        { name: `${wh.code} Stock`, code: `${wh.code}/STOCK`, warehouseId: wh.id },
        { name: `${wh.code} Input`, code: `${wh.code}/INPUT`, warehouseId: wh.id },
        { name: `${wh.code} Output`, code: `${wh.code}/OUTPUT`, warehouseId: wh.id },
      ],
    });

    const full = await prisma.warehouse.findUnique({ where: { id: wh.id }, include: { locations: true } });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

const updateWarehouse = async (req, res, next) => {
  try {
    const wh = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(wh);
  } catch (err) { next(err); }
};

const getLocations = async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const locations = await prisma.location.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { warehouse: true },
      orderBy: { name: 'asc' },
    });
    res.json(locations);
  } catch (err) { next(err); }
};

const createLocation = async (req, res, next) => {
  try {
    const { name, code, warehouseId } = req.body;
    if (!name || !code || !warehouseId) return res.status(400).json({ error: 'Name, code and warehouse required.' });
    const loc = await prisma.location.create({
      data: { name, code: code.toUpperCase(), warehouseId },
      include: { warehouse: true },
    });
    res.status(201).json(loc);
  } catch (err) { next(err); }
};

module.exports = { getWarehouses, createWarehouse, updateWarehouse, getLocations, createLocation };
