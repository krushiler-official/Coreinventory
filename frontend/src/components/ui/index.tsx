import clsx from 'clsx';

export type OpStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELLED';

const statusMap: Record<OpStatus, string> = {
  DRAFT:     'badge-draft',
  WAITING:   'badge-waiting',
  READY:     'badge-ready',
  DONE:      'badge-done',
  CANCELLED: 'badge-cancelled',
};

export function StatusBadge({ status }: { status: OpStatus }) {
  return (
    <span className={clsx('badge', statusMap[status] || 'badge-draft')}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function StockBar({ value, max, warn }: { value: number; max: number; warn?: boolean }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div
        className={clsx('h-full rounded-full transition-all', warn || pct < 25 ? 'bg-orange-400' : 'bg-brand-400')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function KpiCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <p className={clsx('text-2xl font-semibold leading-none', warn ? 'text-orange-500' : 'text-gray-900')}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-12 text-sm text-gray-400">{message}</td>
    </tr>
  );
}

export function LoadingRows() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          {[...Array(5)].map((_, j) => (
            <td key={j}><div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}
