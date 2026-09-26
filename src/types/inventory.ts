export type OperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
export type OperationStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';
export type PickingStatus = 'Pending' | 'Picked' | 'Packed' | 'Dispatched';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  created_at?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  is_active: number;
  location_count?: number;
  total_units_stored?: number;
  distinct_products_count?: number;
  created_at: string;
}

export interface Location {
  id: string;
  warehouse_id: string;
  warehouse_code?: string;
  warehouse_name?: string;
  code: string;
  name: string;
  type: 'internal' | 'inbound' | 'outbound' | 'transit' | 'scrap';
  zone?: string;
  rack?: string;
  shelf?: string;
  current_stock_qty?: number;
  stored_products_count?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit_of_measure: string;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  reorder_point: number;
  max_stock: number;
  lead_time_days: number;
  description?: string;
  total_on_hand?: number;
  total_reserved?: number;
  total_available?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface StockLevel {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  warehouse_name?: string;
  warehouse_code?: string;
  location_name?: string;
  location_code?: string;
  zone?: string;
  rack?: string;
  shelf?: string;
}

export interface OperationLine {
  id?: string;
  operation_id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  unit_of_measure?: string;
  demand_qty: number;
  done_qty: number;
  unit_price?: number;
  notes?: string;
  current_on_hand?: number;
}

export interface Operation {
  id: string;
  op_type: OperationType;
  reference_no: string;
  partner_name?: string;
  source_warehouse_id?: string;
  source_warehouse_name?: string;
  source_warehouse_code?: string;
  source_location_id?: string;
  source_location_name?: string;
  source_location_code?: string;
  dest_warehouse_id?: string;
  dest_warehouse_name?: string;
  dest_warehouse_code?: string;
  dest_location_id?: string;
  dest_location_name?: string;
  dest_location_code?: string;
  status: OperationStatus;
  picking_status?: PickingStatus;
  scheduled_date?: string;
  adjustment_reason?: string;
  notes?: string;
  created_by: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  total_demand_qty?: number;
  total_done_qty?: number;
}

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  operation_id?: string;
  op_type: string;
  reference_no: string;
  product_id: string;
  product_name: string;
  sku: string;
  source_warehouse_id?: string;
  source_warehouse_name?: string;
  source_location_id?: string;
  source_location_name?: string;
  dest_warehouse_id?: string;
  dest_warehouse_name?: string;
  dest_location_id?: string;
  dest_location_name?: string;
  quantity_delta: number;
  balance_after: number;
  reason?: string;
  performed_by: string;
  created_at: string;
}

export interface DashboardKPIs {
  totalProducts: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAlertStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  completedOperations: number;
}
