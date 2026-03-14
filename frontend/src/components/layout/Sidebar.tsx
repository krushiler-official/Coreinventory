'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Package, Warehouse, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, ClipboardList, History,
  Settings, User, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Products', icon: Package,
    children: [
      { label: 'All products',       href: '/products' },
      { label: 'Stock per location', href: '/stock' },
      { label: 'Categories',         href: '/products/categories' },
    ],
  },
  {
    label: 'Operations', icon: ClipboardList,
    children: [
      { label: 'Receipts',            href: '/operations/receipts' },
      { label: 'Delivery orders',     href: '/operations/deliveries' },
      { label: 'Internal transfers',  href: '/operations/transfers' },
      { label: 'Adjustments',         href: '/operations/adjustments' },
    ],
  },
  { label: 'Move history', href: '/history', icon: History },
  {
    label: 'Settings', icon: Settings,
    children: [
      { label: 'Warehouses & locations', href: '/settings/warehouses' },
    ],
  },
];

function NavGroup({ item }: { item: typeof navItems[0] }) {
  const pathname = usePathname();
  const isActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isActive ?? false);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <Link
        href={item.href!}
        className={clsx(
          'flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-colors',
          pathname === item.href
            ? 'bg-brand-50 text-brand-600 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <Icon size={15} />
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center justify-between w-full px-3 py-2 mx-0 rounded-lg text-sm transition-colors',
          isActive ? 'text-brand-600 font-medium' : 'text-gray-600 hover:text-gray-900'
        )}
        style={{ paddingLeft: '12px', paddingRight: '12px', margin: '0 8px', width: 'calc(100% - 16px)' }}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={15} />
          {item.label}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="ml-5 mt-0.5 border-l border-gray-100 pl-3 space-y-0.5">
          {item.children.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={clsx(
                'block px-2 py-1.5 rounded-md text-xs transition-colors',
                pathname === c.href || pathname.startsWith(c.href + '/')
                  ? 'text-brand-600 font-medium bg-brand-50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-[220px] min-w-[220px] h-screen flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Package size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">CoreInventory</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Stock management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavGroup key={item.label} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-1"
        >
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-semibold">
            {user?.loginId?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user?.loginId}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <User size={12} className="text-gray-400" />
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={13} />
          Log out
        </button>
      </div>
    </aside>
  );
}
