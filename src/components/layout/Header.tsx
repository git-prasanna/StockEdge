import React, { useState } from 'react';
import {
  Menu,
  Plus,
  Warehouse as WarehouseIcon,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Warehouse } from '../../types/inventory';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  warehouses: Warehouse[];
  selectedWarehouse: string;
  setSelectedWarehouse: (whId: string) => void;
  onOpenCreate: (type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT' | 'PRODUCT') => void;
  onSearchGlobal?: (term: string) => void;
  lowStockCount?: number;
  onNavigateAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  warehouses,
  selectedWarehouse,
  setSelectedWarehouse,
  onOpenCreate,
  onSearchGlobal,
  lowStockCount = 0,
  onNavigateAlerts
}) => {
  const { user } = useAuth();
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchGlobal) onSearchGlobal(searchTerm);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B1528] border-b border-[#1E293B] px-3.5 md:px-8 flex items-center justify-between gap-3 shadow-sm">
      {/* Left: Mobile hamburger menu trigger + Facility switcher */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-300 hover:text-white md:hidden rounded-lg hover:bg-[#15233E] active:scale-95 transition-all"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-blue-400 shrink-0 hidden sm:block" />
          <label htmlFor="warehouse-select" className="sr-only">Select Facility</label>
          <div className="relative">
            <select
              id="warehouse-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="text-xs md:text-sm font-medium text-slate-100 bg-[#132238] border border-[#223554] hover:border-blue-500/60 rounded-lg py-1.5 pl-3 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-colors"
            >
              <option value="ALL" className="bg-[#0B1528] text-white">All Facilities (Consolidated)</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id} className="bg-[#0B1528] text-white">
                  {wh.code} — {wh.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Middle: Fast SKU / Query Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search SKU, reference, batch, or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#132238] border border-[#223554] text-xs md:text-sm text-white placeholder:text-slate-400 pl-9 pr-4 py-1.5 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </form>

      {/* Right: Low Stock Alert Indicator + Electric Blue Primary Action Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={onNavigateAlerts}
            title={`${lowStockCount} items below safety reorder threshold`}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Low Stock:</span>
            <span className="font-bold font-mono">{lowStockCount}</span>
          </button>
        )}

        {/* "+ New Action" Dropdown with Electric Blue Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs md:text-sm font-semibold px-3 py-1.5 md:py-2 rounded-lg shadow-sm shadow-blue-500/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Action</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {createDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setCreateDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 text-xs md:text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Logistics Movements
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenCreate('RECEIPT');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900">Receive Stock</span>
                    <span className="text-[11px] text-slate-500">Supplier goods inward</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenCreate('DELIVERY');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ArrowUpFromLine className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900">Dispatch Delivery</span>
                    <span className="text-[11px] text-slate-500">Customer outbound order</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenCreate('INTERNAL_TRANSFER');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900">Internal Transfer</span>
                    <span className="text-[11px] text-slate-500">Move between bays/racks</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenCreate('ADJUSTMENT');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900">Physical Stock Count</span>
                    <span className="text-[11px] text-slate-500">Reconcile variance / delta</span>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenCreate('PRODUCT');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900">Register New Product</span>
                    <span className="text-[11px] text-slate-500">SKU, category & reorder point</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
