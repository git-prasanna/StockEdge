import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { Operation, Warehouse, Location, Product } from '../../types/inventory';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { OperationDetailModal } from './OperationDetailModal';

interface OperationsViewProps {
  typeFilter: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
  selectedWarehouse: string;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
  onOpenCreate: (type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT') => void;
  selectedOperationId?: string | null;
  onClearSelectedOperation?: () => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  typeFilter,
  selectedWarehouse,
  warehouses,
  locations,
  products,
  onOpenCreate,
  selectedOperationId = null,
  onClearSelectedOperation
}) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeModalOpId, setActiveModalOpId] = useState<string | null>(selectedOperationId);

  useEffect(() => {
    if (selectedOperationId) {
      setActiveModalOpId(selectedOperationId);
    }
  }, [selectedOperationId]);

  const loadOperations = async () => {
    try {
      setLoading(true);
      const res = await api.operations.list({
        op_type: typeFilter,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouse_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        search: search || undefined
      });
      setOperations(res.operations || []);
    } catch (err) {
      console.error('Failed to load operations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, [typeFilter, statusFilter, selectedWarehouse]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOperations();
  };

  const getModuleConfig = () => {
    switch (typeFilter) {
      case 'RECEIPT':
        return {
          title: 'Goods Inward Receipts',
          desc: 'Incoming stock from suppliers and vendor purchase shipments',
          btnLabel: 'New Receipt',
          icon: <ArrowDownToLine className="w-5 h-5 text-emerald-600" />,
          partnerHeader: 'Supplier Name',
          routeHeader: 'Destination Bay'
        };
      case 'DELIVERY':
        return {
          title: 'Outbound Delivery Orders',
          desc: 'Customer shipments, order picking, staging, and dispatch verification',
          btnLabel: 'New Delivery Order',
          icon: <ArrowUpFromLine className="w-5 h-5 text-blue-600" />,
          partnerHeader: 'Customer Name',
          routeHeader: 'Source Staging Bay'
        };
      case 'INTERNAL_TRANSFER':
        return {
          title: 'Internal Stock Transfers',
          desc: 'Stock relocation between facilities, zones, racks, and picking shelves',
          btnLabel: 'New Internal Transfer',
          icon: <ArrowLeftRight className="w-5 h-5 text-indigo-600" />,
          partnerHeader: 'Purpose / Scope',
          routeHeader: 'Source → Destination Bay'
        };
      case 'ADJUSTMENT':
        return {
          title: 'Physical Inventory Adjustments',
          desc: 'Reconcile counted inventory balances with theoretical ledger counts',
          btnLabel: 'New Stock Adjustment',
          icon: <SlidersHorizontal className="w-5 h-5 text-amber-600" />,
          partnerHeader: 'Adjustment Justification',
          routeHeader: 'Facility / Bay'
        };
    }
  };

  const config = getModuleConfig();

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: config.title }
        ]}
      />

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
            {config.icon}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {config.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {config.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOperations}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onOpenCreate(typeFilter)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>{config.btnLabel}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 md:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder={`Search ${config.title} by reference #, partner, or notes...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden min-h-[44px]"
            />
          </form>

          {/* Status Segmented Buttons */}
          <div className="sm:col-span-5 flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Draft')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Draft'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Ready')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Ready'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ready
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Done')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors min-h-[32px] ${
                statusFilter === 'Done'
                  ? 'bg-white text-blue-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Operations Presentation: Responsive Touch Cards (< md) + Generous Spacing Table (>= md) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Mobile Touch Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Loading records from SQLite database...
            </div>
          ) : operations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No documents found for this filter.
            </div>
          ) : (
            operations.map((op) => (
              <div
                key={op.id}
                onClick={() => setActiveModalOpId(op.id)}
                className="p-4 hover:bg-slate-50/90 active:bg-blue-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {op.reference_no}
                    </span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {op.partner_name || op.adjustment_reason || 'Internal Operation'}
                    </p>
                  </div>

                  <StatusBadge status={op.status} pickingStatus={op.picking_status} size="sm" />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                      {typeFilter === 'RECEIPT' ? (
                        <span>→ {op.dest_warehouse_code} / {op.dest_location_code || 'IN'}</span>
                      ) : typeFilter === 'DELIVERY' ? (
                        <span>{op.source_warehouse_code} / {op.source_location_code || 'OUT'} →</span>
                      ) : typeFilter === 'INTERNAL_TRANSFER' ? (
                        <span>{op.source_warehouse_code} → {op.dest_warehouse_code}</span>
                      ) : (
                        <span>{op.source_warehouse_code}</span>
                      )}
                    </span>
                    <span>{op.total_demand_qty ?? 0} units</span>
                  </div>

                  <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop & Tablet Table with GENEROUS ROW SPACING (>= 48px touch targets) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Reference #</th>
                <th className="py-3.5 px-3 font-semibold">{config.partnerHeader}</th>
                <th className="py-3.5 px-3 font-semibold">{config.routeHeader}</th>
                <th className="py-3.5 px-3 text-right font-semibold">Line Items</th>
                <th className="py-3.5 px-3 text-right font-semibold">Units</th>
                <th className="py-3.5 px-3 font-semibold">Status Badge</th>
                <th className="py-3.5 px-3 text-right font-semibold">Scheduled</th>
                <th className="py-3.5 px-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Loading records from SQLite database...
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No documents found for this filter. Click "{config.btnLabel}" above to create one.
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => setActiveModalOpId(op.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {op.reference_no}
                    </td>
                    <td className="py-4 px-3 font-semibold text-slate-900 truncate max-w-[160px]">
                      {op.partner_name || op.adjustment_reason || 'Internal Operation'}
                    </td>
                    <td className="py-4 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {typeFilter === 'RECEIPT' ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          → {op.dest_warehouse_code} / {op.dest_location_code || 'IN'}
                        </span>
                      ) : typeFilter === 'DELIVERY' ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {op.source_warehouse_code} / {op.source_location_code || 'OUT'} →
                        </span>
                      ) : typeFilter === 'INTERNAL_TRANSFER' ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {op.source_warehouse_code} → {op.dest_warehouse_code}
                        </span>
                      ) : (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {op.source_warehouse_code} ({op.source_location_code})
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-slate-600 tabular-nums">
                      {op.item_count ?? 1}
                    </td>
                    <td className="py-4 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {op.total_demand_qty ?? 0}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <StatusBadge status={op.status} pickingStatus={op.picking_status} size="sm" />
                    </td>
                    <td className="py-4 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                      {op.scheduled_date || '—'}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalOpId(op.id);
                        }}
                        className="p-1.5 text-blue-600 group-hover:text-blue-700 rounded-lg group-hover:bg-blue-50 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Detail Modal */}
      <OperationDetailModal
        operationId={activeModalOpId}
        onClose={() => {
          setActiveModalOpId(null);
          if (onClearSelectedOperation) onClearSelectedOperation();
        }}
        onOperationUpdated={loadOperations}
      />
    </div>
  );
};
