import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'stocksense.sqlite');

let dbInstance: Database | null = null;

// Persist the in-memory SQLite database to disk
export function persistDatabase() {
  if (!dbInstance) return;
  try {
    const binaryArray = dbInstance.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('[StockSense DB] Error persisting database to disk:', err);
  }
}

// Convert params to SQLite-compatible values (boolean -> 1/0, null/undefined -> null)
function sanitizeParams(params: any[]): any[] {
  return params.map(p => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p === undefined) return null;
    return p;
  });
}

// Execute query that doesn't return data (INSERT, UPDATE, DELETE, CREATE)
export async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  if (!dbInstance) throw new Error('Database not initialized');
  const cleanParams = sanitizeParams(params);
  
  if (cleanParams.length > 0) {
    dbInstance.run(sql, cleanParams);
  } else {
    dbInstance.run(sql);
  }
  
  // Persist after mutations
  persistDatabase();
  return { lastID: 0, changes: 1 };
}

// Query returning single row
export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, params);
  return rows[0];
}

// Query returning multiple rows
export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!dbInstance) throw new Error('Database not initialized');
  const cleanParams = sanitizeParams(params);

  let stmt: any;
  try {
    stmt = dbInstance.prepare(sql);
    if (cleanParams.length > 0) {
      stmt.bind(cleanParams);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    if (stmt) stmt.free();
    console.error('[StockSense DB Query Error]:', sql, cleanParams, err);
    throw err;
  }
}

