import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle, Calculator } from 'lucide-react';
import { Product, Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
}

export const CreateAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  warehouses,
  locations,
  products
}) => {
  const { user } = useAuth();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [locationId, setLocationId] = useState('');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [theoreticalQty, setTheoreticalQty] = useState<number>(0);
  const [countedQty, setCountedQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('Cycle Count Discrepancy');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set default location when warehouse changes
  useEffect(() => {
    const whLocs = locations.filter(l => l.warehouse_id === warehouseId);
    if (whLocs.length > 0) {
      setLocationId(whLocs[0].id);
    }
  }, [warehouseId, locations]);

  // Fetch theoretical on-hand quantity for chosen product & location
  useEffect(() => {
    if (!productId || !warehouseId) return;
    api.products.get(productId)
      .then(res => {
        if (locationId) {
          const loc = res.location_stock?.find((ls: any) => ls.location_id === locationId);
          const qty = loc ? Number(loc.quantity) : 0;
          setTheoreticalQty(qty);
          setCountedQty(qty); // default counted to theoretical
        } else {
          setTheoreticalQty(res.product.total_on_hand || 0);
          setCountedQty(res.product.total_on_hand || 0);
        }
      })
      .catch(() => {
        setTheoreticalQty(0);
        setCountedQty(0);
      });
  }, [productId, locationId, warehouseId]);

  const delta = countedQty - theoreticalQty;
  const isSurplus = delta > 0;
  const isShortage = delta < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!warehouseId || !locationId) {
      setError('Warehouse and location are required');
      return;
    }

    if (!productId) {
      setError('Product is required');
      return;
    }

    if (countedQty < 0) {
      setError('Physical counted quantity cannot be negative');
      return;
    }

    const finalReason = adjustmentReason === 'Other' ? customReason.trim() : adjustmentReason;
    if (!finalReason) {
      setError('An explicit adjustment reason is strictly required to adjust physical inventory');
      return;
    }

    try {
      setSubmitting(true);
      await api.operations.create({
        op_type: 'ADJUSTMENT',
        source_warehouse_id: warehouseId,
        source_location_id: locationId,
        adjustment_reason: finalReason,
        notes: notes.trim() || undefined,
        created_by: user?.name || 'Alex Morgan',
        lines: [
          {
            product_id: productId,
            demand_qty: theoreticalQty,
            done_qty: countedQty
          }
        ]
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredLocations = locations.filter(l => l.warehouse_id === warehouseId);
  const selectedProd = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Physical Inventory Adjustment
              </h2>
              <p className="text-xs text-slate-500">
                Reconcile physical stock counts with theoretical ledger balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Warehouse and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facility / Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location / Rack Bay <span className="text-rose-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {filteredLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Product to Reconcile <span className="text-rose-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Card: Theoretical vs Counted vs Computed Delta */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5 text-slate-500" />
              <span>Count Variance Calculator</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="block text-[11px] text-slate-500 font-medium">Theoretical On Hand</span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {theoreticalQty}
                </span>
                <span className="block text-[10px] text-slate-400">{selectedProd?.unit_of_measure}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="block text-[11px] text-slate-700 font-bold">Physical Counted Qty</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={countedQty}
                  onChange={(e) => setCountedQty(Number(e.target.value))}
                  className="w-full text-center text-lg font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md py-0.5 mt-0.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
                <span className="block text-[10px] text-slate-400">{selectedProd?.unit_of_measure}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="block text-[11px] text-slate-500 font-medium">Computed Delta</span>
                <span
                  className={`text-lg font-bold font-mono block ${
                    delta === 0
                      ? 'text-slate-600'
                      : isSurplus
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {isSurplus ? `+${delta}` : delta}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {delta === 0 ? 'No change' : isSurplus ? 'Surplus' : 'Deficit / Shortage'}
                </span>
              </div>
            </div>
          </div>

          {/* Adjustment Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="Cycle Count Discrepancy">Cycle Count Discrepancy (Scheduled physical audit)</option>
              <option value="Damaged / Scrap in Transit">Damaged / Broken goods written off as scrap</option>
              <option value="Found Unregistered Stock">Found unregistered stock / Supplier over-delivery</option>
              <option value="Theft or Inventory Shrinkage">Inventory Shrinkage / Unexplained loss</option>
              <option value="Customer Return Restock">Customer return restocked after inspection</option>
              <option value="Other">Other reason (Enter below)</option>
            </select>

            {adjustmentReason === 'Other' && (
              <input
                type="text"
                placeholder="Specify precise adjustment justification..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Investigation findings, batch numbers, or auditor remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Recording Adjustment...' : 'Record Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
