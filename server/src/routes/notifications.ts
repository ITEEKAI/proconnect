import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/middleware.ts';
import {
  listNotifications,
  markRead,
  toNotificationDto,
  unreadCount,
} from '../domain/notifications.ts';
import { asyncHandler, parseBody } from '../lib/http.ts';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth());

notificationsRouter.get(
  '/',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const rows = listNotifications(user.id);
    res.json({
      unread: unreadCount(user.id),
      notifications: rows.map(toNotificationDto),
    });
  }),
);

notificationsRouter.post(
  '/read',
  asyncHandler((req, res) => {
    const user = currentUser(req);
    const body = parseBody(
      z.object({ ids: z.array(z.coerce.number().int().positive()).max(100).optional() }),
      req.body ?? {},
    );
    const marked = markRead(user.id, body.ids);
    res.json({ marked, unread: unreadCount(user.id) });
  }),
);
