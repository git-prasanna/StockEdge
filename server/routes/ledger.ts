import { Router, Request, Response } from 'express';
import { dbAll, dbGet } from '../db.ts';

export const ledgerRouter = Router();

// GET Stock Ledger list (The append-only audit trail)
ledgerRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { op_type, product_id, warehouse_id, search, limit, offset } = req.query;

    let query = `
      SELECT 
        l.*,
        sw.name as source_warehouse_name,
        sw.code as source_warehouse_code,
        sloc.name as source_location_name,
        sloc.code as source_location_code,
        dw.name as dest_warehouse_name,
        dw.code as dest_warehouse_code,
        dloc.name as dest_location_name,
        dloc.code as dest_location_code
      FROM stock_ledger l
      LEFT JOIN warehouses sw ON sw.id = l.source_warehouse_id
      LEFT JOIN locations sloc ON sloc.id = l.source_location_id
      LEFT JOIN warehouses dw ON dw.id = l.dest_warehouse_id
      LEFT JOIN locations dloc ON dloc.id = l.dest_location_id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (op_type && op_type !== 'ALL') {
      whereClauses.push('l.op_type = ?');
      params.push(op_type);
    }

    if (product_id) {
      whereClauses.push('l.product_id = ?');
      params.push(product_id);
    }

    if (warehouse_id && warehouse_id !== 'ALL') {
      whereClauses.push('(l.source_warehouse_id = ? OR l.dest_warehouse_id = ?)');
      params.push(warehouse_id, warehouse_id);
    }

    if (search) {
      whereClauses.push('(l.reference_no LIKE ? OR l.product_name LIKE ? OR l.sku LIKE ? OR l.reason LIKE ? OR l.performed_by LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY l.timestamp DESC, l.rowid DESC`;

    const maxLimit = limit ? Number(limit) : 50;
    const skipOffset = offset ? Number(offset) : 0;
    query += ` LIMIT ${maxLimit} OFFSET ${skipOffset}`;

    const entries = await dbAll<any>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM stock_ledger l';
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    const countRes = await dbGet<{ total: number }>(countQuery, params);

    return res.json({
      entries,
      total: countRes?.total || 0,
      limit: maxLimit,
      offset: skipOffset
    });
  } catch (err: any) {
    console.error('Error fetching stock ledger:', err);
    return res.status(500).json({ error: 'Failed to retrieve stock ledger entries' });
  }
});

// GET Dashboard KPI stats
ledgerRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    // 1. Total distinct products & total units in stock
    const productsStock = await dbAll<any>(`
      SELECT 
        p.id,
        p.min_stock,
        p.reorder_point,
        COALESCE(SUM(sl.quantity), 0) as on_hand
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      GROUP BY p.id
    `);

    const totalProducts = productsStock.length;
    const totalUnitsInStock = productsStock.reduce((acc, curr) => acc + curr.on_hand, 0);
    
    // 2. Low / Out of stock count
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const p of productsStock) {
      if (p.on_hand <= 0) {
        outOfStockCount++;
      } else if (p.on_hand <= p.reorder_point) {
        lowStockCount++;
      }
    }

    // 3. Pending Receipts (status IN ('Draft', 'Waiting', 'Ready'))
    const pendingReceipts = await dbGet<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM operations 
      WHERE op_type = 'RECEIPT' AND status IN ('Draft', 'Waiting', 'Ready')
    `);

    // 4. Pending Deliveries (status IN ('Draft', 'Waiting', 'Ready'))
    const pendingDeliveries = await dbGet<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM operations 
      WHERE op_type = 'DELIVERY' AND status IN ('Draft', 'Waiting', 'Ready')
    `);

    // 5. Scheduled Internal Transfers (status IN ('Draft', 'Ready', 'Waiting'))
    const scheduledTransfers = await dbGet<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM operations 
      WHERE op_type = 'INTERNAL_TRANSFER' AND status IN ('Draft', 'Ready', 'Waiting')
    `);

    // 6. Total Completed Operations
    const completedOps = await dbGet<{ count: number }>(`
      SELECT COUNT(*) as count FROM operations WHERE status = 'Done'
    `);

    // 7. Recent 5 Ledger activities
    const recentActivities = await dbAll<any>(`
      SELECT 
        l.*,
        sw.name as source_warehouse_name,
        dw.name as dest_warehouse_name
      FROM stock_ledger l
      LEFT JOIN warehouses sw ON sw.id = l.source_warehouse_id
      LEFT JOIN warehouses dw ON dw.id = l.dest_warehouse_id
      ORDER BY l.timestamp DESC, l.rowid DESC
      LIMIT 8
    `);

    return res.json({
      kpis: {
        totalProducts,
        totalUnitsInStock,
        lowStockCount,
        outOfStockCount,
        totalAlertStockCount: lowStockCount + outOfStockCount,
        pendingReceipts: pendingReceipts?.count || 0,
        pendingDeliveries: pendingDeliveries?.count || 0,
        scheduledTransfers: scheduledTransfers?.count || 0,
        completedOperations: completedOps?.count || 0
      },
      recentActivities
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});
