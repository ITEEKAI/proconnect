import type { ReactNode } from 'react';
import { DashboardShell } from '../../components/Layout';

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'layers' as const, end: true },
  { to: '/admin/professionals', label: 'Professionals', icon: 'users' as const },
  { to: '/admin/plans', label: 'Plans & fees', icon: 'card' as const },
  { to: '/admin/categories', label: 'Categories', icon: 'tag' as const },
  { to: '/admin/bookings', label: 'Bookings', icon: 'calendar' as const },
  { to: '/admin/notifications', label: 'Notifications', icon: 'bell' as const },
  { to: '/admin/audit', label: 'Audit log', icon: 'history' as const },
];

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DashboardShell title={title} subtitle={subtitle} nav={NAV} actions={actions}>
      {children}
    </DashboardShell>
  );
}
