import { ClientShell } from './ClientShell';
import { NotificationsInbox } from '../NotificationsInbox';

export function ClientNotifications() {
  return (
    <ClientShell title="Notifications" subtitle="Booking updates, messages and payment reminders.">
      <NotificationsInbox />
    </ClientShell>
  );
}
