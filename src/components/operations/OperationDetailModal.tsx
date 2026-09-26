import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Ban,
  PackageCheck,
  Truck,
  AlertCircle
} from 'lucide-react';
import { Operation, OperationLine } from '../../types/inventory';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface OperationDetailModalProps {
  operationId: string | null;
  onClose: () => void;
  onOperationUpdated: () => void;
}

export const OperationDetailModal: React.FC<OperationDetailModalProps> = ({
  operationId,
  onClose,
  onOperationUpdated
}) => {
  const { user } = useAuth();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [lines, setLines] = useState<OperationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    if (!operationId) return;
    try {
      setLoading(true);
      setActionError(null);
      const res = await api.operations.get(operationId);
      setOperation(res.operation);
      setLines(res.lines || []);
    } catch (err: any) {
      console.error('Failed to load operation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [operationId]);

  const handleAction = async (action: string) => {
    if (!operation) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await api.operations.executeAction(operation.id, action, user?.name || 'Alex Morgan');
      await loadData();
      onOperationUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Operation action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!operationId) return null;

  const isDone = operation?.status === 'Done';
  const isCanceled = operation?.status === 'Canceled';

  const getOpIcon = () => {
    switch (operation?.op_type) {
      case 'RECEIPT':
        return <ArrowDownToLine className="w-5 h-5 text-emerald-600" />;
      case 'DELIVERY':
        return <ArrowUpFromLine className="w-5 h-5 text-blue-600" />;
      case 'INTERNAL_TRANSFER':
        return <ArrowLeftRight className="w-5 h-5 text-indigo-600" />;
      case 'ADJUSTMENT':
        return <SlidersHorizontal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              {getOpIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-slate-900">
                  {operation?.reference_no}
                </h2>
                {operation && (
                  <StatusBadge
                    status={operation.status}
                    pickingStatus={operation.picking_status}
                    size="sm"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {operation?.op_type === 'RECEIPT' ? 'Inbound Goods Receipt' :
                 operation?.op_type === 'DELIVERY' ? 'Outbound Customer Delivery' :
                 operation?.op_type === 'INTERNAL_TRANSFER' ? 'Internal Location Relocation' : 'Stock Physical Count Adjustment'}
                {' · Created by '}
                {operation?.created_by}
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

        {/* Action Error Banner */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading document details...
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Meta Details Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/75 border border-slate-200/80 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">
                  {operation?.op_type === 'RECEIPT' ? 'Supplier / Vendor:' :
                   operation?.op_type === 'DELIVERY' ? 'Customer / Recipient:' :
                   operation?.op_type === 'ADJUSTMENT' ? 'Adjustment Reason:' : 'Movement Scope:'}
                </span>
                <span className="font-semibold text-slate-900 block truncate mt-0.5">
                  {operation?.partner_name || operation?.adjustment_reason || 'Internal Facility'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Route / Facility:</span>
                <span className="font-semibold text-slate-900 block truncate mt-0.5">
                  {operation?.op_type === 'RECEIPT' ? (
                    `→ ${operation?.dest_warehouse_name || 'Warehouse'}`
                  ) : operation?.op_type === 'DELIVERY' ? (
                    `${operation?.source_warehouse_name || 'Warehouse'} →`
                  ) : operation?.op_type === 'INTERNAL_TRANSFER' ? (
                    `${operation?.source_warehouse_code} → ${operation?.dest_warehouse_code}`
                  ) : (
                    operation?.source_warehouse_name
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Scheduled Date:</span>
                <span className="font-mono font-semibold text-slate-900 block mt-0.5">
                  {operation?.scheduled_date || 'Immediate'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Validated Timestamp:</span>
                <span className="font-mono text-slate-900 block mt-0.5">
                  {operation?.validated_at
                    ? new Date(operation.validated_at).toLocaleDateString()
                    : 'Pending Validation'}
                </span>
              </div>
            </div>

            {/* Storage Bay Details */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-100/50 rounded-lg text-xs text-slate-600">
              {operation?.source_location_name && (
                <div>
                  <span className="text-slate-400">Source Bay: </span>
                  <span className="font-medium text-slate-800">
                    {operation.source_location_name} ({operation.source_location_code})
                  </span>
                </div>
              )}
              {operation?.dest_location_name && (
                <div>
                  <span className="text-slate-400">Destination Bay: </span>
                  <span className="font-medium text-slate-800">
                    {operation.dest_location_name} ({operation.dest_location_code})
                  </span>
                </div>
              )}
              {operation?.notes && (
                <div className="truncate max-w-xs">
                  <span className="text-slate-400">Notes: </span>
                  <span className="italic text-slate-700">{operation.notes}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Document Line Items ({lines.length})
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Append-Only Ledger Link Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white text-slate-500 font-semibold text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">Product / SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">
                        {operation?.op_type === 'ADJUSTMENT' ? 'Theoretical Stock' : 'Requested / Demand'}
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        {operation?.op_type === 'ADJUSTMENT' ? 'Counted Physical' : 'Processed / Done'}
                      </th>
                      {operation?.op_type === 'DELIVERY' && (
                        <th className="py-2.5 px-3 text-right">Source Available</th>
                      )}
                      <th className="py-2.5 px-4 text-right">Unit Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {line.product_name}
                          <span className="block font-mono text-[11px] text-slate-400">
                            {line.product_sku}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {line.product_category}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {line.demand_qty} {line.unit_of_measure}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {line.done_qty} {line.unit_of_measure}
                        </td>
                        {operation?.op_type === 'DELIVERY' && (
                          <td className="py-3 px-3 text-right font-mono font-semibold text-blue-700">
                            {line.current_on_hand ?? '—'} {line.unit_of_measure}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ${(line.unit_price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Action Buttons */}
            {!isDone && !isCanceled && (
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Document</span>
                </button>

                <div className="flex items-center gap-2">
                  {operation?.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => handleAction('mark_ready')}
                      disabled={actionLoading}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all"
                    >
                      Mark as Ready
                    </button>
                  )}

                  {/* Delivery Order Specific Steps: Pick -> Pack -> Dispatch */}
                  {operation?.op_type === 'DELIVERY' && (
                    <>
                      {operation.picking_status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => handleAction('pick')}
                          disabled={actionLoading}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>1. Pick Items from Bay</span>
                        </button>
                      )}

                      {operation.picking_status === 'Picked' && (
                        <button
                          type="button"
                          onClick={() => handleAction('pack')}
                          disabled={actionLoading}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/25 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>2. Pack & Stage Order</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Final Validation Button: Writes to Append-Only Stock Ledger & Updates Quantities */}
                  {((operation?.op_type === 'RECEIPT') ||
                    (operation?.op_type === 'DELIVERY' && operation?.picking_status === 'Packed') ||
                    (operation?.op_type === 'INTERNAL_TRANSFER') ||
                    (operation?.op_type === 'ADJUSTMENT')) && (
                    <button
                      type="button"
                      onClick={() => handleAction('validate')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {operation?.op_type === 'RECEIPT' ? 'Validate & Receive into Stock' :
                         operation?.op_type === 'DELIVERY' ? 'Validate & Dispatch Delivery' :
                         operation?.op_type === 'INTERNAL_TRANSFER' ? 'Execute Internal Transfer' : 'Validate Stock Adjustment'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {isDone && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">
                    Document validated & committed to immutable Stock Ledger.
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-600">
                  {new Date(operation.validated_at || operation.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
