import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { relativeTime } from '../lib/format';
import type { NotificationItem } from '../lib/types';
import { Icons } from './icons';
import { cx } from './ui';

interface Inbox {
  unread: number;
  notifications: NotificationItem[];
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox>({ unread: 0, notifications: [] });

  useEffect(() => {
    if (!user) {
      setInbox({ unread: 0, notifications: [] });
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const data = await api<Inbox>('/notifications');
        if (!cancelled) setInbox(data);
      } catch {
        /* ignore polling errors */
      }
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  if (!user) return null;

  const inboxPath =
    user.role === 'admin'
      ? '/admin/notifications'
      : user.role === 'professional'
        ? '/dashboard/notifications'
        : '/account/notifications';

  async function mark(ids?: number[]) {
    const result = await api<{ unread: number }>('/notifications/read', { body: { ids } });
    setInbox((current) => ({
      unread: result.unread,
      notifications: current.notifications.map((item) =>
        !ids || ids.includes(item.id) ? { ...item, read: true } : item,
      ),
    }));
  }

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      try {
        await mark([item.id]);
      } catch {
        /* still navigate */
      }
    }
    if (item.href) navigate(item.href);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={inbox.unread > 0 ? `${inbox.unread} unread notifications` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
        className="text-ink-600 hover:bg-ink-100 relative rounded-lg p-2"
      >
        <Icons.bell className="size-5" />
        {inbox.unread > 0 && (
          <span className="bg-brand-600 absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
            {inbox.unread > 9 ? '9+' : inbox.unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} role="presentation" />
          <div className="shadow-lift border-ink-200 absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border bg-white sm:w-96">
            <div className="border-ink-100 flex items-center justify-between border-b px-4 py-3">
              <p className="text-ink-950 text-sm font-semibold">Notifications</p>
              {inbox.unread > 0 && (
                <button
                  type="button"
                  className="text-brand-700 text-xs font-medium"
                  onClick={() => void mark()}
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {inbox.notifications.length === 0 && (
                <li className="text-ink-500 px-4 py-8 text-center text-sm">Nothing yet.</li>
              )}
              {inbox.notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className={cx(
                      'w-full px-4 py-3 text-left transition hover:bg-ink-50',
                      !item.read && 'bg-brand-50/60',
                    )}
                  >
                    <p className="text-ink-950 text-sm font-medium">{item.title}</p>
                    {item.body && <p className="text-ink-500 mt-0.5 line-clamp-2 text-xs">{item.body}</p>}
                    <p className="text-ink-400 mt-1 text-[11px]">{relativeTime(item.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-ink-100 border-t px-4 py-2.5">
              <button
                type="button"
                className="text-brand-700 text-xs font-medium"
                onClick={() => {
                  setOpen(false);
                  navigate(inboxPath);
                }}
              >
                See all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
