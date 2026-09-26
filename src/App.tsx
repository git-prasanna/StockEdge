/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  History
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveNav } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { OperationsView } from './components/operations/OperationsView';
import { StockLedgerView } from './components/ledger/StockLedgerView';
import { WarehouseSettingsView } from './components/warehouses/WarehouseSettingsView';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/auth/AuthModal';

// Modals
import { CreateReceiptModal } from './components/operations/CreateReceiptModal';
import { CreateDeliveryModal } from './components/operations/CreateDeliveryModal';
import { CreateTransferModal } from './components/operations/CreateTransferModal';
import { CreateAdjustmentModal } from './components/operations/CreateAdjustmentModal';
import { CreateProductModal } from './components/products/CreateProductModal';
import { OperationDetailModal } from './components/operations/OperationDetailModal';

import { Warehouse, Location, Product, Operation } from './types/inventory';
import { api } from './services/api';

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  // Navigation
  const [activeNav, setActiveNav] = useState<ActiveNav>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global filters & cached topology
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');

  // Low stock alerts
  const [alertProducts, setAlertProducts] = useState<any[]>([]);

  // Create modals state
  const [activeCreateModal, setActiveCreateModal] = useState<
    'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT' | 'PRODUCT' | null
  >(null);
  const [replenishProduct, setReplenishProduct] = useState<Product | null>(null);

  // Operation inspection modal
  const [inspectedOpId, setInspectedOpId] = useState<string | null>(null);

  // Load baseline metadata
  const loadMetadata = async () => {
    try {
      const [whRes, locRes, prodRes, alertRes] = await Promise.all([
        api.warehouses.list(),
        api.warehouses.getAllLocations(),
        api.products.list(),
        api.products.getAlerts()
      ]);
      setWarehouses(whRes.warehouses || []);
      setLocations(locRes.locations || []);
      setProducts(prodRes.products || []);
      setAlertProducts(alertRes.alerts || []);
    } catch (err) {
      console.error('Failed to load system metadata:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMetadata();
    }
  }, [user]);

  const handleOrderReplenishment = (product: Product) => {
    setReplenishProduct(product);
    setActiveCreateModal('RECEIPT');
  };

  const handleOpenOperationFromDashboard = (op: Operation) => {
    setInspectedOpId(op.id);
  };

  const handleSearchGlobal = (term: string) => {
    setActiveNav('products');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Starting StockSense Engine...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Fixed Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        alertCount={alertProducts.length}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Top Header */}
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          warehouses={warehouses}
          selectedWarehouse={selectedWarehouse}
          setSelectedWarehouse={setSelectedWarehouse}
          onOpenCreate={(type) => setActiveCreateModal(type)}
          onSearchGlobal={handleSearchGlobal}
          lowStockCount={alertProducts.length}
          onNavigateAlerts={() => {
            setActiveNav('products');
          }}
        />

        {/* View Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeNav === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveNav}
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              onOpenOperation={handleOpenOperationFromDashboard}
              onOpenCreate={(type) => setActiveCreateModal(type)}
            />
          )}

          {activeNav === 'products' && (
            <ProductsView
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              locations={locations}
              onOrderReplenishment={handleOrderReplenishment}
            />
          )}

          {activeNav === 'receipts' && (
            <OperationsView
              typeFilter="RECEIPT"
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              locations={locations}
              products={products}
              onOpenCreate={(type) => setActiveCreateModal(type)}
            />
          )}

          {activeNav === 'deliveries' && (
            <OperationsView
              typeFilter="DELIVERY"
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              locations={locations}
              products={products}
              onOpenCreate={(type) => setActiveCreateModal(type)}
            />
          )}

          {activeNav === 'transfers' && (
            <OperationsView
              typeFilter="INTERNAL_TRANSFER"
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              locations={locations}
              products={products}
              onOpenCreate={(type) => setActiveCreateModal(type)}
            />
          )}

          {activeNav === 'adjustments' && (
            <OperationsView
              typeFilter="ADJUSTMENT"
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
              locations={locations}
              products={products}
              onOpenCreate={(type) => setActiveCreateModal(type)}
            />
          )}

          {activeNav === 'ledger' && (
            <StockLedgerView
              selectedWarehouse={selectedWarehouse}
              warehouses={warehouses}
            />
          )}

          {activeNav === 'warehouses' && (
            <WarehouseSettingsView
              warehouses={warehouses}
              onReloadWarehouses={loadMetadata}
            />
          )}

          {activeNav === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Global Operation Create Modals */}
      <CreateReceiptModal
        isOpen={activeCreateModal === 'RECEIPT'}
        onClose={() => {
          setActiveCreateModal(null);
          setReplenishProduct(null);
        }}
        onCreated={() => {
          loadMetadata();
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
        initialProduct={replenishProduct}
      />

      <CreateDeliveryModal
        isOpen={activeCreateModal === 'DELIVERY'}
        onClose={() => setActiveCreateModal(null)}
        onCreated={() => {
          loadMetadata();
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <CreateTransferModal
        isOpen={activeCreateModal === 'INTERNAL_TRANSFER'}
        onClose={() => setActiveCreateModal(null)}
        onCreated={() => {
          loadMetadata();
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <CreateAdjustmentModal
        isOpen={activeCreateModal === 'ADJUSTMENT'}
        onClose={() => setActiveCreateModal(null)}
        onCreated={() => {
          loadMetadata();
        }}
        warehouses={warehouses}
        locations={locations}
        products={products}
      />

      <CreateProductModal
        isOpen={activeCreateModal === 'PRODUCT'}
        onClose={() => setActiveCreateModal(null)}
        onCreated={() => {
          loadMetadata();
        }}
        warehouses={warehouses}
        locations={locations}
      />

      {/* Direct Operation Inspection Modal */}
      <OperationDetailModal
        operationId={inspectedOpId}
        onClose={() => setInspectedOpId(null)}
        onOperationUpdated={() => {
          loadMetadata();
        }}
      />

      {/* Mobile Deep Navy Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#0B1528] border-t border-[#1E293B] px-1.5 py-1 shadow-lg">
        <div className="grid grid-cols-5 items-center">
          <button
            type="button"
            onClick={() => setActiveNav('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeNav === 'dashboard'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('products')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeNav === 'products'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('receipts')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeNav === 'receipts'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('deliveries')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeNav === 'deliveries'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Deliveries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('ledger')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors min-h-[44px] ${
              activeNav === 'ledger'
                ? 'text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Ledger</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
