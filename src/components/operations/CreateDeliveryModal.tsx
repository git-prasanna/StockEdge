import React, { useState, useEffect } from 'react';
import { X, ArrowUpFromLine, Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Product, Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
}

export const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  warehouses,
  locations,
  products
}) => {
  const { user } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Line items
  const [lines, setLines] = useState<Array<{ product_id: string; demand_qty: number; unit_price: number }>>([
    {
      product_id: products[0]?.id || '',
      demand_qty: 1,
      unit_price: products[0]?.sale_price || 0
    }
  ]);

  // Set default location when source warehouse changes
  useEffect(() => {
    const whLocs = locations.filter(l => l.warehouse_id === sourceWarehouseId);
    if (whLocs.length > 0 && (!sourceLocationId || !whLocs.some(l => l.id === sourceLocationId))) {
      // Prefer internal storage location
      const internalLoc = whLocs.find(l => l.type === 'internal') || whLocs[0];
      setSourceLocationId(internalLoc.id);
    }
  }, [sourceWarehouseId, locations]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_id: products[0]?.id || '',
        demand_qty: 1,
        unit_price: products[0]?.sale_price || 0
      }
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, val: any) => {
    const updated = [...lines];
    if (field === 'product_id') {
      const p = products.find(prod => prod.id === val);
      updated[index] = {
        ...updated[index],
        product_id: val,
        unit_price: p?.sale_price || 0
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!partnerName.trim()) {
      setError('Customer / Client name is required');
      return;
    }

    if (!sourceWarehouseId || !sourceLocationId) {
      setError('Source warehouse and storage bay are required');
      return;
    }

    for (const line of lines) {
      if (!line.product_id) {
        setError('Please select a product for all lines');
        return;
      }
      if (Number(line.demand_qty) <= 0) {
        setError('Order quantity must be greater than zero');
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.operations.create({
        op_type: 'DELIVERY',
        partner_name: partnerName.trim(),
        source_warehouse_id: sourceWarehouseId,
        source_location_id: sourceLocationId,
        scheduled_date: scheduledDate,
        notes: notes.trim() || undefined,
        created_by: user?.name || 'Alex Morgan',
        lines: lines.map(l => ({
          product_id: l.product_id,
          demand_qty: Number(l.demand_qty),
          unit_price: Number(l.unit_price) || 0
        }))
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create delivery order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredLocations = locations.filter(l => l.warehouse_id === sourceWarehouseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Delivery Order (Outward)
              </h2>
              <p className="text-xs text-slate-500">
                Fulfill outbound sales orders, pick items from racks, and stage for dispatch
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
          {/* Customer and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Recipient Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tesla Automation Lab, Acme Corp"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Dispatch Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Source Warehouse & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Picking Bay / Rack <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {filteredLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Outbound Line Items
              </span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-slate-700 hover:text-slate-900 font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
              {lines.map((line, idx) => {
                const prod = products.find(p => p.id === line.product_id);
                const onHand = prod?.total_on_hand || 0;
                const isShortage = onHand < line.demand_qty;

                return (
                  <div key={idx} className="p-3 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-medium text-slate-500 mb-0.5 sm:hidden">Product</label>
                      <select
                        value={line.product_id}
                        onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} (On Hand: {p.total_on_hand ?? 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-28">
                      <label className="block text-[11px] font-medium text-slate-500 mb-0.5 sm:hidden">Order Qty</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.demand_qty}
                        onChange={(e) => updateLine(idx, 'demand_qty', Number(e.target.value))}
                        className={`w-full text-xs font-mono bg-white border rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden ${
                          isShortage ? 'border-rose-400 text-rose-700' : 'border-slate-200'
                        }`}
                      />
                    </div>

                    <div className="w-full sm:w-28">
                      <label className="block text-[11px] font-medium text-slate-500 mb-0.5 sm:hidden">Sale Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, 'unit_price', Number(e.target.value))}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Address / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shipping Destination & Special Instructions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Shipping carrier, dock delivery window, destination address..."
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
              {submitting ? 'Generating Order...' : 'Create Delivery Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
