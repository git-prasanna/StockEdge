import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db.ts';

export const operationRouter = Router();

// GET operations list with dynamic filters
operationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { op_type, status, warehouse_id, search, limit } = req.query;

    let query = `
      SELECT 
        o.*,
        sw.name as source_warehouse_name,
        sw.code as source_warehouse_code,
        sloc.name as source_location_name,
        sloc.code as source_location_code,
        dw.name as dest_warehouse_name,
        dw.code as dest_warehouse_code,
        dloc.name as dest_location_name,
        dloc.code as dest_location_code,
        (SELECT COUNT(*) FROM operation_lines ol WHERE ol.operation_id = o.id) as item_count,
        (SELECT COALESCE(SUM(ol.demand_qty), 0) FROM operation_lines ol WHERE ol.operation_id = o.id) as total_demand_qty,
        (SELECT COALESCE(SUM(ol.done_qty), 0) FROM operation_lines ol WHERE ol.operation_id = o.id) as total_done_qty
      FROM operations o
      LEFT JOIN warehouses sw ON sw.id = o.source_warehouse_id
      LEFT JOIN locations sloc ON sloc.id = o.source_location_id
      LEFT JOIN warehouses dw ON dw.id = o.dest_warehouse_id
      LEFT JOIN locations dloc ON dloc.id = o.dest_location_id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (op_type && op_type !== 'ALL') {
      whereClauses.push('o.op_type = ?');
      params.push(op_type);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('o.status = ?');
      params.push(status);
    }

    if (warehouse_id && warehouse_id !== 'ALL') {
      whereClauses.push('(o.source_warehouse_id = ? OR o.dest_warehouse_id = ?)');
      params.push(warehouse_id, warehouse_id);
    }

    if (search) {
      whereClauses.push('(o.reference_no LIKE ? OR o.partner_name LIKE ? OR o.notes LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY o.created_at DESC`;

    if (limit) {
      query += ` LIMIT ${Number(limit)}`;
    }

    const operations = await dbAll<any>(query, params);
    return res.json({ operations });
  } catch (err: any) {
    console.error('Error fetching operations:', err);
    return res.status(500).json({ error: 'Failed to retrieve operations' });
  }
});

