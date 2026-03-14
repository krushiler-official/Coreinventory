require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CoreInventory database...\n');

  // ── Users ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const staffHash = await bcrypt.hash('Staff@123', 12);

  const admin = await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: { loginId: 'admin', email: 'admin@coreinventory.io', password: adminHash, role: 'MANAGER' },
  });
  const staff = await prisma.user.upsert({
    where: { loginId: 'warehouse1' },
    update: {},
    create: { loginId: 'warehouse1', email: 'staff@coreinventory.io', password: staffHash, role: 'STAFF' },
  });
  console.log('✅ Users created  →  admin / Admin@123   |   warehouse1 / Staff@123');

  // ── Warehouses ─────────────────────────────────────────────────────────
  const wh1 = await prisma.warehouse.upsert({
    where: { code: 'WH' },
    update: {},
    create: { name: 'Main Warehouse', code: 'WH', address: '12, Industrial Estate, Mumbai' },
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { code: 'PF' },
    update: {},
    create: { name: 'Production Floor', code: 'PF', address: 'Unit 2, Factory Block' },
  });
  console.log('✅ Warehouses created');

  // ── Locations ──────────────────────────────────────────────────────────
  const locDefs = [
    { name: 'WH Stock 1',    code: 'WH/STOCK1',  warehouseId: wh1.id },
    { name: 'WH Stock 2',    code: 'WH/STOCK2',  warehouseId: wh1.id },
    { name: 'WH Input',      code: 'WH/INPUT',   warehouseId: wh1.id },
    { name: 'WH Output',     code: 'WH/OUTPUT',  warehouseId: wh1.id },
    { name: 'PF Rack A',     code: 'PF/RACK-A',  warehouseId: wh2.id },
    { name: 'PF Rack B',     code: 'PF/RACK-B',  warehouseId: wh2.id },
    { name: 'Vendor',        code: 'VENDOR',      warehouseId: wh1.id },
    { name: 'Customer',      code: 'CUSTOMER',    warehouseId: wh1.id },
  ];

  const locations = {};
  for (const l of locDefs) {
    const loc = await prisma.location.upsert({ where: { code: l.code }, update: {}, create: l });
    locations[l.code] = loc;
  }
  console.log('✅ Locations created');

  // ── Categories ─────────────────────────────────────────────────────────
  const catNames = ['Furniture', 'Materials', 'Packaging', 'Electronics', 'Stationery'];
  const cats = {};
  for (const name of catNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    cats[name] = c;
  }
  console.log('✅ Categories created');

  // ── Products ───────────────────────────────────────────────────────────
  const productDefs = [
    { name: 'Office Desk',       sku: 'DESK001',  categoryId: cats.Furniture.id,   uom: 'Units', reorderLevel: 10, costPerUnit: 3000 },
    { name: 'Office Chair',      sku: 'CHAIR001', categoryId: cats.Furniture.id,   uom: 'Units', reorderLevel: 15, costPerUnit: 2000 },
    { name: 'Steel Rods',        sku: 'STEEL001', categoryId: cats.Materials.id,   uom: 'kg',    reorderLevel: 20, costPerUnit: 500  },
    { name: 'Packing Boxes',     sku: 'BOX001',   categoryId: cats.Packaging.id,   uom: 'Box',   reorderLevel: 50, costPerUnit: 80   },
    { name: 'Ethernet Cable 5m', sku: 'CABLE001', categoryId: cats.Electronics.id, uom: 'Units', reorderLevel: 10, costPerUnit: 150  },
    { name: 'A4 Paper Ream',     sku: 'PAPER001', categoryId: cats.Stationery.id,  uom: 'Ream',  reorderLevel: 30, costPerUnit: 280  },
    { name: 'Whiteboard',        sku: 'WBD001',   categoryId: cats.Furniture.id,   uom: 'Units', reorderLevel: 5,  costPerUnit: 1500 },
  ];

  const products = {};
  for (const p of productDefs) {
    const prod = await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
    products[p.sku] = prod;
  }
  console.log('✅ Products created');

  // ── Initial stock ──────────────────────────────────────────────────────
  const stockDefs = [
    { sku: 'DESK001',  locCode: 'WH/STOCK1', qty: 50 },
    { sku: 'CHAIR001', locCode: 'WH/STOCK1', qty: 30 },
    { sku: 'STEEL001', locCode: 'WH/STOCK2', qty: 8  },
    { sku: 'BOX001',   locCode: 'WH/STOCK1', qty: 200 },
    { sku: 'CABLE001', locCode: 'WH/STOCK1', qty: 0  },
    { sku: 'PAPER001', locCode: 'WH/STOCK1', qty: 45 },
    { sku: 'WBD001',   locCode: 'PF/RACK-A', qty: 12 },
  ];

  for (const s of stockDefs) {
    await prisma.locationStock.upsert({
      where: { productId_locationId: { productId: products[s.sku].id, locationId: locations[s.locCode].id } },
      update: { onHand: s.qty },
      create: { productId: products[s.sku].id, locationId: locations[s.locCode].id, onHand: s.qty },
    });
  }
  console.log('✅ Initial stock set');

  // ── Sample operations ─────────────────────────────────────────────────
  const opDefs = [
    {
      reference: 'WH/IN/0001', type: 'RECEIPT', status: 'DONE', contact: 'Azure Interior',
      fromLocationId: locations['VENDOR'].id, toLocationId: locations['WH/STOCK1'].id,
      scheduledDate: new Date('2025-03-10'), userId: admin.id,
      lines: [{ productId: products['DESK001'].id, quantity: 6, doneQty: 6 }, { productId: products['CHAIR001'].id, quantity: 4, doneQty: 4 }],
    },
    {
      reference: 'WH/IN/0002', type: 'RECEIPT', status: 'READY', contact: 'Steel Corp Ltd',
      fromLocationId: locations['VENDOR'].id, toLocationId: locations['WH/STOCK2'].id,
      scheduledDate: new Date('2025-03-18'), userId: admin.id,
      lines: [{ productId: products['STEEL001'].id, quantity: 50, doneQty: 0 }],
    },
    {
      reference: 'WH/OUT/0001', type: 'DELIVERY', status: 'DONE', contact: 'RetailMart Pvt Ltd',
      fromLocationId: locations['WH/STOCK1'].id, toLocationId: locations['CUSTOMER'].id,
      scheduledDate: new Date('2025-03-12'), userId: admin.id,
      lines: [{ productId: products['DESK001'].id, quantity: 4, doneQty: 4 }],
    },
    {
      reference: 'WH/OUT/0002', type: 'DELIVERY', status: 'READY', contact: 'OfficeHub Solutions',
      fromLocationId: locations['WH/STOCK1'].id, toLocationId: locations['CUSTOMER'].id,
      scheduledDate: new Date('2025-03-20'), userId: staff.id,
      lines: [{ productId: products['CHAIR001'].id, quantity: 2, doneQty: 0 }],
    },
    {
      reference: 'WH/INT/0001', type: 'TRANSFER', status: 'DONE', contact: null,
      fromLocationId: locations['WH/STOCK1'].id, toLocationId: locations['PF/RACK-A'].id,
      scheduledDate: new Date('2025-03-11'), userId: staff.id,
      lines: [{ productId: products['DESK001'].id, quantity: 2, doneQty: 2 }],
    },
    {
      reference: 'WH/ADJ/0001', type: 'ADJUSTMENT', status: 'DONE', contact: null,
      fromLocationId: locations['WH/STOCK1'].id, toLocationId: locations['WH/STOCK1'].id,
      scheduledDate: new Date('2025-03-09'), userId: admin.id,
      lines: [{ productId: products['CABLE001'].id, quantity: 0, doneQty: 0 }],
    },
  ];

  for (const op of opDefs) {
    const { lines, ...opData } = op;
    await prisma.operation.upsert({
      where: { reference: op.reference },
      update: {},
      create: { ...opData, lines: { create: lines } },
    });
  }
  console.log('✅ Sample operations created');

  // ── Stock moves (ledger) ───────────────────────────────────────────────
  const moveDefs = [
    { reference: 'WH/IN/0001',  type: 'RECEIPT',    productId: products['DESK001'].id,  quantity: 6,   fromLocationId: locations['VENDOR'].id,      toLocationId: locations['WH/STOCK1'].id, movedAt: new Date('2025-03-10') },
    { reference: 'WH/IN/0001',  type: 'RECEIPT',    productId: products['CHAIR001'].id, quantity: 4,   fromLocationId: locations['VENDOR'].id,      toLocationId: locations['WH/STOCK1'].id, movedAt: new Date('2025-03-10') },
    { reference: 'WH/OUT/0001', type: 'DELIVERY',   productId: products['DESK001'].id,  quantity: -4,  fromLocationId: locations['WH/STOCK1'].id,   toLocationId: locations['CUSTOMER'].id,  movedAt: new Date('2025-03-12') },
    { reference: 'WH/INT/0001', type: 'TRANSFER',   productId: products['DESK001'].id,  quantity: 2,   fromLocationId: locations['WH/STOCK1'].id,   toLocationId: locations['PF/RACK-A'].id, movedAt: new Date('2025-03-11') },
    { reference: 'WH/ADJ/0001', type: 'ADJUSTMENT', productId: products['CABLE001'].id, quantity: -5,  fromLocationId: locations['WH/STOCK1'].id,   toLocationId: locations['WH/STOCK1'].id, movedAt: new Date('2025-03-09') },
  ];

  for (const m of moveDefs) {
    await prisma.stockMove.create({ data: { ...m, userId: admin.id } });
  }
  console.log('✅ Move history seeded');

  console.log('\n🎉 Seed complete!\n');
  console.log('   Login credentials:');
  console.log('   ├── admin       / Admin@123  (Manager)');
  console.log('   └── warehouse1  / Staff@123  (Staff)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
