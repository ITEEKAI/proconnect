import { api } from '../lib/api';
import { relativeTime } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { NotificationItem } from '../lib/types';
import { ErrorBanner, PageLoader } from '../components/Layout';
import { Button, EmptyState, cx } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface Inbox {
  unread: number;
  notifications: NotificationItem[];
}

export function NotificationsInbox() {
  const navigate = useNavigate();
  const inbox = useAsync(() => api<Inbox>('/notifications'));
  const [busy, setBusy] = useState(false);

  async function mark(ids?: number[]) {
    setBusy(true);
    try {
      await api('/notifications/read', { body: { ids } });
      inbox.reload();
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: NotificationItem) {
    if (!item.read) {
      try {
        await api('/notifications/read', { body: { ids: [item.id] } });
      } catch {
        /* still navigate */
      }
    }
    if (item.href) navigate(item.href);
  }

  if (inbox.loading) return <PageLoader />;

  const items = inbox.data?.notifications ?? [];
  const unread = inbox.data?.unread ?? 0;

  return (
    <>
      <ErrorBanner error={inbox.error} />
      <div className="mb-5 flex items-center justify-between">
        <p className="text-ink-500 text-sm">
          {unread === 0 ? 'You are up to date.' : `${unread} unread`}
        </p>
        {unread > 0 && (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => void mark()}>
            Mark all read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No notifications yet" description="Booking updates, messages and invoices will appear here." />
      ) : (
        <ul className="card divide-ink-100 divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openItem(item)}
                className={cx(
                  'w-full px-5 py-4 text-left transition hover:bg-ink-50',
                  !item.read && 'bg-brand-50/50',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-ink-950 text-sm font-medium">{item.title}</p>
                    {item.body && <p className="text-ink-500 mt-0.5 text-sm">{item.body}</p>}
                  </div>
                  <span className="text-ink-400 shrink-0 text-xs">{relativeTime(item.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
