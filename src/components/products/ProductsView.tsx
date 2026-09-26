import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowDownToLine,
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Boxes
} from 'lucide-react';
import { Product, Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { CreateProductModal } from './CreateProductModal';
import { ProductDetailModal } from './ProductDetailModal';

interface ProductsViewProps {
  selectedWarehouse: string;
  warehouses: Warehouse[];
  locations: Location[];
  onOrderReplenishment: (product: Product) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  selectedWarehouse,
  warehouses,
  locations,
  onOrderReplenishment,
  openCreateModal = false,
  onCloseCreateModal
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatus, setStockStatus] = useState<string>('all'); // 'all', 'in_stock', 'low', 'out'

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(openCreateModal);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (openCreateModal) {
      setIsCreateOpen(true);
    }
  }, [openCreateModal]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.products.list({
          search: search || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          stockStatus: stockStatus !== 'all' ? stockStatus : undefined,
          warehouseId: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined
        }),
        api.products.getCategories()
      ]);

      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, stockStatus, selectedWarehouse]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  return (
    <div className="space-y-5">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Product Master & Stock Levels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage SKU specifications, safety thresholds, and per-facility inventory availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Products"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          {/* SKU / Name Search */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search by SKU, product name, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden min-h-[44px]"
            />
          </form>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs md:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter Buttons */}
          <div className="md:col-span-4 flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStockStatus('all')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                stockStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStockStatus('in_stock')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                stockStatus === 'in_stock'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In Stock
            </button>
            <button
              type="button"
              onClick={() => setStockStatus('low')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                stockStatus === 'low'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Stock
            </button>
            <button
              type="button"
              onClick={() => setStockStatus('out')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                stockStatus === 'out'
                  ? 'bg-white text-rose-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Products Presentation: Responsive Touch Cards (< md) + Generous Spacing Table (>= md) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Mobile Touch Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Loading inventory catalog...
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No products found matching the criteria.
            </div>
          ) : (
            products.map((p) => {
              const onHand = p.total_on_hand ?? 0;
              const isOut = onHand <= 0;
              const isLow = !isOut && onHand <= p.reorder_point;
              const healthStatus = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className="p-4 hover:bg-slate-50/90 active:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {p.sku}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {p.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {p.name}
                      </h3>
                    </div>

                    {/* Color-Coded Pill Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs whitespace-nowrap ${
                        isOut
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : isLow
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{healthStatus}</span>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-lg text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">On Hand</span>
                      <span className="text-xs font-bold text-slate-900">{onHand}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Available</span>
                      <span className="text-xs font-bold text-blue-700">{p.total_available ?? onHand}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Reorder Pt</span>
                      <span className="text-xs font-bold text-slate-600">{p.reorder_point}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      UOM: {p.unit_of_measure}
                    </span>
                    <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5">
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Table with GENEROUS ROW SPACING (>= 48px touch targets) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-semibold">SKU & Code</th>
                <th className="py-3.5 px-4 font-semibold">Product Name</th>
                <th className="py-3.5 px-3 font-semibold">Category</th>
                <th className="py-3.5 px-3 font-semibold">Unit</th>
                <th className="py-3.5 px-3 text-right font-semibold">Physical On Hand</th>
                <th className="py-3.5 px-3 text-right font-semibold">Available</th>
                <th className="py-3.5 px-3 text-right font-semibold">Reorder Threshold</th>
                <th className="py-3.5 px-4 font-semibold">Stock Health</th>
                <th className="py-3.5 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                    Loading inventory data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const onHand = p.total_on_hand ?? 0;
                  const isOut = onHand <= 0;
                  const isLow = !isOut && onHand <= p.reorder_point;
                  const healthStatus = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {p.name}
                        {p.barcode && (
                          <span className="block text-[11px] font-mono text-slate-400 font-normal">
                            {p.barcode}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-slate-600">
                        {p.category}
                      </td>
                      <td className="py-4 px-3 text-slate-500 font-mono">
                        {p.unit_of_measure}
                      </td>
                      <td className="py-4 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {onHand}
                      </td>
                      <td className="py-4 px-3 text-right font-mono font-bold text-blue-700 tabular-nums">
                        {p.total_available ?? onHand}
                      </td>
                      <td className="py-4 px-3 text-right font-mono text-slate-500 tabular-nums">
                        {p.reorder_point} <span className="text-slate-400 font-normal">(Min: {p.min_stock})</span>
                      </td>

                      {/* COLOR-CODED PILL BADGE */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${
                            isOut
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{healthStatus}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductId(p.id);
                          }}
                          className="p-1.5 text-blue-600 group-hover:text-blue-700 rounded-lg group-hover:bg-blue-50 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        onCreated={loadProducts}
        warehouses={warehouses}
        locations={locations}
      />

      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onOrderReplenishment={onOrderReplenishment}
        onProductUpdated={loadProducts}
      />
    </div>
  );
};
