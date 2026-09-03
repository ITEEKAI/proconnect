import { Link, useParams } from 'react-router-dom';
import { BookingThread } from '../../components/BookingThread';
import { Icons } from '../../components/icons';
import { AdminShell } from './AdminShell';

export function AdminBookingDetail() {
  const { id = '' } = useParams();
  return (
    <AdminShell
      title="Booking"
      subtitle="Messages, status and the job invoice for this engagement."
      actions={
        <Link
          to="/admin/bookings"
          className="text-ink-600 hover:text-ink-950 inline-flex items-center gap-1 text-sm font-medium"
        >
          <Icons.arrowRight className="size-3.5 rotate-180" /> All bookings
        </Link>
      }
    >
      <BookingThread bookingId={Number(id)} backTo="/admin/bookings" />
    </AdminShell>
  );
}
