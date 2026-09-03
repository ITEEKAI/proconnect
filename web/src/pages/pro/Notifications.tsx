import { NotificationsInbox } from '../NotificationsInbox';
import { ProShell } from './ProDashboard';

export function ProNotifications() {
  return (
    <ProShell title="Notifications" subtitle="New requests, messages, verification and fee changes.">
      <NotificationsInbox />
    </ProShell>
  );
}
