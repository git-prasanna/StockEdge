import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse as WarehouseIcon,
  User as UserIcon,
  LogOut,
  Boxes,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveNav =
  | 'dashboard'
  | 'products'
  | 'receipts'
  | 'deliveries'
  | 'transfers'
  | 'adjustments'
  | 'ledger'
  | 'warehouses'
  | 'profile';

interface SidebarProps {
  activeNav: ActiveNav;
  setActiveNav: (nav: ActiveNav) => void;
  alertCount?: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  setActiveNav,
  alertCount = 0,
  mobileOpen,
  setMobileOpen
}) => {
  const { user, logout } = useAuth();
  const [opsExpanded, setOpsExpanded] = React.useState(true);

  const handleNavClick = (nav: ActiveNav) => {
    setActiveNav(nav);
    setMobileOpen(false);
  };

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/25'
        : 'text-slate-300 hover:text-white hover:bg-[#14233D]'
    }`;

  const subNavItemClass = (isActive: boolean) =>
    `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
      isActive
        ? 'bg-blue-950/80 text-blue-300 font-semibold border-l-2 border-blue-500 pl-2.5'
        : 'text-slate-400 hover:text-white hover:bg-[#14233D] font-normal'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container: Deep Navy Blue */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0B1528] border-r border-[#1E293B] flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Workspace Header */}
        <div>
          <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1E293B]">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shadow-xs">
              <Boxes className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">StockSense</span>
              <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Enterprise IMS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* Dashboard */}
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full ${navItemClass(activeNav === 'dashboard')}`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Products */}
            <button
              type="button"
              onClick={() => handleNavClick('products')}
              className={`w-full ${navItemClass(activeNav === 'products')} justify-between`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 shrink-0" />
                <span>Products</span>
              </div>
              {alertCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono font-medium bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  {alertCount}
                </span>
              )}
            </button>

            {/* Operations Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOpsExpanded(!opsExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>Operations</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${opsExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>

              {opsExpanded && (
                <div className="mt-1 pl-2 space-y-1 border-l border-[#1E293B] ml-3">
                  <button
                    type="button"
                    onClick={() => handleNavClick('receipts')}
                    className={`w-full ${subNavItemClass(activeNav === 'receipts')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Receipts</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavClick('deliveries')}
                    className={`w-full ${subNavItemClass(activeNav === 'deliveries')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUpFromLine className="w-3.5 h-3.5 text-blue-400" />
                      <span>Delivery Orders</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavClick('transfers')}
                    className={`w-full ${subNavItemClass(activeNav === 'transfers')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Internal Transfers</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavClick('adjustments')}
                    className={`w-full ${subNavItemClass(activeNav === 'adjustments')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Stock Adjustments</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Move History / Stock Ledger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleNavClick('ledger')}
                className={`w-full ${navItemClass(activeNav === 'ledger')}`}
              >
                <History className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Move History</span>
              </button>
            </div>

            {/* Settings -> Warehouses */}
            <div className="pt-3">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Settings
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('warehouses')}
                className={`w-full ${navItemClass(activeNav === 'warehouses')}`}
              >
                <WarehouseIcon className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Warehouses & Locs</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Profile and Logout Footer */}
        <div className="p-3 border-t border-[#1E293B] bg-[#070E1C]">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 text-left truncate flex-1 hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-blue-900/60 border border-blue-500/30 flex items-center justify-center text-blue-200 font-semibold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Alex Morgan'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.role || 'Inventory Manager'}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
