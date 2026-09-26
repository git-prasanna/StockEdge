import React, { useState } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  warehouses: Warehouse[];
  locations: Location[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  warehouses,
  locations
}) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [customCategory, setCustomCategory] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Units');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [salePrice, setSalePrice] = useState<string>('0');
  const [minStock, setMinStock] = useState<string>('10');
  const [reorderPoint, setReorderPoint] = useState<string>('20');
  const [maxStock, setMaxStock] = useState<string>('100');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('7');
  const [description, setDescription] = useState('');

  // Initial stock allocation
  const [addInitialStock, setAddInitialStock] = useState(false);
  const [initialWarehouseId, setInitialWarehouseId] = useState(warehouses[0]?.id || '');
  const [initialLocationId, setInitialLocationId] = useState('');
  const [initialQty, setInitialQty] = useState<string>('0');

  // Filter locations for selected initial warehouse
  const filteredLocations = locations.filter(l => l.warehouse_id === initialWarehouseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    if (!sku.trim()) {
      setError('SKU / Product Code is required');
      return;
    }

    const finalCategory = category === '__custom__' ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Product category is required');
      return;
    }

    if (Number(minStock) < 0 || Number(reorderPoint) < 0 || Number(maxStock) < 0) {
      setError('Stock thresholds cannot be negative numbers');
      return;
    }

    if (Number(reorderPoint) < Number(minStock)) {
      setError('Reorder point should normally be greater than or equal to minimum safety stock');
      return;
    }

    if (addInitialStock && (Number(initialQty) < 0 || !initialWarehouseId || !initialLocationId)) {
      setError('Please provide a valid warehouse, location, and non-negative initial quantity');
      return;
    }

    try {
      setSubmitting(true);
      await api.products.create({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        category: finalCategory,
        unit_of_measure: unitOfMeasure,
        cost_price: Number(costPrice) || 0,
        sale_price: Number(salePrice) || 0,
        min_stock: Number(minStock) || 0,
        reorder_point: Number(reorderPoint) || 0,
        max_stock: Number(maxStock) || 0,
        lead_time_days: Number(leadTimeDays) || 7,
        description: description.trim() || undefined,
        initial_stock: addInitialStock && Number(initialQty) > 0 ? {
          warehouse_id: initialWarehouseId,
          location_id: initialLocationId,
          quantity: Number(initialQty)
        } : undefined,
        user_name: user?.name || 'Alex Morgan'
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Register New Inventory Product
              </h2>
              <p className="text-xs text-slate-500">
                Define SKU specifications, inventory rules, and initial bay assignment
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

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Row 1: Name and SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Smart IoT Gateway Pro v2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Item Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SKU-IOT-8802"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Barcode and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barcode / EAN-13 (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 890123450001"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="Electronics">Electronics</option>
                <option value="Robotics & Motors">Robotics & Motors</option>
                <option value="Cabling & Networking">Cabling & Networking</option>
                <option value="Packaging & Storage">Packaging & Storage</option>
                <option value="Hardware Tools">Hardware Tools</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="__custom__">+ Enter Custom Category...</option>
              </select>
              {category === '__custom__' && (
                <input
                  type="text"
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                />
              )}
            </div>
          </div>

          {/* Row 3: Unit of Measure & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="Units">Units (pcs)</option>
                <option value="Boxes">Boxes</option>
                <option value="Rolls">Rolls</option>
                <option value="Kg">Kilograms (Kg)</option>
                <option value="Meters">Meters (m)</option>
                <option value="Pallets">Pallets</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 4: Reordering Rules (Min, Reorder, Max, Lead Time) */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Automated Reordering Thresholds
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Min Safety Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Reorder Point
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Max Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxStock}
                  onChange={(e) => setMaxStock(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Initial Stock Assignment (Optional) */}
          <div className="p-3 border border-slate-200 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={addInitialStock}
                onChange={(e) => setAddInitialStock(e.target.checked)}
                className="rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Allocate Initial Physical Stock on Registration</span>
            </label>

            {addInitialStock && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Target Warehouse
                  </label>
                  <select
                    value={initialWarehouseId}
                    onChange={(e) => {
                      setInitialWarehouseId(e.target.value);
                      const locs = locations.filter(l => l.warehouse_id === e.target.value);
                      setInitialLocationId(locs[0]?.id || '');
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Storage Location / Bay
                  </label>
                  <select
                    value={initialLocationId}
                    onChange={(e) => setInitialLocationId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    <option value="">Select Location</option>
                    {filteredLocations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={initialQty}
                    onChange={(e) => setInitialQty(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md p-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Engineering Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Technical specs, handling instructions, supplier details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Actions */}
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
              {submitting ? 'Registering...' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
