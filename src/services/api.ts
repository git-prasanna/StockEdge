import {
  User,
  Warehouse,
  Location,
  Product,
  Operation,
  OperationLine,
  StockLedgerEntry,
  DashboardKPIs
} from '../types/inventory';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

export const api = {
  // Auth API
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    signup: (userData: { name: string; email: string; password: string; role?: string; department?: string }) =>
      request<{ user: User; token: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),
    forgotPassword: (email: string) =>
      request<{ message: string; otpPreview?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    resetPassword: (payload: { email: string; otp: string; newPassword: string }) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    getMe: () => request<{ user: User }>('/api/auth/me'),
    updateProfile: (profile: { id: string; name: string; role?: string; department?: string }) =>
      request<{ message: string; user: User }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      })
  },

  // Warehouses & Locations
  warehouses: {
    list: () => request<{ warehouses: Warehouse[] }>('/api/warehouses'),
    get: (id: string) => request<{ warehouse: Warehouse; locations: Location[] }>(`/api/warehouses/${id}`),
    create: (data: Partial<Warehouse>) =>
      request<{ message: string; warehouse: Warehouse }>('/api/warehouses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getAllLocations: () => request<{ locations: Location[] }>('/api/warehouses/locations/all'),
    createLocation: (warehouseId: string, data: Partial<Location>) =>
      request<{ message: string; location: Location }>(`/api/warehouses/${warehouseId}/locations`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Products
  products: {
    list: (params?: { search?: string; category?: string; stockStatus?: string; warehouseId?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.category) query.set('category', params.category);
      if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
      if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
      return request<{ products: Product[] }>(`/api/products?${query.toString()}`);
    },
    get: (id: string) =>
      request<{ product: Product; location_stock: any[]; recent_movements: StockLedgerEntry[] }>(`/api/products/${id}`),
    getCategories: () => request<{ categories: string[] }>('/api/products/meta/categories'),
    getAlerts: () => request<{ alerts: any[] }>('/api/products/meta/alerts'),
    create: (data: any) =>
      request<{ message: string; product: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Product>) =>
      request<{ message: string; product: Product }>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
  },

  // Operations (Receipts, Deliveries, Transfers, Adjustments)
  operations: {
    list: (params?: { op_type?: string; status?: string; warehouse_id?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.op_type) query.set('op_type', params.op_type);
      if (params?.status) query.set('status', params.status);
      if (params?.warehouse_id) query.set('warehouse_id', params.warehouse_id);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', params.limit.toString());
      return request<{ operations: Operation[] }>(`/api/operations?${query.toString()}`);
    },
    get: (id: string) =>
      request<{ operation: Operation; lines: OperationLine[] }>(`/api/operations/${id}`),
    create: (data: {
      op_type: string;
      partner_name?: string;
      source_warehouse_id?: string;
      source_location_id?: string;
      dest_warehouse_id?: string;
      dest_location_id?: string;
      scheduled_date?: string;
      adjustment_reason?: string;
      notes?: string;
      created_by?: string;
      lines: Array<{
        product_id: string;
        demand_qty: number;
        done_qty?: number;
        unit_price?: number;
        notes?: string;
      }>;
    }) =>
      request<{ message: string; operationId: string; reference_no: string }>('/api/operations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    executeAction: (id: string, action: string, performed_by?: string) =>
      request<{ message: string; status: string; picking_status?: string }>(`/api/operations/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, performed_by })
      })
  },

  // Stock Ledger & KPI Stats
  ledger: {
    list: (params?: { op_type?: string; product_id?: string; warehouse_id?: string; search?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.op_type) query.set('op_type', params.op_type);
      if (params?.product_id) query.set('product_id', params.product_id);
      if (params?.warehouse_id) query.set('warehouse_id', params.warehouse_id);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.offset) query.set('offset', params.offset.toString());
      return request<{ entries: StockLedgerEntry[]; total: number; limit: number; offset: number }>(`/api/ledger?${query.toString()}`);
    },
    getStats: () =>
      request<{ kpis: DashboardKPIs; recentActivities: StockLedgerEntry[] }>('/api/ledger/stats')
  }
};
