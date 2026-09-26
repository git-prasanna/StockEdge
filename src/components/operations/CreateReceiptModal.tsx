import React, { useState } from 'react';
import { X, ArrowDownToLine, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Product, Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
  initialProduct?: Product | null;
}

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  warehouses,
  locations,
  products,
  initialProduct
}) => {
  const { user } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState(warehouses[0]?.id || '');
  const [destLocationId, setDestLocationId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Line items
  const [lines, setLines] = useState<Array<{ product_id: string; demand_qty: number; unit_price: number }>>([
    {
      product_id: initialProduct?.id || products[0]?.id || '',
      demand_qty: initialProduct ? Math.max(1, initialProduct.reorder_point - (initialProduct.total_on_hand || 0)) : 10,
      unit_price: initialProduct?.cost_price || 0
    }
  ]);

  // Set default location when warehouse changes
  React.useEffect(() => {
    const whLocs = locations.filter(l => l.warehouse_id === destWarehouseId);
    if (whLocs.length > 0 && (!destLocationId || !whLocs.some(l => l.id === destLocationId))) {
      // Prefer inbound bay if available
      const inbound = whLocs.find(l => l.type === 'inbound') || whLocs[0];
      setDestLocationId(inbound.id);
    }
  }, [destWarehouseId, locations]);

  // If initial product changed
  React.useEffect(() => {
    if (initialProduct) {
      setLines([
        {
          product_id: initialProduct.id,
          demand_qty: Math.max(5, (initialProduct.reorder_point || 10) * 2 - (initialProduct.total_on_hand || 0)),
          unit_price: initialProduct.cost_price || 0
        }
      ]);
    }
  }, [initialProduct]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_id: products[0]?.id || '',
        demand_qty: 10,
        unit_price: products[0]?.cost_price || 0
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
        unit_price: p?.cost_price || 0
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
      setError('Supplier name is required');
      return;
    }

    if (!destWarehouseId || !destLocationId) {
      setError('Destination warehouse and receiving bay are required');
      return;
    }

    for (const line of lines) {
      if (!line.product_id) {
        setError('Please select a product for all lines');
        return;
      }
      if (Number(line.demand_qty) <= 0) {
        setError('Demand quantity must be greater than zero');
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.operations.create({
        op_type: 'RECEIPT',
        partner_name: partnerName.trim(),
        dest_warehouse_id: destWarehouseId,
        dest_location_id: destLocationId,
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
      setError(err.message || 'Failed to create receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredLocations = locations.filter(l => l.warehouse_id === destWarehouseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Goods Receipt (Inward)
              </h2>
              <p className="text-xs text-slate-500">
                Receive inventory from vendor / manufacturing supplier into stock
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
          {/* Supplier and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier / Partner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Sensor Components Ltd."
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Receipt Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Destination Warehouse & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={destWarehouseId}
                onChange={(e) => setDestWarehouseId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Bay / Storage Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
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
                Inbound Items
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
              {lines.map((line, idx) => (
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
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5 sm:hidden">Expected Qty</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={line.demand_qty}
                      onChange={(e) => updateLine(idx, 'demand_qty', Number(e.target.value))}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5 sm:hidden">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Cost"
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
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              PO Number / Logistics Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. PO-9812, Bill of Lading, tracking number..."
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
              {submitting ? 'Generating Receipt...' : 'Create Receipt Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
