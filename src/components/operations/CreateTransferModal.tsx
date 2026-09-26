import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { Product, Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  warehouses,
  locations,
  products
}) => {
  const { user } = useAuth();
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [destLocationId, setDestLocationId] = useState('');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set default source location
  useEffect(() => {
    const srcLocs = locations.filter(l => l.warehouse_id === sourceWarehouseId);
    if (srcLocs.length > 0) {
      setSourceLocationId(srcLocs[0].id);
    }
  }, [sourceWarehouseId, locations]);

  // Set default dest location
  useEffect(() => {
    const dstLocs = locations.filter(l => l.warehouse_id === destWarehouseId);
    if (dstLocs.length > 0) {
      // Find one different from source
      const diff = dstLocs.find(l => l.id !== sourceLocationId) || dstLocs[0];
      setDestLocationId(diff.id);
    }
  }, [destWarehouseId, locations, sourceLocationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceWarehouseId || !sourceLocationId) {
      setError('Source warehouse and location are required');
      return;
    }

    if (!destWarehouseId || !destLocationId) {
      setError('Destination warehouse and location are required');
      return;
    }

    if (sourceLocationId === destLocationId) {
      setError('Source and destination locations cannot be identical');
      return;
    }

    if (!productId) {
      setError('Product is required');
      return;
    }

    if (Number(transferQty) <= 0) {
      setError('Transfer quantity must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      await api.operations.create({
        op_type: 'INTERNAL_TRANSFER',
        source_warehouse_id: sourceWarehouseId,
        source_location_id: sourceLocationId,
        dest_warehouse_id: destWarehouseId,
        dest_location_id: destLocationId,
        scheduled_date: scheduledDate,
        notes: notes.trim() || undefined,
        created_by: user?.name || 'Alex Morgan',
        lines: [
          {
            product_id: productId,
            demand_qty: Number(transferQty)
          }
        ]
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create internal transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const srcLocations = locations.filter(l => l.warehouse_id === sourceWarehouseId);
  const dstLocations = locations.filter(l => l.warehouse_id === destWarehouseId);
  const selectedProd = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Internal Transfer
              </h2>
              <p className="text-xs text-slate-500">
                Relocate inventory between warehouses, zones, or staging racks
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
          {/* Source Location */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Source Origin
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Source Warehouse
                </label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Source Bay / Rack
                </label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {srcLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Destination Location */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Destination Target
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Target Warehouse
                </label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Target Bay / Rack
                </label>
                <select
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  {dstLocations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product and Transfer Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product to Transfer <span className="text-rose-500">*</span>
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transfer Qty ({selectedProd?.unit_of_measure || 'units'})
              </label>
              <input
                type="number"
                min="1"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value))}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Transfer Date & Reason Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transfer Purpose / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Retail storefront replenishment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
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
              {submitting ? 'Creating Transfer...' : 'Schedule Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
