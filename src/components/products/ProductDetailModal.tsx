import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Warehouse,
  History,
  AlertTriangle,
  ArrowDownToLine,
  Sliders,
  CheckCircle2,
  Edit2,
  Save
} from 'lucide-react';
import { Product, StockLedgerEntry } from '../../types/inventory';
import { api } from '../../services/api';

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
  onOrderReplenishment: (product: Product) => void;
  onProductUpdated: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  onClose,
  onOrderReplenishment,
  onProductUpdated
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [locationStock, setLocationStock] = useState<any[]>([]);
  const [movements, setMovements] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit reordering rules state
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [minStock, setMinStock] = useState<number>(0);
  const [reorderPoint, setReorderPoint] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number>(0);
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.products.get(productId)
      .then(res => {
        setProduct(res.product);
        setLocationStock(res.location_stock || []);
        setMovements(res.recent_movements || []);
        setMinStock(res.product.min_stock);
        setReorderPoint(res.product.reorder_point);
        setMaxStock(res.product.max_stock);
      })
      .catch(err => console.error('Failed to load product detail:', err))
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSaveRules = async () => {
    if (!product) return;
    try {
      setSavingRules(true);
      await api.products.update(product.id, {
        min_stock: Number(minStock),
        reorder_point: Number(reorderPoint),
        max_stock: Number(maxStock)
      });
      setIsEditingRules(false);
      onProductUpdated();
      // Reload
      const res = await api.products.get(product.id);
      setProduct(res.product);
    } catch (err) {
      console.error('Failed to update rules:', err);
    } finally {
      setSavingRules(false);
    }
  };

  if (!productId) return null;

  const onHand = product?.total_on_hand || 0;
  const isOutOfStock = onHand <= 0;
  const isLowStock = !isOutOfStock && onHand <= (product?.reorder_point || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {product?.name || 'Product Details'}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm">
                  {product?.sku}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>{product?.category}</span>
                <span aria-hidden="true">·</span>
                <span>Unit: {product?.unit_of_measure}</span>
                {product?.barcode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Barcode: {product.barcode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isLowStock || isOutOfStock) && product && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOrderReplenishment(product);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Order Replenishment</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading inventory metrics and ledger history...
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total On Hand
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {product?.total_on_hand} {product?.unit_of_measure}
                </span>
                <div className="mt-1">
                  {isOutOfStock ? (
                    <span className="text-rose-600 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Out of stock
                    </span>
                  ) : isLowStock ? (
                    <span className="text-amber-600 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Below reorder point
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Healthy level
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Reserved in Orders
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {product?.total_reserved || 0} {product?.unit_of_measure}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Committed in deliveries
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Net Available
                </span>
                <span className="text-xl font-bold font-mono text-blue-700 mt-1 block">
                  {product?.total_available || 0} {product?.unit_of_measure}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Unallocated inventory
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Valuation Unit Cost
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  ${product?.cost_price?.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Sale: ${product?.sale_price?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Reordering Rules Section */}
            <div className="p-4 bg-slate-50/75 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Automated Reordering Rules
                  </h3>
                </div>
                {!isEditingRules ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingRules(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Adjust Rules</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingRules(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRules}
                      disabled={savingRules}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Save className="w-3 h-3" />
                      <span>{savingRules ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditingRules ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Min Safety Stock:</span>
                    <span className="font-mono font-bold text-slate-900">{product?.min_stock} {product?.unit_of_measure}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reorder Point:</span>
                    <span className="font-mono font-bold text-slate-900">{product?.reorder_point} {product?.unit_of_measure}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Max Bay Capacity:</span>
                    <span className="font-mono font-bold text-slate-900">{product?.max_stock} {product?.unit_of_measure}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Supplier Lead Time:</span>
                    <span className="font-mono font-bold text-slate-900">{product?.lead_time_days || 7} days</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Min Safety Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Reorder Point</label>
                    <input
                      type="number"
                      min="0"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(Number(e.target.value))}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Max Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={maxStock}
                      onChange={(e) => setMaxStock(Number(e.target.value))}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Per-Location Stock Availability */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Per-Location Stock Availability
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {locationStock.length} storage locations
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 font-semibold text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">Warehouse</th>
                      <th className="py-2.5 px-3">Location / Bay</th>
                      <th className="py-2.5 px-3">Rack & Shelf</th>
                      <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                      <th className="py-2.5 px-4 text-right">Net Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {locationStock.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No stock allocated to any warehouse location.
                        </td>
                      </tr>
                    ) : (
                      locationStock.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {loc.warehouse_name}
                            <span className="block text-[11px] font-mono text-slate-400">
                              {loc.warehouse_code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-slate-800">{loc.location_name}</span>
                            <span className="block text-[10px] font-mono text-slate-400">{loc.location_code}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {loc.zone || '—'} / {loc.rack || '—'} {loc.shelf ? `(${loc.shelf})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {loc.quantity} {product?.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                            {loc.available_quantity} {product?.unit_of_measure}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Movement History (Append-only Ledger Entries) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Stock Ledger Audit History
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {movements.length} logged movements
                </span>
              </div>

              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 font-semibold text-[11px] border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-3">Operation / Ref #</th>
                      <th className="py-2.5 px-3">Warehouse / Bay Route</th>
                      <th className="py-2.5 px-3 text-right">Delta Qty</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-4">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No ledger movements recorded for this SKU yet.
                        </td>
                      </tr>
                    ) : (
                      movements.map((move) => {
                        const isPos = move.quantity_delta > 0;
                        return (
                          <tr key={move.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                            <td className="py-2 px-4 text-slate-500 whitespace-nowrap">
                              {new Date(move.timestamp).toLocaleDateString()}{' '}
                              {new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-slate-900 font-semibold block">{move.reference_no}</span>
                              <span className="text-[10px] text-slate-400 font-sans">{move.op_type.replace('_', ' ')}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-sans">
                              {move.dest_warehouse_name || move.source_warehouse_name || 'Warehouse'}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isPos ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isPos ? `+${move.quantity_delta}` : move.quantity_delta}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900 font-bold">
                              {move.balance_after}
                            </td>
                            <td className="py-2 px-4 text-slate-500 font-sans truncate max-w-[120px]">
                              {move.performed_by}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
