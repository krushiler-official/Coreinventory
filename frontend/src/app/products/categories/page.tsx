'use client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { productApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories().then((r) => r.data),
  });

  return (
    <AppShell>
      <PageHeader title="Product categories" subtitle="All categories in use" />
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {isLoading && Array.from({length:6}).map((_,i)=>(
            <div key={i} className="card p-4 animate-pulse h-20 bg-gray-50"/>
          ))}
          {categories.map((c: any) => (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Tag size={14} className="text-brand-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c._count?.products ?? 0} products</p>
              </div>
            </div>
          ))}
          {!isLoading && categories.length === 0 && (
            <div className="col-span-full card p-12 text-center text-gray-400 text-sm">
              No categories yet. Add a product with a category to create one automatically.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
