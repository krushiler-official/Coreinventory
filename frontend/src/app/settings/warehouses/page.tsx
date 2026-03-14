'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingRows } from '@/components/ui';
import { warehouseApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Plus, MapPin } from 'lucide-react';

export default function WarehousesPage() {
  const qc = useQueryClient();
  const [whModal, setWhModal] = useState(false);
  const [locModal, setLocModal] = useState(false);

  const { data: warehouses, isLoading: whLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.list().then((r) => r.data),
  });
  const { data: locations, isLoading: locLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehouseApi.listLocations().then((r) => r.data),
  });

  const whForm = useForm<{ name: string; code: string; address: string }>();
  const locForm = useForm<{ name: string; code: string; warehouseId: string }>();

  const createWh = useMutation({
    mutationFn: (d: any) => warehouseApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Warehouse created with default locations');
      setWhModal(false); whForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Error'),
  });

  const createLoc = useMutation({
    mutationFn: (d: any) => warehouseApi.createLocation(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location created');
      setLocModal(false); locForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <AppShell>
      <PageHeader title="Warehouses & locations" />
      <div className="p-6 space-y-6">

        {/* Warehouses */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800">Warehouses</p>
            <button className="btn btn-primary btn-sm" onClick={() => setWhModal(true)}>
              <Plus size={12} /> New warehouse
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Address</th><th>Locations</th></tr></thead>
              <tbody>
                {whLoading && <LoadingRows />}
                {!whLoading && (warehouses ?? []).length === 0 && <EmptyState message="No warehouses yet." />}
                {(warehouses ?? []).map((w: any) => (
                  <tr key={w.id}>
                    <td className="font-medium text-gray-800">{w.name}</td>
                    <td><code className="text-xs font-mono bg-gray-50 px-1.5 py-0.5 rounded">{w.code}</code></td>
                    <td className="text-gray-500 text-xs">{w.address || '—'}</td>
                    <td>
                      <span className="badge badge-ready">{w.locations?.length ?? 0} locations</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locations */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800">Locations</p>
            <button className="btn btn-primary btn-sm" onClick={() => setLocModal(true)}>
              <Plus size={12} /> New location
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Warehouse</th></tr></thead>
              <tbody>
                {locLoading && <LoadingRows />}
                {!locLoading && (locations ?? []).length === 0 && <EmptyState message="No locations yet." />}
                {(locations ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-medium text-gray-800 flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-300" />{l.name}
                    </td>
                    <td><code className="text-xs font-mono bg-gray-50 px-1.5 py-0.5 rounded">{l.code}</code></td>
                    <td className="text-gray-500 text-xs">{l.warehouse?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warehouse modal */}
      <Modal open={whModal} onClose={() => { setWhModal(false); whForm.reset(); }} title="New warehouse">
        <form onSubmit={whForm.handleSubmit((d) => createWh.mutate(d))} className="space-y-3">
          <div><label className="label">Name *</label><input className="input" placeholder="Main Warehouse" {...whForm.register('name', { required: true })} /></div>
          <div><label className="label">Short code *</label><input className="input" placeholder="WH" maxLength={5} {...whForm.register('code', { required: true })} /></div>
          <div><label className="label">Address</label><input className="input" placeholder="123 Industrial Area" {...whForm.register('address')} /></div>
          <p className="text-xs text-gray-400">Stock, Input & Output locations will be auto-created.</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn" onClick={() => setWhModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={whForm.formState.isSubmitting}>Create</button>
          </div>
        </form>
      </Modal>

      {/* Location modal */}
      <Modal open={locModal} onClose={() => { setLocModal(false); locForm.reset(); }} title="New location">
        <form onSubmit={locForm.handleSubmit((d) => createLoc.mutate(d))} className="space-y-3">
          <div><label className="label">Name *</label><input className="input" placeholder="Rack A" {...locForm.register('name', { required: true })} /></div>
          <div><label className="label">Code *</label><input className="input" placeholder="WH/RACK-A" {...locForm.register('code', { required: true })} /></div>
          <div>
            <label className="label">Warehouse *</label>
            <select className="input" {...locForm.register('warehouseId', { required: true })}>
              <option value="">Select warehouse…</option>
              {(warehouses ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn" onClick={() => setLocModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={locForm.formState.isSubmitting}>Create</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
