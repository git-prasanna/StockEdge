import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db.ts';

export const warehouseRouter = Router();

// GET all warehouses with location counts & total stock quantity
warehouseRouter.get('/', async (req: Request, res: Response) => {
  try {
    const warehouses = await dbAll<any>(`
      SELECT 
        w.*,
        COUNT(DISTINCT l.id) as location_count,
        COALESCE(SUM(sl.quantity), 0) as total_units_stored,
        COUNT(DISTINCT CASE WHEN sl.quantity > 0 THEN sl.product_id END) as distinct_products_count
      FROM warehouses w
      LEFT JOIN locations l ON l.warehouse_id = w.id
      LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
      GROUP BY w.id
      ORDER BY w.name ASC
    `);
    return res.json({ warehouses });
  } catch (err: any) {
    console.error('Error fetching warehouses:', err);
    return res.status(500).json({ error: 'Failed to retrieve warehouses' });
  }
});

// GET all locations across all warehouses (with warehouse details and stocked items)
warehouseRouter.get('/locations/all', async (req: Request, res: Response) => {
  try {
    const locations = await dbAll<any>(`
      SELECT 
        l.*,
        w.code as warehouse_code,
        w.name as warehouse_name,
        COALESCE(SUM(sl.quantity), 0) as current_stock_qty,
        COUNT(DISTINCT CASE WHEN sl.quantity > 0 THEN sl.product_id END) as stored_products_count
      FROM locations l
      JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN stock_levels sl ON sl.location_id = l.id
      GROUP BY l.id
      ORDER BY w.name ASC, l.name ASC
    `);
    return res.json({ locations });
  } catch (err: any) {
    console.error('Error fetching all locations:', err);
    return res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// GET single warehouse details with locations and stock breakdown
warehouseRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await dbGet<any>('SELECT * FROM warehouses WHERE id = ?', [req.params.id]);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const locations = await dbAll<any>(`
      SELECT 
        l.*,
        COALESCE(SUM(sl.quantity), 0) as current_stock_qty,
        COUNT(DISTINCT CASE WHEN sl.quantity > 0 THEN sl.product_id END) as stored_products_count
      FROM locations l
      LEFT JOIN stock_levels sl ON sl.location_id = l.id
      WHERE l.warehouse_id = ?
      GROUP BY l.id
      ORDER BY l.name ASC
    `, [req.params.id]);

    return res.json({ warehouse, locations });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve warehouse' });
  }
});

// POST create warehouse
warehouseRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, address, contact_person, phone } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Warehouse code and name are required' });
    }

    const existing = await dbGet('SELECT id FROM warehouses WHERE UPPER(code) = UPPER(?)', [code.trim()]);
    if (existing) {
      return res.status(409).json({ error: `Warehouse with code "${code}" already exists` });
    }

    const id = `wh_${Date.now()}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO warehouses (id, code, name, address, contact_person, phone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, code.trim().toUpperCase(), name.trim(), address?.trim() || null, contact_person?.trim() || null, phone?.trim() || null, now]
    );

    // Also auto-create a default general storage location for this warehouse
    const defaultLocId = `loc_${id}_gen`;
    await dbRun(
      `INSERT INTO locations (id, warehouse_id, code, name, type, zone, created_at)
       VALUES (?, ?, ?, ?, 'internal', 'Main Bay', ?)`,
      [defaultLocId, id, `${code.trim().toUpperCase()}/GEN`, 'General Storage', now]
    );

    const created = await dbGet('SELECT * FROM warehouses WHERE id = ?', [id]);
    return res.status(201).json({ message: 'Warehouse created successfully', warehouse: created });
  } catch (err: any) {
    console.error('Create warehouse error:', err);
    return res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

// POST create location under warehouse
warehouseRouter.post('/:id/locations', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.params.id;
    const warehouse = await dbGet('SELECT id, code FROM warehouses WHERE id = ?', [warehouseId]);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const { code, name, type, zone, rack, shelf } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Location code and name are required' });
    }

    const existing = await dbGet('SELECT id FROM locations WHERE warehouse_id = ? AND UPPER(code) = UPPER(?)', [warehouseId, code.trim()]);
    if (existing) {
      return res.status(409).json({ error: `Location code "${code}" already exists in this warehouse` });
    }

    const locId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO locations (id, warehouse_id, code, name, type, zone, rack, shelf, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        locId,
        warehouseId,
        code.trim().toUpperCase(),
        name.trim(),
        type || 'internal',
        zone?.trim() || null,
        rack?.trim() || null,
        shelf?.trim() || null,
        now
      ]
    );

    const created = await dbGet('SELECT * FROM locations WHERE id = ?', [locId]);
    return res.status(201).json({ message: 'Location created successfully', location: created });
  } catch (err: any) {
    console.error('Create location error:', err);
    return res.status(500).json({ error: 'Failed to create location' });
  }
});