// GET single operation with lines and item details
operationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const op = await dbGet<any>(`
      SELECT 
        o.*,
        sw.name as source_warehouse_name,
        sw.code as source_warehouse_code,
        sloc.name as source_location_name,
        sloc.code as source_location_code,
        dw.name as dest_warehouse_name,
        dw.code as dest_warehouse_code,
        dloc.name as dest_location_name,
        dloc.code as dest_location_code
      FROM operations o
      LEFT JOIN warehouses sw ON sw.id = o.source_warehouse_id
      LEFT JOIN locations sloc ON sloc.id = o.source_location_id
      LEFT JOIN warehouses dw ON dw.id = o.dest_warehouse_id
      LEFT JOIN locations dloc ON dloc.id = o.dest_location_id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const lines = await dbAll<any>(`
      SELECT 
        ol.*,
        p.name as product_name,
        p.sku as product_sku,
        p.category as product_category,
        p.unit_of_measure,
        (
          SELECT COALESCE(SUM(sl.quantity), 0)
          FROM stock_levels sl
          WHERE sl.product_id = p.id 
          AND (
            (? IS NOT NULL AND sl.location_id = ?) 
            OR (? IS NULL AND sl.warehouse_id = ?)
          )
        ) as current_on_hand
      FROM operation_lines ol
      JOIN products p ON p.id = ol.product_id
      WHERE ol.operation_id = ?
    `, [
      op.source_location_id || null, op.source_location_id || null,
      op.source_location_id || null, op.source_warehouse_id || null,
      op.id
    ]);

    return res.json({ operation: op, lines });
  } catch (err: any) {
    console.error('Error retrieving operation:', err);
    return res.status(500).json({ error: 'Failed to retrieve operation details' });
  }
});

// POST create a new operation (Receipt, Delivery, Internal Transfer, Adjustment)
operationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      op_type,
      partner_name,
      source_warehouse_id,
      source_location_id,
      dest_warehouse_id,
      dest_location_id,
      scheduled_date,
      adjustment_reason,
      notes,
      created_by,
      lines // Array<{ product_id: string, demand_qty: number, done_qty?: number, unit_price?: number, notes?: string }>
    } = req.body;

    if (!op_type) {
      return res.status(400).json({ error: 'Operation type is required' });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one product line item is required' });
    }

    // Specific validation per operation type
    if (op_type === 'RECEIPT') {
      if (!dest_warehouse_id || !dest_location_id) {
        return res.status(400).json({ error: 'Destination warehouse and location are required for receipts' });
      }
      if (!partner_name || partner_name.trim().length === 0) {
        return res.status(400).json({ error: 'Supplier / Partner name is required for receipts' });
      }
    } else if (op_type === 'DELIVERY') {
      if (!source_warehouse_id || !source_location_id) {
        return res.status(400).json({ error: 'Source warehouse and location are required for delivery orders' });
      }
      if (!partner_name || partner_name.trim().length === 0) {
        return res.status(400).json({ error: 'Customer / Recipient name is required for delivery orders' });
      }
    } else if (op_type === 'INTERNAL_TRANSFER') {
      if (!source_warehouse_id || !source_location_id || !dest_warehouse_id || !dest_location_id) {
        return res.status(400).json({ error: 'Both source and destination warehouse/location are required for transfers' });
      }
      if (source_location_id === dest_location_id) {
        return res.status(400).json({ error: 'Source and destination locations cannot be identical' });
      }
    } else if (op_type === 'ADJUSTMENT') {
      if (!source_warehouse_id || !source_location_id) {
        return res.status(400).json({ error: 'Warehouse and location are required for inventory adjustments' });
      }
      if (!adjustment_reason || adjustment_reason.trim().length === 0) {
        return res.status(400).json({ error: 'Adjustment reason is required (e.g. Cycle Count, Damaged, Surplus)' });
      }
    }

    // Check quantities
    for (const line of lines) {
      if (!line.product_id) {
        return res.status(400).json({ error: 'Product must be specified for each line item' });
      }
      if (op_type !== 'ADJUSTMENT') {
        if (!line.demand_qty || Number(line.demand_qty) <= 0) {
          return res.status(400).json({ error: 'Demand quantity must be greater than zero' });
        }
      } else {
        if (line.done_qty === undefined || Number(line.done_qty) < 0) {
          return res.status(400).json({ error: 'Counted physical quantity cannot be negative' });
        }
      }
    }

    // Generate reference number
    const prefix = op_type === 'RECEIPT' ? 'REC' :
                   op_type === 'DELIVERY' ? 'DEL' :
                   op_type === 'INTERNAL_TRANSFER' ? 'TRF' : 'ADJ';
    const year = new Date().getFullYear();
    const countRow = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM operations WHERE op_type = ?',
      [op_type]
    );
    const seq = (countRow?.count || 0) + 1;
    const reference_no = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;

    const opId = `op_${prefix.toLowerCase()}_${Date.now()}`;
    const now = new Date().toISOString();

    const initialStatus = op_type === 'ADJUSTMENT' ? 'Draft' : 'Draft';

    await dbRun(
      `INSERT INTO operations (
        id, op_type, reference_no, partner_name,
        source_warehouse_id, source_location_id,
        dest_warehouse_id, dest_location_id,
        status, picking_status, scheduled_date,
        adjustment_reason, notes, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        opId,
        op_type,
        reference_no,
        partner_name?.trim() || null,
        source_warehouse_id || null,
        source_location_id || null,
        dest_warehouse_id || (op_type === 'ADJUSTMENT' ? source_warehouse_id : null),
        dest_location_id || (op_type === 'ADJUSTMENT' ? source_location_id : null),
        initialStatus,
        op_type === 'DELIVERY' ? 'Pending' : null,
        scheduled_date || now.split('T')[0],
        adjustment_reason?.trim() || null,
        notes?.trim() || null,
        created_by || 'Alex Morgan',
        now,
        now
      ]
    );

    // Insert operation lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = `line_${opId}_${i + 1}`;
      await dbRun(
        `INSERT INTO operation_lines (id, operation_id, product_id, demand_qty, done_qty, unit_price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          opId,
          line.product_id,
          Number(line.demand_qty) || Number(line.done_qty) || 0,
          Number(line.done_qty) || 0,
          Number(line.unit_price) || 0,
          line.notes?.trim() || null
        ]
      );
    }

    return res.status(201).json({
      message: `${op_type} created successfully with reference ${reference_no}`,
      operationId: opId,
      reference_no
    });
  } catch (err: any) {
    console.error('Create operation error:', err);
    return res.status(500).json({ error: 'Failed to create operation: ' + err.message });
  }
});

// POST action on operation (status progression: 'to_ready', 'pick', 'pack', 'validate', 'cancel')
operationRouter.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const opId = req.params.id;
    const { action, performed_by } = req.body; // 'mark_ready', 'pick', 'pack', 'validate', 'cancel'

    const op = await dbGet<any>('SELECT * FROM operations WHERE id = ?', [opId]);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    if (op.status === 'Done') {
      return res.status(400).json({ error: 'Operation is already validated and completed' });
    }

    if (op.status === 'Canceled') {
      return res.status(400).json({ error: 'Operation has already been canceled' });
    }

    const lines = await dbAll<any>(`
      SELECT ol.*, p.name as product_name, p.sku as product_sku
      FROM operation_lines ol
      JOIN products p ON p.id = ol.product_id
      WHERE ol.operation_id = ?
    `, [opId]);

    const now = new Date().toISOString();
    const actor = performed_by || 'Alex Morgan';

    // 1. CANCEL
    if (action === 'cancel') {
      await dbRun('UPDATE operations SET status = ?, updated_at = ? WHERE id = ?', ['Canceled', now, opId]);
      return res.json({ message: 'Operation has been canceled', status: 'Canceled' });
    }

    // 2. MARK READY / WAITING
    if (action === 'mark_ready') {
      await dbRun('UPDATE operations SET status = ?, updated_at = ? WHERE id = ?', ['Ready', now, opId]);
      return res.json({ message: 'Operation marked as Ready', status: 'Ready' });
    }

    // 3. DELIVERY SPECIFIC: PICK
    if (action === 'pick' && op.op_type === 'DELIVERY') {
      // Auto-populate done_qty with demand_qty as picked
      for (const line of lines) {
        await dbRun('UPDATE operation_lines SET done_qty = demand_qty WHERE id = ?', [line.id]);
      }
      await dbRun(
        'UPDATE operations SET status = ?, picking_status = ?, updated_at = ? WHERE id = ?',
        ['Ready', 'Picked', now, opId]
      );
      return res.json({ message: 'Items successfully picked from racks', status: 'Ready', picking_status: 'Picked' });
    }

    // 4. DELIVERY SPECIFIC: PACK
    if (action === 'pack' && op.op_type === 'DELIVERY') {
      await dbRun(
        'UPDATE operations SET picking_status = ?, updated_at = ? WHERE id = ?',
        ['Packed', now, opId]
      );
      return res.json({ message: 'Items packed and staged for dispatch', status: op.status, picking_status: 'Packed' });
    }

    // 5. VALIDATE (The critical transition: updates stock levels and writes append-only Stock Ledger!)
    if (action === 'validate') {
      // --- VALIDATE RECEIPT ---
      if (op.op_type === 'RECEIPT') {
        const destWh = op.dest_warehouse_id;
        const destLoc = op.dest_location_id;

        if (!destWh || !destLoc) {
          return res.status(400).json({ error: 'Missing destination warehouse/location' });
        }

        for (const line of lines) {
          // If done_qty is 0, default to demand_qty on validation
          const receivedQty = line.done_qty > 0 ? line.done_qty : line.demand_qty;

          // Update stock_levels
          const existingStock = await dbGet<any>(
            'SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, destWh, destLoc]
          );

          let newQty = receivedQty;
          if (existingStock) {
            newQty = existingStock.quantity + receivedQty;
            await dbRun(
              'UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE id = ?',
              [newQty, now, existingStock.id]
            );
          } else {
            const stockId = `stk_${line.product_id}_${destLoc}`;
            await dbRun(
              `INSERT INTO stock_levels (id, product_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)`,
              [stockId, line.product_id, destWh, destLoc, newQty, now]
            );
          }

          // Update line done_qty
          await dbRun('UPDATE operation_lines SET done_qty = ? WHERE id = ?', [receivedQty, line.id]);

          // APPEND-ONLY STOCK LEDGER ENTRY
          const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbRun(
            `INSERT INTO stock_ledger (
              id, timestamp, operation_id, op_type, reference_no,
              product_id, product_name, sku,
              dest_warehouse_id, dest_location_id,
              quantity_delta, balance_after, reason, performed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ledgerId,
              now,
              op.id,
              'RECEIPT',
              op.reference_no,
              line.product_id,
              line.product_name,
              line.product_sku,
              destWh,
              destLoc,
              receivedQty,
              newQty,
              `Receipt from ${op.partner_name || 'Supplier'}`,
              actor,
              now
            ]
          );
        }

        await dbRun(
          'UPDATE operations SET status = ?, validated_at = ?, updated_at = ? WHERE id = ?',
          ['Done', now, now, opId]
        );
        return res.json({ message: `Receipt ${op.reference_no} validated. Stock successfully updated.`, status: 'Done' });
      }

      // --- VALIDATE DELIVERY ORDER ---
      if (op.op_type === 'DELIVERY') {
        const srcWh = op.source_warehouse_id;
        const srcLoc = op.source_location_id;

        if (!srcWh || !srcLoc) {
          return res.status(400).json({ error: 'Missing source warehouse/location for delivery' });
        }

        // Check availability for all line items first
        for (const line of lines) {
          const dispatchQty = line.done_qty > 0 ? line.done_qty : line.demand_qty;
          const currentStock = await dbGet<any>(
            'SELECT quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, srcWh, srcLoc]
          );

          const availableQty = currentStock?.quantity || 0;
          if (availableQty < dispatchQty) {
            return res.status(400).json({
              error: `Insufficient stock for SKU ${line.product_sku} (${line.product_name}). Requested: ${dispatchQty}, Available at source location: ${availableQty}. Negative stock not permitted without manual adjustment.`
            });
          }
        }

        // Deduct stock and append to stock ledger
        for (const line of lines) {
          const dispatchQty = line.done_qty > 0 ? line.done_qty : line.demand_qty;
          const currentStock = await dbGet<any>(
            'SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, srcWh, srcLoc]
          );

          const newQty = (currentStock?.quantity || 0) - dispatchQty;
          await dbRun(
            'UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE id = ?',
            [newQty, now, currentStock.id]
          );

          await dbRun('UPDATE operation_lines SET done_qty = ? WHERE id = ?', [dispatchQty, line.id]);

          // APPEND-ONLY STOCK LEDGER ENTRY
          const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbRun(
            `INSERT INTO stock_ledger (
              id, timestamp, operation_id, op_type, reference_no,
              product_id, product_name, sku,
              source_warehouse_id, source_location_id,
              quantity_delta, balance_after, reason, performed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ledgerId,
              now,
              op.id,
              'DELIVERY',
              op.reference_no,
              line.product_id,
              line.product_name,
              line.product_sku,
              srcWh,
              srcLoc,
              -dispatchQty, // Negative delta
              newQty,
              `Dispatched to ${op.partner_name || 'Customer'}`,
              actor,
              now
            ]
          );
        }

        await dbRun(
          'UPDATE operations SET status = ?, picking_status = ?, validated_at = ?, updated_at = ? WHERE id = ?',
          ['Done', 'Dispatched', now, now, opId]
        );
        return res.json({ message: `Delivery Order ${op.reference_no} validated. Stock dispatched.`, status: 'Done' });
      }

      // --- VALIDATE INTERNAL TRANSFER ---
      if (op.op_type === 'INTERNAL_TRANSFER') {
        const srcWh = op.source_warehouse_id;
        const srcLoc = op.source_location_id;
        const destWh = op.dest_warehouse_id;
        const destLoc = op.dest_location_id;

        // Check source stock availability
        for (const line of lines) {
          const moveQty = line.done_qty > 0 ? line.done_qty : line.demand_qty;
          const currentSourceStock = await dbGet<any>(
            'SELECT quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, srcWh, srcLoc]
          );

          const available = currentSourceStock?.quantity || 0;
          if (available < moveQty) {
            return res.status(400).json({
              error: `Insufficient stock for SKU ${line.product_sku} at source location. Required: ${moveQty}, Available: ${available}.`
            });
          }
        }

        // Execute transfer: deduct source, credit destination, log to ledger
        for (const line of lines) {
          const moveQty = line.done_qty > 0 ? line.done_qty : line.demand_qty;

          // 1. Deduct from source
          const srcStock = await dbGet<any>(
            'SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, srcWh, srcLoc]
          );
          const srcNewQty = (srcStock?.quantity || 0) - moveQty;
          await dbRun('UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE id = ?', [srcNewQty, now, srcStock.id]);

          // 2. Add to destination
          const destStock = await dbGet<any>(
            'SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, destWh, destLoc]
          );

          let destNewQty = moveQty;
          if (destStock) {
            destNewQty = destStock.quantity + moveQty;
            await dbRun('UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE id = ?', [destNewQty, now, destStock.id]);
          } else {
            const destStockId = `stk_${line.product_id}_${destLoc}`;
            await dbRun(
              `INSERT INTO stock_levels (id, product_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)`,
              [destStockId, line.product_id, destWh, destLoc, destNewQty, now]
            );
          }

          await dbRun('UPDATE operation_lines SET done_qty = ? WHERE id = ?', [moveQty, line.id]);

          // APPEND-ONLY STOCK LEDGER ENTRY (Transfer movement)
          const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbRun(
            `INSERT INTO stock_ledger (
              id, timestamp, operation_id, op_type, reference_no,
              product_id, product_name, sku,
              source_warehouse_id, source_location_id,
              dest_warehouse_id, dest_location_id,
              quantity_delta, balance_after, reason, performed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ledgerId,
              now,
              op.id,
              'INTERNAL_TRANSFER',
              op.reference_no,
              line.product_id,
              line.product_name,
              line.product_sku,
              srcWh,
              srcLoc,
              destWh,
              destLoc,
              moveQty, // Transfer quantity
              destNewQty,
              `Internal relocation from source to target bay`,
              actor,
              now
            ]
          );
        }

        await dbRun(
          'UPDATE operations SET status = ?, validated_at = ?, updated_at = ? WHERE id = ?',
          ['Done', now, now, opId]
        );
        return res.json({ message: `Transfer ${op.reference_no} executed. Stock locations updated.`, status: 'Done' });
      }

      // --- VALIDATE STOCK ADJUSTMENT ---
      if (op.op_type === 'ADJUSTMENT') {
        const whId = op.source_warehouse_id;
        const locId = op.source_location_id;

        for (const line of lines) {
          const countedQty = Number(line.done_qty);
          const currentStock = await dbGet<any>(
            'SELECT id, quantity FROM stock_levels WHERE product_id = ? AND warehouse_id = ? AND location_id = ?',
            [line.product_id, whId, locId]
          );

          const theoreticalQty = currentStock?.quantity || 0;
          const delta = countedQty - theoreticalQty;

          if (currentStock) {
            await dbRun(
              'UPDATE stock_levels SET quantity = ?, updated_at = ? WHERE id = ?',
              [countedQty, now, currentStock.id]
            );
          } else {
            const stockId = `stk_${line.product_id}_${locId}`;
            await dbRun(
              `INSERT INTO stock_levels (id, product_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, ?)`,
              [stockId, line.product_id, whId, locId, countedQty, now]
            );
          }

          // APPEND-ONLY STOCK LEDGER ENTRY
          const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbRun(
            `INSERT INTO stock_ledger (
              id, timestamp, operation_id, op_type, reference_no,
              product_id, product_name, sku,
              source_warehouse_id, source_location_id,
              dest_warehouse_id, dest_location_id,
              quantity_delta, balance_after, reason, performed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ledgerId,
              now,
              op.id,
              'ADJUSTMENT',
              op.reference_no,
              line.product_id,
              line.product_name,
              line.product_sku,
              whId,
              locId,
              whId,
              locId,
              delta, // Quantity delta (+/-)
              countedQty,
              `Adjustment Reason: ${op.adjustment_reason || 'Count reconciliation'} (Theoretical: ${theoreticalQty}, Counted: ${countedQty})`,
              actor,
              now
            ]
          );
        }

        await dbRun(
          'UPDATE operations SET status = ?, validated_at = ?, updated_at = ? WHERE id = ?',
          ['Done', now, now, opId]
        );
        return res.json({ message: `Adjustment ${op.reference_no} applied. Inventory balance synchronized.`, status: 'Done' });
      }
    }

    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err: any) {
    console.error('Operation action error:', err);
    return res.status(500).json({ error: 'Failed to execute operation action: ' + err.message });
  }
});
