import { NotificationsInbox } from '../NotificationsInbox';
import { AdminShell } from './AdminShell';

export function AdminNotifications() {
  return (
    <AdminShell title="Notifications" subtitle="Applications, verification and platform alerts.">
      <NotificationsInbox />
    </AdminShell>
  );
}
