import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { DashboardKPIs, Operation, StockLedgerEntry, Warehouse } from '../../types/inventory';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { ActiveNav } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (nav: ActiveNav) => void;
  selectedWarehouse: string;
  warehouses: Warehouse[];
  onOpenOperation: (op: Operation) => void;
  onOpenCreate: (type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  selectedWarehouse,
  warehouses,
  onOpenOperation,
  onOpenCreate
}) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [recentActivities, setRecentActivities] = useState<StockLedgerEntry[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic filter state
  const [filterDocType, setFilterDocType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, opsRes, catsRes] = await Promise.all([
        api.ledger.getStats(),
        api.operations.list({
          op_type: filterDocType !== 'ALL' ? filterDocType : undefined,
          status: filterStatus !== 'ALL' ? filterStatus : undefined,
          warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
          search: searchQuery || undefined,
          limit: 20
        }),
        api.products.getCategories()
      ]);

      setKpis(statsRes.kpis);
      setRecentActivities(statsRes.recentActivities || []);
      setOperations(opsRes.operations || []);
      setCategories(catsRes.categories || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDocType, filterStatus, selectedWarehouse]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Top Banner / SaaS Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Operations & Inventory Hub
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Live Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time stock ledger, cross-facility fulfillment queues, and audit trail
          </p>
        </div>

        {/* Quick action buttons on desktop & refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer min-h-[40px]"
            title="Refresh latest stock figures"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCreate('RECEIPT')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>+ Receive Stock</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCreate('DELIVERY')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>+ Dispatch Order</span>
          </button>
        </div>
      </div>

      {/* Mobile Quick Action Buttons Bar (One-Thumb Access for Mobile Screens) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:hidden">
        <button
          type="button"
          onClick={() => onOpenCreate('RECEIPT')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs active:bg-blue-50 text-left transition-colors min-h-[48px]"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Receive</span>
            <span className="text-[10px] text-slate-500">Inward goods</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenCreate('DELIVERY')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs active:bg-blue-50 text-left transition-colors min-h-[48px]"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowUpFromLine className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Dispatch</span>
            <span className="text-[10px] text-slate-500">Outbound pick</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenCreate('INTERNAL_TRANSFER')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs active:bg-blue-50 text-left transition-colors min-h-[48px]"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Transfer</span>
            <span className="text-[10px] text-slate-500">Bay rebalance</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenCreate('ADJUSTMENT')}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs active:bg-blue-50 text-left transition-colors min-h-[48px]"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">Count Stock</span>
            <span className="text-[10px] text-slate-500">Audit variance</span>
          </div>
        </button>
      </div>

      {/* STRUCTURED DATA CARDS WITH SUBTLE BORDERS TO GROUP DASHBOARD METRICS */}
      <div className="space-y-4">
        {/* Metric Group 1: Inventory Health & Catalog Capacity */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Inventory Health & Capacity
            </span>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Catalog Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Total Products & Units In Stock */}
            <div
              onClick={() => onNavigate('products')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4.5 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Products in Stock
                  </span>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                      {kpis?.totalProducts ?? '—'}
                    </span>
                    <span className="text-xs font-medium text-slate-500">active SKUs</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {kpis?.totalUnitsInStock ?? 0}
                  </span>
                  <span className="text-slate-500">Physical Units On Hand</span>
                </div>
                <span className="text-blue-600 font-medium inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* 2. Low Stock & Out of Stock Card */}
            <div
              onClick={() => onNavigate('products')}
              className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4.5 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Low & Depleted Stock
                    </span>
                    {(kpis?.totalAlertStockCount ?? 0) > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Action Required
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-3xl font-bold font-mono tabular-nums text-amber-900 tracking-tight">
                      {kpis?.totalAlertStockCount ?? 0}
                    </span>
                    <span className="text-xs font-medium text-amber-700/80">items below safety rule</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {kpis?.lowStockCount ?? 0} Low Stock
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {kpis?.outOfStockCount ?? 0} Out of Stock
                  </span>
                </div>
                <span className="text-amber-700 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Replenish <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Group 2: Operational Flow & Logistics Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operations & Fulfillment Pipeline
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Consolidated across active facilities
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 3. Pending Receipts */}
            <div
              onClick={() => onNavigate('receipts')}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pending Receipts
                  </span>
                  <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {kpis?.pendingReceipts ?? '—'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Supplier goods inward</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready to intake
                </span>
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Process <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* 4. Pending Deliveries */}
            <div
              onClick={() => onNavigate('deliveries')}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pending Deliveries
                  </span>
                  <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {kpis?.pendingDeliveries ?? '—'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Outbound customer shipments</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Waiting pick & pack
                </span>
                <span className="text-blue-700 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Dispatch <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* 5. Scheduled Internal Transfers */}
            <div
              onClick={() => onNavigate('transfers')}
              className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Internal Transfers
                  </span>
                  <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {kpis?.scheduledTransfers ?? '—'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Inter-facility & bay rebalancing</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  Total moves scheduled
                </span>
                <span className="text-indigo-700 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Manage <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Workflow & Status Filters</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {operations.length} matching operations
          </span>
        </div>

        {/* Quick Document Type Segmented Control Buttons (Easy Touch Hits) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'ALL', label: 'All Operations' },
            { id: 'RECEIPT', label: 'Receipts (In)' },
            { id: 'DELIVERY', label: 'Deliveries (Out)' },
            { id: 'INTERNAL_TRANSFER', label: 'Internal Moves' },
            { id: 'ADJUSTMENT', label: 'Stock Counts' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterDocType(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[36px] ${
                filterDocType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Document Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
            >
              <option value="ALL">All Statuses (Draft, Waiting, Ready, Done)</option>
              <option value="Draft">Draft</option>
              <option value="Waiting">Waiting / Waiting pick</option>
              <option value="Ready">Ready</option>
              <option value="Done">Done (Completed)</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          {/* Product Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Product Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Reference / Partner */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Reference / Partner Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. REC-2026, Tesla, Apex..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]"
              />
              <button
                type="button"
                onClick={loadData}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: ACTIVE OPERATIONS TABLE/CARDS + REAL-TIME STOCK LEDGER STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Warehouse Operations with Generous Row Spacing & Mobile Touch Cards */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900">
                  Active Warehouse Operations
                </h2>
                <p className="text-xs text-slate-500">
                  Tap any document to inspect line items, pick status, or validate moves
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCreate('RECEIPT')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
                >
                  + New Inward
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCreate('DELIVERY')}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
                >
                  + New Outward
                </button>
              </div>
            </div>

            {/* RESPONSIVE VIEW 1: Mobile Touch Cards (< md screens) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  Loading operations from SQLite database...
                </div>
              ) : operations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No operations match the selected criteria.
                </div>
              ) : (
                operations.map((op) => (
                  <div
                    key={op.id}
                    onClick={() => onOpenOperation(op)}
                    className="p-4 hover:bg-slate-50/90 active:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {op.reference_no}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                            {op.op_type === 'RECEIPT' ? 'Receipt' :
                             op.op_type === 'DELIVERY' ? 'Delivery' :
                             op.op_type === 'INTERNAL_TRANSFER' ? 'Transfer' : 'Count'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mt-1">
                          {op.partner_name || op.adjustment_reason || 'Internal operation'}
                        </p>
                      </div>

                      {/* Color-Coded Pill Badge for Status */}
                      <StatusBadge status={op.status} pickingStatus={op.picking_status} size="sm" />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {op.op_type === 'RECEIPT' ? `→ ${op.dest_warehouse_code || 'WH'}` :
                           op.op_type === 'DELIVERY' ? `${op.source_warehouse_code || 'WH'} →` :
                           op.op_type === 'INTERNAL_TRANSFER' ? `${op.source_warehouse_code} → ${op.dest_warehouse_code}` :
                           op.source_warehouse_code}
                        </span>
                        {op.scheduled_date && (
                          <span className="text-slate-400 text-[11px]">
                            · {op.scheduled_date}
                          </span>
                        )}
                      </div>

                      <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RESPONSIVE VIEW 2: Desktop & Tablet Data Table with GENEROUS ROW SPACING (>= 48px touch targets) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Ref #</th>
                    <th className="py-3.5 px-3 font-semibold">Type</th>
                    <th className="py-3.5 px-3 font-semibold">Partner / Purpose</th>
                    <th className="py-3.5 px-3 font-semibold">Bay Route</th>
                    <th className="py-3.5 px-3 font-semibold">Status Badge</th>
                    <th className="py-3.5 px-3 text-right font-semibold">Scheduled</th>
                    <th className="py-3.5 px-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                        Loading operations from SQLite database...
                      </td>
                    </tr>
                  ) : operations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No operations match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    operations.map((op) => (
                      <tr
                        key={op.id}
                        onClick={() => onOpenOperation(op)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {op.reference_no}
                        </td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="text-slate-800 font-semibold">
                            {op.op_type === 'RECEIPT' ? 'Receipt' :
                             op.op_type === 'DELIVERY' ? 'Delivery' :
                             op.op_type === 'INTERNAL_TRANSFER' ? 'Transfer' : 'Adjustment'}
                          </span>
                        </td>
                        <td className="py-4 px-3 truncate max-w-[160px] text-slate-800 font-medium">
                          {op.partner_name || op.adjustment_reason || '—'}
                        </td>
                        <td className="py-4 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {op.op_type === 'RECEIPT' ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              → {op.dest_warehouse_code || 'WH'}
                            </span>
                          ) : op.op_type === 'DELIVERY' ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {op.source_warehouse_code || 'WH'} →
                            </span>
                          ) : op.op_type === 'INTERNAL_TRANSFER' ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {op.source_warehouse_code} → {op.dest_warehouse_code}
                            </span>
                          ) : (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              {op.source_warehouse_code}
                            </span>
                          )}
                        </td>
                        {/* COLOR-CODED PILL BADGE */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <StatusBadge status={op.status} pickingStatus={op.picking_status} size="sm" />
                        </td>
                        <td className="py-4 px-3 text-right text-slate-500 font-mono whitespace-nowrap">
                          {op.scheduled_date || '—'}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="text-blue-600 group-hover:text-blue-700 p-1.5 inline-flex items-center justify-center rounded-lg group-hover:bg-blue-50 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing up to 20 operational records</span>
            <button
              type="button"
              onClick={() => onNavigate('receipts')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All Operations →
            </button>
          </div>
        </div>

        {/* Right 1 Column: Live Append-Only Stock Ledger Activity Stream */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-900">
                    Stock Ledger Stream
                  </h2>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Single append-only source of truth
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('ledger')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No movement entries logged yet.
                </div>
              ) : (
                recentActivities.slice(0, 7).map((entry) => {
                  const isPositive = entry.quantity_delta > 0;
                  const isZero = entry.quantity_delta === 0;

                  return (
                    <div key={entry.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {entry.product_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-slate-600 font-medium">{entry.sku}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{entry.op_type.replace('_', ' ').toLowerCase()}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-bold text-xs inline-block px-1.5 py-0.5 rounded ${
                              isZero
                                ? 'bg-slate-100 text-slate-600'
                                : isPositive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isPositive ? `+${entry.quantity_delta}` : entry.quantity_delta}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Bal: {entry.balance_after}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 text-[11px] text-slate-400 truncate flex items-center justify-between">
                        <span>{entry.dest_warehouse_name || entry.source_warehouse_name || 'Warehouse'}</span>
                        <span className="font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Verified SQLite append-only transaction ledger
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
