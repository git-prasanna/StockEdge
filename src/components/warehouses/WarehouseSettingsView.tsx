import React, { useState, useEffect } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  Phone,
  User,
  Boxes,
  Layers,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import { Warehouse, Location } from '../../types/inventory';
import { api } from '../../services/api';
import { Breadcrumbs } from '../common/Breadcrumbs';

interface WarehouseSettingsViewProps {
  warehouses: Warehouse[];
  onReloadWarehouses: () => void;
}

export const WarehouseSettingsView: React.FC<WarehouseSettingsViewProps> = ({
  warehouses,
  onReloadWarehouses
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');

  // Add Warehouse Modal
  const [isAddWhModalOpen, setIsAddWhModalOpen] = useState(false);
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whContact, setWhContact] = useState('');
  const [whPhone, setWhPhone] = useState('');
  const [whError, setWhError] = useState<string | null>(null);
  const [whSubmitting, setWhSubmitting] = useState(false);

  // Add Location Modal
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);
  const [locCode, setLocCode] = useState('');
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState<'internal' | 'inbound' | 'outbound'>('internal');
  const [locZone, setLocZone] = useState('');
  const [locRack, setLocRack] = useState('');
  const [locShelf, setLocShelf] = useState('');
  const [locError, setLocError] = useState<string | null>(null);
  const [locSubmitting, setLocSubmitting] = useState(false);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await api.warehouses.getAllLocations();
      setLocations(res.locations || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError(null);
    if (!whCode.trim() || !whName.trim()) {
      setWhError('Warehouse code and name are required');
      return;
    }

    try {
      setWhSubmitting(true);
      await api.warehouses.create({
        code: whCode.trim().toUpperCase(),
        name: whName.trim(),
        address: whAddress.trim() || undefined,
        contact_person: whContact.trim() || undefined,
        phone: whPhone.trim() || undefined
      });
      setIsAddWhModalOpen(false);
      setWhCode('');
      setWhName('');
      setWhAddress('');
      setWhContact('');
      setWhPhone('');
      onReloadWarehouses();
      await loadLocations();
    } catch (err: any) {
      setWhError(err.message || 'Failed to create warehouse');
    } finally {
      setWhSubmitting(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocError(null);
    if (!selectedWarehouseId) {
      setLocError('Please select a target warehouse');
      return;
    }
    if (!locCode.trim() || !locName.trim()) {
      setLocError('Location code and name are required');
      return;
    }

    try {
      setLocSubmitting(true);
      await api.warehouses.createLocation(selectedWarehouseId, {
        code: locCode.trim().toUpperCase(),
        name: locName.trim(),
        type: locType,
        zone: locZone.trim() || undefined,
        rack: locRack.trim() || undefined,
        shelf: locShelf.trim() || undefined
      });
      setIsAddLocModalOpen(false);
      setLocCode('');
      setLocName('');
      setLocZone('');
      setLocRack('');
      setLocShelf('');
      await loadLocations();
    } catch (err: any) {
      setLocError(err.message || 'Failed to create location');
    } finally {
      setLocSubmitting(false);
    }
  };

  const currentWh = warehouses.find(w => w.id === selectedWarehouseId) || warehouses[0];
  const whLocations = locations.filter(l => l.warehouse_id === currentWh?.id);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Settings' },
          { label: 'Warehouses & Locations' }
        ]}
      />

      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Multi-Warehouse & Storage Topology
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure logistics facilities, receiving bays, pallet racks, and pick shelves
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddWhModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Warehouse</span>
          </button>
        </div>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((wh) => {
          const isSelected = wh.id === (currentWh?.id);
          return (
            <div
              key={wh.id}
              onClick={() => setSelectedWarehouseId(wh.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm">
                  {wh.code}
                </span>
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active Hub
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 mt-2 truncate">
                {wh.name}
              </h3>

              {wh.address && (
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5 line-clamp-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{wh.address}</span>
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Locations</span>
                  <span className="font-bold text-slate-900">{wh.location_count || 0} bays</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Units Stored</span>
                  <span className="font-bold text-blue-700">{wh.total_units_stored || 0}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Storage Locations inside Selected Warehouse */}
      {currentWh && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Storage Locations in {currentWh.name} ({currentWh.code})
              </h2>
              <p className="text-xs text-slate-500">
                Discrete zones, staging bays, and shelves where goods are picked or stored
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddLocModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location Bay</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Bay Code</th>
                  <th className="py-3 px-4">Location Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Zone</th>
                  <th className="py-3 px-3">Rack & Shelf</th>
                  <th className="py-3 px-4 text-right">Physical Stock Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {whLocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No locations defined for this facility. Click "+ Add Location Bay" above.
                    </td>
                  </tr>
                ) : (
                  whLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {loc.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {loc.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[11px] font-mono rounded-sm ${
                          loc.type === 'inbound' ? 'bg-emerald-50 text-emerald-700' :
                          loc.type === 'outbound' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {loc.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {loc.zone || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {loc.rack || '—'} {loc.shelf ? `/ ${loc.shelf}` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {loc.current_stock_qty || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {isAddWhModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">Create New Warehouse Facility</h3>
              <button
                type="button"
                onClick={() => setIsAddWhModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {whError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {whError}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-EAST"
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. East Coast Distribution"
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500 Port Blvd, Newark, NJ"
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={whContact}
                    onChange={(e) => setWhContact(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={whPhone}
                    onChange={(e) => setWhPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddWhModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={whSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {whSubmitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isAddLocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Add Location Bay in {currentWh?.code}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddLocModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {locError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {locError}
              </div>
            )}

            <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bay Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-MAIN/ZONE-C"
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bulk Pallet Racks C"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Type
                </label>
                <select
                  value={locType}
                  onChange={(e: any) => setLocType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="internal">Internal Storage (Default)</option>
                  <option value="inbound">Inbound Receiving Bay</option>
                  <option value="outbound">Outbound Packing & Staging</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Zone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Zone A"
                    value={locZone}
                    onChange={(e) => setLocZone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rack (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Rack 03"
                    value={locRack}
                    onChange={(e) => setLocRack(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shelf (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Shelf 2"
                    value={locShelf}
                    onChange={(e) => setLocShelf(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLocModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={locSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {locSubmitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
