'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { warehouseApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function LocationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehouseApi.listLocations().then((r) => r.data),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (d: any) => warehouseApi.createLocation(d),
    onSuccess: () => {
      toast.success('Location created');
      qc.invalidateQueries({ queryKey: ['locations'] });
      setOpen(false); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <AppShell>
      <PageHeader
        title="Locations"
        subtitle="Rack, bin, and zone locations within warehouses"
        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} />New location</button>}
      />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Code</th><th>Warehouse</th></tr>
              </thead>
              <tbody>
                {isLoading && Array.from({length:5}).map((_,i)=>(
                  <tr key={i}>{Array.from({length:3}).map((_,j)=>(
                    <td key={j}><div className="h-3 bg-gray-100 rounded animate-pulse w-24"/></td>
                  ))}</tr>
                ))}
                {locations.map((l: any) => (
                  <tr key={l.id}>
                    <td className="font-medium">{l.name}</td>
                    <td className="font-mono text-xs text-gray-500">{l.code}</td>
                    <td>{l.warehouse?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="New location">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" {...register('name', { required: 'Required' })} placeholder="Rack A - Shelf 1" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>}
          </div>
          <div>
            <label className="label">Code *</label>
            <input className="input" {...register('code', { required: 'Required' })} placeholder="WH/RACK-A1" />
          </div>
          <div>
            <label className="label">Warehouse *</label>
            <select className="input" {...register('warehouseId', { required: 'Required' })}>
              <option value="">Select warehouse</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {errors.warehouseId && <p className="text-xs text-red-500 mt-1">{errors.warehouseId.message as string}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn" onClick={() => { setOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Create location'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
