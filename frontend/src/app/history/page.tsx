'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, LoadingRows } from '@/components/ui';
import { stockApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { format } from 'date-fns';

const typeColors: Record<string, string> = {
  RECEIPT:    'bg-green-100 text-green-700',
  DELIVERY:   'bg-red-100 text-red-600',
  TRANSFER:   'bg-blue-100 text-blue-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
};

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate]   = useState('');
  const [toDate, setToDate]       = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['moves', typeFilter, fromDate, toDate],
    queryFn: () => stockApi.moves({
      type: typeFilter || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }).then((r) => r.data),
  });

  const moves = data?.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Move history"
        subtitle={`${data?.total ?? 0} stock moves`}
        actions={
          <div className="flex items-center gap-2">
            <select className="input text-xs py-1.5 w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {['RECEIPT','DELIVERY','TRANSFER','ADJUSTMENT'].map((t) => (
                <option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <input className="input text-xs py-1.5" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-gray-400 text-xs">to</span>
            <input className="input text-xs py-1.5" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        }
      />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reference</th><th>Product</th><th>Qty</th>
                  <th>From</th><th>To</th><th>Type</th><th>Date</th><th>By</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <LoadingRows />}
                {!isLoading && moves.length === 0 && <EmptyState message="No moves found." />}
                {moves.map((m: any) => (
                  <tr key={m.id}>
                    <td><code className="text-xs font-mono bg-gray-50 px-1.5 py-0.5 rounded">{m.reference}</code></td>
                    <td className="font-medium text-gray-800">{m.product?.name}</td>
                    <td>
                      <span className={`font-semibold ${m.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{m.fromLocation?.name || '—'}</td>
                    <td className="text-gray-500 text-xs">{m.toLocation?.name || '—'}</td>
                    <td>
                      <span className={`badge text-[10px] ${typeColors[m.type] || 'badge-draft'}`}>
                        {m.type.charAt(0)+m.type.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(m.movedAt), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="text-gray-400 text-xs">{m.doneBy?.loginId}</td>
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
