import React from 'react';
import { OperationStatus, PickingStatus } from '../../types/inventory';

interface StatusBadgeProps {
  status: OperationStatus | string;
  pickingStatus?: PickingStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  pickingStatus,
  size = 'md',
  className = ''
}) => {
  // If pickingStatus is provided and status is Waiting or Ready, give specific label like "Waiting pick"
  let displayLabel = status;
  let pillStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotStyle = 'bg-slate-400';

  const normalizedStatus = String(status).toLowerCase();
  const normalizedPicking = pickingStatus ? String(pickingStatus).toLowerCase() : '';

  if (normalizedPicking === 'waiting pick' || (normalizedStatus === 'waiting' && (!pickingStatus || normalizedPicking === 'pending'))) {
    displayLabel = normalizedPicking === 'waiting pick' ? 'Waiting pick' : 'Waiting';
    pillStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    dotStyle = 'bg-amber-500';
  } else if (normalizedPicking === 'waiting pick') {
    displayLabel = 'Waiting pick';
    pillStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    dotStyle = 'bg-amber-500';
  } else if (normalizedStatus === 'ready') {
    displayLabel = 'Ready';
    pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotStyle = 'bg-emerald-500 animate-pulse';
  } else if (normalizedStatus === 'done') {
    displayLabel = 'Done';
    pillStyle = 'bg-blue-50 text-blue-800 border-blue-200';
    dotStyle = 'bg-blue-600';
  } else if (normalizedStatus === 'draft') {
    displayLabel = 'Draft';
    pillStyle = 'bg-slate-100 text-slate-700 border-slate-200';
    dotStyle = 'bg-slate-400';
  } else if (normalizedStatus === 'canceled') {
    displayLabel = 'Canceled';
    pillStyle = 'bg-rose-50 text-rose-700 border-rose-200';
    dotStyle = 'bg-rose-500';
  } else if (normalizedStatus === 'in stock') {
    displayLabel = 'In Stock';
    pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotStyle = 'bg-emerald-500';
  } else if (normalizedStatus === 'low stock') {
    displayLabel = 'Low Stock';
    pillStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    dotStyle = 'bg-amber-500';
  } else if (normalizedStatus === 'out of stock') {
    displayLabel = 'Out of Stock';
    pillStyle = 'bg-rose-50 text-rose-800 border-rose-200';
    dotStyle = 'bg-rose-500';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3.5 py-1 text-xs md:text-sm font-semibold'
      : 'px-2.5 py-0.5 text-xs font-medium';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${pillStyle} ${sizeClasses} ${className} shadow-2xs whitespace-nowrap`}
      >
        <span className={`${dotSize} rounded-full ${dotStyle} shrink-0`} aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>

      {/* Companion picking status pill badge if distinct from waiting */}
      {pickingStatus &&
        normalizedPicking !== 'pending' &&
        normalizedPicking !== 'waiting pick' && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide shadow-2xs whitespace-nowrap ${
              normalizedPicking === 'picked'
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : normalizedPicking === 'packed'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>{pickingStatus}</span>
          </span>
        )}
    </div>
  );
};
