import type { ReactNode } from 'react';
import { useAuth } from '../../lib/auth';
import { DashboardShell } from '../../components/Layout';
import { Badge } from '../../components/ui';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: 'layers' as const, end: true },
  { to: '/dashboard/bookings', label: 'Bookings', icon: 'calendar' as const },
  { to: '/dashboard/rates', label: 'My rates', icon: 'tag' as const },
  { to: '/dashboard/profile', label: 'Profile', icon: 'briefcase' as const },
  { to: '/dashboard/billing', label: 'Membership', icon: 'card' as const },
];

export function ProShell({
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

export function VerificationNotice() {
  const { professional } = useAuth();
  if (!professional || professional.verificationStatus === 'verified') return null;

  return (
    <div className="mb-6 rounded-xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 ring-inset">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="warning">
          {professional.verificationStatus === 'pending' ? 'Awaiting verification' : 'Not verified'}
        </Badge>
        <p className="text-sm text-amber-900">
          {professional.verificationStatus === 'pending'
            ? 'Our team is checking your credentials. You can finish your profile and set your rate now — it goes live the moment you are verified.'
            : 'Your profile is not currently verified, so it is hidden from the directory. Contact support to resolve this.'}
        </p>
      </div>
    </div>
  );
}
