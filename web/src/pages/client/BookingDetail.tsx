import { Link, useParams } from 'react-router-dom';
import { BookingThread } from '../../components/BookingThread';
import { DashboardShell } from '../../components/Layout';
import { Icons } from '../../components/icons';

const NAV = [{ to: '/account', label: 'My bookings', icon: 'calendar' as const }];

export function ClientBookingDetail() {
  const { id = '' } = useParams();
  return (
    <DashboardShell
      title="Booking"
      subtitle="Messages, status and payment for this job."
      nav={NAV}
      actions={
        <Link to="/account" className="text-ink-600 hover:text-ink-950 inline-flex items-center gap-1 text-sm font-medium">
          <Icons.arrowRight className="size-3.5 rotate-180" /> All bookings
        </Link>
      }
    >
      <BookingThread bookingId={Number(id)} backTo="/account" />
    </DashboardShell>
  );
}
