import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db.ts';

export const productRouter = Router();

// GET all products with aggregated stock counts and status
productRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, stockStatus, warehouseId } = req.query;

    let query = `
      SELECT 
        p.*,
        COALESCE(SUM(sl.quantity), 0) as total_on_hand,
        COALESCE(SUM(sl.reserved_quantity), 0) as total_reserved,
        (COALESCE(SUM(sl.quantity), 0) - COALESCE(SUM(sl.reserved_quantity), 0)) as total_available
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (warehouseId) {
      whereClauses.push('(sl.warehouse_id = ? OR sl.warehouse_id IS NULL)');
      params.push(warehouseId);
    }

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (category && category !== 'All') {
      whereClauses.push('p.category = ?');
      params.push(category);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` GROUP BY p.id ORDER BY p.name ASC`;

    const products = await dbAll<any>(query, params);

    // Apply stockStatus filter in application layer for reliable min_stock comparisons
    let filtered = products.map((prod) => {
      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (prod.total_on_hand <= 0) {
        status = 'out_of_stock';
      } else if (prod.total_on_hand <= prod.reorder_point) {
        status = 'low_stock';
      }
      return {
        ...prod,
        stock_status: status
      };
    });

    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'low') {
        filtered = filtered.filter(p => p.stock_status === 'low_stock');
      } else if (stockStatus === 'out') {
        filtered = filtered.filter(p => p.stock_status === 'out_of_stock');
      } else if (stockStatus === 'alert') {
        filtered = filtered.filter(p => p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock');
      } else if (stockStatus === 'in_stock') {
        filtered = filtered.filter(p => p.stock_status === 'in_stock');
      }
    }

    return res.json({ products: filtered });
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET categories
productRouter.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const rows = await dbAll<{ category: string }>('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = rows.map(r => r.category);
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// GET low-stock and reorder alerts
productRouter.get('/meta/alerts', async (req: Request, res: Response) => {
  try {
    const rows = await dbAll<any>(`
      SELECT 
        p.*,
        COALESCE(SUM(sl.quantity), 0) as total_on_hand,
        (p.reorder_point - COALESCE(SUM(sl.quantity), 0)) as deficit_qty
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      GROUP BY p.id
      HAVING COALESCE(SUM(sl.quantity), 0) <= p.reorder_point
      ORDER BY total_on_hand ASC
    `);

    return res.json({ alerts: rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve stock alerts' });
  }
});

// GET single product with stock by location and recent ledger movements
productRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await dbGet<any>('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Per-location breakdown
    const locationStock = await dbAll<any>(`
      SELECT 
        sl.quantity,
        sl.reserved_quantity,
        (sl.quantity - sl.reserved_quantity) as available_quantity,
        w.id as warehouse_id,
        w.name as warehouse_name,
        w.code as warehouse_code,
        l.id as location_id,
        l.name as location_name,
        l.code as location_code,
        l.type as location_type,
        l.zone,
        l.rack,
        l.shelf
      FROM stock_levels sl
      JOIN warehouses w ON w.id = sl.warehouse_id
      JOIN locations l ON l.id = sl.location_id
      WHERE sl.product_id = ?
      ORDER BY w.name ASC, l.name ASC
    `, [req.params.id]);

    // Total on hand
    const totalOnHand = locationStock.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalReserved = locationStock.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);

    // Recent movements in ledger for this product
    const ledgerMovements = await dbAll<any>(`
      SELECT 
        sl.*,
        sw.name as source_warehouse_name,
        sloc.name as source_location_name,
        dw.name as dest_warehouse_name,
        dloc.name as dest_location_name
      FROM stock_ledger sl
      LEFT JOIN warehouses sw ON sw.id = sl.source_warehouse_id
      LEFT JOIN locations sloc ON sloc.id = sl.source_location_id
      LEFT JOIN warehouses dw ON dw.id = sl.dest_warehouse_id
      LEFT JOIN locations dloc ON dloc.id = sl.dest_location_id
      WHERE sl.product_id = ?
      ORDER BY sl.timestamp DESC
      LIMIT 25
    `, [req.params.id]);

    return res.json({
      product: {
        ...product,
        total_on_hand: totalOnHand,
        total_reserved: totalReserved,
        total_available: totalOnHand - totalReserved
      },
      location_stock: locationStock,
      recent_movements: ledgerMovements
    });
  } catch (err: any) {
    console.error('Error fetching product detail:', err);
    return res.status(500).json({ error: 'Failed to retrieve product details' });
  }
});

// POST create product
productRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      unit_of_measure,
      cost_price,
      sale_price,
      min_stock,
      reorder_point,
      max_stock,
      lead_time_days,
      description,
      initial_stock, // optional: { warehouse_id, location_id, quantity }
      user_name
    } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ error: 'Product name, SKU, and category are required' });
    }

    const existingSku = await dbGet('SELECT id FROM products WHERE UPPER(sku) = UPPER(?)', [sku.trim()]);
    if (existingSku) {
      return res.status(409).json({ error: `A product with SKU "${sku}" already exists` });
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const minS = Number(min_stock) || 0;
    const reorderP = Number(reorder_point) || (minS * 1.5);
    const maxS = Number(max_stock) || (minS * 4);

    if (minS < 0 || reorderP < 0 || maxS < 0) {
      return res.status(400).json({ error: 'Stock threshold levels must be positive numbers' });
    }

    await dbRun(
      `INSERT INTO products (
        id, name, sku, barcode, category, unit_of_measure,
        cost_price, sale_price, min_stock, reorder_point, max_stock,
        lead_time_days, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        name.trim(),
        sku.trim().toUpperCase(),
        barcode?.trim() || null,
        category.trim(),
        unit_of_measure || 'Units',
        Number(cost_price) || 0,
        Number(sale_price) || 0,
        minS,
        reorderP,
        maxS,
        Number(lead_time_days) || 7,
        description?.trim() || null,
        now,
        now
      ]
    );

    // If initial stock was provided, assign and log to append-only stock ledger
    if (initial_stock && Number(initial_stock.quantity) > 0 && initial_stock.warehouse_id && initial_stock.location_id) {
      const initialQty = Number(initial_stock.quantity);
      const stockLevelId = `stk_${productId}_${initial_stock.location_id}`;
      
      await dbRun(
        `INSERT INTO stock_levels (id, product_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [stockLevelId, productId, initial_stock.warehouse_id, initial_stock.location_id, initialQty, now]
      );

      // Append-only stock ledger
      await dbRun(
        `INSERT INTO stock_ledger (
          id, timestamp, operation_id, op_type, reference_no,
          product_id, product_name, sku,
          dest_warehouse_id, dest_location_id,
          quantity_delta, balance_after, reason, performed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `led_${Date.now()}`,
          now,
          null,
          'INITIAL_INVENTORY',
          `INIT-${sku.trim().toUpperCase()}`,
          productId,
          name.trim(),
          sku.trim().toUpperCase(),
          initial_stock.warehouse_id,
          initial_stock.location_id,
          initialQty,
          initialQty,
          'Initial stock allocated at product registration',
          user_name || 'System Admin',
          now
        ]
      );
    }

    const created = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    return res.status(201).json({ message: 'Product created successfully', product: created });
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
productRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const {
      name,
      barcode,
      category,
      unit_of_measure,
      cost_price,
      sale_price,
      min_stock,
      reorder_point,
      max_stock,
      lead_time_days,
      description
    } = req.body;

    const existing = await dbGet('SELECT id FROM products WHERE id = ?', [productId]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const now = new Date().toISOString();

    await dbRun(
      `UPDATE products SET
        name = COALESCE(?, name),
        barcode = COALESCE(?, barcode),
        category = COALESCE(?, category),
        unit_of_measure = COALESCE(?, unit_of_measure),
        cost_price = COALESCE(?, cost_price),
        sale_price = COALESCE(?, sale_price),
        min_stock = COALESCE(?, min_stock),
        reorder_point = COALESCE(?, reorder_point),
        max_stock = COALESCE(?, max_stock),
        lead_time_days = COALESCE(?, lead_time_days),
        description = COALESCE(?, description),
        updated_at = ?
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        barcode !== undefined ? barcode.trim() : null,
        category ? category.trim() : null,
        unit_of_measure || null,
        cost_price !== undefined ? Number(cost_price) : null,
        sale_price !== undefined ? Number(sale_price) : null,
        min_stock !== undefined ? Number(min_stock) : null,
        reorder_point !== undefined ? Number(reorder_point) : null,
        max_stock !== undefined ? Number(max_stock) : null,
        lead_time_days !== undefined ? Number(lead_time_days) : null,
        description !== undefined ? description.trim() : null,
        now,
        productId
      ]
    );

    const updated = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    return res.json({ message: 'Product updated successfully', product: updated });
  } catch (err: any) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});
