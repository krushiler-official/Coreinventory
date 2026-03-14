'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, EmptyState, LoadingRows } from '@/components/ui';
import { operationApi, productApi, warehouseApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { OpStatus } from '@/components/ui';

type OpType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

interface LineForm { productId: string; quantity: number; }
interface OpForm {
  contact: string;
  locationId: string;       // toLocation for receipt, fromLocation for delivery
  toLocationId: string;     // for transfer
  scheduledDate: string;
  lines: LineForm[];
}

const typeConfig = {
  RECEIPT:  { title: 'Receipts',           locationLabel: 'Destination location', ref: 'WH/IN' },
  DELIVERY: { title: 'Delivery orders',    locationLabel: 'Source location',      ref: 'WH/OUT' },
  TRANSFER: { title: 'Internal transfers', locationLabel: 'From location',        ref: 'WH/INT' },
  ADJUSTMENT: { title: 'Adjustments',      locationLabel: 'Location',             ref: 'WH/ADJ' },
};

export function OperationsPage({ type }: { type: OpType }) {
  const qc = useQueryClient();
  const cfg = typeConfig[type];
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOp, setDetailOp] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: opsData, isLoading } = useQuery({
    queryKey: ['operations', type, statusFilter],
    queryFn: () => operationApi.list({ type, status: statusFilter || undefined }).then((r) => r.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-mini'],
    queryFn: () => productApi.list({ limit: 200 }).then((r) => r.data.data),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehouseApi.listLocations().then((r) => r.data),
  });

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm<OpForm>({
    defaultValues: { lines: [{ productId: '', quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const createMut = useMutation({
    mutationFn: (d: OpForm) => {
      const lines = d.lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));
      if (type === 'RECEIPT')   return operationApi.createReceipt({ contact: d.contact, toLocationId: d.locationId, scheduledDate: d.scheduledDate, lines });
      if (type === 'DELIVERY')  return operationApi.createDelivery({ contact: d.contact, fromLocationId: d.locationId, scheduledDate: d.scheduledDate, lines });
      if (type === 'TRANSFER')  return operationApi.createTransfer({ fromLocationId: d.locationId, toLocationId: d.toLocationId, scheduledDate: d.scheduledDate, lines });
      if (type === 'ADJUSTMENT') return operationApi.createAdjustment({ productId: d.lines[0].productId, locationId: d.locationId, physicalCount: d.lines[0].quantity });
      throw new Error('Unknown type');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${cfg.title.slice(0,-1)} created`);
      setModalOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Error creating operation'),
  });

  const validateMut = useMutation({
    mutationFn: (id: string) => operationApi.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Validated! Stock updated.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Validation failed'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => operationApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operations'] }); toast.success('Cancelled'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Error'),
  });

  const ops = opsData?.data ?? [];
  const userLocs = (locations ?? []).filter((l: any) => !['VENDOR','CUSTOMER'].includes(l.code));

  return (
    <AppShell>
      <PageHeader
        title={cfg.title}
        subtitle={`${opsData?.total ?? 0} records`}
        actions={
          <>
            <select className="input text-xs py-1.5 w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {['DRAFT','WAITING','READY','DONE','CANCELLED'].map((s) => <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => { reset({ lines: [{ productId: '', quantity: 1 }] }); setModalOpen(true); }}>
              <Plus size={13} /> New
            </button>
          </>
        }
      />

      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reference</th><th>Contact</th>
                  {type === 'TRANSFER' ? <><th>From</th><th>To</th></> : <><th>From</th><th>To</th></>}
                  <th>Scheduled</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <LoadingRows />}
                {!isLoading && ops.length === 0 && <EmptyState message={`No ${cfg.title.toLowerCase()} found.`} />}
                {ops.map((op: any) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const isLate = ['READY','WAITING'].includes(op.status) && op.scheduledDate && new Date(op.scheduledDate) < today;
                  return (
                    <tr key={op.id}>
                      <td><code className="text-xs font-mono bg-gray-50 px-1.5 py-0.5 rounded">{op.reference}</code></td>
                      <td className="text-gray-600">{op.contact || '—'}</td>
                      <td className="text-gray-500 text-xs">{op.fromLocation?.name || '—'}</td>
                      <td className="text-gray-500 text-xs">{op.toLocation?.name || '—'}</td>
                      <td>
                        {op.scheduledDate ? (
                          <span className={isLate ? 'text-red-500 font-medium text-xs' : 'text-xs text-gray-500'}>
                            {format(new Date(op.scheduledDate), 'dd MMM yyyy')}
                            {isLate && ' ⚠'}
                          </span>
                        ) : '—'}
                      </td>
                      <td><StatusBadge status={op.status as OpStatus} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button className="btn btn-sm" onClick={() => setDetailOp(op)}><Eye size={11} /></button>
                          {['READY','WAITING','DRAFT'].includes(op.status) && (
                            <button className="btn btn-sm btn-primary" onClick={() => validateMut.mutate(op.id)} disabled={validateMut.isPending}>
                              <CheckCircle size={11} /> Validate
                            </button>
                          )}
                          {op.status !== 'DONE' && op.status !== 'CANCELLED' && (
                            <button className="btn btn-sm" onClick={() => cancelMut.mutate(op.id)}>
                              <XCircle size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title={`New ${cfg.title.toLowerCase().replace(/s$/,'')}`} size="lg">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          {type !== 'ADJUSTMENT' && type !== 'TRANSFER' && (
            <div>
              <label className="label">Contact / {type === 'RECEIPT' ? 'Supplier' : 'Customer'}</label>
              <input className="input" placeholder="Company name" {...register('contact')} />
            </div>
          )}
          <div className={type === 'TRANSFER' ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="label">{cfg.locationLabel}</label>
              <select className="input" {...register('locationId', { required: true })}>
                <option value="">Select location…</option>
                {userLocs.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.warehouse?.name})</option>)}
              </select>
            </div>
            {type === 'TRANSFER' && (
              <div>
                <label className="label">To location</label>
                <select className="input" {...register('toLocationId', { required: true })}>
                  <option value="">Select location…</option>
                  {userLocs.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {type !== 'ADJUSTMENT' && (
            <div>
              <label className="label">Scheduled date</label>
              <input className="input" type="date" {...register('scheduledDate')} />
            </div>
          )}

          {/* Product lines */}
          <div>
            <label className="label">{type === 'ADJUSTMENT' ? 'Product & physical count' : 'Products'}</label>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex gap-2 items-center">
                  <select className="input flex-1 text-xs" {...register(`lines.${i}.productId`, { required: true })}>
                    <option value="">Select product…</option>
                    {(products ?? []).map((p: any) => (
                      <option key={p.id} value={p.id}>[{p.sku}] {p.name} ({p.totalStock} in stock)</option>
                    ))}
                  </select>
                  <input
                    className="input w-20 text-xs"
                    type="number" min="0"
                    placeholder={type === 'ADJUSTMENT' ? 'Count' : 'Qty'}
                    {...register(`lines.${i}.quantity`, { required: true, min: 0 })}
                  />
                  {fields.length > 1 && type !== 'ADJUSTMENT' && (
                    <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {type !== 'ADJUSTMENT' && (
              <button type="button" className="btn btn-sm mt-2" onClick={() => append({ productId: '', quantity: 1 })}>
                <Plus size={11} /> Add line
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      {detailOp && (
        <Modal open={!!detailOp} onClose={() => setDetailOp(null)} title={detailOp.reference}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailOp.contact && <div><span className="text-gray-500">Contact: </span>{detailOp.contact}</div>}
              <div><span className="text-gray-500">Status: </span><StatusBadge status={detailOp.status} /></div>
              {detailOp.scheduledDate && <div><span className="text-gray-500">Scheduled: </span>{format(new Date(detailOp.scheduledDate), 'dd MMM yyyy')}</div>}
              {detailOp.fromLocation && <div><span className="text-gray-500">From: </span>{detailOp.fromLocation.name}</div>}
              {detailOp.toLocation && <div><span className="text-gray-500">To: </span>{detailOp.toLocation.name}</div>}
              <div><span className="text-gray-500">Created by: </span>{detailOp.createdBy?.loginId}</div>
            </div>
            <table className="w-full text-sm">
              <thead><tr><th className="text-left py-1.5 text-xs text-gray-500">Product</th><th className="text-left py-1.5 text-xs text-gray-500">SKU</th><th className="text-right py-1.5 text-xs text-gray-500">Qty</th></tr></thead>
              <tbody>
                {detailOp.lines?.map((l: any) => (
                  <tr key={l.id} className="border-t border-gray-50">
                    <td className="py-1.5">{l.product?.name}</td>
                    <td className="py-1.5 text-gray-400 font-mono text-xs">{l.product?.sku}</td>
                    <td className="py-1.5 text-right">{l.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
