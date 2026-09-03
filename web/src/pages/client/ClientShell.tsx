import type { ReactNode } from 'react';
import { DashboardShell } from '../../components/Layout';

const NAV = [
  { to: '/account', label: 'My bookings', icon: 'calendar' as const, end: true },
  { to: '/account/invoices', label: 'Invoices', icon: 'card' as const },
  { to: '/account/notifications', label: 'Notifications', icon: 'bell' as const },
  { to: '/account/settings', label: 'Account', icon: 'users' as const },
];

export function ClientShell({
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
