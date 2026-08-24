import { all, get, run } from '../db/database.ts';

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
}

export function notify(
  userId: number,
  type: string,
  title: string,
  body: string,
  href = '',
): void {
  run(
    `INSERT INTO notifications (user_id, type, title, body, href) VALUES (?, ?, ?, ?, ?)`,
    userId,
    type,
    title,
    body,
    href,
  );
}

export function notifyAdmins(type: string, title: string, body: string, href = ''): void {
  const admins = all<{ id: number }>("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  for (const admin of admins) notify(admin.id, type, title, body, href);
}

export function listNotifications(userId: number, limit = 40): NotificationRow[] {
  return all<NotificationRow>(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    userId,
    limit,
  );
}

export function unreadCount(userId: number): number {
  return get<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL', userId)
    ?.n ?? 0;
}

export function markRead(userId: number, ids?: number[]): number {
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    return run(
      `UPDATE notifications SET read_at = datetime('now')
       WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
      userId,
      ...ids,
    ).changes;
  }
  return run(
    `UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`,
    userId,
  ).changes;
}

export function toNotificationDto(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}
