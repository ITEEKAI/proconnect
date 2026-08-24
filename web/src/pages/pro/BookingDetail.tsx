import { Link, useParams } from 'react-router-dom';
import { BookingThread } from '../../components/BookingThread';
import { Icons } from '../../components/icons';
import { ProShell } from './ProDashboard';

export function ProBookingDetail() {
  const { id = '' } = useParams();
  return (
    <ProShell
      title="Booking"
      subtitle="Accept work, message the client, and log hours when you finish."
      actions={
        <Link
          to="/dashboard/bookings"
          className="text-ink-600 hover:text-ink-950 inline-flex items-center gap-1 text-sm font-medium"
        >
          <Icons.arrowRight className="size-3.5 rotate-180" /> All bookings
        </Link>
      }
    >
      <BookingThread bookingId={Number(id)} backTo="/dashboard/bookings" />
    </ProShell>
  );
}
