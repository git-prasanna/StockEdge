import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { StockLedgerEntry, Warehouse } from '../../types/inventory';
import { api } from '../../services/api';
import { Breadcrumbs } from '../common/Breadcrumbs';

interface StockLedgerViewProps {
  selectedWarehouse: string;
  warehouses: Warehouse[];
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({
  selectedWarehouse,
  warehouses
}) => {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [opTypeFilter, setOpTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const loadLedger = async () => {
    try {
      setLoading(true);
      const res = await api.ledger.list({
        op_type: opTypeFilter !== 'ALL' ? opTypeFilter : undefined,
        warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        search: search || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      setEntries(res.entries || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [opTypeFilter, selectedWarehouse, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLedger();
  };

  const exportCSV = () => {
    if (entries.length === 0) return;
    const headers = [
      'Timestamp',
      'Operation Type',
      'Reference No',
      'SKU',
      'Product Name',
      'Source Warehouse',
      'Destination Warehouse',
      'Quantity Delta',
      'Balance After',
      'Reason',
      'Performed By'
    ];

    const rows = entries.map(e => [
      `"${e.timestamp}"`,
      `"${e.op_type}"`,
      `"${e.reference_no}"`,
      `"${e.sku}"`,
      `"${e.product_name.replace(/"/g, '""')}"`,
      `"${e.source_warehouse_name || ''}"`,
      `"${e.dest_warehouse_name || ''}"`,
      e.quantity_delta,
      e.balance_after,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${e.performed_by}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocksense_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: 'Move History & Stock Ledger' }
        ]}
      />

      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs text-slate-800">
            <History className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Stock Ledger & Move History
              </h1>
              <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-sm">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Append-Only Source of Truth</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Immutable audit log of all quantity increments, decrements, adjustments, and bay transfers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search ledger by SKU, product name, ref #, reason, or auditor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
            />
          </form>

          {/* Operation Type Dropdown */}
          <div className="sm:col-span-5 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={opTypeFilter}
              onChange={(e) => {
                setOpTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs md:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="RECEIPT">Receipts (+ Stock In)</option>
              <option value="DELIVERY">Deliveries (- Stock Out)</option>
              <option value="INTERNAL_TRANSFER">Internal Relocations</option>
              <option value="ADJUSTMENT">Physical Count Adjustments</option>
              <option value="INITIAL_INVENTORY">Initial Baseline Ingestion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Mobile View: Touch Cards Stream (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Loading ledger entries from SQLite database...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No ledger entries match the filter criteria.
            </div>
          ) : (
            entries.map((entry) => {
              const isPos = entry.quantity_delta > 0;
              const isZero = entry.quantity_delta === 0;

              return (
                <div key={entry.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {entry.reference_no}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {entry.op_type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 mt-0.5">
                        {entry.product_name}
                      </h4>
                      <span className="font-mono text-[11px] text-slate-400">
                        {entry.sku}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold text-xs inline-block px-2 py-0.5 rounded-full border ${
                          isZero
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : isPos
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isPos ? `+${entry.quantity_delta}` : entry.quantity_delta}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                        Bal: {entry.balance_after}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate max-w-[200px]">
                      {entry.dest_warehouse_name || entry.source_warehouse_name || 'Warehouse'}
                    </span>
                    <span>
                      {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-3 font-semibold">Type</th>
                <th className="py-3.5 px-3 font-semibold">Reference #</th>
                <th className="py-3.5 px-4 font-semibold">Product & SKU</th>
                <th className="py-3.5 px-3 font-semibold">Facility / Bay Route</th>
                <th className="py-3.5 px-3 text-right font-semibold">Delta</th>
                <th className="py-3.5 px-3 text-right font-semibold">Balance</th>
                <th className="py-3.5 px-3 font-semibold">Reason / Context</th>
                <th className="py-3.5 px-4 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                    Loading ledger entries from SQLite database...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No ledger entries match the filter criteria.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isPos = entry.quantity_delta > 0;
                  const isZero = entry.quantity_delta === 0;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(entry.timestamp).toLocaleDateString()}{' '}
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {entry.op_type === 'RECEIPT' ? 'Receipt' :
                           entry.op_type === 'DELIVERY' ? 'Delivery' :
                           entry.op_type === 'INTERNAL_TRANSFER' ? 'Transfer' :
                           entry.op_type === 'ADJUSTMENT' ? 'Adjustment' : 'Initial Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {entry.reference_no}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-900 block">{entry.product_name}</span>
                        <span className="font-mono text-[11px] text-slate-400">{entry.sku}</span>
                      </td>
                      <td className="py-4 px-3 text-slate-600 text-[11px] font-mono">
                        {entry.source_warehouse_name && entry.dest_warehouse_name ? (
                          <span>{entry.source_warehouse_name} → {entry.dest_warehouse_name}</span>
                        ) : (
                          <span>{entry.dest_warehouse_name || entry.source_warehouse_name || 'Warehouse'}</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right font-mono font-bold whitespace-nowrap tabular-nums">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            isZero
                              ? 'bg-slate-100 text-slate-600'
                              : isPos
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPos ? `+${entry.quantity_delta}` : entry.quantity_delta}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {entry.balance_after}
                      </td>
                      <td className="py-4 px-3 text-slate-600 truncate max-w-[200px]" title={entry.reason}>
                        {entry.reason || '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                        {entry.performed_by}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {entries.length} of {totalCount} logged transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
