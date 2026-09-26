import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  items: Array<{ label: string; onClick?: () => void }>;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-slate-800 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-slate-900 font-semibold' : ''}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