// Initialize tables and run migrations
export async function initializeDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      dbInstance = new SQL.Database(fileBuffer);
      console.log('[StockSense DB] Loaded existing SQLite database from disk.');
    } catch (e) {
      console.warn('[StockSense DB] Failed to load disk DB, creating fresh instance:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log('[StockSense DB] Initialized fresh SQLite database.');
  }

  // 1. Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Inventory Manager',
      department TEXT DEFAULT 'Logistics & Supply Chain',
      created_at TEXT NOT NULL
    );
  `);

  // 2. Password resets table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 3. Warehouses table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      contact_person TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Locations table (within warehouses)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'internal',
      zone TEXT,
      rack TEXT,
      shelf TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Products table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      category TEXT NOT NULL,
      unit_of_measure TEXT NOT NULL DEFAULT 'Units',
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      min_stock REAL DEFAULT 10,
      reorder_point REAL DEFAULT 20,
      max_stock REAL DEFAULT 150,
      lead_time_days INTEGER DEFAULT 7,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 6. Stock levels per location
  await dbRun(`
    CREATE TABLE IF NOT EXISTS stock_levels (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      reserved_quantity REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(product_id, warehouse_id, location_id)
    );
  `);

  // 7. Operations table (Receipts, Deliveries, Internal Transfers, Adjustments)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      op_type TEXT NOT NULL,
      reference_no TEXT UNIQUE NOT NULL,
      partner_name TEXT,
      source_warehouse_id TEXT,
      source_location_id TEXT,
      dest_warehouse_id TEXT,
      dest_location_id TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      picking_status TEXT DEFAULT 'Pending',
      scheduled_date TEXT,
      adjustment_reason TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      validated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 8. Operation lines
  await dbRun(`
    CREATE TABLE IF NOT EXISTS operation_lines (
      id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      demand_qty REAL NOT NULL,
      done_qty REAL NOT NULL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      notes TEXT
    );
  `);

  // 9. Stock ledger (Strictly Append-Only Source of Truth)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      operation_id TEXT,
      op_type TEXT NOT NULL,
      reference_no TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      source_warehouse_id TEXT,
      source_location_id TEXT,
      dest_warehouse_id TEXT,
      dest_location_id TEXT,
      quantity_delta REAL NOT NULL,
      balance_after REAL NOT NULL,
      reason TEXT,
      performed_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await seedInitialData();
  persistDatabase();
}

async function seedInitialData() {
  const userCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Seed demo user (password is "stocksense123")
  await dbRun(
    `INSERT INTO users (id, name, email, password_hash, role, department, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['usr_demo', 'Alex Morgan', 'alex@stocksense.io', 'stocksense123', 'Head of Logistics & Inventory', 'Global Operations', now]
  );

  // 2. Seed Warehouses
  const warehouses = [
    { id: 'wh_main', code: 'WH-MAIN', name: 'Central Logistics Hub', address: 'Building 4, Commerce Parkway, Chicago, IL', contact: 'Mark Evans', phone: '+1 312-555-0199' },
    { id: 'wh_north', code: 'WH-NORTH', name: 'North Express Depository', address: '88 Industrial Way, Minneapolis, MN', contact: 'Sarah Lin', phone: '+1 612-555-0144' },
    { id: 'wh_retail', code: 'WH-RETAIL', name: 'Downtown Distribution Backroom', address: '142 Market Street, Chicago, IL', contact: 'David Rossi', phone: '+1 312-555-0288' }
  ];

  for (const wh of warehouses) {
    await dbRun(
      `INSERT INTO warehouses (id, code, name, address, contact_person, phone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [wh.id, wh.code, wh.name, wh.address, wh.contact, wh.phone, now]
    );
  }

  // 3. Seed Locations
  const locations = [
    { id: 'loc_main_inbound', wh: 'wh_main', code: 'MAIN/INBOUND', name: 'Inbound Receiving Bay', type: 'inbound', zone: 'Zone A', rack: 'Dock 1' },
    { id: 'loc_main_zone_a', wh: 'wh_main', code: 'MAIN/STORAGE-A1', name: 'High-Density Storage A-1', type: 'internal', zone: 'Zone A', rack: 'Rack 01', shelf: 'Shelf 1-3' },
    { id: 'loc_main_zone_b', wh: 'wh_main', code: 'MAIN/STORAGE-B2', name: 'Pallet Racking Zone B', type: 'internal', zone: 'Zone B', rack: 'Rack 04', shelf: 'Level 2' },
    { id: 'loc_main_outbound', wh: 'wh_main', code: 'MAIN/OUTBOUND', name: 'Outbound Packing & Staging', type: 'outbound', zone: 'Zone C', rack: 'Dock 4' },
    { id: 'loc_north_general', wh: 'wh_north', code: 'NORTH/MAIN-BAY', name: 'North General Depot', type: 'internal', zone: 'Zone 1', rack: 'Bay 02' },
    { id: 'loc_north_cold', wh: 'wh_north', code: 'NORTH/SECURE-01', name: 'Secure Component Vault', type: 'internal', zone: 'Vault', rack: 'Cabinet A' },
    { id: 'loc_retail_shelf', wh: 'wh_retail', code: 'RETAIL/SHELF-FRONT', name: 'Front Storage Floor', type: 'internal', zone: 'Front', rack: 'Shelf 01' },
    { id: 'loc_retail_back', wh: 'wh_retail', code: 'RETAIL/BACK-STOCK', name: 'Backroom Overstock', type: 'internal', zone: 'Back', rack: 'Shelf B3' }
  ];

  for (const loc of locations) {
    await dbRun(
      `INSERT INTO locations (id, warehouse_id, code, name, type, zone, rack, shelf, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loc.id, loc.wh, loc.code, loc.name, loc.type, loc.zone || null, loc.rack || null, loc.shelf || null, now]
    );
  }

  // 4. Seed Products
  const products = [
    {
      id: 'prod_1',
      name: 'Smart IoT Gateway Pro v2',
      sku: 'SKU-IOT-8802',
      barcode: '890123450001',
      category: 'Electronics',
      uom: 'Units',
      cost: 45.0,
      sale: 89.99,
      min_stock: 25,
      reorder: 40,
      max_stock: 200,
      lead_time: 14,
      desc: 'Industrial IoT edge gateway with dual ethernet and 4G failover.'
    },
    {
      id: 'prod_2',
      name: 'High-Torque Stepper Motor NEMA 23',
      sku: 'SKU-MOT-4120',
      barcode: '890123450002',
      category: 'Robotics & Motors',
      uom: 'Units',
      cost: 22.5,
      sale: 49.50,
      min_stock: 15,
      reorder: 30,
      max_stock: 120,
      lead_time: 10,
      desc: 'Bipolar 2.8A stepper motor for CNC and automated pick-and-place lines.'
    },
    {
      id: 'prod_3',
      name: 'Shielded CAT6A Industrial Cable (100m)',
      sku: 'SKU-CAB-6100',
      barcode: '890123450003',
      category: 'Cabling & Networking',
      uom: 'Boxes',
      cost: 38.0,
      sale: 74.00,
      min_stock: 10,
      reorder: 20,
      max_stock: 80,
      lead_time: 5,
      desc: 'Double-shielded ruggedized industrial Ethernet spool.'
    },
    {
      id: 'prod_4',
      name: 'DIN-Rail Power Supply 24V 10A',
      sku: 'SKU-PWR-2410',
      barcode: '890123450004',
      category: 'Electronics',
      uom: 'Units',
      cost: 31.0,
      sale: 62.00,
      min_stock: 20,
      reorder: 35,
      max_stock: 150,
      lead_time: 8,
      desc: 'Efficiency 93% industrial DIN-rail power unit with surge protection.'
    },
    {
      id: 'prod_5',
      name: 'Heavy-Duty Anti-Static ESD Bin (L)',
      sku: 'SKU-BIN-7022',
      barcode: '890123450005',
      category: 'Packaging & Storage',
      uom: 'Units',
      cost: 8.5,
      sale: 18.00,
      min_stock: 40,
      reorder: 60,
      max_stock: 300,
      lead_time: 4,
      desc: 'Conductive polypropylene stackable bin for sensitive board staging.'
    },
    {
      id: 'prod_6',
      name: 'Precision Barcode & QR Scanner USB-C',
      sku: 'SKU-SCN-3011',
      barcode: '890123450006',
      category: 'Hardware Tools',
      uom: 'Units',
      cost: 54.0,
      sale: 119.00,
      min_stock: 8,
      reorder: 15,
      max_stock: 50,
      lead_time: 12,
      desc: 'Rugged IP65 2D imager with drop resistance up to 2 meters.'
    },
    {
      id: 'prod_7',
      name: 'Thermal Transfer Label Roll (2000 pcs)',
      sku: 'SKU-LBL-2000',
      barcode: '890123450007',
      category: 'Packaging & Storage',
      uom: 'Rolls',
      cost: 12.0,
      sale: 24.50,
      min_stock: 30,
      reorder: 50,
      max_stock: 250,
      lead_time: 3,
      desc: 'Resin-compatible weather-resistant label roll for warehouse pallets.'
    },
    {
      id: 'prod_8',
      name: 'Micro-Controller Sensor Node ESP32-S3',
      sku: 'SKU-MCU-5520',
      barcode: '890123450008',
      category: 'Electronics',
      uom: 'Units',
      cost: 6.8,
      sale: 16.50,
      min_stock: 50,
      reorder: 80,
      max_stock: 400,
      lead_time: 7,
      desc: 'Dual-core Xtensa LX7 MCU module with Wi-Fi and Bluetooth LE 5.'
    }
  ];

  for (const p of products) {
    await dbRun(
      `INSERT INTO products (id, name, sku, barcode, category, unit_of_measure, cost_price, sale_price, min_stock, reorder_point, max_stock, lead_time_days, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.sku, p.barcode, p.category, p.uom, p.cost, p.sale, p.min_stock, p.reorder, p.max_stock, p.lead_time, p.desc, now, now]
    );
  }

  // 5. Initial stock levels & corresponding Stock Ledger entries
  const initialStock = [
    { prod: products[0], wh: 'wh_main', loc: 'loc_main_zone_a', qty: 35 },
    { prod: products[0], wh: 'wh_north', loc: 'loc_north_general', qty: 13 },
    { prod: products[1], wh: 'wh_main', loc: 'loc_main_zone_b', qty: 6 },
    { prod: products[1], wh: 'wh_north', loc: 'loc_north_cold', qty: 2 },
    { prod: products[2], wh: 'wh_main', loc: 'loc_main_zone_b', qty: 18 },
    { prod: products[2], wh: 'wh_retail', loc: 'loc_retail_back', qty: 4 },
    { prod: products[3], wh: 'wh_main', loc: 'loc_main_zone_a', qty: 5 },
    { prod: products[4], wh: 'wh_main', loc: 'loc_main_zone_a', qty: 100 },
    { prod: products[4], wh: 'wh_north', loc: 'loc_north_general', qty: 40 },
    { prod: products[5], wh: 'wh_main', loc: 'loc_main_zone_a', qty: 8 },
    { prod: products[5], wh: 'wh_retail', loc: 'loc_retail_shelf', qty: 4 },
    { prod: products[6], wh: 'wh_main', loc: 'loc_main_zone_b', qty: 65 },
    { prod: products[6], wh: 'wh_north', loc: 'loc_north_general', qty: 20 }
  ];

  let ledgerCounter = 1;
  for (const item of initialStock) {
    const stockLevelId = `stk_${item.prod.id}_${item.loc}`;
    await dbRun(
      `INSERT INTO stock_levels (id, product_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [stockLevelId, item.prod.id, item.wh, item.loc, item.qty, now]
    );

    await dbRun(
      `INSERT INTO stock_ledger (
        id, timestamp, operation_id, op_type, reference_no,
        product_id, product_name, sku,
        dest_warehouse_id, dest_location_id,
        quantity_delta, balance_after, reason, performed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `led_init_${ledgerCounter++}`,
        now,
        null,
        'INITIAL_INVENTORY',
        'INIT-STOCK-2026',
        item.prod.id,
        item.prod.name,
        item.prod.sku,
        item.wh,
        item.loc,
        item.qty,
        item.qty,
        'Initial baseline count upon system onboarding',
        'Alex Morgan (Admin)',
        now
      ]
    );
  }

  // 6. Seed Sample Operations
  // Receipt 1
  const rec1Id = 'op_rec_101';
  await dbRun(
    `INSERT INTO operations (id, op_type, reference_no, partner_name, dest_warehouse_id, dest_location_id, status, scheduled_date, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [rec1Id, 'RECEIPT', 'REC-2026-0001', 'Apex Sensor Components Ltd.', 'wh_main', 'loc_main_inbound', 'Ready', '2026-09-28', 'Replenishment for low-stock power units & motors.', 'Alex Morgan', now, now]
  );
  await dbRun(
    `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty, unit_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['line_rec1_1', rec1Id, 'prod_4', 40, 0, 31.0]
  );
  await dbRun(
    `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty, unit_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['line_rec1_2', rec1Id, 'prod_2', 25, 0, 22.5]
  );

  // Delivery 1
  const del1Id = 'op_del_201';
  await dbRun(
    `INSERT INTO operations (id, op_type, reference_no, partner_name, source_warehouse_id, source_location_id, status, picking_status, scheduled_date, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [del1Id, 'DELIVERY', 'DEL-2026-0001', 'Tesla Automation Lab', 'wh_main', 'loc_main_zone_a', 'Waiting', 'Pick', '2026-09-27', 'Express order for gateway modules and diagnostic scanners.', 'Alex Morgan', now, now]
  );
  await dbRun(
    `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty, unit_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['line_del1_1', del1Id, 'prod_1', 4, 0, 89.99]
  );
  await dbRun(
    `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty, unit_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['line_del1_2', del1Id, 'prod_6', 2, 0, 119.00]
  );

  // Transfer 1
  const trf1Id = 'op_trf_301';
  await dbRun(
    `INSERT INTO operations (id, op_type, reference_no, source_warehouse_id, source_location_id, dest_warehouse_id, dest_location_id, status, scheduled_date, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trf1Id, 'INTERNAL_TRANSFER', 'TRF-2026-0001', 'wh_main', 'loc_main_zone_a', 'wh_retail', 'loc_retail_shelf', 'Ready', '2026-09-29', 'Replenishing retail storefront shelf from central hub.', 'Alex Morgan', now, now]
  );
  await dbRun(
    `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty)
     VALUES (?, ?, ?, ?, ?)`,
    ['line_trf1_1', trf1Id, 'prod_1', 6, 0]
  );
}
