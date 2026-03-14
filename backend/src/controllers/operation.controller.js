const prisma = require('../config/prisma');

// ─── Reference number generator ──────────────────────────────────────────
const genRef = async (prefix) => {
  const count = await prisma.operation.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}/${String(count + 1).padStart(4, '0')}`;
};

// ─── GET operations (with filters) ───────────────────────────────────────
const getOperations = async (req, res, next) => {
  try {
    const { type, status, warehouseId, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (type) where.type = type.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const ops = await prisma.operation.findMany({
      where,
      include: {
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
        lines: { include: { product: true } },
        createdBy: { select: { loginId: true } },
      },
      skip: (page - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.operation.count({ where });
    res.json({ data: ops, total });
  } catch (err) {
    next(err);
  }
};

// ─── GET single operation ─────────────────────────────────────────────────
const getOperation = async (req, res, next) => {
  try {
    const op = await prisma.operation.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
        lines: { include: { product: { include: { category: true } } } },
        createdBy: { select: { loginId: true, email: true } },
        moves: { include: { product: true, fromLocation: true, toLocation: true } },
      },
    });
    res.json(op);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE receipt ───────────────────────────────────────────────────────
const createReceipt = async (req, res, next) => {
  try {
    const { contact, toLocationId, scheduledDate, lines } = req.body;
    if (!toLocationId || !lines?.length) {
      return res.status(400).json({ error: 'Destination location and at least one product line required.' });
    }

    const wh = await prisma.location.findUnique({ where: { id: toLocationId }, include: { warehouse: true } });
    const ref = await genRef(`${wh.warehouse.code}/IN`);

    // Vendor location (system)
    const vendorLoc = await prisma.location.findFirst({ where: { code: 'VENDOR' } });

    const op = await prisma.operation.create({
      data: {
        reference: ref,
        type: 'RECEIPT',
        status: 'READY',
        contact,
        fromLocationId: vendorLoc?.id,
        toLocationId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        userId: req.user.id,
        lines: {
          create: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
        },
      },
      include: { lines: { include: { product: true } }, toLocation: true },
    });
    res.status(201).json(op);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE delivery ──────────────────────────────────────────────────────
const createDelivery = async (req, res, next) => {
  try {
    const { contact, fromLocationId, scheduledDate, lines } = req.body;
    if (!fromLocationId || !lines?.length) {
      return res.status(400).json({ error: 'Source location and lines required.' });
    }

    // Check stock
    for (const l of lines) {
      const stock = await prisma.locationStock.findUnique({
        where: { productId_locationId: { productId: l.productId, locationId: fromLocationId } },
      });
      if (!stock || stock.onHand < Number(l.quantity)) {
        const prod = await prisma.product.findUnique({ where: { id: l.productId } });
        return res.status(400).json({ error: `Insufficient stock for ${prod?.name || l.productId}.` });
      }
    }

    const wh = await prisma.location.findUnique({ where: { id: fromLocationId }, include: { warehouse: true } });
    const ref = await genRef(`${wh.warehouse.code}/OUT`);
    const customerLoc = await prisma.location.findFirst({ where: { code: 'CUSTOMER' } });

    const op = await prisma.operation.create({
      data: {
        reference: ref,
        type: 'DELIVERY',
        status: 'READY',
        contact,
        fromLocationId,
        toLocationId: customerLoc?.id,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        userId: req.user.id,
        lines: {
          create: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
        },
      },
      include: { lines: { include: { product: true } }, fromLocation: true },
    });
    res.status(201).json(op);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE internal transfer ─────────────────────────────────────────────
const createTransfer = async (req, res, next) => {
  try {
    const { fromLocationId, toLocationId, scheduledDate, lines } = req.body;
    if (fromLocationId === toLocationId) {
      return res.status(400).json({ error: 'Source and destination must differ.' });
    }
    const ref = await genRef('WH/INT');
    const op = await prisma.operation.create({
      data: {
        reference: ref,
        type: 'TRANSFER',
        status: 'READY',
        fromLocationId,
        toLocationId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        userId: req.user.id,
        lines: {
          create: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
        },
      },
      include: { lines: { include: { product: true } } },
    });
    res.status(201).json(op);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE adjustment ────────────────────────────────────────────────────
const createAdjustment = async (req, res, next) => {
  try {
    const { productId, locationId, physicalCount } = req.body;
    const physical = Number(physicalCount);

    const current = await prisma.locationStock.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });
    const recorded = current?.onHand ?? 0;
    const diff = physical - recorded;

    const ref = await genRef('WH/ADJ');

    const result = await prisma.$transaction(async (tx) => {
      const op = await tx.operation.create({
        data: {
          reference: ref,
          type: 'ADJUSTMENT',
          status: 'DONE',
          fromLocationId: locationId,
          toLocationId: locationId,
          userId: req.user.id,
          lines: {
            create: [{ productId, quantity: physical, doneQty: physical }],
          },
        },
      });

      // Update stock
      await tx.locationStock.upsert({
        where: { productId_locationId: { productId, locationId } },
        update: { onHand: physical },
        create: { productId, locationId, onHand: physical },
      });

      // Write ledger
      await tx.stockMove.create({
        data: {
          reference: ref,
          type: 'ADJUSTMENT',
          productId,
          quantity: diff,
          fromLocationId: locationId,
          toLocationId: locationId,
          operationId: op.id,
          userId: req.user.id,
        },
      });

      return { op, recorded, physical, diff };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── VALIDATE operation ───────────────────────────────────────────────────
const validateOperation = async (req, res, next) => {
  try {
    const op = await prisma.operation.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { lines: true, fromLocation: true, toLocation: true },
    });

    if (op.status === 'DONE') return res.status(400).json({ error: 'Already validated.' });
    if (op.status === 'CANCELLED') return res.status(400).json({ error: 'Operation is cancelled.' });

    await prisma.$transaction(async (tx) => {
      const moves = [];

      for (const line of op.lines) {
        if (op.type === 'RECEIPT') {
          // Increase destination stock
          await tx.locationStock.upsert({
            where: { productId_locationId: { productId: line.productId, locationId: op.toLocationId } },
            update: { onHand: { increment: line.quantity } },
            create: { productId: line.productId, locationId: op.toLocationId, onHand: line.quantity },
          });
        } else if (op.type === 'DELIVERY') {
          // Decrease source stock
          const stock = await tx.locationStock.findUnique({
            where: { productId_locationId: { productId: line.productId, locationId: op.fromLocationId } },
          });
          if (!stock || stock.onHand < line.quantity) throw new Error(`Insufficient stock for product ${line.productId}`);
          await tx.locationStock.update({
            where: { productId_locationId: { productId: line.productId, locationId: op.fromLocationId } },
            data: { onHand: { decrement: line.quantity } },
          });
        } else if (op.type === 'TRANSFER') {
          const stock = await tx.locationStock.findUnique({
            where: { productId_locationId: { productId: line.productId, locationId: op.fromLocationId } },
          });
          if (!stock || stock.onHand < line.quantity) throw new Error(`Insufficient stock for transfer.`);
          await tx.locationStock.update({
            where: { productId_locationId: { productId: line.productId, locationId: op.fromLocationId } },
            data: { onHand: { decrement: line.quantity } },
          });
          await tx.locationStock.upsert({
            where: { productId_locationId: { productId: line.productId, locationId: op.toLocationId } },
            update: { onHand: { increment: line.quantity } },
            create: { productId: line.productId, locationId: op.toLocationId, onHand: line.quantity },
          });
        }

        moves.push({
          reference: op.reference,
          type: op.type,
          productId: line.productId,
          quantity: op.type === 'DELIVERY' ? -line.quantity : line.quantity,
          fromLocationId: op.fromLocationId,
          toLocationId: op.toLocationId,
          operationId: op.id,
          userId: req.user.id,
        });
      }

      await tx.stockMove.createMany({ data: moves });
      await tx.operation.update({ where: { id: op.id }, data: { status: 'DONE' } });
    });

    const updated = await prisma.operation.findUnique({
      where: { id: op.id },
      include: { lines: { include: { product: true } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ─── CANCEL operation ─────────────────────────────────────────────────────
const cancelOperation = async (req, res, next) => {
  try {
    const op = await prisma.operation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(op);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOperations, getOperation,
  createReceipt, createDelivery, createTransfer, createAdjustment,
  validateOperation, cancelOperation,
};
