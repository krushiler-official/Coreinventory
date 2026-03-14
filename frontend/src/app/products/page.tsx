'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, StockBar, EmptyState, LoadingRows } from '@/components/ui';
import { productApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Plus, Search, Pencil } from 'lucide-react';

interface ProductForm {
  name: string; sku: string; categoryName: string; uom: string;
  initialStock: number; reorderLevel: number; costPerUnit: number;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category],
    queryFn: () => productApi.list({ search, category }).then((r) => r.data),
  });

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProductForm>();

  const saveMut = useMutation({
    mutationFn: (d: ProductForm) =>
      editProduct ? productApi.update(editProduct.id, d) : productApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editProduct ? 'Product updated' : 'Product created');
      setModalOpen(false);
      setEditProduct(null);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Error'),
  });

  const openCreate = () => { setEditProduct(null); reset(); setModalOpen(true); };
  const openEdit = (p: any) => {
    setEditProduct(p);
    reset({
      name: p.name, sku: p.sku, categoryName: p.category?.name,
      uom: p.uom, reorderLevel: p.reorderLevel, costPerUnit: p.costPerUnit,
    });
    setModalOpen(true);
  };

  const products = data?.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Products"
        subtitle={`${data?.total ?? 0} products`}
        actions={
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                className="input pl-7 w-48 text-xs py-1.5"
                placeholder="Search name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-40 text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {(cats ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={13} /> New product
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
                  <th>Name</th><th>SKU</th><th>Category</th><th>UoM</th>
                  <th>On hand</th><th>Reorder level</th><th>Cost/unit</th><th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <LoadingRows />}
                {!isLoading && products.length === 0 && <EmptyState message="No products found." />}
                {products.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-medium text-gray-800">{p.name}</td>
                    <td><code className="text-xs bg-gray-50 px-1.5 py-0.5 rounded font-mono">{p.sku}</code></td>
                    <td className="text-gray-500">{p.category?.name || '—'}</td>
                    <td className="text-gray-500">{p.uom}</td>
                    <td>
                      <span className={p.isLowStock ? 'text-orange-600 font-medium' : 'text-gray-800'}>
                        {p.totalStock}
                      </span>
                      <StockBar value={p.totalStock} max={p.reorderLevel * 3} warn={p.isLowStock} />
                      {p.isLowStock && <span className="badge badge-low text-[10px] mt-0.5">Low stock</span>}
                    </td>
                    <td className="text-gray-500">{p.reorderLevel}</td>
                    <td className="text-gray-500">₹{p.costPerUnit.toLocaleString()}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => openEdit(p)}>
                        <Pencil size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditProduct(null); reset(); }} title={editProduct ? 'Edit product' : 'New product'}>
        <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Product name *</label>
              <input className="input" placeholder="e.g. Office Desk" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">SKU / Code *</label>
              <input className="input" placeholder="e.g. DESK001" {...register('sku', { required: true })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" list="cat-list" placeholder="e.g. Furniture" {...register('categoryName')} />
              <datalist id="cat-list">{(cats ?? []).map((c: any) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div>
              <label className="label">Unit of measure</label>
              <select className="input" {...register('uom')}>
                {['Units','kg','m','L','Box','Ream','Pcs'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            {!editProduct && (
              <div>
                <label className="label">Initial stock</label>
                <input className="input" type="number" min="0" defaultValue={0} {...register('initialStock')} />
              </div>
            )}
            <div>
              <label className="label">Reorder level</label>
              <input className="input" type="number" min="0" defaultValue={10} {...register('reorderLevel')} />
            </div>
            <div>
              <label className="label">Cost per unit (₹)</label>
              <input className="input" type="number" min="0" defaultValue={0} {...register('costPerUnit')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
