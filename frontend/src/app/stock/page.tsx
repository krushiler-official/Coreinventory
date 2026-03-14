'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, LoadingRows } from '@/components/ui';
import { stockApi, warehouseApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function StockPage() {
  const [warehouseId, setWarehouseId] = useState('');

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['stock', warehouseId],
    queryFn: () => stockApi.byLocation({ warehouseId: warehouseId || undefined }).then((r) => r.data),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.list().then((r) => r.data),
  });

  const rows = stocks ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Stock per location"
        subtitle={`${rows.length} stock entries`}
        actions={
          <select className="input text-xs py-1.5 w-48" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {(warehouses ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        }
      />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th><th>Category</th>
                  <th>Warehouse</th><th>Location</th>
                  <th>On hand</th><th>Cost/unit</th><th>Total value</th><th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <LoadingRows />}
                {!isLoading && rows.length === 0 && <EmptyState message="No stock entries found." />}
                {rows.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-medium text-gray-800">{s.product?.name}</td>
                    <td><code className="text-xs font-mono bg-gray-50 px-1.5 py-0.5 rounded">{s.product?.sku}</code></td>
                    <td className="text-gray-500 text-xs">{s.product?.category?.name || '—'}</td>
                    <td className="text-gray-500 text-xs">{s.location?.warehouse?.name}</td>
                    <td className="text-gray-500 text-xs">{s.location?.name}</td>
                    <td>
                      <span className={s.isLow ? 'text-orange-600 font-semibold' : 'text-gray-800 font-medium'}>
                        {s.onHand}
                      </span>
                    </td>
                    <td className="text-gray-500">₹{s.product?.costPerUnit?.toLocaleString()}</td>
                    <td className="text-gray-600 font-medium">₹{(s.onHand * s.product?.costPerUnit).toLocaleString()}</td>
                    <td>
                      {s.isLow && (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <AlertTriangle size={12} /> Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
