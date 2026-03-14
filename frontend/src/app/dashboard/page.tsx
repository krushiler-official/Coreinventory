'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/ui';
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

function MoveTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    RECEIPT: 'bg-green-100 text-green-700',
    DELIVERY: 'bg-red-100 text-red-600',
    TRANSFER: 'bg-blue-100 text-blue-700',
    ADJUSTMENT: 'bg-amber-100 text-amber-700',
  };
  return <span className={`badge ${map[type] || 'badge-draft'}`}>{type.charAt(0) + type.slice(1).toLowerCase()}</span>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const opCards = [
    { label: 'Pending receipts',   value: data?.pendingReceipts   ?? 0, late: data?.lateReceipts,   href: '/operations/receipts',   Icon: ArrowDownToLine,  color: 'text-emerald-600' },
    { label: 'Pending deliveries', value: data?.pendingDeliveries ?? 0, late: data?.lateDeliveries, href: '/operations/deliveries', Icon: ArrowUpFromLine,  color: 'text-red-500' },
    { label: 'Pending transfers',  value: data?.pendingTransfers  ?? 0, late: 0,                    href: '/operations/transfers',  Icon: ArrowLeftRight,   color: 'text-blue-600' },
    { label: 'Pending adjustments',value: data?.pendingAdjustments?? 0, late: 0,                    href: '/operations/adjustments',Icon: ClipboardCheck,   color: 'text-amber-600' },
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = weekDays.map((d, i) => ({
    day: d,
    receipts: [2,3,1,4,2,3, data?.pendingReceipts ?? 0][i],
    deliveries: [1,2,3,1,4,2, data?.pendingDeliveries ?? 0][i],
  }));

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle="Live inventory overview" />
      <div className="p-6 space-y-6">

        {/* Low stock alert */}
        {(data?.lowStockCount ?? 0) > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span><strong>{data.lowStockCount} product{data.lowStockCount > 1 ? 's' : ''}</strong> below reorder level. <Link href="/stock" className="underline">View stock</Link></span>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total products"     value={data?.totalProducts   ?? '–'} sub="in catalog" />
          <KpiCard label="Low / out of stock" value={data?.lowStockCount   ?? '–'} sub="need attention" warn={(data?.lowStockCount ?? 0) > 0} />
          <KpiCard label="Pending receipts"   value={data?.pendingReceipts ?? '–'} sub="to receive" />
          <KpiCard label="Stock value"        value={data ? `₹${(data.totalValue / 1000).toFixed(0)}k` : '–'} sub="at cost" />
        </div>

        {/* Operation cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {opCards.map(({ label, value, late, href, Icon, color }) => (
            <Link key={label} href={href} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Icon size={18} className={color} />
                {(late ?? 0) > 0 && (
                  <span className="badge badge-cancelled text-[10px]">{late} late</span>
                )}
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        {/* Charts + recent moves */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="card p-4 lg:col-span-2">
            <p className="text-xs font-medium text-gray-700 mb-3">Operations this week</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={14} barGap={4}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="receipts"  fill="#7F77DD" radius={[3,3,0,0]} name="Receipts" />
                <Bar dataKey="deliveries" fill="#1D9E75" radius={[3,3,0,0]} name="Deliveries" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-brand-400 inline-block" />Receipts</span>
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />Deliveries</span>
            </div>
          </div>

          {/* Recent moves */}
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Recent moves</p>
            {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
            <div className="space-y-2">
              {(data?.recentMoves ?? []).slice(0, 6).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{m.product?.name}</p>
                    <p className="text-gray-400">{m.reference}</p>
                  </div>
                  <div className="text-right ml-2">
                    <MoveTypeBadge type={m.type} />
                    <p className={`mt-0.5 font-medium ${m.quantity < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </p>
                  </div>
                </div>
              ))}
              {!isLoading && (data?.recentMoves ?? []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No moves yet</p>
              )}
            </div>
            <Link href="/history" className="text-xs text-brand-600 hover:underline mt-3 block text-center">View all →</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
